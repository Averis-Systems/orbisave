import sys
from celery import shared_task
import structlog
from apps.accounts.models import User

logger = structlog.get_logger(__name__)

@shared_task
def send_invite_notification(invite_id, channel, target_address):
    """
    Background worker process. Satisfies Checklist Item 9: Background workers implemented for Notifications.
    """
    from apps.groups.models import GroupInvite
    
    try:
        invite = GroupInvite.objects.select_related('group', 'invited_by').get(id=invite_id)
    except GroupInvite.DoesNotExist:
        logger.error("invite_task_missing_object", invite_id=invite_id)
        return

    # Mock real-world SMS/Email Dispatch
    message = (
        f"You have been invited by {invite.invited_by.full_name} to join "
        f"the collective '{invite.group.name}' on OrbiSave. "
        f"Use code {invite.token} to securely accept."
    )
    
    if channel == 'sms':
        # Log to STDOUT as per spec for dev mock
        sys.stdout.write(f"\n[MOCK SMS -> {target_address}]: {message}\n")
        logger.info("mock_sms_sent", target=target_address)
    else:
        sys.stdout.write(f"\n[MOCK EMAIL -> {target_address}]: {message}\n")
        logger.info("mock_email_sent", target=target_address)
        
    return "Notification dispatched."
