from decimal import Decimal

import pytest

from apps.payments.models import BankProvider


@pytest.fixture
def jenga_provider_record(db):
    provider = BankProvider.objects.create(
        name="Equity Bank Kenya - Jenga UAT",
        provider_code="jenga_ke",
        country="kenya",
        environment="sandbox",
        status="active",
        api_key="uat-api-key",
        api_secret="uat-consumer-secret",
        merchant_code="123456",
        webhook_url="https://api.orbisave.test/api/v1/payments/webhooks/jenga/",
        webhook_secret="ipn-password",
        extra_config={
            "rsa_private_key_pem": "test-key",
            "ipn_username": "orbisave-ipn",
        },
    )
    provider.accounts.create(
        label="Primary Collection",
        account_type="collection",
        account_number="1100194977404",
        account_name="OrbiSave Collections",
        country_code="KE",
        currency="KES",
        is_default_for_collections=True,
        is_default_for_reconciliation=True,
    )
    provider.accounts.create(
        label="Primary Payout",
        account_type="payout",
        account_number="0020100014605",
        account_name="OrbiSave Payouts",
        country_code="KE",
        currency="KES",
        is_default_for_disbursements=True,
    )
    return provider


@pytest.mark.django_db
def test_jenga_provider_uses_documented_uat_base_url_when_blank(jenga_provider_record):
    from apps.payments.providers.jenga import JengaProvider

    jenga_provider_record.base_url = ""
    provider = JengaProvider(jenga_provider_record)

    assert provider.base_url == "https://uat.finserve.africa"


@pytest.mark.django_db
def test_jenga_provider_resolves_typed_accounts(jenga_provider_record):
    from apps.payments.providers.jenga import JengaProvider

    provider = JengaProvider(jenga_provider_record)

    assert provider.account("collection").account_number == "1100194977404"
    assert provider.account("payout").account_number == "0020100014605"
    assert provider.account("reconciliation").account_number == "1100194977404"


@pytest.mark.django_db
def test_jenga_signature_payloads_follow_public_docs(jenga_provider_record):
    from apps.payments.providers.jenga import JengaProvider

    provider = JengaProvider(jenga_provider_record)

    assert provider.signature_payload("account_balance", country_code="KE", account_number="12345") == "KE12345"
    assert provider.signature_payload(
        "full_statement",
        account_number="12345",
        country_code="KE",
        to_date="2026-06-20",
    ) == "12345KE2026-06-20"
    assert provider.signature_payload(
        "mpesa_account_stk",
        merchant_account="1100194977404",
        reference="ORB123",
        mobile_number="254700000001",
        telco="Safaricom",
        amount="5000.00",
        currency="KES",
    ) == "1100194977404ORB123254700000001Safaricom5000.00KES"
    assert provider.signature_payload(
        "send_mobile_wallet",
        amount="4950.00",
        currency="KES",
        reference="PAY123",
        source_account="0020100014605",
    ) == "4950.00KESPAY1230020100014605"


@pytest.mark.django_db
def test_jenga_collection_payload_uses_account_based_stk_contract(jenga_provider_record, monkeypatch):
    from apps.payments.providers.jenga import JengaProvider

    provider = JengaProvider(jenga_provider_record)
    monkeypatch.setattr(provider, "_get_token", lambda: "token")
    monkeypatch.setattr(provider, "_sign_request", lambda payload: f"sig:{payload}")

    captured = {}

    class Response:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"status": True, "code": "-1", "reference": "ORB123", "transactionId": "JENGA-1"}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return Response()

    monkeypatch.setattr("apps.payments.providers.jenga.requests.post", fake_post)

    result = provider.initiate_collection(
        phone="254700000001",
        amount=Decimal("5000.00"),
        reference="ORB123",
        description="Contribution to Kijani",
    )

    assert captured["url"] == "https://uat.finserve.africa/v3-apis/payment-api/v3.0/stkussdpush/initiate"
    assert captured["json"]["merchant"]["accountNumber"] == "1100194977404"
    assert captured["json"]["payment"]["ref"] == "ORB123"
    assert captured["json"]["payment"]["amount"] == "5000.00"
    assert captured["headers"]["Signature"] == "sig:1100194977404ORB123254700000001Safaricom5000.00KES"
    assert result["status"] == "pending_async"
    assert result["provider_reference"] == "JENGA-1"


@pytest.mark.django_db
def test_jenga_disbursement_acknowledgement_remains_provider_processing(jenga_provider_record, monkeypatch):
    from apps.payments.providers.jenga import JengaProvider

    provider = JengaProvider(jenga_provider_record)
    monkeypatch.setattr(provider, "_get_token", lambda: "token")
    monkeypatch.setattr(provider, "_sign_request", lambda payload: f"sig:{payload}")

    captured = {}

    class Response:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"status": True, "code": "-1", "reference": "PAY123", "transactionId": "JENGA-PAY-1"}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return Response()

    monkeypatch.setattr("apps.payments.providers.jenga.requests.post", fake_post)

    result = provider.initiate_disbursement(
        phone="254700000001",
        amount=Decimal("4950.00"),
        reference="PAY123",
        remarks="Rotation payout",
    )

    assert captured["url"] == "https://uat.finserve.africa/v3-apis/transaction-api/v3.0/remittance/sendmobile"
    assert captured["json"]["source"]["accountNumber"] == "0020100014605"
    assert captured["json"]["transfer"]["amount"] == "4950.00"
    assert captured["headers"]["Signature"] == "sig:4950.00KESPAY1230020100014605"
    assert result["status"] == "provider_processing"
    assert result["provider_reference"] == "JENGA-PAY-1"


@pytest.mark.django_db
def test_jenga_provider_records_provider_transaction_on_submission(jenga_provider_record, monkeypatch):
    from apps.payments.models import ProviderTransaction
    from apps.payments.providers.jenga import JengaProvider

    provider = JengaProvider(jenga_provider_record)
    monkeypatch.setattr(provider, "_get_token", lambda: "token")
    monkeypatch.setattr(provider, "_sign_request", lambda payload: "sig")

    class Response:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"status": True, "code": "-1", "reference": "ORB124", "transactionId": "JENGA-124"}

    monkeypatch.setattr("apps.payments.providers.jenga.requests.post", lambda *args, **kwargs: Response())

    provider.initiate_collection(
        phone="254700000001",
        amount=Decimal("5000.00"),
        reference="ORB124",
        description="Contribution to Kijani",
    )

    tx = ProviderTransaction.objects.get(internal_reference="ORB124")
    assert tx.provider == jenga_provider_record
    assert tx.direction == "inbound"
    assert tx.channel == "mpesa_account_stk"
    assert tx.provider_transaction_id == "JENGA-124"
    assert tx.status == "provider_processing"


@pytest.mark.django_db
def test_jenga_provider_records_callbacks_idempotently(jenga_provider_record):
    from apps.payments.models import ProviderCallback
    from apps.payments.providers.jenga import JengaProvider

    provider = JengaProvider(jenga_provider_record)
    payload = {"reference": "ORB124", "transactionId": "JENGA-124", "status": "SUCCESS"}
    parsed = provider.parse_callback(payload)

    first = provider.record_callback(payload, parsed)
    second = provider.record_callback(payload, parsed)

    assert first.id == second.id
    assert ProviderCallback.objects.count() == 1
    assert second.is_duplicate is True
