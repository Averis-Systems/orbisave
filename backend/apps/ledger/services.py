from decimal import Decimal

from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from apps.ledger.models import (
    LedgerEntry,
    LedgerEventGroup,
    LedgerStreamLock,
    PROTECTED_NON_NEGATIVE_STREAMS,
    ReconciliationItem,
    ReconciliationRun,
)
from common.db_utils import get_db_for_country, get_db_for_group


def _invalidate_group_wallet_cache(group):
    try:
        cache.delete(f"group_wallet_{group.id}")
    except Exception:
        pass


def _get_or_create_stream_lock(*, db_alias, group, account_stream, currency):
    try:
        LedgerStreamLock.objects.using(db_alias).get_or_create(
            group=group,
            account_stream=account_stream,
            currency=currency,
        )
    except IntegrityError:
        pass
    return (
        LedgerStreamLock.objects.using(db_alias)
        .select_for_update()
        .get(group=group, account_stream=account_stream, currency=currency)
    )


def _get_or_create_event_group(*, db_alias, event_group_key, event_type, source_system, metadata):
    if not event_group_key:
        return None
    event_group, _ = LedgerEventGroup.objects.using(db_alias).get_or_create(
        event_group_key=event_group_key,
        defaults={
            'event_type': event_type or 'ledger_event',
            'source_system': source_system,
            'metadata': metadata or {},
        },
    )
    if event_group.status != LedgerEventGroup.STATUS_OPEN:
        raise ValueError(f"Ledger event group '{event_group_key}' is already closed.")
    return event_group


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
    event_group_key=None,
    event_type='ledger_event',
    event_metadata=None,
    allow_overdraft=False,
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

        event_group = _get_or_create_event_group(
            db_alias=db_alias,
            event_group_key=event_group_key,
            event_type=event_type,
            source_system=source_system,
            metadata=event_metadata,
        )
        stream_lock = _get_or_create_stream_lock(
            db_alias=db_alias,
            group=group,
            account_stream=account_stream,
            currency=currency,
        )

        amount_dec = Decimal(str(amount)).quantize(Decimal('0.01'))
        if direction == 'credit':
            next_balance = stream_lock.current_balance + amount_dec
        elif direction == 'debit':
            next_balance = stream_lock.current_balance - amount_dec
        else:
            raise ValueError(f"Unsupported ledger direction '{direction}'.")

        if (
            not allow_overdraft
            and account_stream in PROTECTED_NON_NEGATIVE_STREAMS
            and next_balance < Decimal('0.00')
        ):
            raise ValueError(
                f"Insufficient ledger balance in {account_stream}: "
                f"{stream_lock.current_balance} available, {amount_dec} requested."
            )

        entry = LedgerEntry(
            event_group=event_group,
            group=group,
            member=member,
            account_stream=account_stream,
            entry_type=entry_type,
            direction=direction,
            amount=amount_dec,
            currency=currency,
            running_balance=next_balance,
            description=description,
            reference=reference,
            related_contribution=related_contribution,
            related_loan=related_loan,
            related_payout=related_payout,
            recorded_by=recorded_by,
            idempotency_key=idempotency_key,
            source_system=source_system,
            sequence_number=stream_lock.last_sequence_number + 1,
            previous_hash=stream_lock.last_hash,
        )
        entry.hash = entry.compute_hash()
        entry.save(using=db_alias)

        stream_lock.last_sequence_number = entry.sequence_number
        stream_lock.last_hash = entry.hash
        stream_lock.current_balance = entry.running_balance
        stream_lock.save(using=db_alias, update_fields=[
            'last_sequence_number',
            'last_hash',
            'current_balance',
            'updated_at',
        ])

        transaction.on_commit(lambda: _invalidate_group_wallet_cache(group), using=db_alias)
        return entry


def close_ledger_event_group(event_group_key, *, db_alias='default'):
    with transaction.atomic(using=db_alias):
        event_group = (
            LedgerEventGroup.objects.using(db_alias)
            .select_for_update()
            .get(event_group_key=event_group_key)
        )
        totals = {}
        for row in (
            LedgerEntry.objects.using(db_alias)
            .filter(event_group=event_group)
            .values('currency', 'direction')
            .annotate(total=Sum('amount'))
        ):
            totals.setdefault(row['currency'], Decimal('0.00'))
            if row['direction'] == 'debit':
                totals[row['currency']] += row['total'] or Decimal('0.00')
            else:
                totals[row['currency']] -= row['total'] or Decimal('0.00')

        imbalances = {
            currency: total for currency, total in totals.items()
            if total != Decimal('0.00')
        }
        if imbalances:
            raise ValueError(f"Ledger event group '{event_group_key}' is not balanced: {imbalances}")

        event_group.status = LedgerEventGroup.STATUS_CLOSED
        event_group.closed_at = timezone.now()
        event_group.save(using=db_alias, update_fields=['status', 'closed_at', 'updated_at'])
        return event_group


def verify_ledger_stream(*, group, account_stream, currency):
    db_alias = group._state.db or get_db_for_group(group)
    previous_hash = '0' * 64
    running_balance = Decimal('0.00')
    expected_sequence = 1
    errors = []

    entries = (
        LedgerEntry.objects.using(db_alias)
        .filter(group=group, account_stream=account_stream, currency=currency)
        .select_related('event_group')
        .order_by('sequence_number', 'created_at')
    )

    for entry in entries:
        if entry.sequence_number != expected_sequence:
            errors.append({
                'code': 'sequence_gap',
                'entry_id': str(entry.id),
                'expected': expected_sequence,
                'actual': entry.sequence_number,
            })

        if entry.previous_hash != previous_hash:
            errors.append({
                'code': 'previous_hash_mismatch',
                'entry_id': str(entry.id),
                'expected': previous_hash,
                'actual': entry.previous_hash,
            })

        amount = Decimal(str(entry.amount)).quantize(Decimal('0.01'))
        if entry.direction == 'credit':
            running_balance += amount
        elif entry.direction == 'debit':
            running_balance -= amount

        if entry.hash != entry.compute_hash():
            errors.append({
                'code': 'hash_mismatch',
                'entry_id': str(entry.id),
            })

        if entry.running_balance != running_balance:
            errors.append({
                'code': 'running_balance_mismatch',
                'entry_id': str(entry.id),
                'expected': str(running_balance),
                'actual': str(entry.running_balance),
            })

        previous_hash = entry.hash
        expected_sequence += 1

    return {
        'valid': not errors,
        'entry_count': expected_sequence - 1,
        'final_hash': previous_hash,
        'final_balance': str(running_balance),
        'errors': errors,
    }


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
    db_alias=None,
):
    """
    Create the immutable-ish header for a daily bank/provider reconciliation pass.
    Runs are intentionally explicit per country/provider/account stream so Kenya,
    Rwanda, and Ghana can reconcile independently against their own bank feeds.
    db_alias overrides the country-derived database (see record_reconciliation_exception).
    """
    db_alias = db_alias or get_db_for_country(country)
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
    db_alias=None,
):
    """
    Record a fail-closed finance exception.

    When isolate_to_suspense=True and a group is available, the observed money is
    represented in the suspense stream. We never force it into rotation/savings/
    loaning until a human or a trusted reconciliation rule resolves the mismatch.

    db_alias overrides the country-derived database — callers that already
    resolved where the related rows live (e.g. webhook handlers) pass it so
    the exception lands beside them.
    """
    db_alias = db_alias or get_db_for_country(country)
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
