import pytest

from apps.payments.models import BankProvider


@pytest.fixture
def jenga_bank_provider(db):
    provider = BankProvider.objects.create(
        name="Equity Bank Kenya - Jenga",
        provider_code="jenga_ke",
        country="kenya",
        environment="sandbox",
        status="inactive",
        api_key="sandbox-api-key",
        api_secret="sandbox-secret",
        merchant_code="123456",
        webhook_secret="webhook-password",
    )
    provider.accounts.create(
        label="Collections",
        account_type="collection",
        account_number="1100194977404",
        account_name="OrbiSave Collections",
        country_code="KE",
        currency="KES",
        is_default_for_collections=True,
        is_default_for_reconciliation=True,
    )
    return provider


@pytest.mark.django_db
def test_bank_provider_serializer_masks_secrets_and_returns_accounts(jenga_bank_provider):
    from apps.admin_portal.provider_views import BankProviderSerializer

    data = BankProviderSerializer(jenga_bank_provider).data

    # ALL credential material is write-only — reads only expose has_* flags
    # and extra_config key names. extra_config can hold the Jenga RSA private
    # key, so it must never round-trip out of the API.
    assert "api_key" not in data
    assert "api_secret" not in data
    assert "webhook_secret" not in data
    assert "extra_config" not in data
    assert data["has_api_key"] is True
    assert data["has_api_secret"] is True
    assert data["has_webhook_secret"] is True
    assert data["extra_config_keys"] == []
    assert data["accounts"][0]["account_number"] == "1100194977404"
    assert data["accounts"][0]["account_type"] == "collection"


@pytest.mark.django_db
def test_bank_provider_serializer_preserves_existing_secrets_on_blank_update(jenga_bank_provider):
    from apps.admin_portal.provider_views import BankProviderSerializer

    serializer = BankProviderSerializer(
        jenga_bank_provider,
        data={
            "name": "Equity Bank Kenya - Jenga Updated",
            "api_secret": "",
            "webhook_secret": "",
            "extra_config": {"country_code": "KE"},
        },
        partial=True,
    )
    serializer.is_valid(raise_exception=True)
    provider = serializer.save()

    assert provider.name == "Equity Bank Kenya - Jenga Updated"
    assert provider.api_secret == "sandbox-secret"
    assert provider.webhook_secret == "webhook-password"


@pytest.mark.django_db
def test_bank_provider_serializer_accepts_multiple_jenga_accounts():
    from apps.admin_portal.provider_views import BankProviderSerializer

    serializer = BankProviderSerializer(
        data={
            "name": "Equity Bank Kenya - Jenga",
            "provider_code": "jenga_ke",
            "country": "kenya",
            "environment": "sandbox",
            "status": "inactive",
            "api_key": "sandbox-api-key",
            "api_secret": "sandbox-secret",
            "merchant_code": "123456",
            "webhook_secret": "webhook-password",
            "accounts": [
                {
                    "label": "Collections",
                    "account_type": "collection",
                    "account_number": "1100194977404",
                    "account_name": "OrbiSave Collections",
                    "country_code": "KE",
                    "currency": "KES",
                    "is_default_for_collections": True,
                    "is_default_for_reconciliation": True,
                },
                {
                    "label": "Payouts",
                    "account_type": "payout",
                    "account_number": "0020100014605",
                    "account_name": "OrbiSave Payouts",
                    "country_code": "KE",
                    "currency": "KES",
                    "is_default_for_disbursements": True,
                },
            ],
        }
    )
    serializer.is_valid(raise_exception=True)
    provider = serializer.save()

    assert provider.accounts.count() == 2
    assert provider.accounts.get(account_type="collection").is_default_for_collections is True
    assert provider.accounts.get(account_type="payout").is_default_for_disbursements is True
