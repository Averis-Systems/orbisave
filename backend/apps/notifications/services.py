import structlog
from apps.notifications.models import Notification
from common.translation import translate_for_user

logger = structlog.get_logger(__name__)

def notify_user(user, title, body, notification_type='admin_alert', related_object_id=None):
    """
    Utility to create a persistent in-app notification for a user, served in
    their preferred language (translation degrades gracefully to English).

    NOTE: field names must match the Notification model (recipient/type/
    metadata) — a silent kwargs mismatch here previously meant NO in-app
    notification was ever created platform-wide.
    """
    valid_types = {choice for choice, _ in Notification.TYPE_CHOICES}
    if notification_type not in valid_types:
        notification_type = 'admin_alert'
    try:
        notification = Notification.objects.create(
            recipient=user,
            title=translate_for_user(title, user),
            body=translate_for_user(body, user),
            type=notification_type,
            channel='in_app',
            metadata={'related_object_id': str(related_object_id)} if related_object_id else {},
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
