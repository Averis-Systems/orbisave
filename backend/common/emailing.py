"""
Branded transactional email helper.

One entry point (`send_branded_notice`) renders templates/emails/notice.html —
the same flat OrbiSave design as the verification email — with an optional
numbered-steps panel and CTA button. Every user-facing string is translated
through the user's preferred language before interpolation, and a plain-text
fallback is always included.

Delivery failures raise; callers on non-critical paths (nudges, follow-ups)
should wrap in try/except so email trouble never breaks the primary action.
"""
import structlog
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from common.translation import translate_for_user

logger = structlog.get_logger(__name__)


def send_branded_notice(
    user,
    subject: str,
    heading: str,
    intro: str,
    steps: list[str] | None = None,
    cta_label: str | None = None,
    cta_url: str | None = None,
    disclaimer: str = 'You received this email because you have an OrbiSave account.',
):
    steps = steps or []
    t_heading = translate_for_user(heading, user)
    t_intro = translate_for_user(intro, user)
    t_steps = [translate_for_user(step, user) for step in steps]
    t_cta = translate_for_user(cta_label, user) if cta_label else None
    t_disclaimer = translate_for_user(disclaimer, user)

    html_message = render_to_string(
        'emails/notice.html',
        {
            'heading': t_heading,
            'intro': t_intro,
            'steps': t_steps,
            'cta_label': t_cta,
            'cta_url': cta_url,
            'disclaimer': t_disclaimer,
            'year': timezone.now().year,
        },
    )

    plain_lines = [t_intro, '']
    plain_lines += [f'{i + 1}. {step}' for i, step in enumerate(t_steps)]
    if cta_url:
        plain_lines += ['', f'{t_cta or "Open"}: {cta_url}']

    send_mail(
        subject=subject,
        message='\n'.join(plain_lines).strip(),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )
    logger.info('branded_notice_sent', user_id=str(user.id), subject=subject)
