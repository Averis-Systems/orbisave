"""
JengaHQ / Equity Bank provider adapter.

The adapter follows the public Jenga Developer Hub contracts. It is deliberately
thin: Jenga is treated as the external rail and reconciliation evidence source,
while OrbiSave's ledger remains the product accounting source of truth.
"""
import base64
import hashlib
import hmac
import json
import logging
import time
from decimal import Decimal
from typing import Any, Dict, Optional

import requests
from django.utils import timezone

from apps.payments.base import PaymentProvider

# Normalized callback status → ProviderTransaction state. Shared with the
# stuck-transaction poller (apps.payments.tasks) so both paths advance the
# state machine identically.
CALLBACK_STATUS_TO_TX = {
    'success': 'settled',
    'failed': 'failed',
    'cancelled': 'cancelled',
    'rejected': 'rejected',
    'settlement_exception': 'settlement_exception',
    'pending': 'provider_processing',
    'manual_review': 'manual_review',
}
TERMINAL_TX_STATUSES = {'settled', 'failed', 'cancelled', 'rejected', 'reversed'}

logger = logging.getLogger(__name__)

UAT_BASE_URL = "https://uat.finserve.africa"
LIVE_BASE_URL = "https://api.finserve.africa"


class JengaProvider(PaymentProvider):
    def __init__(self, provider_record):
        self.record = provider_record
        self.api_key = provider_record.api_key
        self.api_secret = provider_record.api_secret
        self.merchant_code = provider_record.merchant_code
        self.extra = provider_record.extra_config or {}
        self.base_url = (provider_record.base_url or self._default_base_url()).rstrip("/")

    def _default_base_url(self):
        return LIVE_BASE_URL if self.record.environment == "live" else UAT_BASE_URL

    def account(self, purpose: str):
        """
        Resolve the account configured for a provider purpose.

        Supported purposes: collection, payout, reconciliation, trust,
        settlement, wallet, fee. Legacy extra_config fallback keeps older local
        records usable until migrated through the admin console.
        """
        qs = self.record.accounts.filter(is_active=True)
        if purpose == "collection":
            account = qs.filter(is_default_for_collections=True).first() or qs.filter(account_type="collection").first()
        elif purpose == "payout":
            account = qs.filter(is_default_for_disbursements=True).first() or qs.filter(account_type="payout").first()
        elif purpose == "reconciliation":
            account = qs.filter(is_default_for_reconciliation=True).first() or qs.filter(account_type="reconciliation").first()
            account = account or qs.filter(is_default_for_collections=True).first()
        else:
            account = qs.filter(account_type=purpose).first()

        if account:
            return account

        legacy_number = self.extra.get(f"{purpose}_account_number") or self.extra.get("trust_account_number")
        if legacy_number:
            return _LegacyAccount(
                account_number=legacy_number,
                account_name=self.extra.get("account_name", "OrbiSave"),
                country_code=self.extra.get("country_code", "KE"),
                currency=self.extra.get("currency", "KES"),
            )
        raise ValueError(f"No active Jenga {purpose} account configured for provider {self.record.id}.")

    def signature_payload(self, kind: str, **kwargs) -> str:
        formulas = {
            "account_balance": ["country_code", "account_number"],
            "mini_statement": ["country_code", "account_number"],
            "full_statement": ["account_number", "country_code", "to_date"],
            "opening_closing_balance": ["account_number", "country_code", "date"],
            "account_inquiry": ["country_code", "account_number"],
            "account_validate": ["country_code", "account_number", "account_full_name"],
            "transaction_details": ["reference"],
            "mpesa_account_stk": [
                "merchant_account",
                "reference",
                "mobile_number",
                "telco",
                "amount",
                "currency",
            ],
            "mpesa_wallet_stk": [
                "order_reference",
                "payment_currency",
                "msisdn",
                "payment_amount",
            ],
            "send_mobile_wallet": ["amount", "currency", "reference", "source_account"],
            "within_equity": ["source_account", "amount", "currency", "reference"],
            "pesalink": ["amount", "currency", "reference", "destination_name", "source_account"],
            "rtgs": ["reference", "date", "source_account", "destination_account", "amount"],
        }
        try:
            fields = formulas[kind]
        except KeyError as exc:
            raise ValueError(f"Unsupported Jenga signature payload kind '{kind}'.") from exc
        missing = [field for field in fields if kwargs.get(field) is None]
        if missing:
            raise ValueError(f"Missing Jenga signature field(s): {', '.join(missing)}")
        return "".join(str(kwargs[field]) for field in fields)

    def _get_token(self) -> str:
        url = f"{self.base_url}/authentication/api/v3/authenticate/merchant"
        resp = requests.post(
            url,
            headers={
                "Api-Key": self.api_key,
                "Content-Type": "application/json",
            },
            json={
                "merchantCode": self.merchant_code,
                "consumerSecret": self.api_secret,
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["accessToken"]

    def _sign_request(self, payload_string: str) -> str:
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        pem = (self.extra.get("rsa_private_key_pem") or "").encode()
        if not pem:
            raise ValueError("Missing Jenga RSA private key PEM in provider extra_config.")
        private_key = serialization.load_pem_private_key(
            pem,
            password=None,
            backend=default_backend(),
        )
        signature = private_key.sign(
            payload_string.encode(),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return base64.b64encode(signature).decode()

    def _headers(self, token: str, signature: str = "") -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Api-Key": self.api_key,
            "Signature": signature,
            "Content-Type": "application/json",
        }

    def _amount(self, amount: Decimal) -> str:
        return f"{Decimal(str(amount)).quantize(Decimal('0.01')):.2f}"

    def initiate_collection(
        self,
        phone: str,
        amount: Decimal,
        reference: str,
        description: str,
    ) -> Dict[str, Any]:
        """
        Initiate account-based M-Pesa/Equitel STK or USSD push.

        Jenga acknowledges the request first; final contribution credit must wait
        for callback/IPN or transaction query finality.
        """
        account = self.account("collection")
        currency = account.currency or self.extra.get("currency", "KES")
        country_code = account.country_code or self.extra.get("country_code", "KE")
        telco = self.extra.get("default_telco", "Safaricom")
        amount_text = self._amount(amount)
        token = self._get_token()
        payload = {
            "merchant": {
                "countryCode": country_code,
                "accountNumber": account.account_number,
                "name": account.account_name or self.record.name,
            },
            "payment": {
                "ref": reference,
                "mobileNumber": phone,
                "telco": telco,
                "amount": amount_text,
                "currency": currency,
                "date": self.extra.get("request_date", ""),
                "callBackUrl": self.record.webhook_url,
                "pushType": self.extra.get("push_type", "STK"),
                "description": description[:100],
            },
        }
        signature_payload = self.signature_payload(
            "mpesa_account_stk",
            merchant_account=account.account_number,
            reference=reference,
            mobile_number=phone,
            telco=telco,
            amount=amount_text,
            currency=currency,
        )
        signature = self._sign_request(signature_payload)
        url = f"{self.base_url}/v3-apis/payment-api/v3.0/stkussdpush/initiate"
        resp = requests.post(url, headers=self._headers(token, signature), json=payload, timeout=30)
        data = self._record_response("POST", url, payload, resp)
        status_norm = self._normalize_submission_status(data)
        self._record_provider_transaction(
            direction="inbound",
            channel="mpesa_account_stk",
            amount=amount_text,
            currency=currency,
            internal_reference=reference,
            provider_reference=data.get("reference") or reference,
            provider_transaction_id=data.get("transactionId", ""),
            source_account=phone,
            destination_account=account.account_number,
            status=status_norm,
            request_payload=payload,
            response_payload=data,
        )
        return {
            "status": "pending_async" if status_norm == "provider_processing" else status_norm,
            "provider_reference": data.get("transactionId") or data.get("reference") or reference,
            "raw": data,
        }

    def initiate_disbursement(
        self,
        phone: str,
        amount: Decimal,
        reference: str,
        remarks: str,
    ) -> Dict[str, Any]:
        account = self.account("payout")
        currency = account.currency or self.extra.get("currency", "KES")
        country_code = account.country_code or self.extra.get("country_code", "KE")
        wallet_name = self.extra.get("default_wallet_name", "Mpesa")
        amount_text = self._amount(amount)
        token = self._get_token()
        payload = {
            "source": {
                "countryCode": country_code,
                "name": account.account_name or self.record.name,
                "accountNumber": account.account_number,
            },
            "destination": {
                "type": "mobile",
                "countryCode": country_code,
                "name": remarks[:80],
                "mobileNumber": phone,
                "walletName": wallet_name,
            },
            "transfer": {
                "type": "MobileWallet",
                "amount": amount_text,
                "currencyCode": currency,
                "reference": reference,
                "date": self.extra.get("request_date", ""),
                "description": remarks[:100],
                "callbackUrl": self.record.webhook_url,
            },
        }
        signature_payload = self.signature_payload(
            "send_mobile_wallet",
            amount=amount_text,
            currency=currency,
            reference=reference,
            source_account=account.account_number,
        )
        signature = self._sign_request(signature_payload)
        url = f"{self.base_url}/v3-apis/transaction-api/v3.0/remittance/sendmobile"
        resp = requests.post(url, headers=self._headers(token, signature), json=payload, timeout=30)
        data = self._record_response("POST", url, payload, resp)
        status_norm = self._normalize_submission_status(data)
        self._record_provider_transaction(
            direction="outbound",
            channel="mobile_wallet",
            amount=amount_text,
            currency=currency,
            internal_reference=reference,
            provider_reference=data.get("reference") or reference,
            provider_transaction_id=data.get("transactionId", ""),
            source_account=account.account_number,
            destination_account=phone,
            status=status_norm,
            request_payload=payload,
            response_payload=data,
        )
        return {
            "status": status_norm,
            "provider_reference": data.get("transactionId") or data.get("reference") or reference,
            "raw": data,
        }

    def get_account_balance(self, account_number: Optional[str] = None) -> Dict[str, Any]:
        account = self.account("reconciliation")
        acc = account_number or account.account_number
        country_code = account.country_code
        token = self._get_token()
        signature = self._sign_request(
            self.signature_payload("account_balance", country_code=country_code, account_number=acc)
        )
        url = f"{self.base_url}/v3-apis/account-api/v3.0/accounts/balances/{country_code}/{acc}"
        resp = requests.get(url, headers=self._headers(token, signature), timeout=15)
        return self._record_response("GET", url, {}, resp)

    def get_opening_closing_balance(self, *, account_number: Optional[str] = None, business_date: str) -> Dict[str, Any]:
        account = self.account("reconciliation")
        acc = account_number or account.account_number
        country_code = account.country_code
        token = self._get_token()
        signature = self._sign_request(
            self.signature_payload(
                "opening_closing_balance",
                account_number=acc,
                country_code=country_code,
                date=business_date,
            )
        )
        url = f"{self.base_url}/v3-apis/account-api/v3.0/accounts/accountBalance/query"
        payload = {"accountId": acc, "countryCode": country_code, "date": business_date}
        resp = requests.post(url, headers=self._headers(token, signature), json=payload, timeout=20)
        return self._record_response("POST", url, payload, resp)

    def get_full_statement(
        self,
        *,
        account_number: Optional[str] = None,
        from_date: str,
        to_date: str,
        limit: int = 100,
    ) -> Dict[str, Any]:
        account = self.account("reconciliation")
        acc = account_number or account.account_number
        country_code = account.country_code
        token = self._get_token()
        signature = self._sign_request(
            self.signature_payload(
                "full_statement",
                account_number=acc,
                country_code=country_code,
                to_date=to_date,
            )
        )
        url = f"{self.base_url}/v3-apis/account-api/v3.0/accounts/fullStatement"
        payload = {
            "countryCode": country_code,
            "accountNumber": acc,
            "fromDate": from_date,
            "toDate": to_date,
            "limit": limit,
        }
        resp = requests.post(url, headers=self._headers(token, signature), json=payload, timeout=30)
        return self._record_response("POST", url, payload, resp)

    def query_transaction_details(self, reference: str) -> Dict[str, Any]:
        token = self._get_token()
        signature = self._sign_request(self.signature_payload("transaction_details", reference=reference))
        url = f"{self.base_url}/v3-apis/transaction-api/v3.0/transactions/details/{reference}"
        resp = requests.get(url, headers=self._headers(token, signature), timeout=15)
        return self._record_response("GET", url, {}, resp)

    def parse_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        status_value = str(
            payload.get("transactionStatus")
            or payload.get("status")
            or payload.get("code")
            or payload.get("stateCode")
            or ""
        ).strip()
        normalized = self._normalize_final_status(status_value)
        transaction_id = (
            payload.get("transactionReference")
            or payload.get("transactionId")
            or payload.get("reference")
            or payload.get("paymentReference")
            or ""
        )
        amount = (
            payload.get("amount")
            or payload.get("transactionAmount")
            or payload.get("orderAmount")
            or payload.get("paymentAmount")
            or "0.00"
        )
        return {
            "status": normalized,
            "transaction_id": transaction_id,
            "amount": str(amount),
            "reason": payload.get("description") or payload.get("message") or payload.get("remarks") or "",
            "raw": payload,
        }

    def verify_webhook_signature(self, request) -> bool:
        """
        Support current HMAC integrations and Jenga IPN Basic Auth.
        """
        header_sig = request.headers.get("X-Jenga-Signature", "")
        if header_sig.startswith("sha256=") and self.record.webhook_secret:
            expected = hmac.new(
                self.record.webhook_secret.encode(),
                request.body,
                hashlib.sha256,
            ).hexdigest()
            return hmac.compare_digest(f"sha256={expected}", header_sig)

        auth = request.headers.get("Authorization", "")
        username = self.extra.get("ipn_username")
        password = self.record.webhook_secret or self.extra.get("ipn_password")
        if auth.startswith("Basic ") and username and password:
            try:
                decoded = base64.b64decode(auth.split(" ", 1)[1]).decode()
            except Exception:
                return False
            return hmac.compare_digest(decoded, f"{username}:{password}")

        return False

    def test_connection(self) -> Dict[str, Any]:
        start = time.time()
        try:
            self._get_token()
            latency = int((time.time() - start) * 1000)
            return {
                "success": True,
                "latency_ms": latency,
                "message": f"Authentication successful. Token obtained in {latency}ms.",
            }
        except Exception as exc:
            return {
                "success": False,
                "latency_ms": int((time.time() - start) * 1000),
                "message": str(exc),
            }

    def record_callback(self, payload: Dict[str, Any], parsed: Dict[str, Any]):
        from apps.payments.models import ProviderCallback, ProviderTransaction

        checksum = self._checksum(payload)
        tx = None
        reference = (
            payload.get("reference")
            or payload.get("paymentReference")
            or parsed.get("transaction_id")
            or ""
        )
        if reference:
            tx = ProviderTransaction.objects.filter(
                provider=self.record,
                internal_reference=reference,
            ).first()
            if tx is None:
                tx = ProviderTransaction.objects.filter(
                    provider=self.record,
                    provider_transaction_id=parsed.get("transaction_id", ""),
                ).first()

        callback, created = ProviderCallback.objects.get_or_create(
            provider=self.record,
            payload_checksum=checksum,
            defaults={
                "provider_transaction": tx,
                "callback_type": payload.get("callbackType", ""),
                "provider_reference": reference,
                "payload": payload,
                "normalized_status": parsed.get("status", ""),
                "is_duplicate": False,
            },
        )
        if not created and not callback.is_duplicate:
            callback.is_duplicate = True
            callback.save(update_fields=["is_duplicate", "updated_at"])

        # Advance the provider-side transaction state machine from the fresh
        # callback — this is what makes the lifecycle end-to-end instead of
        # freezing transactions at 'submitted' forever.
        if created and tx is not None:
            new_status = CALLBACK_STATUS_TO_TX.get(parsed.get("status", ""))
            if new_status and tx.status != new_status:
                tx.status = new_status
                update_fields = ["status", "updated_at"]
                if new_status in TERMINAL_TX_STATUSES and tx.final_at is None:
                    tx.final_at = timezone.now()
                    update_fields.append("final_at")
                tx.save(update_fields=update_fields)
        return callback

    def _normalize_submission_status(self, data: Dict[str, Any]) -> str:
        code = str(data.get("code", "")).strip()
        if code in {"-1", "0"}:
            return "provider_processing"
        if data.get("status") is True and data.get("data", {}).get("status") == "SUCCESS":
            return "success"
        if str(data.get("status", "")).lower() in {"failed", "false"}:
            return "failed"
        return "pending_async"

    def _normalize_final_status(self, value: str) -> str:
        normalized = value.lower()
        success_values = {"success", "successful", "completed", "paid", "3", "2"}
        failed_values = {"failed", "failure", "1"}
        cancelled_values = {"cancelled", "canceled", "5", "6"}
        rejected_values = {"rejected", "7"}
        pending_values = {"pending", "processing", "0", "-1"}
        settlement_exception_values = {"4"}

        if normalized in success_values:
            return "success"
        if normalized in failed_values:
            return "failed"
        if normalized in cancelled_values:
            return "cancelled"
        if normalized in rejected_values:
            return "rejected"
        if normalized in settlement_exception_values:
            return "settlement_exception"
        if normalized in pending_values:
            return "pending"
        return "manual_review"

    def _record_provider_transaction(
        self,
        *,
        direction,
        channel,
        amount,
        currency,
        internal_reference,
        provider_reference,
        provider_transaction_id,
        source_account,
        destination_account,
        status,
        request_payload,
        response_payload,
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
                "provider_reference": provider_reference or "",
                "provider_transaction_id": provider_transaction_id or "",
                "source_account": source_account or "",
                "destination_account": destination_account or "",
                "status": status,
                "raw_request_checksum": self._checksum(request_payload),
                "raw_response_checksum": self._checksum(response_payload),
                "submitted_at": timezone.now(),
                "metadata": {
                    "environment": self.record.environment,
                    "provider_code": self.record.provider_code,
                },
            },
        )

    def _checksum(self, payload: Dict[str, Any]) -> str:
        return hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()
        ).hexdigest()

    def _record_response(self, method: str, url: str, payload: dict, resp):
        try:
            resp.raise_for_status()
            data = resp.json()
            self._log_api_call(method, url, payload, resp.status_code, data, True)
            return data
        except requests.HTTPError as exc:
            response_body = {}
            try:
                response_body = resp.json()
            except Exception:
                pass
            self._log_api_call(method, url, payload, resp.status_code, response_body, False, str(exc))
            raise

    def _log_api_call(
        self,
        method: str,
        url: str,
        request_body: dict,
        response_code: int,
        response_body: dict,
        success: bool,
        error_message: str = "",
    ):
        try:
            from apps.payments.models import ProviderApiLog

            safe_body = json.loads(json.dumps(request_body))
            for key in ("consumerSecret", "apiSecret", "api_secret", "rsa_private_key_pem"):
                safe_body.pop(key, None)
            ProviderApiLog.objects.create(
                provider=self.record,
                direction="outbound",
                endpoint=url,
                method=method,
                request_body=safe_body,
                response_code=response_code,
                response_body=response_body,
                success=success,
                error_message=error_message,
            )
        except Exception as exc:
            logger.warning("Failed to write ProviderApiLog: %s", exc)


class _LegacyAccount:
    def __init__(self, *, account_number, account_name, country_code, currency):
        self.account_number = account_number
        self.account_name = account_name
        self.country_code = country_code
        self.currency = currency
