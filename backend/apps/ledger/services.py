from django.db import transaction

from apps.ledger.models import LedgerEntry, ReconciliationItem, ReconciliationRun
from common.db_utils import get_db_for_country, get_db_for_group


def append_ledger_entry(
    *,
    group,
    member=None,
    account_stream,
    entry_type,
    direction,
    amount,
    currency,
    description,
    reference,
    related_contribution=None,
    related_loan=None,
    related_payout=None,
    recorded_by=None,
    idempotency_key=None,
    source_system='orbisave',
):
    """
    Single append-only entry point for ledger writes.
    Returns the existing entry when an idempotency key has already been used.
    """
    db_alias = group._state.db or get_db_for_group(group)

    with transaction.atomic(using=db_alias):
        if idempotency_key:
            existing = LedgerEntry.objects.using(db_alias).filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing

        return LedgerEntry.objects.using(db_alias).create(
            group=group,
            member=member,
            account_stream=account_stream,
            entry_type=entry_type,
            direction=direction,
            amount=amount,
            currency=currency,
            description=description,
            reference=reference,
            related_contribution=related_contribution,
            related_loan=related_loan,
            related_payout=related_payout,
            recorded_by=recorded_by,
            idempotency_key=idempotency_key,
            source_system=source_system,
        )


def start_reconciliation_run(
    *,
    country,
    provider_code,
    account_stream,
    account_number,
    business_date,
    expected_closing_balance=None,
    observed_closing_balance=None,
    source='daily_bank_statement',
    metadata=None,
):
    """
    Create the immutable-ish header for a daily bank/provider reconciliation pass.
    Runs are intentionally explicit per country/provider/account stream so Kenya,
    Rwanda, and Ghana can reconcile independently against their own bank feeds.
    """
    db_alias = get_db_for_country(country)
    return ReconciliationRun.objects.using(db_alias).create(
        country=country,
        provider_code=provider_code,
        account_stream=account_stream,
        account_number=account_number,
        business_date=business_date,
        expected_closing_balance=expected_closing_balance,
        observed_closing_balance=observed_closing_balance,
        source=source,
        metadata=metadata or {},
    )


def record_reconciliation_exception(
    *,
    country,
    account_stream,
    issue_type,
    reference,
    expected_amount=None,
    observed_amount=None,
    currency='',
    group=None,
    run=None,
    related_contribution=None,
    provider_reference='',
    bank_reference='',
    severity='orange',
    details=None,
    isolate_to_suspense=False,
    member=None,
    source_system='reconciliation',
):
    """
    Record a fail-closed finance exception.

    When isolate_to_suspense=True and a group is available, the observed money is
    represented in the suspense stream. We never force it into rotation/savings/
    loaning until a human or a trusted reconciliation rule resolves the mismatch.
    """
    db_alias = get_db_for_country(country)
    details = details or {}

    with transaction.atomic(using=db_alias):
        if run is not None and run.status != 'needs_review':
            run.status = 'needs_review'
            run.save(using=db_alias, update_fields=['status', 'updated_at'])

        item = ReconciliationItem.objects.using(db_alias).create(
            run=run,
            group=group,
            related_contribution=related_contribution,
            account_stream=account_stream,
            issue_type=issue_type,
            reference=reference,
            provider_reference=provider_reference,
            bank_reference=bank_reference,
            expected_amount=expected_amount,
            observed_amount=observed_amount,
            currency=currency or '',
            severity=severity,
            details=details,
        )

        if isolate_to_suspense and group is not None and observed_amount is not None:
            append_ledger_entry(
                group=group,
                member=member,
                account_stream='suspense',
                entry_type='reconciliation_adjustment',
                direction='credit',
                amount=observed_amount,
                currency=currency,
                description=f"Suspense hold for {issue_type}: {reference}",
                reference=f"SUSPENSE-{reference}",
                related_contribution=related_contribution,
                idempotency_key=f"suspense:{reference}:{issue_type}",
                source_system=source_system,
            )

        return item
