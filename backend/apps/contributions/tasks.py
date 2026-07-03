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
            # Collect IDs first: select_for_update is only legal inside a
            # transaction, so each row is re-fetched and locked per-atomic
            # block below (skip_locked lets concurrent workers coexist).
            overdue_ids = list(
                Contribution.objects.using(db_alias).filter(
                    group=group,
                    status__in=['initiated', 'pending'],
                    scheduled_date__lt=today,
                ).values_list('id', flat=True)
            )
            for contribution_id in overdue_ids:
                with transaction.atomic(using=db_alias):
                    contribution = (
                        Contribution.objects.using(db_alias)
                        .select_for_update(skip_locked=True)
                        .filter(
                            id=contribution_id,
                            status__in=['initiated', 'pending'],
                        )
                        .first()
                    )
                    if contribution is None:
                        continue  # already handled by a concurrent worker

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
    Runs every 6 hours. Promotes Penalty records from 'pending' to 'applied',
    making the obligation official against the member.

    The ledger deliberately records NO entry at assessment time: a penalty
    owed is an obligation, not a money movement. The previous implementation
    wrote a direct LedgerEntry here (bypassing append_ledger_entry) with an
    invalid entry_type and a rotation-stream debit for money that never moved
    — corrupting both the stream lock and the pool balance. Ledger entries
    for penalties are written only when the fine is actually collected,
    through the payment/webhook flow like any other confirmed money-in.

    Satisfies Financial Engine Checklist §9: Escalation logic.
    """
    from apps.contributions.models import Penalty
    from common.db_utils import get_db_for_group

    pending_penalties = Penalty.objects.filter(status='pending').select_related(
        'contribution__group', 'member'
    )
    applied = 0

    for penalty in pending_penalties:
        group = penalty.contribution.group
        db_alias = get_db_for_group(group)
        try:
            with transaction.atomic(using=db_alias):
                penalty.status = 'applied'
                penalty.save(update_fields=['status', 'updated_at'])
                applied += 1

            _emit_group_event(group.id, 'penalty.applied', {
                'penalty_id': str(penalty.id),
                'member_id': str(penalty.member_id),
                'amount': str(penalty.amount),
            })
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
