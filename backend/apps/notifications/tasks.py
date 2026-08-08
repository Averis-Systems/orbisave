from celery import shared_task
import structlog
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

logger = structlog.get_logger(__name__)


def _resolve_user(contact, contact_type):
    """Return an existing OrbiSave user matching the invite contact, or None.

    Invites are sent to a raw email/phone before the person has an account, so
    this is best-effort: when it matches we can also surface the invite in-app.
    """
    from apps.accounts.models import User
    if not contact:
        return None
    lookup = {'email__iexact': contact} if contact_type == 'email' else {'phone': contact}
    return User.objects.filter(**lookup).first()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_invite_notification(self, invite_id, channel, target_address):
    """
    Deliver a group invite over its real channel and retry on transient failure.

    - SMS  -> apps.notifications.sms.send_sms (console-managed provider; in DEBUG
              with no provider it logs and reports the 'logged' channel).
    - Email -> a branded notice.html email through the configured backend
              (Resend in production, console in development).
    If the contact already belongs to an OrbiSave user, an in-app notification is
    created as well so it appears in their bell.

    This previously wrote a mock line to stdout and returned success without
    sending anything (areas_of_concern M9), so a real invitee never heard about
    their invite in production.
    """
    from apps.groups.models import GroupInvite

    try:
        invite = GroupInvite.objects.select_related('group').get(id=invite_id)
    except GroupInvite.DoesNotExist:
        logger.error("invite_task_missing_object", invite_id=str(invite_id))
        return "invite_missing"

    inviter = invite.invited_by.full_name if invite.invited_by else "an OrbiSave group admin"
    group_name = invite.group.name
    text = (
        f"You have been invited by {inviter} to join the savings group "
        f"'{group_name}' on OrbiSave. Use code {invite.token} to accept. "
        f"This code expires in 7 days."
    )

    try:
        if channel == 'sms':
            from apps.notifications.sms import send_sms
            result = send_sms(target_address, text)
            logger.info("invite_sms_sent", invite_id=str(invite_id), channel=result.get('channel'))
        else:
            heading = f"You're invited to join {group_name}"
            intro = (
                f"{inviter} has invited you to join the savings group "
                f"'{group_name}' on OrbiSave, where members save together and "
                f"access a shared pool."
            )
            steps = [
                "Open the OrbiSave app or web app and choose 'Join a group'.",
                f"Enter your invite code: {invite.token}",
                "Complete your profile to start saving with the group.",
            ]
            html_message = render_to_string('emails/notice.html', {
                'heading': heading,
                'intro': intro,
                'steps': steps,
                'cta_label': None,
                'cta_url': None,
                'disclaimer': 'You received this email because someone invited you to a group on OrbiSave.',
                'year': timezone.now().year,
            })
            plain = intro + "\n\n" + "\n".join(f"{i + 1}. {s}" for i, s in enumerate(steps))
            send_mail(
                subject=f"You're invited to join {group_name} on OrbiSave",
                message=plain,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[target_address],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info("invite_email_sent", invite_id=str(invite_id))
    except Exception as exc:
        # A provider/Redis blip should not silently drop an invite; retry a few times.
        logger.error("invite_notification_failed", invite_id=str(invite_id), channel=channel, error=str(exc))
        raise self.retry(exc=exc)

    # If the invitee already has an account, surface it in-app as well.
    existing_user = _resolve_user(invite.contact, invite.contact_type)
    if existing_user is not None:
        from apps.notifications.services import notify_user
        notify_user(
            existing_user,
            title=f"Invitation to join {group_name}",
            body=text,
            notification_type='group_invite',
            related_object_id=str(invite.id),
        )

    return "invite_notification_sent"
