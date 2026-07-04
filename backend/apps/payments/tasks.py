"""
Provider operations tasks — the two jobs that keep OrbiSave's ledger and the
bank provably in agreement:

  1. poll_stuck_provider_transactions — webhooks get lost; every 15 minutes
     any ProviderTransaction still in a non-final state is re-queried against
     the provider's transaction API and advanced. Transactions stuck past 24h
     escalate to 'manual_review' so a human sees them.

  2. import_daily_statements — daily bank-statement pull per active provider
     into ProviderStatementLine rows, auto-matched against our provider-side
     transactions. Orphan bank movements (money the bank saw that we didn't)
     open red reconciliation items; the run header records the closing
     balance for the day. Fail closed, always visible, never silent.
"""
from datetime import timedelta
from decimal import Decimal, InvalidOperation

import structlog
from celery import shared_task
from django.utils import timezone

logger = structlog.get_logger(__name__)

NON_FINAL_TX_STATUSES = [
    'created', 'request_signed', 'submitted', 'acknowledged',
    'pending_customer_action', 'provider_processing',
    'awaiting_third_party_settlement',
]
STUCK_AFTER_MINUTES = 10
ESCALATE_AFTER_HOURS = 24


@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def poll_stuck_provider_transactions(self):
    """Re-query non-final provider transactions and advance their states."""
    from apps.payments.models import ProviderTransaction
    from apps.payments.providers.jenga import CALLBACK_STATUS_TO_TX, TERMINAL_TX_STATUSES
    from apps.payments.selector import get_provider_by_id

    cutoff = timezone.now() - timedelta(minutes=STUCK_AFTER_MINUTES)
    escalation_cutoff = timezone.now() - timedelta(hours=ESCALATE_AFTER_HOURS)

    stuck = (
        ProviderTransaction.objects
        .filter(status__in=NON_FINAL_TX_STATUSES, created_at__lt=cutoff)
        .select_related('provider')
        .order_by('created_at')[:200]  # bounded batch; next beat picks up the rest
    )

    advanced = 0
    escalated = 0
    checked = 0
    providers = {}

    for tx in stuck:
        checked += 1
        try:
            provider = providers.setdefault(tx.provider_id, get_provider_by_id(str(tx.provider_id)))
            details = provider.query_transaction_details(tx.internal_reference)
            parsed = provider.parse_callback(details.get('data') or details)
            new_status = CALLBACK_STATUS_TO_TX.get(parsed.get('status', ''))

            if new_status and new_status != tx.status:
                tx.status = new_status
                update_fields = ['status', 'updated_at']
                if new_status in TERMINAL_TX_STATUSES and tx.final_at is None:
                    tx.final_at = timezone.now()
                    update_fields.append('final_at')
                tx.save(update_fields=update_fields)
                advanced += 1
                continue
        except Exception as exc:
            logger.warning(
                'stuck_tx_query_failed',
                tx_id=str(tx.id), reference=tx.internal_reference, error=str(exc),
            )

        if tx.created_at < escalation_cutoff and tx.status != 'manual_review':
            tx.status = 'manual_review'
            tx.save(update_fields=['status', 'updated_at'])
            escalated += 1
            logger.error(
                'provider_tx_escalated_manual_review',
                tx_id=str(tx.id), reference=tx.internal_reference,
                age_hours=ESCALATE_AFTER_HOURS,
            )

    logger.info(
        'stuck_tx_poll_complete',
        checked=checked, advanced=advanced, escalated=escalated,
    )
    return {'checked': checked, 'advanced': advanced, 'escalated': escalated}


def _normalize_statement_row(row: dict) -> dict:
    """Tolerant normalizer for Jenga fullStatement rows."""
    amount_raw = row.get('amount') or row.get('transactionAmount') or '0'
    try:
        amount = Decimal(str(amount_raw))
    except (InvalidOperation, TypeError):
        amount = Decimal('0')
    type_value = str(row.get('type') or row.get('transactionType') or '').lower()
    direction = 'debit' if 'debit' in type_value or type_value == 'd' else 'credit'
    balance_raw = row.get('runningBalance') or row.get('balance')
    try:
        running_balance = Decimal(str(balance_raw)) if balance_raw is not None else None
    except (InvalidOperation, TypeError):
        running_balance = None
    return {
        'transaction_id': str(row.get('transactionId') or row.get('id') or ''),
        'reference': str(row.get('reference') or row.get('transactionReference') or ''),
        'serial': str(row.get('serial') or ''),
        'posted_date_time': str(row.get('postedDateTime') or row.get('date') or ''),
        'description': str(row.get('description') or row.get('narrative') or ''),
        'amount': abs(amount),
        'direction': direction,
        'running_balance': running_balance,
        'currency': str(row.get('currency') or ''),
        'raw': row,
    }


@shared_task(bind=True, max_retries=2, default_retry_delay=600)
def import_daily_statements(self, business_date=None):
    """
    Pull yesterday's (or an explicit YYYY-MM-DD) bank statement per active
    provider, persist the lines, auto-match, and open reconciliation items
    for anything the bank saw that we didn't.
    """
    from apps.ledger.services import record_reconciliation_exception, start_reconciliation_run
    from apps.payments.models import BankProvider, ProviderStatementLine, ProviderTransaction
    from apps.payments.selector import get_provider_by_id

    if business_date is None:
        business_date = (timezone.now() - timedelta(days=1)).date().isoformat()

    summary = []

    for record in BankProvider.objects.filter(status='active'):
        # Pin every row this import writes (run, lines, items) to the same
        # database the provider record lives on — one alias end to end.
        db_alias = record._state.db or 'default'
        recon_account = record.accounts.filter(is_default_for_reconciliation=True).first() \
            or record.accounts.first()
        if recon_account is None:
            logger.warning('statement_import_no_account', provider=record.name)
            continue

        try:
            provider = get_provider_by_id(str(record.id))
            statement = provider.get_full_statement(
                account_number=recon_account.account_number,
                from_date=business_date,
                to_date=business_date,
            )
        except Exception as exc:
            logger.error('statement_pull_failed', provider=record.name, error=str(exc))
            continue

        rows = (
            (statement.get('data') or {}).get('transactions')
            or statement.get('transactions')
            or []
        )

        # Closing balance for the run header (best-effort).
        observed_closing = None
        try:
            balance_data = provider.get_opening_closing_balance(
                account_number=recon_account.account_number, business_date=business_date,
            )
            balances = (balance_data.get('data') or {}).get('balances') or []
            for entry in balances:
                if str(entry.get('type', '')).lower() == 'closing':
                    observed_closing = Decimal(str(entry.get('amount')))
        except Exception as exc:
            logger.warning('closing_balance_pull_failed', provider=record.name, error=str(exc))

        run = start_reconciliation_run(
            country=record.country,
            provider_code=record.provider_code,
            account_stream='provider_settlement',
            account_number=recon_account.account_number,
            business_date=business_date,
            observed_closing_balance=observed_closing,
            source='daily_bank_statement',
            metadata={'provider_id': str(record.id), 'line_count': len(rows)},
            db_alias=db_alias,
        )

        imported = 0
        matched = 0
        orphans = 0

        for raw_row in rows:
            line_data = _normalize_statement_row(raw_row)
            line, created = ProviderStatementLine.objects.using(db_alias).get_or_create(
                provider=record,
                account_number=recon_account.account_number,
                transaction_id=line_data['transaction_id'],
                reference=line_data['reference'],
                transaction_date=business_date,
                defaults={
                    'serial': line_data['serial'],
                    'posted_date_time': line_data['posted_date_time'],
                    'description': line_data['description'],
                    'amount': line_data['amount'],
                    'direction': line_data['direction'],
                    'running_balance': line_data['running_balance'],
                    'currency': line_data['currency'],
                    'raw_payload': line_data['raw'],
                },
            )
            if not created:
                continue  # idempotent re-import
            imported += 1

            # Match against our provider-side transactions by any reference.
            candidates = [line_data['reference'], line_data['transaction_id']]
            tx_match = ProviderTransaction.objects.using(db_alias).filter(
                provider=record,
            ).filter(
                models_q_any_reference(candidates)
            ).first()

            if tx_match is not None:
                line.matched_status = 'matched'
                line.save(update_fields=['matched_status', 'updated_at'])
                matched += 1
            else:
                line.matched_status = 'exception'
                line.save(update_fields=['matched_status', 'updated_at'])
                orphans += 1
                record_reconciliation_exception(
                    country=record.country,
                    account_stream='provider_settlement',
                    issue_type='orphan_bank_transaction',
                    reference=line_data['reference'] or line_data['transaction_id'] or f'LINE-{line.id}',
                    observed_amount=line_data['amount'],
                    currency=line_data['currency'] or recon_account.currency,
                    run=run,
                    bank_reference=line_data['transaction_id'],
                    severity='red',
                    details={'description': line_data['description'], 'statement_line_id': str(line.id)},
                    db_alias=db_alias,
                )

        run.status = 'needs_review' if orphans else 'matched'
        run.save(update_fields=['status', 'updated_at'])

        logger.info(
            'statement_import_complete',
            provider=record.name, date=business_date,
            imported=imported, matched=matched, orphans=orphans,
        )
        summary.append({
            'provider': record.name, 'imported': imported,
            'matched': matched, 'orphans': orphans,
        })

    return {'date': business_date, 'providers': summary}


def models_q_any_reference(candidates):
    """OR-filter over internal/provider references for the given candidates."""
    from django.db.models import Q
    query = Q(pk=None)  # always-false base
    for candidate in candidates:
        if not candidate:
            continue
        query |= (
            Q(internal_reference=candidate)
            | Q(provider_reference=candidate)
            | Q(provider_transaction_id=candidate)
        )
    return query
