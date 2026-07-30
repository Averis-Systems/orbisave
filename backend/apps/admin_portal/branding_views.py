from django.conf import settings
from rest_framework import status, views
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.admin_portal.models import PlatformBranding, SystemConfiguration
from apps.audit.services import log_audit


def email_branding_context():
    """
    Branding for server-rendered emails, which have no request to build
    absolute URLs against. Returns the uploaded member logo as an absolute URL
    (or None to fall back to the built-in CSS mark) plus the platform display
    name. Safe to call from any send path.
    """
    branding = PlatformBranding.current()
    logo_url = None
    if branding.member_logo:
        base = (getattr(settings, 'BACKEND_PUBLIC_URL', '') or '').rstrip('/')
        if base:
            logo_url = f'{base}{branding.member_logo.url}'
    platform_name = SystemConfiguration.get_value('platform_name', 'OrbiSave') or 'OrbiSave'
    return {'logo_url': logo_url, 'platform_name': platform_name}


# The uploadable slots. Keys are the model field names, which double as the
# multipart field names the Console settings UI posts.
BRANDING_SLOTS = ('member_logo', 'console_logo', 'manager_logo', 'footer_logo', 'favicon')


def _branding_payload(request, branding):
    def url(field):
        f = getattr(branding, field)
        return request.build_absolute_uri(f.url) if f else None

    return {f'{slot}_url': url(slot) for slot in BRANDING_SLOTS}


class PlatformBrandingView(views.APIView):
    """
    GET /api/v1/platform-branding/ — public, unauthenticated.
    All three frontends read this (including pre-login pages), so it can't
    require a JWT the way admin-portal endpoints do.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(_branding_payload(request, PlatformBranding.current()))


class UpdatePlatformBrandingView(views.APIView):
    """
    PATCH /api/v1/admin-portal/platform-branding/ — super_admin only.
    Body: multipart/form-data with any of member_logo / console_logo /
    manager_logo / favicon. Slots not included are left untouched.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        if request.user.role != 'super_admin':
            return Response(
                {'error': 'Super admin access required.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        provided = [slot for slot in BRANDING_SLOTS if slot in request.FILES]
        if not provided:
            return Response(
                {'error': f"Include at least one of: {', '.join(BRANDING_SLOTS)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        branding = PlatformBranding.current()
        for slot in provided:
            setattr(branding, slot, request.FILES[slot])
        branding.updated_by = request.user
        branding.save()

        log_audit(
            action='platform_branding_updated',
            actor=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'slots': provided},
        )
        return Response(_branding_payload(request, branding))
