"""
Payout Celery tasks.

Scheduled payout execution is deliberately thin: the readiness and idempotency
rules live in PayoutService so manual and automated execution share one gate.
"""
import structlog
from celery import shared_task

logger = structlog.get_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def process_due_rotation_payouts(self):
    """
    Runs on a schedule and attempts due rotation payouts for active groups.

    PayoutService.process_due_rotation_payout() handles:
      - schedule-derived recipient selection,
      - contribution readiness and grace-period blocking,
      - cycle/recipient payout idempotency.
    """
    from apps.groups.lifecycle import COUNTRY_DATABASE_ALIASES
    from apps.groups.models import Group, RotationCycle
    from apps.payouts.services import PayoutService
    from common.db_utils import get_db_for_group

    scanned = 0
    executed = 0
    skipped = 0
    failed = 0

    for alias in COUNTRY_DATABASE_ALIASES:
        for group in Group.objects.using(alias).filter(status='active'):
            scanned += 1
            db_alias = get_db_for_group(group)

            try:
                current_cycle = (
                    RotationCycle.objects.using(db_alias)
                    .filter(group=group, is_current=True, status='open')
                    .order_by('cycle_number')
                    .first()
                )
                if current_cycle is None:
                    skipped += 1
                    continue

                result = PayoutService.process_due_rotation_payout(group, cycle=current_cycle)
                if result.get('payout') is not None:
                    executed += 1
                else:
                    skipped += 1
            except Exception as exc:
                failed += 1
                logger.exception('scheduled_rotation_payout_failed', group_id=group.id, country_db=alias, error=str(exc))

    logger.info(
        'scheduled_rotation_payouts_complete',
        scanned=scanned,
        executed=executed,
        skipped=skipped,
        failed=failed,
    )
    return {
        'scanned': scanned,
        'executed': executed,
        'skipped': skipped,
        'failed': failed,
    }
