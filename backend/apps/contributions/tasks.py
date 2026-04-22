"""
Contributions Celery tasks.
Satisfies:
  - System Design Checklist §9 (Background Job Processing)
  - Financial Engine Checklist §4 (Contribution deadlines enforced)
  - Financial Engine Checklist §9 (Defaults & Penalties)
"""
import structlog
from celery import shared_task
from django.utils import timezone
from django.db import transaction

logger = structlog.get_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def enforce_contribution_deadlines(self):
    """
    Runs daily. Scans all active groups for contributions whose
    scheduled_date has passed and whose status is still 'initiated' or 'pending'.
    Marks them 'overdue' and fires the PenaltyService.

    Satisfies Financial Engine Checklist §4: Contribution deadlines enforced.
    """
    from apps.contributions.models import Contribution
    from apps.contributions.services.penalty_service import PenaltyService
    from apps.groups.models import Group
    from common.db_utils import get_db_for_group

    today = timezone.now().date()
    processed = 0
    penalised = 0

    active_groups = Group.objects.filter(status='active').select_related()

    for group in active_groups:
        db_alias = get_db_for_group(group)
        try:
            overdue_qs = Contribution.objects.using(db_alias).filter(
                group=group,
                status__in=['initiated', 'pending'],
                scheduled_date__lt=today,
            )
            for contribution in overdue_qs.select_for_update(skip_locked=True):
                with transaction.atomic(using=db_alias):
                    contribution.status = 'overdue'
                    contribution.save(update_fields=['status', 'updated_at'])
                    processed += 1

                    penalty = PenaltyService.apply_late_penalty(contribution)
                    if penalty:
                        penalised += 1
                        logger.info(
                            'penalty_applied',
                            group_id=group.id,
                            contribution_id=contribution.id,
                            penalty_amount=str(penalty.amount),
                        )

                    # Emit real-time event via Django Channels
                    _emit_group_event(group.id, 'contribution.overdue', {
                        'contribution_id': str(contribution.id),
                        'member_id': str(contribution.member_id),
                        'amount': str(contribution.amount),
                    })

        except Exception as exc:
            logger.error('deadline_enforcement_error', group_id=group.id, error=str(exc))
            # Don't retry per-group failures — continue to next group.

    logger.info('deadline_enforcement_complete', processed=processed, penalised=penalised)
    return {'processed': processed, 'penalised': penalised}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def apply_pending_penalties(self):
    """
    Runs every 6 hours. Processes any Penalty records still in 'pending' state
    (e.g. flagged by the deadline task but not yet reconciled into the ledger).

    Satisfies Financial Engine Checklist §9: Escalation logic.
    """
    from apps.contributions.models import Penalty
    from apps.ledger.models import LedgerEntry
    from common.db_utils import get_db_for_group
    import uuid

    pending_penalties = Penalty.objects.filter(status='pending').select_related(
        'contribution__group', 'member'
    )
    applied = 0

    for penalty in pending_penalties:
        group = penalty.contribution.group
        db_alias = get_db_for_group(group)
        try:
            with transaction.atomic(using=db_alias):
                LedgerEntry.objects.using(db_alias).get_or_create(
                    reference=f"PENALTY-{penalty.id}",
                    defaults={
                        'group': group,
                        'member': penalty.member,
                        'entry_type': 'penalty',
                        'direction': 'debit',
                        'amount': penalty.amount,
                        'currency': group.currency,
                        'description': (
                            f"Late contribution penalty for "
                            f"{penalty.contribution.scheduled_date}."
                        ),
                        'related_contribution': penalty.contribution,
                    }
                )
                penalty.status = 'applied'
                penalty.save(update_fields=['status', 'updated_at'])
                applied += 1
        except Exception as exc:
            logger.error('penalty_apply_error', penalty_id=penalty.id, error=str(exc))

    logger.info('pending_penalties_applied', applied=applied)
    return {'applied': applied}


def _emit_group_event(group_id, event_type: str, payload: dict):
    """Helper: sends a real-time channel event to the group's WebSocket room."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"group_{group_id}",
                {'type': 'group.event', 'event': event_type, 'payload': payload},
            )
    except Exception as exc:
        logger.warning('ws_emit_failed', event=event_type, group_id=group_id, error=str(exc))
