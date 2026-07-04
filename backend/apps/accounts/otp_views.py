"""
Phone OTP flows: signup phone verification + password reset.

Security properties:
  * codes are 6 digits from `secrets`, stored hashed, 10-minute expiry,
    5 verification attempts, single-use, purpose-scoped;
  * requesting a new code invalidates prior unused codes for that purpose;
  * DB-backed send throttle (3/hour per user+purpose) — deterministic across
    processes, no cache dependency;
  * password-reset request is enumeration-safe: the response never reveals
    whether the phone exists;
  * delivery goes through the console-managed SMS provider
    (apps.notifications.sms) with a logged dev fallback.
"""
import secrets
from datetime import timedelta

import structlog
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import PhoneOTP, User
from apps.audit.services import log_audit
from apps.notifications.sms import SmsDeliveryError, send_sms
from common.exceptions import success_response

logger = structlog.get_logger(__name__)

OTP_TTL_MINUTES = 10
OTP_SENDS_PER_HOUR = 3


def _issue_otp(user, purpose: str) -> str:
    """Create a fresh OTP (invalidating prior unused ones) and return the raw code."""
    raw_code = f"{secrets.randbelow(1_000_000):06d}"
    PhoneOTP.objects.filter(user=user, purpose=purpose, used=False).update(used=True)
    PhoneOTP.objects.create(
        user=user,
        code=make_password(raw_code),
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    return raw_code


def _send_throttled(user, purpose: str):
    """Raise ValueError when the hourly send budget is exhausted."""
    window_start = timezone.now() - timedelta(hours=1)
    recent = PhoneOTP.objects.filter(
        user=user, purpose=purpose, created_at__gte=window_start,
    ).count()
    if recent >= OTP_SENDS_PER_HOUR:
        raise ValueError(
            'Too many codes requested. Please wait up to an hour before trying again.'
        )


def _verify_otp(user, purpose: str, raw_code: str):
    """Return an error string, or None when the code is valid (marks it used)."""
    if not raw_code or not str(raw_code).isdigit():
        return 'Enter the 6-digit code that was sent to your phone.'

    otp = (
        PhoneOTP.objects
        .filter(user=user, purpose=purpose, used=False)
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
        return 'Incorrect code. Please check the SMS and try again.'

    otp.used = True
    otp.save(update_fields=['used', 'updated_at'])
    return None


class RequestPhoneOTPView(views.APIView):
    """POST /auth/otp/request/ — send a verification code to the logged-in user's phone."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.phone_verified:
            return success_response(data=None, message='Phone number is already verified.')

        try:
            _send_throttled(user, 'phone_verify')
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        raw_code = _issue_otp(user, 'phone_verify')
        try:
            delivery = send_sms(
                user.phone,
                f'Your OrbiSave verification code is {raw_code}. It expires in {OTP_TTL_MINUTES} minutes.',
            )
        except SmsDeliveryError as exc:
            logger.error('otp_delivery_failed', user_id=str(user.id), error=str(exc))
            return Response(
                {'error': 'We could not send the SMS right now. Please try again shortly.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return success_response(
            data={'channel': delivery['channel'], 'expires_in_minutes': OTP_TTL_MINUTES},
            message=f'Verification code sent to {user.phone}.',
        )


class ConfirmPhoneOTPView(views.APIView):
    """POST /auth/otp/confirm/ — body {code}; marks the user's phone verified."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.phone_verified:
            return success_response(data={'phone_verified': True}, message='Phone number is already verified.')

        error = _verify_otp(user, 'phone_verify', request.data.get('code'))
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        user.phone_verified = True
        user.save(update_fields=['phone_verified'])
        log_audit(
            action='phone_verified',
            actor=user,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return success_response(data={'phone_verified': True}, message='Phone number verified.')


class PasswordResetRequestView(views.APIView):
    """
    POST /auth/password-reset/request/ — body {phone}.
    Always returns 200 with the same message: responses must not reveal
    whether an account exists for the phone number.
    """
    permission_classes = [AllowAny]

    GENERIC_MESSAGE = 'If an account exists for that phone number, a reset code has been sent.'

    def post(self, request):
        phone = str(request.data.get('phone') or '').strip()
        if not phone:
            return Response({'error': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(phone=phone, is_active=True).first()
        if user is not None:
            try:
                _send_throttled(user, 'password_reset')
                raw_code = _issue_otp(user, 'password_reset')
                send_sms(
                    user.phone,
                    f'Your OrbiSave password reset code is {raw_code}. '
                    f'It expires in {OTP_TTL_MINUTES} minutes. '
                    'If you did not request this, ignore this message.',
                )
            except (ValueError, SmsDeliveryError) as exc:
                # Still return the generic message — throttling/delivery state
                # must not become an account-existence oracle.
                logger.warning('password_reset_send_suppressed', phone=phone, reason=str(exc))

        return success_response(data=None, message=self.GENERIC_MESSAGE)


class PasswordResetConfirmView(views.APIView):
    """POST /auth/password-reset/confirm/ — body {phone, code, new_password}."""
    permission_classes = [AllowAny]

    def post(self, request):
        phone = str(request.data.get('phone') or '').strip()
        new_password = request.data.get('new_password') or ''
        user = User.objects.filter(phone=phone, is_active=True).first()

        # A single generic error for "no such user" and "bad code": the
        # confirm endpoint must not be an enumeration oracle either.
        generic_error = 'The code is invalid or has expired. Request a new reset code.'
        if user is None:
            return Response({'error': generic_error}, status=status.HTTP_400_BAD_REQUEST)

        error = _verify_otp(user, 'password_reset', request.data.get('code'))
        if error:
            return Response({'error': generic_error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=user)
        except ValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        log_audit(
            action='password_reset',
            actor=user,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        logger.info('password_reset_completed', user_id=str(user.id))
        return success_response(data=None, message='Password updated. You can now log in.')
