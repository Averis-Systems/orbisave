"""
Absa provider adapter tests.

Absa's transactional spec is partnership-gated, so the adapter is config-driven
and fail-closed in live. These verify the scaffolding that IS ours: fail-closed
safety, OAuth token acquisition, account resolution, webhook HMAC verification,
callback parsing, and selector registration — without hitting a real endpoint.
"""
import hashlib
import hmac
import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from apps.payments.models import BankProvider, PaymentProviderAccount
from apps.payments.providers.absa import AbsaProvider, AbsaConfigError

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


def _provider(environment="sandbox", extra=None, with_accounts=True, region=""):
    rec = BankProvider.objects.using("default").create(
        name="Absa Kenya", provider_code="absa_ke", country="kenya",
        environment=environment, status="active", region=region,
        api_key="ck", api_secret="cs",
        extra_config=extra or {},
    )
    if with_accounts:
        PaymentProviderAccount.objects.using("default").create(
            provider=rec, label="Collection", account_type="collection",
            account_number="COLL-1", currency="KES", is_active=True,
            is_default_for_collections=True,
        )
        PaymentProviderAccount.objects.using("default").create(
            provider=rec, label="Payout", account_type="payout",
            account_number="PAY-1", currency="KES", is_active=True,
            is_default_for_disbursements=True,
        )
    return rec


def _fake_post(json_body):
    resp = SimpleNamespace(json=lambda: json_body, raise_for_status=lambda: None)
    return resp


class TestAbsaSafety:
    def test_live_fails_closed_without_config(self):
        # A live provider with no endpoint/secret config must refuse to instantiate.
        with pytest.raises(AbsaConfigError):
            AbsaProvider(_provider(environment="live", extra={}))

    def test_live_ok_when_configured(self):
        rec = _provider(environment="live", extra={
            "token_path": "/oauth/token", "collection_path": "/c",
            "disbursement_path": "/d", "webhook_secret": "s",
        })
        # Should not raise.
        assert AbsaProvider(rec).is_live is True

    def test_sandbox_does_not_require_full_config(self):
        assert AbsaProvider(_provider(environment="sandbox", extra={})) is not None


class TestAbsaAuth:
    def test_get_token_and_test_connection(self):
        p = AbsaProvider(_provider(extra={"token_path": "/oauth/token"}))
        with patch("apps.payments.providers.absa.requests.post", return_value=_fake_post({"access_token": "tok", "expires_in": 3600})) as m:
            result = p.test_connection()
        assert result["success"] is True
        assert m.call_count == 1
        # Cached: a second token fetch does not re-hit the endpoint.
        with patch("apps.payments.providers.absa.requests.post") as m2:
            assert p._get_token() == "tok"
            assert m2.call_count == 0

    def test_token_requires_path(self):
        p = AbsaProvider(_provider(extra={}))  # no token_path
        with pytest.raises(AbsaConfigError):
            p._get_token()


class TestAbsaAccountsAndCalls:
    def test_account_resolution(self):
        p = AbsaProvider(_provider())
        assert p.account("collection").account_number == "COLL-1"
        assert p.account("payout").account_number == "PAY-1"

    def test_disbursement_posts_and_returns_reference(self):
        p = AbsaProvider(_provider(extra={"token_path": "/t", "disbursement_path": "/disburse"}))
        with patch("apps.payments.providers.absa.requests.post") as m:
            # First call = token, second = disbursement.
            m.side_effect = [
                _fake_post({"access_token": "tok", "expires_in": 3600}),
                _fake_post({"transactionReference": "ABSA-REF-9"}),
            ]
            from decimal import Decimal
            res = p.initiate_disbursement("+254700000001", Decimal("500"), "PAY-1", "payout")
        assert res["status"] == "success"
        assert res["provider_reference"] == "ABSA-REF-9"

    def test_disbursement_without_path_fails_gracefully(self):
        p = AbsaProvider(_provider(extra={"token_path": "/t"}))  # no disbursement_path
        with patch("apps.payments.providers.absa.requests.post", return_value=_fake_post({"access_token": "tok", "expires_in": 3600})):
            from decimal import Decimal
            res = p.initiate_disbursement("+254700000001", Decimal("500"), "PAY-1", "payout")
        assert res["status"] == "failed"  # config error surfaced, no money moved


class TestAbsaWebhookAndCallback:
    def test_webhook_signature_verifies(self):
        p = AbsaProvider(_provider(extra={"webhook_secret": "shh"}))
        body = b'{"status":"success"}'
        sig = hmac.new(b"shh", body, hashlib.sha256).hexdigest()
        req = SimpleNamespace(body=body, META={"HTTP_X_ABSA_SIGNATURE": sig})
        assert p.verify_webhook_signature(req) is True

    def test_webhook_rejects_forged_and_missing(self):
        p = AbsaProvider(_provider(extra={"webhook_secret": "shh"}))
        body = b'{"status":"success"}'
        forged = SimpleNamespace(body=body, META={"HTTP_X_ABSA_SIGNATURE": "deadbeef"})
        assert p.verify_webhook_signature(forged) is False
        missing = SimpleNamespace(body=body, META={})
        assert p.verify_webhook_signature(missing) is False
        # No configured secret -> fail closed.
        p2 = AbsaProvider(_provider(extra={}, region="west"))
        assert p2.verify_webhook_signature(SimpleNamespace(body=body, META={"HTTP_X_ABSA_SIGNATURE": "x"})) is False

    def test_parse_callback_normalizes(self):
        p = AbsaProvider(_provider(extra={}))
        parsed = p.parse_callback({"status": "SUCCESSFUL", "transactionReference": "R1", "amount": "500"})
        assert parsed["status"] == "success"
        assert parsed["transaction_id"] == "R1"
        assert parsed["amount"] == "500"


class TestAbsaSelector:
    def test_selector_resolves_absa(self):
        from apps.payments.selector import _instantiate_provider
        rec = _provider(extra={})
        provider = _instantiate_provider(rec)
        assert isinstance(provider, AbsaProvider)
