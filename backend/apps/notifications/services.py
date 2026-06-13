import structlog
from apps.notifications.models import Notification

logger = structlog.get_logger(__name__)

def notify_user(user, title, body, notification_type='system', related_object_id=None):
    """
    Utility to create a persistent in-app notification for a user.
    Optionally triggers background push/SMS via Celery (TODO).
    """
    try:
        notification = Notification.objects.create(
            user=user,
            title=title,
            body=body,
            notification_type=notification_type,
            related_object_id=related_object_id
        )
        logger.info("notification_created", user_id=str(user.id), type=notification_type)
        return notification
    except Exception as e:
        logger.error("notification_creation_failed", error=str(e))
        return None

def notify_group_verification(group, action, note=None):
    """
    Specifically handles group approval/rejection notifications to the chairperson.
    """
    if action == 'verify':
        title = "Group Verified Successfully"
        body = f"Congratulations! Your group '{group.name}' has been verified by the regional office and is now ready for operations."
    else:
        title = "Group Verification Rejected"
        body = f"Your group '{group.name}' could not be verified at this time. Reason: {note or 'Contact support for details.'}"
    
    from apps.accounts.models import User
    chairperson = User.objects.get(id=group.chairperson_id)

    return notify_user(
        user=chairperson,
        title=title,
        body=body,
        notification_type='group_status',
        related_object_id=str(group.id)
    )
