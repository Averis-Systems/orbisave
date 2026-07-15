from rest_framework import status, views
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.admin_portal.models import PlatformBranding
from apps.audit.services import log_audit


def _branding_payload(request, branding):
    return {
        'logo_url': request.build_absolute_uri(branding.logo.url) if branding.logo else None,
        'favicon_url': request.build_absolute_uri(branding.favicon.url) if branding.favicon else None,
    }


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
    Body: multipart/form-data with an optional 'logo' and/or 'favicon' file.
    Sending only one of the two leaves the other untouched.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        if request.user.role != 'super_admin':
            return Response(
                {'error': 'Super admin access required.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if 'logo' not in request.FILES and 'favicon' not in request.FILES:
            return Response(
                {'error': "Include a 'logo' and/or 'favicon' file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        branding = PlatformBranding.current()
        if 'logo' in request.FILES:
            branding.logo = request.FILES['logo']
        if 'favicon' in request.FILES:
            branding.favicon = request.FILES['favicon']
        branding.updated_by = request.user
        branding.save()

        log_audit(
            action='platform_branding_updated',
            actor=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(_branding_payload(request, branding))
