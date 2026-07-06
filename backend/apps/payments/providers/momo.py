"""
MTN MoMo Open API provider — the Rwanda & Ghana mobile-money rail.

Verified against the public sandbox (sandbox.momodeveloper.mtn.com, July 2026):
  * Auth:        POST /{product}/token/           Basic(apiUser:apiKey) + Ocp-Apim-Subscription-Key
  * Collection:  POST /collection/v1_0/requesttopay        → 202 (async; status via GET)
  * Status:      GET  /collection/v1_0/requesttopay/{ref}  → SUCCESSFUL | PENDING | FAILED
  * Disburse:    POST /disbursement/v1_0/transfer          → 202 (async; status via GET)
  * Every transaction is keyed by a client-generated UUIDv4 in X-Reference-Id.
  * Sandbox quirks: currency MUST be EUR; live uses RWF (Rwanda) / GHS (Ghana);
    X-Target-Environment is 'sandbox' or the live gateway name (e.g. 'mtnrwanda').

BankProvider field mapping (configured in Console → Provider Hub):
  api_key       → Collection product subscription key (Ocp-Apim-Subscription-Key)
  api_secret    → API user's apiKey (the Basic-auth password)
  merchant_code → API user UUID (the Basic-auth username)
  extra_config  → { 'disbursement_subscription_key': ...,   # if separate product sub
                    'target_environment': 'sandbox',
                    'currency': 'EUR' | 'RWF' | 'GHS',
                    'callback_host': 'https://api.orbisave.com' }

MoMo callbacks (PUT to providerCallbackHost) carry no HMAC — webhook security is
callback-host allow-listing plus optional Basic auth. verify_webhook_signature
therefore requires a configured webhook_secret Basic pair and FAILS CLOSED
without one; until then the stuck-transaction poller settles transactions via
the status API, which is the sandbox-recommended pattern anyway.
"""
import base64
import hashlib
import json
import logging
import time
import uuid
from decimal import Decimal
from typing import Any, Dict

import requests
from django.utils import timezone

from apps.payments.base import PaymentProvider

logger = logging.getLogger(__name__)

SANDBOX_BASE_URL = "https://sandbox.momodeveloper.mtn.com"
LIVE_BASE_URL = "https://proxy.momoapi.mtn.com"


class MTNMoMoProvider(PaymentProvider):
    def __init__(self, provider_record):
        self.record = provider_record
        self.extra = provider_record.extra_config or {}
        self.subscription_key = provider_record.api_key
        self.api_user = provider_record.merchant_code
        self.api_user_key = provider_record.api_secret
        self.base_url = (provider_record.base_url or self._default_base_url()).rstrip("/")
        self._tokens: Dict[str, str] = {}

    def _default_base_url(self):
        return LIVE_BASE_URL if self.record.environment == "live" else SANDBOX_BASE_URL

    # ── Config helpers ────────────────────────────────────────────────────────

    def _target_environment(self) -> str:
        if self.record.environment == "live":
            return self.extra.get("target_environment") or f"mtn{self.record.country}"
        return "sandbox"

    def _currency(self) -> str:
        # Sandbox only accepts EUR; live uses the country currency.
        if self.record.environment != "live":
            return self.extra.get("currency", "EUR")
        return self.extra.get("currency") or {"rwanda": "RWF", "ghana": "GHS"}.get(self.record.country, "EUR")

    def _subscription_key(self, product: str) -> str:
        if product == "disbursement":
            return self.extra.get("disbursement_subscription_key") or self.subscription_key
        return self.subscription_key

    def _msisdn(self, phone: str) -> str:
        return phone.lstrip("+").replace(" ", "")

    # ── Auth ─────────────────────────────────────────────────────────────────

    def _get_token(self, product: str) -> str:
        cached = self._tokens.get(product)
        if cached:
            return cached
        basic = base64.b64encode(f"{self.api_user}:{self.api_user_key}".encode()).decode()
        url = f"{self.base_url}/{product}/token/"
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Basic {basic}",
                "Ocp-Apim-Subscription-Key": self._subscription_key(product),
            },
            timeout=15,
        )
        self._record_response("POST", url, {}, resp)
        resp.raise_for_status()
        token = resp.json()["access_token"]
        self._tokens[product] = token
        return token

    def _headers(self, product: str, reference_id: str = "") -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._get_token(product)}",
            "Ocp-Apim-Subscription-Key": self._subscription_key(product),
            "X-Target-Environment": self._target_environment(),
            "Content-Type": "application/json",
        }
        if reference_id:
            headers["X-Reference-Id"] = reference_id
        callback_host = self.extra.get("callback_host")
        if callback_host:
            headers["X-Callback-Url"] = f"{callback_host.rstrip('/')}/api/v1/contributions/webhook/{self.record.country}/mtn_momo/"
        return headers

    # ── Money in: requesttopay ────────────────────────────────────────────────

    def initiate_collection(self, phone: str, amount: Decimal, reference: str, description: str) -> Dict[str, Any]:
        """
        Fire a requesttopay prompt to the payer's handset. MoMo is async by
        contract: a 202 means 'prompt delivered'; settlement lands via callback
        or the status poller.
        """
        tx_reference = str(uuid.uuid4())  # MoMo requires a client UUIDv4 per transaction
        payload = {
            "amount": self._amount(amount),
            "currency": self._currency(),
            "externalId": reference,
            "payer": {"partyIdType": "MSISDN", "partyId": self._msisdn(phone)},
            "payerMessage": description[:160],
            "payeeNote": f"OrbiSave {reference}"[:160],
        }
        url = f"{self.base_url}/collection/v1_0/requesttopay"
        resp = requests.post(url, headers=self._headers("collection", tx_reference), json=payload, timeout=20)
        self._record_response("POST", url, payload, resp)

        if resp.status_code != 202:
            logger.error("momo_requesttopay_rejected status=%s body=%s", resp.status_code, resp.text[:300])
            return {"status": "failed", "error": f"MoMo rejected the request (HTTP {resp.status_code})."}

        self._record_provider_transaction(
            direction="inbound",
            channel="momo_requesttopay",
            amount=amount,
            currency=payload["currency"],
            internal_reference=tx_reference,
            external_reference=reference,
            counterparty=payload["payer"]["partyId"],
            status="pending_customer_action",
            request_payload=payload,
        )
        return {"status": "pending_async", "provider_reference": tx_reference}

    # ── Money out: transfer ───────────────────────────────────────────────────

    def initiate_disbursement(self, phone: str, amount: Decimal, reference: str, remarks: str) -> Dict[str, Any]:
        """
        B2C transfer. MoMo answers 202 then settles asynchronously — we poll the
        status endpoint immediately (sandbox settles instantly; live usually
        within seconds). A still-PENDING transfer is reported as failed to the
        caller so the payout can be retried once the poller confirms state;
        see docs/rwanda_ghana_rails_onboarding.md for the live-launch note.
        """
        tx_reference = str(uuid.uuid4())
        payload = {
            "amount": self._amount(amount),
            "currency": self._currency(),
            "externalId": reference,
            "payee": {"partyIdType": "MSISDN", "partyId": self._msisdn(phone)},
            "payerMessage": remarks[:160],
            "payeeNote": remarks[:160],
        }
        url = f"{self.base_url}/disbursement/v1_0/transfer"
        resp = requests.post(url, headers=self._headers("disbursement", tx_reference), json=payload, timeout=20)
        self._record_response("POST", url, payload, resp)

        if resp.status_code != 202:
            logger.error("momo_transfer_rejected status=%s body=%s", resp.status_code, resp.text[:300])
            return {"status": "failed", "error": f"MoMo rejected the transfer (HTTP {resp.status_code})."}

        self._record_provider_transaction(
            direction="outbound",
            channel="momo_transfer",
            amount=amount,
            currency=payload["currency"],
            internal_reference=tx_reference,
            external_reference=reference,
            counterparty=payload["payee"]["partyId"],
            status="provider_processing",
            request_payload=payload,
        )

        status_data = self._get_transaction_status("disbursement", "transfer", tx_reference)
        momo_status = str(status_data.get("status", "PENDING")).upper()
        if momo_status == "SUCCESSFUL":
            return {
                "status": "success",
                "provider_reference": tx_reference,
                "financial_transaction_id": status_data.get("financialTransactionId", ""),
            }
        if momo_status == "PENDING":
            return {
                "status": "failed",
                "provider_reference": tx_reference,
                "error": "MoMo transfer still pending settlement — retry after the poller confirms.",
            }
        return {
            "status": "failed",
            "provider_reference": tx_reference,
            "error": status_data.get("reason", f"MoMo transfer status: {momo_status}"),
        }

    # ── Status / reconciliation ───────────────────────────────────────────────

    def _get_transaction_status(self, product: str, path: str, reference: str) -> Dict[str, Any]:
        url = f"{self.base_url}/{product}/v1_0/{path}/{reference}"
        resp = requests.get(url, headers=self._headers(product), timeout=15)
        self._record_response("GET", url, {}, resp)
        if resp.status_code != 200:
            return {"status": "PENDING"}
        return resp.json()

    def query_transaction_details(self, reference: str) -> Dict[str, Any]:
        """
        Used by the stuck-transaction poller. Tries collection first, then
        disbursement (the poller doesn't know direction).
        """
        data = self._get_transaction_status("collection", "requesttopay", reference)
        if str(data.get("status", "")).upper() in ("", "PENDING") and not data.get("financialTransactionId"):
            disbursement = self._get_transaction_status("disbursement", "transfer", reference)
            if disbursement.get("status"):
                data = disbursement
        return {"data": data}

    def get_full_statement(self, **kwargs) -> Dict[str, Any]:
        # MoMo has no statement API — reconciliation for RW/GH runs against the
        # BANK trust account (BK Open API / Ecobank), not the wallet.
        return {"data": {"transactions": []}}

    def get_opening_closing_balance(self, **kwargs) -> Dict[str, Any]:
        return {"data": {"balances": []}}

    # ── Callbacks ─────────────────────────────────────────────────────────────

    def parse_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        raw = payload.get("data") if isinstance(payload.get("data"), dict) else payload
        momo_status = str(raw.get("status", "")).upper()
        normalized = {
            "SUCCESSFUL": "success",
            "FAILED": "failed",
            "PENDING": "pending",
            "REJECTED": "rejected",
            "TIMEOUT": "failed",
        }.get(momo_status, "manual_review" if momo_status else "pending")
        return {
            "status": normalized,
            # Ledger flows key on OUR UUIDv4 (X-Reference-Id) — the callback
            # echoes it as referenceId; externalId carries our business ref.
            "transaction_id": raw.get("referenceId") or raw.get("externalId") or "",
            "amount": str(raw.get("amount", "0.00")),
            "reason": (raw.get("reason") or {}).get("message", "") if isinstance(raw.get("reason"), dict) else str(raw.get("reason") or ""),
            "raw": raw,
        }

    def verify_webhook_signature(self, request) -> bool:
        """
        MoMo callbacks carry no HMAC. Fail closed unless a Basic-auth pair is
        configured (webhook_secret = 'username:password'); the status poller
        remains the source of truth either way.
        """
        secret = self.record.webhook_secret or ""
        if not secret or ":" not in secret:
            return False
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Basic "):
            return False
        try:
            decoded = base64.b64decode(auth.split(" ", 1)[1]).decode()
        except Exception:
            return False
        import hmac as hmac_mod
        return hmac_mod.compare_digest(decoded, secret)

    # ── Console test-connection ───────────────────────────────────────────────

    def test_connection(self) -> Dict[str, Any]:
        start = time.time()
        try:
            self._tokens.pop("collection", None)
            self._get_token("collection")
            return {
                "success": True,
                "latency_ms": int((time.time() - start) * 1000),
                "message": "MoMo collection token issued — credentials are valid.",
            }
        except Exception as exc:
            return {
                "success": False,
                "latency_ms": int((time.time() - start) * 1000),
                "message": str(exc),
            }

    # ── Journaling (mirrors the Jenga provider's audit trail) ────────────────

    def _amount(self, amount: Decimal) -> str:
        return f"{Decimal(str(amount)).quantize(Decimal('0.01')):.2f}"

    def _checksum(self, payload: Dict[str, Any]) -> str:
        return hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()
        ).hexdigest()

    def _record_response(self, method: str, url: str, payload: Dict[str, Any], resp) -> Dict[str, Any]:
        from apps.payments.models import ProviderApiLog

        try:
            body = resp.json() if resp.content else {}
        except ValueError:
            body = {"raw": resp.text[:500]}
        try:
            ProviderApiLog.objects.create(
                provider=self.record,
                direction="outbound",
                endpoint=url,
                method=method,
                response_code=resp.status_code,
                success=200 <= resp.status_code < 300,
                duration_ms=int(resp.elapsed.total_seconds() * 1000) if resp.elapsed else 0,
                reference=str(payload.get("externalId", "")),
                error_message="" if 200 <= resp.status_code < 300 else str(body)[:500],
            )
        except Exception:  # journaling must never break a money call
            logger.warning("momo_api_log_failed url=%s", url)
        return body

    def _record_provider_transaction(
        self, *, direction, channel, amount, currency,
        internal_reference, external_reference, counterparty, status, request_payload,
    ):
        from apps.payments.models import ProviderTransaction

        ProviderTransaction.objects.update_or_create(
            internal_reference=internal_reference,
            defaults={
                "provider": self.record,
                "direction": direction,
                "channel": channel,
                "country": self.record.country,
                "currency": currency,
                "amount": Decimal(str(amount)),
                "provider_reference": external_reference or "",
                "source_account": counterparty if direction == "inbound" else "",
                "destination_account": counterparty if direction == "outbound" else "",
                "status": status,
                "raw_request_checksum": self._checksum(request_payload),
                "submitted_at": timezone.now(),
                "metadata": {
                    "environment": self.record.environment,
                    "provider_code": self.record.provider_code,
                    "target_environment": self._target_environment(),
                },
            },
        )
