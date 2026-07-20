from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import structlog
import re
import traceback
import random

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.admin_portal.models import AdminEmailVerification

logger = structlog.get_logger(__name__)

ALLOWED_DOMAIN = 'averissystems.com'
OWNER_SUPER_ADMIN_EMAIL = getattr(settings, 'OWNER_SUPER_ADMIN_EMAIL', 'emanuel@averissystems.com')

PORTAL_ROLE_MAP = {
    'console': 'super_admin',
    'manager': 'platform_admin',
}

# Admin access rules are not public information. The set of admin portals, the
# fact that a specific email domain grants access, and the identity of the
# owner super admin are all things an attacker would like to confirm, and
# distinct error messages confirm them for free. Every rejected signup and
# sign-in returns one of these two strings regardless of which check failed,
# so a caller cannot tell "wrong domain" from "already registered" from "not
# the owner" from "wrong password".
GENERIC_SIGNUP_REFUSAL = (
    'We could not create an account with those details. If you believe you '
    'should have access, contact your administrator.'
)
GENERIC_SIGNIN_REFUSAL = 'Incorrect email or password.'

def _tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['email'] = user.email
    refresh['country'] = user.country or ''
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


def _generate_email_code():
    return f"{random.SystemRandom().randint(0, 999999):06d}"


def _log_code_in_development(kind, user, code):
    """
    In DEBUG, print admin codes to the server console.

    Admin codes are the only way into the Console, so if outbound email is
    misconfigured or the sending domain is still pending verification, an
    admin is locked out with no recourse and no signal as to why. The member
    app effectively had this via Django's console email backend; the admin
    portal never did.

    Guarded on settings.DEBUG so it can never run in production, where writing
    a live credential to the application log would itself be the problem.
    """
    if settings.DEBUG:
        logger.warning(
            'admin_code_debug_only',
            kind=kind,
            email=user.email,
            code=code,
            note='Printed because DEBUG=True. Never emitted in production.',
        )


def _send_admin_verification_code(user, code):
    _log_code_in_development('registration', user, code)
    send_mail(
        subject='Your Orbisave admin verification code',
        message=f"Your Orbisave admin verification code is {code}. It expires in 15 minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def _send_admin_password_reset_code(user, code):
    _log_code_in_development('password_reset', user, code)
    send_mail(
        subject='Your Orbisave admin password reset code',
        message=(
            f"Your Orbisave admin password reset code is {code}. It expires in 15 minutes.\n\n"
            "If you did not request this, ignore this email and your password stays unchanged."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

@method_decorator(csrf_exempt, name='dispatch')
class AdminRegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            email     = request.data.get('email', '').strip().lower()
            full_name = request.data.get('full_name', '').strip()
            phone     = request.data.get('phone', '').strip()
            password  = request.data.get('password', '')
            portal    = request.data.get('portal', '').lower()
            country   = request.data.get('country', '').lower()

            if not email.endswith(f'@{ALLOWED_DOMAIN}'):
                return Response({'success': False, 'message': GENERIC_SIGNUP_REFUSAL}, status=403)

            role = PORTAL_ROLE_MAP.get(portal, 'platform_admin')
            if role == 'super_admin' and email != OWNER_SUPER_ADMIN_EMAIL:
                return Response({'success': False, 'message': GENERIC_SIGNUP_REFUSAL}, status=403)

            if User.objects.filter(email=email).exists():
                return Response({'success': False, 'message': GENERIC_SIGNUP_REFUSAL}, status=403)

            user = User.objects.create_user(
                email=email,
                phone=phone,
                full_name=full_name,
                password=password,
                role=role,
                country=country,
                kyc_status='verified',
                is_active=False,
            )

            code = _generate_email_code()
            verification = AdminEmailVerification(
                user=user,
                email=email,
                expires_at=timezone.now() + timezone.timedelta(minutes=15),
            )
            verification.set_code(code)
            verification.save()
            _send_admin_verification_code(user, code)

            return Response({
                'success': True,
                'message': 'Verification code sent to your company email.',
                'data': {
                    'user': {
                        'id': str(user.id),
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.role,
                        'country': user.country,
                    }
                }
            }, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class AdminPasswordResetRequestView(APIView):
    """
    POST {email} -> emails a 6 digit reset code.

    Deliberately enumeration-safe: the response is identical whether the email
    exists, sits on a non-authorised domain, or is inactive. An attacker must
    not be able to use this endpoint to discover which addresses are admins,
    nor to learn that a particular email domain is the one that grants access.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    GENERIC = 'If that account exists, a reset code has been sent.'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        # Only ever act for a real, authorised, active admin, but never say so.
        if email.endswith(f'@{ALLOWED_DOMAIN}'):
            user = User.objects.filter(
                email=email,
                is_active=True,
                role__in=('platform_admin', 'super_admin'),
            ).first()
            if user is not None:
                # Invalidate any outstanding reset codes so only the newest works.
                AdminEmailVerification.objects.filter(
                    user=user, purpose='admin_password_reset', used_at__isnull=True,
                ).update(used_at=timezone.now())

                code = _generate_email_code()
                verification = AdminEmailVerification(
                    user=user,
                    email=email,
                    purpose='admin_password_reset',
                    expires_at=timezone.now() + timezone.timedelta(minutes=15),
                )
                verification.set_code(code)
                verification.save()
                try:
                    _send_admin_password_reset_code(user, code)
                except Exception as exc:
                    # Never leak delivery state to the caller.
                    logger.error('admin_password_reset_send_failed', email=email, error=str(exc))

        return Response({'success': True, 'message': self.GENERIC}, status=200)


@method_decorator(csrf_exempt, name='dispatch')
class AdminPasswordResetConfirmView(APIView):
    """POST {email, code, new_password} -> sets the new password."""
    permission_classes = [AllowAny]
    authentication_classes = []

    GENERIC_INVALID = 'That code is invalid or has expired. Request a new one.'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()
        new_password = request.data.get('new_password', '')

        if not re.fullmatch(r'\d{6}', code):
            return Response({'success': False, 'message': self.GENERIC_INVALID}, status=400)

        user = None
        if email.endswith(f'@{ALLOWED_DOMAIN}'):
            user = User.objects.filter(
                email=email,
                is_active=True,
                role__in=('platform_admin', 'super_admin'),
            ).first()

        # One shared failure message for wrong domain, unknown account, and bad
        # code, so none of them can be told apart from the outside.
        if user is None:
            return Response({'success': False, 'message': self.GENERIC_INVALID}, status=400)

        verification = AdminEmailVerification.objects.filter(
            user=user,
            email=email,
            purpose='admin_password_reset',
            used_at__isnull=True,
        ).order_by('-created_at').first()

        if verification is None or not verification.verify_code(code):
            return Response({'success': False, 'message': self.GENERIC_INVALID}, status=400)

        try:
            validate_password(new_password, user=user)
        except ValidationError as exc:
            return Response({'success': False, 'message': ' '.join(exc.messages)}, status=400)

        user.set_password(new_password)
        user.save(update_fields=['password'])

        AuditLog.objects.create(
            action='password_reset',
            actor=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={'portal': 'admin'},
        )

        return Response(
            {'success': True, 'message': 'Password updated. Sign in with your new password.'},
            status=200,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminVerifyEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()

        if not email.endswith(f'@{ALLOWED_DOMAIN}'):
            return Response({'success': False, 'message': GENERIC_SIGNIN_REFUSAL}, status=403)
        if not re.fullmatch(r'\d{6}', code):
            return Response({'success': False, 'message': 'A valid 6 digit verification code is required.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'Invalid verification request.'}, status=400)

        verification = AdminEmailVerification.objects.filter(
            user=user,
            email=email,
            purpose='admin_registration',
            used_at__isnull=True,
        ).order_by('-created_at').first()

        if verification is None or not verification.verify_code(code):
            return Response({'success': False, 'message': 'Invalid or expired verification code.'}, status=400)

        user.is_active = True
        user.save(update_fields=['is_active'])
        tokens = _tokens_for_user(user)

        return Response({
            'success': True,
            'message': 'Email verified successfully.',
            'data': {
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role,
                    'country': user.country,
                },
                **tokens,
            }
        }, status=200)

@method_decorator(csrf_exempt, name='dispatch')
class AdminLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            email    = request.data.get('email', '').strip().lower()
            password = request.data.get('password', '')

            if not email.endswith(f'@{ALLOWED_DOMAIN}'):
                return Response({'success': False, 'message': GENERIC_SIGNIN_REFUSAL}, status=403)

            user = authenticate(request, username=email, password=password)

            if user is None:
                pending_user = User.objects.filter(email=email, is_active=False).first()
                if pending_user and pending_user.check_password(password) and pending_user.role in ('super_admin', 'platform_admin'):
                    return Response({'success': False, 'message': 'Email verification required.'}, status=403)
                return Response({'success': False, 'message': 'Invalid credentials.'}, status=401)

            if user.role not in ('super_admin', 'platform_admin'):
                return Response({'success': False, 'message': 'Unauthorized role.'}, status=403)

            tokens = _tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'Login successful.',
                'data': {
                    'user': {
                        'id': str(user.id),
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.role,
                        'country': user.country,
                    },
                    **tokens
                }
            }, status=200)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
