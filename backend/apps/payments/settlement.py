"""
Platform revenue settlement (Model A).

One main custody account holds each group's rotation/savings/loaning pool; the
platform's cut is booked to the `company_revenue` ledger stream on every
disbursement. This module sweeps that accrued cut out to a SEPARATE company
(`fee`) bank account and tracks it so accrued-vs-swept revenue reconciles.

The physical bank transfer is effected through `_effect_transfer` once the live
provider exposes an internal-transfer API; until then a sweep is recorded as
`pending` for the treasury to action (or `blocked` if no company account is
configured). Sweeps never touch the per-group ledgers, the fee is already
accounted there.
"""
from decimal import Decimal

import structlog
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from common.db_utils import get_db_for_country, advisory_xact_lock

logger = structlog.get_logger(__name__)

# Sweep amounts already counted (so re-running never double-records the same cut).
_COUNTED_STATUSES = ('pending', 'completed')


def active_provider(country, db_alias):
    from apps.payments.models import BankProvider
    return (
        BankProvider.objects.using(db_alias)
        .filter(country=country, status='active')
        .order_by('-created_at')
        .first()
    )


def resolve_account(provider, account_type, currency=None):
    """The active provider account of a type (currency-preferred), or None."""
    if provider is None:
        return None
    qs = provider.accounts.filter(is_active=True, account_type=account_type)
    if currency:
        match = qs.filter(currency=currency).first()
        if match:
            return match
    return qs.first()


def custody_account(provider, currency=None):
    """The one main custody account (Model A). Falls back to the disbursement account."""
    if provider is None:
        return None
    return (
        resolve_account(provider, 'trust', currency)
        or provider.accounts.filter(is_active=True, is_default_for_disbursements=True).first()
    )


def company_account(provider, currency=None):
    """The separate company account that receives the platform's cut."""
    return resolve_account(provider, 'fee', currency)


def accrued_company_revenue(db_alias):
    """Total `company_revenue` credited on a country's shard, by currency."""
    from apps.ledger.models import LedgerEntry
    rows = (
        LedgerEntry.objects.using(db_alias)
        .filter(account_stream='company_revenue', direction='credit')
        .values('currency')
        .annotate(total=Sum('amount'))
    )
    return {r['currency']: r['total'] or Decimal('0') for r in rows}


def swept_or_pending_revenue(country, db_alias):
    from apps.payments.models import RevenueSweep
    rows = (
        RevenueSweep.objects.using(db_alias)
        .filter(country=country, status__in=_COUNTED_STATUSES)
        .values('currency')
        .annotate(total=Sum('amount'))
    )
    return {r['currency']: r['total'] or Decimal('0') for r in rows}


def unswept_revenue(country, db_alias):
    """Per-currency accrued cut not yet recorded as swept/pending (>0 only)."""
    accrued = accrued_company_revenue(db_alias)
    counted = swept_or_pending_revenue(country, db_alias)
    out = {}
    for currency, total in accrued.items():
        remaining = total - counted.get(currency, Decimal('0'))
        if remaining > Decimal('0'):
            out[currency] = remaining
    return out


def _effect_transfer(provider, sweep):
    """Hook for the real custody -> company bank transfer.

    Returns a provider reference on success, or None if the provider cannot yet
    transfer between the platform's own accounts (the current state until the
    Equity/Absa internal-transfer integration is live). Kept separate so wiring
    the live call later does not touch the accounting above.
    """
    return None


def sweep_country_revenue(country):
    """
    Record sweeps of the accrued-but-unswept platform cut to the company account
    for one country. Idempotent: serialized per country and counted against
    pending+completed sweeps, so re-running never double-records the same cut.
    Returns the RevenueSweep rows created.
    """
    from apps.payments.models import RevenueSweep

    db_alias = get_db_for_country(country)
    created = []
    with transaction.atomic(using=db_alias):
        with advisory_xact_lock(db_alias, 'revenue_sweep', country):
            provider = active_provider(country, db_alias)
            for currency, amount in unswept_revenue(country, db_alias).items():
                company = company_account(provider, currency)
                custody = custody_account(provider, currency)
                sweep = RevenueSweep.objects.using(db_alias).create(
                    country=country,
                    currency=currency,
                    amount=amount,
                    source_account_ref=custody.account_number if custody else '',
                    target_account_ref=company.account_number if company else '',
                    status='pending' if company else 'blocked',
                    note='' if company else 'No active company (fee) account configured for this country.',
                )
                if company:
                    ref = _effect_transfer(provider, sweep)
                    if ref:
                        sweep.provider_reference = ref
                        sweep.status = 'completed'
                        sweep.completed_at = timezone.now()
                        sweep.save(using=db_alias, update_fields=[
                            'provider_reference', 'status', 'completed_at', 'updated_at',
                        ])
                logger.info(
                    'revenue_sweep_recorded', country=country, currency=currency,
                    amount=str(amount), status=sweep.status,
                )
                created.append(sweep)
    return created
