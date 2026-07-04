"""
SMS delivery service.

Resolves the active console-managed NotificationProviderConfiguration at send
time (Africa's Talking first). No credentials in env files or code. When no
provider is active:
  * DEBUG environments log the message and report the 'logged' channel so
    signup/OTP flows stay fully testable without an SMS account;
  * production raises, because silently dropping an OTP is a user-facing
    outage, not a soft failure.
"""
import structlog
from django.conf import settings

logger = structlog.get_logger(__name__)


class SmsDeliveryError(Exception):
    pass


def _active_config():
    from apps.admin_portal.models import NotificationProviderConfiguration
    return (
        NotificationProviderConfiguration.objects
        .filter(status='active')
        .order_by('provider_code')
        .first()
    )


def send_via_config(config, phone: str, message: str) -> dict:
    """
    Send through a SPECIFIC provider config (used by the Console
    test-connection flow, regardless of which provider is 'active').
    """
    if config.provider_code == 'africastalking':
        return _send_via_africastalking(config, phone, message)
    raise SmsDeliveryError(f"SMS provider '{config.provider_code}' has no implementation.")


def _send_via_africastalking(config, phone: str, message: str) -> dict:
    import africastalking

    africastalking.initialize(username=config.username or 'sandbox', api_key=config.api_key)
    sms = africastalking.SMS
    kwargs = {}
    if config.sender_id:
        kwargs['sender_id'] = config.sender_id
    response = sms.send(message, [phone], **kwargs)
    recipients = (response or {}).get('SMSMessageData', {}).get('Recipients', [])
    if not recipients or recipients[0].get('statusCode') not in (100, 101, 102):
        raise SmsDeliveryError(f"Africa's Talking rejected the message: {response}")
    return {'channel': 'africastalking', 'provider_message_id': recipients[0].get('messageId')}


def send_sms(phone: str, message: str) -> dict:
    """
    Send one SMS. Returns {'channel': ..., ...} on success.
    Raises SmsDeliveryError when delivery is required but impossible.
    """
    config = _active_config()

    if config is None:
        if settings.DEBUG:
            logger.info('sms_dev_fallback', phone=phone, message=message)
            return {'channel': 'logged'}
        raise SmsDeliveryError(
            'No active SMS provider configured. Configure one in Console → Settings → APIs.'
        )

    try:
        if config.provider_code == 'africastalking':
            result = _send_via_africastalking(config, phone, message)
        else:
            raise SmsDeliveryError(
                f"SMS provider '{config.provider_code}' has no implementation."
            )
    except SmsDeliveryError:
        raise
    except Exception as exc:
        logger.error('sms_send_failed', phone=phone, provider=config.provider_code, error=str(exc))
        raise SmsDeliveryError(f'SMS delivery failed via {config.provider_code}.') from exc

    logger.info('sms_sent', phone=phone, channel=result['channel'])
    return result
