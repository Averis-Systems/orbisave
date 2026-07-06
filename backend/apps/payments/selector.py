"""
Dynamic Payment Provider Selector
===================================
Loads the active BankProvider configuration from the database at runtime.
No hardcoded credentials or provider mappings — everything is managed via
the Super Admin Console's Provider Hub.

Resolution order:
  1. Look for an active BankProvider for (country, exact provider_code).
  2. Fall back to any active provider for the country that supports the method.
  3. Raise a descriptive error if none configured.
"""
import logging
from django.db.utils import NotSupportedError
from .base import PaymentProvider

logger = logging.getLogger(__name__)

# Country → default mobile-money method. Single source of truth for services
# that need a rail without the caller specifying one (payouts, loan
# disbursements). Kenya launches first; Rwanda/Ghana follow the same pattern
# once their bank APIs are onboarded via the Console Provider Hub.
COUNTRY_DEFAULT_METHOD = {
    'kenya':  'mpesa',
    'rwanda': 'mtn_momo',
    'ghana':  'mtn_momo',
}


def get_payment_provider(country: str, method: str = None) -> PaymentProvider:
    """
    Returns an instantiated PaymentProvider for the given country/method.

    Args:
        country: 'kenya' | 'rwanda' | 'ghana'
        method:  'mpesa' | 'airtel' | 'mtn_momo' | 'bank' | None (uses country default)
    """
    try:
        from apps.payments.models import BankProvider

        # Find the best active provider for this country
        qs = BankProvider.objects.filter(country=country, status='active')

        if method:
            # Prefer a provider that explicitly supports this mobile method
            try:
                provider_record = qs.filter(supported_mobile_methods__contains=method).first()
            except NotSupportedError:
                provider_record = next(
                    (
                        provider
                        for provider in qs
                        if method in (provider.supported_mobile_methods or [])
                    ),
                    None,
                )
            provider_record = provider_record or qs.first()
        else:
            provider_record = qs.first()

        if not provider_record:
            raise ValueError(
                f"No active payment provider configured for country='{country}'. "
                f"Configure one in the Console → Provider Hub."
            )

        return _instantiate_provider(provider_record)

    except Exception as exc:
        logger.error("Payment provider resolution failed: %s", exc, exc_info=True)
        raise


def get_provider_by_id(provider_id: str) -> PaymentProvider:
    """Load a specific provider by its DB UUID — used for test connection calls."""
    from apps.payments.models import BankProvider
    record = BankProvider.objects.get(id=provider_id)
    return _instantiate_provider(record)


def _instantiate_provider(record) -> PaymentProvider:
    """Map a BankProvider record to its implementation class."""
    from apps.payments.providers.jenga import JengaProvider
    from apps.payments.providers.mock import MockProvider
    from apps.payments.providers.momo import MTNMoMoProvider

    mapping = {
        'jenga_ke': JengaProvider,
        'jenga_rw': JengaProvider,
        'mtn_momo': MTNMoMoProvider,   # Rwanda + Ghana mobile-money rail
        'mock': MockProvider,
        # 'bk_rw': BankOfKigaliProvider,   # trust-account rail — see docs/rwanda_ghana_rails_onboarding.md
        # 'ecobank_gh': EcobankProvider,   # trust-account rail — see docs/rwanda_ghana_rails_onboarding.md
    }

    # The instant-success mock can never run against real money: it is only
    # resolvable for provider rows explicitly configured as sandbox.
    if record.provider_code == 'mock' and record.environment != 'sandbox':
        raise ValueError(
            "The 'mock' provider is restricted to environment='sandbox' configurations."
        )

    cls = mapping.get(record.provider_code)
    if cls is None:
        raise ValueError(
            f"Provider code '{record.provider_code}' has no implementation class. "
            f"Add it to apps/payments/selector.py and create the provider module."
        )

    logger.info(
        "Resolved provider: %s | country=%s | env=%s",
        record.name, record.country, record.environment
    )
    return cls(record)
