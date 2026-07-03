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

    mapping = {
        'jenga_ke': JengaProvider,
        'jenga_rw': JengaProvider,
        # 'ecobank_gh': EcobankProvider,  # coming soon
    }

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
