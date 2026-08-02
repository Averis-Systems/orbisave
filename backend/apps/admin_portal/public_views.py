"""
Public (unauthenticated) endpoints for the marketing site.

These live at the top level of the API, outside the /api/v1/admin-portal/ gate,
and take no authentication so there is no CSRF/JWT requirement for an anonymous
visitor. They are rate-limited with the shared public throttle.
"""
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
import structlog

from common.throttling import PublicRateThrottle
from .models import PartnerEnquiry

logger = structlog.get_logger(__name__)


class PartnerEnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerEnquiry
        fields = ['organization', 'contact_name', 'email', 'phone', 'partner_type', 'message']
        extra_kwargs = {
            'organization': {'required': True, 'allow_blank': False},
            'contact_name': {'required': True, 'allow_blank': False},
            'email': {'required': True},
        }


class PartnerEnquiryCreateView(APIView):
    """
    POST /api/v1/partner-enquiries/  (public)

    A partnership enquiry from the marketing site. Anonymous and throttled; the
    super admin reviews submissions.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # anonymous, so no session/CSRF and no JWT
    throttle_classes = [PublicRateThrottle]

    def post(self, request):
        serializer = PartnerEnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save(source='landing')
        logger.info(
            'partner_enquiry_received',
            enquiry_id=str(enquiry.id),
            organization=enquiry.organization,
            partner_type=enquiry.partner_type,
        )
        return Response(
            {'message': 'Thank you. Our partnerships team will be in touch.'},
            status=status.HTTP_201_CREATED,
        )
