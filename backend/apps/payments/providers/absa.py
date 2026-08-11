"""
Absa Bank provider adapter (Absa API Marketplace / Absa Access).

Unlike Jenga — Equity's OPEN developer platform (finserve.africa) whose contracts
are public — Absa's transactional API (KE collections + B2C disbursements) is
released through the Absa API Marketplace (api.absa.africa) / Absa Access under a
partnership NDA. The exact endpoint paths, payload/response field names and the
webhook signature scheme are supplied in the onboarding pack, not published.

So this adapter is deliberately CONFIG-DRIVEN: the standard scaffolding — OAuth2
client-credentials auth, account resolution, HMAC webhook verification, request/
response plumbing — is implemented here and is correct; the Absa-specific values
(token/collection/disbursement paths, field names, webhook secret) come from the
provider record's `extra_config`, entered in the Console from the onboarding pack.
No Absa endpoint or payload shape is hard-coded/guessed.

Safety: in a `live` environment the adapter FAILS CLOSED — it refuses to move
money until the required config keys are present, so it can never send a real
transaction against unconfirmed endpoints. See docs/absa_onboarding.md.
"""
import base64
import hashlib
import hmac
import logging
import time
from decimal import Decimal
from typing import Any, Dict

import requests

from apps.payments.base import PaymentProvider

logger = logging.getLogger(__name__)

# Absa API Marketplace base hosts (the gateway; product paths come from config).
SANDBOX_BASE_URL = "https://api-uat.absa.africa"
LIVE_BASE_URL = "https://api.absa.africa"

# Config keys that MUST be present before the adapter will move real money.
_REQUIRED_LIVE_KEYS = ("token_path", "collection_path", "disbursement_path", "webhook_secret")

# Standard request field names, overridable per-field via extra_config['field_map']
# once the onboarding pack confirms Absa's exact schema.
_DEFAULT_FIELD_MAP = {
    "amount": "amount",
    "currency": "currency",
    "reference": "reference",
    "msisdn": "mobileNumber",
    "narration": "narration",
    "account": "accountNumber",
}


class AbsaConfigError(ValueError):
    """Raised when the Absa adapter is asked to act before it is fully configured."""


class AbsaProvider(PaymentProvider):
    def __init__(self, provider_record):
        self.record = provider_record
        self.consumer_key = provider_record.api_key           # Absa API consumer/client key
        self.consumer_secret = provider_record.api_secret     # consumer/client secret
        self.extra = provider_record.extra_config or {}
        self.base_url = (provider_record.base_url or self._default_base_url()).rstrip("/")
        self.is_live = provider_record.environment == "live"
        self._token = None
        self._token_expiry = 0.0
        if self.is_live:
            self._require_live_config()

    def _default_base_url(self):
        return LIVE_BASE_URL if self.record.environment == "live" else SANDBOX_BASE_URL

    def _cfg(self, key, default=None):
        return self.extra.get(key, default)

    def _require_live_config(self):
        missing = [k for k in _REQUIRED_LIVE_KEYS if not self._cfg(k)]
        if missing:
            raise AbsaConfigError(
                "Absa live provider is not fully configured; refusing to transact. "
                f"Missing config: {', '.join(missing)}. Supply these from the Absa "
                "onboarding pack in Console → Payment Providers (see docs/absa_onboarding.md)."
            )

    def _field(self, name):
        return {**_DEFAULT_FIELD_MAP, **(self._cfg("field_map") or {})}[name]

    # ── Auth ────────────────────────────────────────────────────────────────
    def _get_token(self):
        """OAuth2 client-credentials against the Absa API Marketplace token endpoint."""
        if self._token and time.time() < self._token_expiry - 30:
            return self._token
        token_path = self._cfg("token_path")
        if not token_path:
            raise AbsaConfigError("Absa 'token_path' is not configured (from the onboarding pack).")
        if not (self.consumer_key and self.consumer_secret):
            raise AbsaConfigError("Absa consumer key/secret are not set on the provider record.")

        basic = base64.b64encode(f"{self.consumer_key}:{self.consumer_secret}".encode()).decode()
        resp = requests.post(
            f"{self.base_url}{token_path}",
            headers={"Authorization": f"Basic {basic}", "Content-Type": "application/x-www-form-urlencoded"},
            data={"grant_type": "client_credentials"},
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()
        self._token = body.get("access_token") or body.get("accessToken")
        if not self._token:
            raise AbsaConfigError(f"Absa token endpoint returned no access token: {body}")
        self._token_expiry = time.time() + int(body.get("expires_in", 3600))
        return self._token

    def _authed_headers(self):
        return {"Authorization": f"Bearer {self._get_token()}", "Content-Type": "application/json"}

    # ── Accounts ────────────────────────────────────────────────────────────
    def account(self, purpose: str):
        qs = self.record.accounts.filter(is_active=True)
        if purpose == "collection":
            acc = qs.filter(is_default_for_collections=True).first() or qs.filter(account_type="collection").first()
        elif purpose == "payout":
            acc = qs.filter(is_default_for_disbursements=True).first() or qs.filter(account_type="payout").first()
        else:
            acc = qs.filter(account_type=purpose).first()
        if not acc:
            raise AbsaConfigError(f"No active Absa '{purpose}' account configured for provider {self.record.id}.")
        return acc

    def _post(self, path_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        path = self._cfg(path_key)
        if not path:
            raise AbsaConfigError(
                f"Absa '{path_key}' is not configured. Enter it from the onboarding pack "
                "(Console → Payment Providers); see docs/absa_onboarding.md."
            )
        resp = requests.post(f"{self.base_url}{path}", json=payload, headers=self._authed_headers(), timeout=45)
        resp.raise_for_status()
        return resp.json()

    def _reference_of(self, body: Dict[str, Any]) -> str:
        key = self._cfg("reference_field", "transactionReference")
        return str(body.get(key) or body.get("reference") or body.get("transactionId") or "")

    # ── Interface ───────────────────────────────────────────────────────────
    def initiate_collection(self, phone: str, amount: Decimal, reference: str, description: str) -> Dict[str, Any]:
        payload = {
            self._field("amount"): str(amount),
            self._field("currency"): self._cfg("currency", "KES"),
            self._field("reference"): reference,
            self._field("msisdn"): phone,
            self._field("narration"): description,
            self._field("account"): self.account("collection").account_number,
        }
        try:
            body = self._post("collection_path", payload)
            return {"status": "pending", "provider_reference": self._reference_of(body), "raw": body}
        except Exception as exc:
            logger.error("absa_collection_failed", extra={"reference": reference, "error": str(exc)})
            return {"status": "failed", "error": str(exc)}

    def initiate_disbursement(self, phone: str, amount: Decimal, reference: str, remarks: str) -> Dict[str, Any]:
        payload = {
            self._field("amount"): str(amount),
            self._field("currency"): self._cfg("currency", "KES"),
            self._field("reference"): reference,
            self._field("msisdn"): phone,
            self._field("narration"): remarks,
            self._field("account"): self.account("payout").account_number,
        }
        try:
            body = self._post("disbursement_path", payload)
            return {"status": "success", "provider_reference": self._reference_of(body), "raw": body}
        except Exception as exc:
            logger.error("absa_disbursement_failed", extra={"reference": reference, "error": str(exc)})
            return {"status": "failed", "error": str(exc)}

    def parse_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        status_field = self._cfg("callback_status_field", "status")
        raw_status = str(payload.get(status_field, "")).lower()
        mapping = {**{"success": "success", "successful": "success", "completed": "success",
                      "failed": "failed", "declined": "failed", "cancelled": "cancelled"},
                   **(self._cfg("callback_status_map") or {})}
        return {
            "status": mapping.get(raw_status, "pending"),
            "transaction_id": str(payload.get(self._cfg("callback_reference_field", "transactionReference"))
                                  or payload.get("reference") or ""),
            "amount": payload.get(self._cfg("callback_amount_field", "amount")),
            "reason": payload.get("statusDescription") or payload.get("message", ""),
            "raw": payload,
        }

    def verify_webhook_signature(self, request) -> bool:
        """HMAC-SHA256 over the raw body with the configured webhook secret. Fail-closed."""
        secret = self._cfg("webhook_secret")
        header = self._cfg("webhook_signature_header", "X-Absa-Signature")
        supplied = request.META.get(f"HTTP_{header.upper().replace('-', '_')}")
        if not secret or not supplied:
            return False
        expected = hmac.new(secret.encode(), request.body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, supplied)

    def test_connection(self) -> Dict[str, Any]:
        start = time.time()
        try:
            self._get_token()
            latency = int((time.time() - start) * 1000)
            return {"success": True, "latency_ms": latency, "message": f"Absa authentication succeeded in {latency}ms."}
        except Exception as exc:
            return {"success": False, "latency_ms": int((time.time() - start) * 1000), "message": str(exc)}
