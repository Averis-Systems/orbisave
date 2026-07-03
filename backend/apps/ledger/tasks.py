"""
Ledger operations tasks.

Two standing jobs keep the ledger provably intact:

  1. generate_daily_checkpoints — freezes each group's previous business day
     into an immutable DailyLedgerCheckpoint holding the Merkle root of that
     day's entry hashes. Checkpoints are the tamper-evidence anchor: once a
     day is sealed, rewriting history would change the root.

  2. verify_all_ledger_streams — sweeps every (group, stream, currency)
     chain with verify_ledger_stream and logs any sequence gap, hash break,
     or running-balance drift. A non-empty result is a P0 incident.

Both iterate the configured country databases explicitly (never relying on
thread-local routing), matching the platform's financial-code convention.
"""
import hashlib
from datetime import timedelta

import structlog
from celery import shared_task
from django.utils import timezone

from common.db_utils import COUNTRY_DB_MAP
from django.conf import settings

logger = structlog.get_logger(__name__)


def _financial_db_aliases():
    """Every distinct DB alias that can hold financial (per-country) data."""
    aliases = {'default'}
    for alias in COUNTRY_DB_MAP.values():
        if alias in settings.DATABASES:
            aliases.add(alias)
    return sorted(aliases)


def compute_merkle_root(leaf_hashes):
    """
    Standard pairwise SHA-256 Merkle root over the given leaves (hex strings).
    Odd layers duplicate their last node. Empty input has no root.
    """
    if not leaf_hashes:
        return None
    level = list(leaf_hashes)
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        level = [
            hashlib.sha256((level[i] + level[i + 1]).encode()).hexdigest()
            for i in range(0, len(level), 2)
        ]
    return level[0]


@shared_task(bind=True, max_retries=3, default_retry_delay=600)
def generate_daily_checkpoints(self, business_date=None):
    """
    Seal the previous UTC day (or an explicit YYYY-MM-DD business_date) into
    per-group Merkle checkpoints. Idempotent: (group, date) is unique, so
    re-runs skip already-sealed days.
    """
    from apps.groups.models import Group
    from apps.ledger.models import DailyLedgerCheckpoint, LedgerEntry

    if business_date:
        from datetime import date as date_cls
        target_date = date_cls.fromisoformat(str(business_date))
    else:
        target_date = (timezone.now() - timedelta(days=1)).date()

    created = 0
    skipped = 0

    for db_alias in _financial_db_aliases():
        group_ids = (
            LedgerEntry.objects.using(db_alias)
            .filter(created_at__date=target_date)
            .values_list('group_id', flat=True)
            .distinct()
        )
        for group_id in group_ids:
            try:
                if DailyLedgerCheckpoint.objects.using(db_alias).filter(
                    group_id=group_id, date=target_date
                ).exists():
                    skipped += 1
                    continue

                day_entries = list(
                    LedgerEntry.objects.using(db_alias)
                    .filter(group_id=group_id, created_at__date=target_date)
                    .order_by('account_stream', 'currency', 'sequence_number')
                    .values_list('hash', 'amount')
                )
                root = compute_merkle_root([h for h, _ in day_entries])
                if root is None:
                    continue

                group = Group.objects.using(db_alias).get(id=group_id)
                DailyLedgerCheckpoint.objects.using(db_alias).create(
                    group=group,
                    date=target_date,
                    merkle_root_hash=root,
                    transaction_count=len(day_entries),
                    total_volume=sum(amount for _, amount in day_entries),
                )
                created += 1
            except Exception as exc:
                logger.error(
                    'daily_checkpoint_failed',
                    group_id=str(group_id),
                    db=db_alias,
                    date=str(target_date),
                    error=str(exc),
                )

    logger.info(
        'daily_checkpoints_complete',
        date=str(target_date),
        created=created,
        skipped=skipped,
    )
    return {'date': str(target_date), 'created': created, 'skipped': skipped}


@shared_task(bind=True, max_retries=1, default_retry_delay=600)
def verify_all_ledger_streams(self):
    """
    Full-chain integrity sweep. Any error entry means the append-only
    invariant was violated somewhere — page a human, freeze writes for the
    affected group, and investigate before further money moves.
    """
    from apps.groups.models import Group
    from apps.ledger.models import LedgerStreamLock
    from apps.ledger.services import verify_ledger_stream

    streams_checked = 0
    broken = []

    for db_alias in _financial_db_aliases():
        stream_keys = (
            LedgerStreamLock.objects.using(db_alias)
            .values_list('group_id', 'account_stream', 'currency')
        )
        for group_id, account_stream, currency in stream_keys:
            try:
                group = Group.objects.using(db_alias).get(id=group_id)
                result = verify_ledger_stream(
                    group=group, account_stream=account_stream, currency=currency
                )
                streams_checked += 1
                if not result['valid']:
                    broken.append({
                        'group_id': str(group_id),
                        'db': db_alias,
                        'account_stream': account_stream,
                        'currency': currency,
                        'errors': result['errors'],
                    })
            except Exception as exc:
                broken.append({
                    'group_id': str(group_id),
                    'db': db_alias,
                    'account_stream': account_stream,
                    'currency': currency,
                    'errors': [{'code': 'verifier_crashed', 'detail': str(exc)}],
                })

    if broken:
        logger.error('ledger_integrity_violations', count=len(broken), violations=broken)
    else:
        logger.info('ledger_integrity_ok', streams_checked=streams_checked)
    return {'streams_checked': streams_checked, 'violations': broken}
