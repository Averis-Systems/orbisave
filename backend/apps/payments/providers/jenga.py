"""
Jenga HQ (Equity Bank) Payment Provider
==========================================
Covers Kenya + Rwanda via a single API integration.
Equity Bank natively connects to M-Pesa (Kenya) and MoMo (Rwanda),
so one Jenga integration handles both mobile money and bank transfers
— no separate M-Pesa Daraja integration needed.

API Docs: https://developer.jengahq.io/
Sandbox:  https://uat.jengahq.io
Live:     https://api.jengahq.io

Auth: API Key in header + RSA SHA256 request signing.
"""
import hashlib
import hmac
import json
import logging
import time
import base64
from decimal import Decimal
from typing import Any, Dict, Optional

import requests

from apps.payments.base import PaymentProvider

logger = logging.getLogger(__name__)


class JengaProvider(PaymentProvider):
    """
    Jenga HQ payment provider (Equity Bank Kenya & Rwanda).

    Instantiated dynamically from the DB-stored BankProvider record —
    credentials are loaded at runtime, never hardcoded.

    Key Jenga flows used by OrbiSave:
    ──────────────────────────────────
    Collections  → Send Money (receive from member) via mobile money prompt
    Disbursements → EFT Credit Transfer or Mobile Money Send
    Account Inquiry → check trust account balance
    Webhooks → Jenga fires callbacks to our /webhooks/jenga/ endpoint
    """

    def __init__(self, provider_record):
        """
        Args:
            provider_record: apps.payments.models.BankProvider instance
        """
        self.record = provider_record
        self.api_key = provider_record.api_key
        self.api_secret = provider_record.api_secret
        self.merchant_code = provider_record.merchant_code
        self.base_url = provider_record.base_url.rstrip('/')
        self.extra = provider_record.extra_config  # dict

    # ─────────────────────────────────────────────────────────────────────────
    # Auth helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _get_token(self) -> str:
        """Obtain a Bearer token from Jenga's auth endpoint."""
        url = f"{self.base_url}/authentication/api/genericauth/token/v2"
        resp = requests.post(
            url,
            headers={
                'Api-Key': self.api_key,
                'Content-Type': 'application/json',
            },
            json={'merchantCode': self.merchant_code, 'consumerSecret': self.api_secret},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()['accessToken']

    def _sign_request(self, payload_string: str) -> str:
        """
        Jenga requires RSA-SHA256 signature on the request body.
        The private key is stored in extra_config['rsa_private_key_pem'].
        """
        try:
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.backends import default_backend

            pem = self.extra.get('rsa_private_key_pem', '').encode()
            private_key = serialization.load_pem_private_key(
                pem, password=None, backend=default_backend()
            )
            signature = private_key.sign(
                payload_string.encode(),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            return base64.b64encode(signature).decode()
        except Exception as exc:
            logger.error("Jenga RSA signing failed: %s", exc)
            return ""

    def _headers(self, token: str, signature: str = "") -> Dict[str, str]:
        return {
            'Authorization': f'Bearer {token}',
            'Api-Key': self.api_key,
            'signature': signature,
            'Content-Type': 'application/json',
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Collections (receive from member)
    # ─────────────────────────────────────────────────────────────────────────

    def initiate_collection(
        self,
        phone: str,
        amount: Decimal,
        reference: str,
        description: str,
    ) -> Dict[str, Any]:
        """
        Triggers a mobile money collection (M-Pesa STK push in Kenya,
        MoMo request-to-pay in Rwanda) through Jenga.

        Returns:
            {
                "status": "pending_async",
                "provider_reference": "<jenga_ref>",
                "raw": { ... }
            }
        """
        token = self._get_token()
        payload = {
            "merchantCode": self.merchant_code,
            "currency": self.extra.get('currency', 'KES'),
            "amount": str(amount),
            "mobileNumber": phone,
            "narration": description[:100],
            "reference": reference,
            "callbackUrl": self.record.webhook_url,
        }
        payload_str = json.dumps(payload, separators=(',', ':'))
        signature = self._sign_request(payload_str)

        url = f"{self.base_url}/transaction/v2/mobilemoneycollection"
        try:
            resp = requests.post(
                url,
                headers=self._headers(token, signature),
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            provider_ref = (
                data.get('transactionReference')
                or data.get('providerTransactionId')
                or reference
            )
            self._log_api_call('POST', url, payload, resp.status_code, data, True)
            return {
                'status': 'pending_async',
                'provider_reference': provider_ref,
                'raw': data,
            }
        except requests.HTTPError as exc:
            self._log_api_call('POST', url, payload, exc.response.status_code,
                               {}, False, str(exc))
            raise

    # ─────────────────────────────────────────────────────────────────────────
    # Disbursements (pay out to member)
    # ─────────────────────────────────────────────────────────────────────────

    def initiate_disbursement(
        self,
        phone: str,
        amount: Decimal,
        reference: str,
        remarks: str,
    ) -> Dict[str, Any]:
        """
        Sends money to a member's mobile wallet or bank account via Jenga.
        """
        token = self._get_token()
        payload = {
            "source": {
                "countryCode": self.extra.get('country_code', 'KE'),
                "name": self.extra.get('account_name', 'OrbiSave Trust'),
                "accountNumber": self.extra.get('trust_account_number', ''),
            },
            "destination": {
                "type": "mobile",
                "countryCode": self.extra.get('country_code', 'KE'),
                "name": remarks,
                "mobileNumber": phone,
            },
            "amount": {
                "currencyCode": self.extra.get('currency', 'KES'),
                "amount": str(amount),
            },
            "description": remarks[:100],
            "reference": reference,
            "callbackUrl": self.record.webhook_url,
        }
        payload_str = json.dumps(payload, separators=(',', ':'))
        signature = self._sign_request(payload_str)

        url = f"{self.base_url}/transaction/v2/remittance"
        try:
            resp = requests.post(
                url,
                headers=self._headers(token, signature),
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            self._log_api_call('POST', url, payload, resp.status_code, data, True)
            return {
                'status': 'success',
                'provider_reference': data.get('transactionId', reference),
                'raw': data,
            }
        except requests.HTTPError as exc:
            self._log_api_call('POST', url, payload, exc.response.status_code,
                               {}, False, str(exc))
            raise

    # ─────────────────────────────────────────────────────────────────────────
    # Account / Trust Account
    # ─────────────────────────────────────────────────────────────────────────

    def get_account_balance(self, account_number: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetches the trust account balance from Equity Bank via Jenga.
        account_number defaults to extra_config['trust_account_number'].
        """
        token = self._get_token()
        acc = account_number or self.extra.get('trust_account_number', '')
        country_code = self.extra.get('country_code', 'KE')
        payload_str = f"{country_code}{acc}"
        signature = self._sign_request(payload_str)

        url = f"{self.base_url}/account/v2/accounts/balances/{country_code}/{acc}"
        resp = requests.get(
            url,
            headers=self._headers(token, signature),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    # ─────────────────────────────────────────────────────────────────────────
    # Webhook parsing + verification
    # ─────────────────────────────────────────────────────────────────────────

    def parse_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalises Jenga webhook payload into the standard OrbiSave format:
        { status, transaction_id, amount, reason }
        """
        status_raw = payload.get('transactionStatus', payload.get('status', '')).lower()
        success = status_raw in ('success', 'completed', '0')
        return {
            'status': 'success' if success else 'failed',
            'transaction_id': (
                payload.get('transactionReference')
                or payload.get('transactionId', '')
            ),
            'amount': str(payload.get('amount', payload.get('transactionAmount', '0'))),
            'reason': payload.get('description', payload.get('message', '')),
            'raw': payload,
        }

    def verify_webhook_signature(self, request) -> bool:
        """
        Verifies Jenga HMAC-SHA256 signature on incoming webhooks.
        Header: X-Jenga-Signature: sha256=<hex_digest>
        """
        secret = self.record.webhook_secret.encode()
        header_sig = request.headers.get('X-Jenga-Signature', '')
        if not header_sig.startswith('sha256='):
            return False
        expected = hmac.new(secret, request.body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", header_sig)

    # ─────────────────────────────────────────────────────────────────────────
    # Connection test (called from Provider Hub "Test Connection" button)
    # ─────────────────────────────────────────────────────────────────────────

    def test_connection(self) -> Dict[str, Any]:
        """
        Light connectivity check — obtains a token and returns latency.
        """
        start = time.time()
        try:
            token = self._get_token()
            latency = int((time.time() - start) * 1000)
            return {
                'success': True,
                'latency_ms': latency,
                'message': f"Authentication successful. Token obtained in {latency}ms.",
            }
        except Exception as exc:
            return {
                'success': False,
                'latency_ms': int((time.time() - start) * 1000),
                'message': str(exc),
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Internal logging
    # ─────────────────────────────────────────────────────────────────────────

    def _log_api_call(
        self,
        method: str,
        url: str,
        request_body: dict,
        response_code: int,
        response_body: dict,
        success: bool,
        error_message: str = '',
    ):
        try:
            from apps.payments.models import ProviderApiLog
            # Strip credentials from logs
            safe_body = {k: v for k, v in request_body.items()
                         if k not in ('consumerSecret', 'apiSecret')}
            ProviderApiLog.objects.create(
                provider=self.record,
                direction='outbound',
                endpoint=url,
                method=method,
                request_body=safe_body,
                response_code=response_code,
                response_body=response_body,
                success=success,
                error_message=error_message,
            )
        except Exception as e:
            logger.warning("Failed to write ProviderApiLog: %s", e)
