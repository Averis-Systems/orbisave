"""
Groups Celery tasks.
Satisfies:
  - Financial Engine Checklist §3 (Rotation Engine — cycle tracking)
  - System Design Checklist §9 (Background Job Processing)
"""
import structlog
from celery import shared_task
from django.utils import timezone

logger = structlog.get_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def check_cycle_completion(self):
    """
    Runs daily. For each active group, checks if all RotationSchedule slots
    for the current cycle are marked is_paid_out=True. If so, closes the
    current RotationCycle and starts the next one automatically.

    Satisfies Financial Engine Checklist §3: Each cycle tracks expected vs actual contributions.
    """
    from apps.groups.models import Group, RotationCycle, RotationSchedule
    from apps.groups.services.rotation_service import RotationService
    from common.db_utils import get_db_for_group

    completed = 0
    active_groups = Group.objects.filter(status='active')

    for group in active_groups:
        db_alias = get_db_for_group(group)
        try:
            current_cycle = RotationCycle.objects.using(db_alias).filter(
                group=group, is_current=True, status='open'
            ).first()

            if not current_cycle:
                continue

            total_slots = RotationSchedule.objects.using(db_alias).filter(
                group=group, cycle_number=current_cycle.cycle_number
            ).count()

            paid_slots = RotationSchedule.objects.using(db_alias).filter(
                group=group, cycle_number=current_cycle.cycle_number, is_paid_out=True
            ).count()

            if total_slots > 0 and paid_slots == total_slots:
                # All members have received their payout — close cycle and start new one.
                RotationService.start_next_cycle(group)
                completed += 1
                logger.info('cycle_completed', group_id=group.id, cycle=current_cycle.cycle_number)

                _emit_group_event(group.id, 'cycle.completed', {
                    'completed_cycle': current_cycle.cycle_number,
                    'new_cycle': current_cycle.cycle_number + 1,
                })

        except Exception as exc:
            logger.error('cycle_check_error', group_id=group.id, error=str(exc))

    logger.info('cycle_completion_check_done', groups_cycled=completed)
    return {'groups_cycled': completed}


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
