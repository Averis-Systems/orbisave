"""
Email OTP flow: signup email verification.

Security properties mirror apps/accounts/otp_views.py (phone OTP):
  * codes are 6 digits from `secrets`, stored hashed, 10-minute expiry,
    5 verification attempts, single-use, purpose-scoped;
  * requesting a new code invalidates prior unused codes for that purpose;
  * DB-backed send throttle (3/hour per user+purpose);
  * resend is enumeration-safe: the response never reveals whether the
    email exists or is already verified.

Unlike phone verification, email verification blocks login entirely
(TokenObtainPairView checks user.email_verified) — so confirm/resend can't
require IsAuthenticated the way the phone endpoints do; both look the user
up by email instead.
"""
import secrets
from datetime import timedelta

import structlog
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework import status, views
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.models import EmailOTP, User
from apps.accounts.views import get_tokens_for_user
from apps.audit.services import log_audit
from common.exceptions import success_response
from common.translation import translate_for_user

logger = structlog.get_logger(__name__)

OTP_TTL_MINUTES = 10
OTP_SENDS_PER_HOUR = 3


def issue_email_otp(user) -> str:
    """Create a fresh email OTP (invalidating prior unused ones) and return the raw code."""
    raw_code = f"{secrets.randbelow(1_000_000):06d}"
    EmailOTP.objects.filter(user=user, purpose='email_verify', used=False).update(used=True)
    EmailOTP.objects.create(
        user=user,
        code=make_password(raw_code),
        purpose='email_verify',
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    return raw_code


def send_email_otp(user, raw_code: str):
    """Send the verification code in the user's preferred language."""
    message = translate_for_user(
        f'Your OrbiSave verification code is {raw_code}. It expires in {OTP_TTL_MINUTES} minutes.',
        user,
    )
    send_mail(
        subject='Verify your OrbiSave account',
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def _send_throttled(user):
    window_start = timezone.now() - timedelta(hours=1)
    recent = EmailOTP.objects.filter(
        user=user, purpose='email_verify', created_at__gte=window_start,
    ).count()
    if recent >= OTP_SENDS_PER_HOUR:
        raise ValueError(
            'Too many codes requested. Please wait up to an hour before trying again.'
        )


def _verify_otp(user, raw_code: str):
    """Return an error string, or None when the code is valid (marks it used)."""
    if not raw_code or not str(raw_code).isdigit():
        return 'Enter the 6-digit code that was sent to your email.'

    otp = (
        EmailOTP.objects
        .filter(user=user, purpose='email_verify', used=False)
        .order_by('-created_at')
        .first()
    )
    if otp is None:
        return 'No active code found. Request a new one.'
    if otp.is_expired():
        return 'This code has expired. Request a new one.'
    if otp.is_exhausted():
        return 'Too many incorrect attempts. Request a new code.'

    if not check_password(str(raw_code), otp.code):
        otp.attempt_count += 1
        otp.save(update_fields=['attempt_count', 'updated_at'])
        return 'Incorrect code. Please check your email and try again.'

    otp.used = True
    otp.save(update_fields=['used', 'updated_at'])
    return None


class ResendEmailOTPView(views.APIView):
    """
    POST /auth/email/resend/ — body {email}.
    Always returns 200 with the same generic message: the response must not
    reveal whether an account exists for the email, or whether it's already
    verified.
    """
    permission_classes = [AllowAny]

    GENERIC_MESSAGE = 'If that email is registered and unverified, a new code has been sent.'

    def post(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email, is_active=True, email_verified=False).first()
        if user is not None:
            try:
                _send_throttled(user)
                raw_code = issue_email_otp(user)
                send_email_otp(user, raw_code)
            except ValueError as exc:
                # Still return the generic message — throttling state must
                # not become an account-existence oracle.
                logger.warning('email_otp_resend_suppressed', email=email, reason=str(exc))

        return success_response(data=None, message=self.GENERIC_MESSAGE)


class ConfirmEmailOTPView(views.APIView):
    """
    POST /auth/email/confirm/ — body {email, code}.
    On success, marks the email verified and logs the user straight in
    (mirrors AdminVerifyEmailView) so the frontend can go from "enter code"
    to authenticated in one call.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()

        generic_error = 'The code is invalid or has expired. Request a new code.'
        if user is None:
            return Response({'error': generic_error}, status=status.HTTP_400_BAD_REQUEST)

        if user.email_verified:
            return success_response(
                data=get_tokens_for_user(user),
                message='Email is already verified.',
            )

        error = _verify_otp(user, request.data.get('code'))
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = True
        user.save(update_fields=['email_verified'])
        log_audit(
            action='email_verified',
            actor=user,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return success_response(
            data=get_tokens_for_user(user),
            message='Email verified.',
        )
