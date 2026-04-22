"""
KYC (Know Your Customer) views for OrbiSave.
Satisfies Frontend System Design Checklist Section 4 (KYC Flow).

Flow:
    1. POST /api/v1/kyc/submit/      — member submits identity documents
    2. GET  /api/v1/kyc/status/      — member checks their verification status
    3. POST /api/v1/kyc/pin/set/     — member sets transaction PIN post-KYC
"""
import structlog
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated

from .models import KYCDocument, User

logger = structlog.get_logger(__name__)

ALLOWED_DOCUMENT_TYPES = ['national_id', 'passport', 'drivers_license']


class KYCSubmitView(APIView):
    """
    Allows a user to submit identity documents for KYC verification.
    Chairpersons must complete this before activating a group.
    Treasurers must complete this when the role is assigned.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        user = request.user
        document_type = request.data.get('document_type', '').strip()
        front_image   = request.FILES.get('front_image')
        back_image    = request.FILES.get('back_image')  # optional for passports

        if not document_type or document_type not in ALLOWED_DOCUMENT_TYPES:
            return Response(
                {'error': f"document_type must be one of: {', '.join(ALLOWED_DOCUMENT_TYPES)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not front_image:
            return Response(
                {'error': 'front_image file is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent re-submission if already verified
        if user.kyc_status == 'verified':
            return Response(
                {'message': 'Your identity is already verified.'},
                status=status.HTTP_200_OK,
            )

        # Create or update the submitted KYC document record
        doc, created = KYCDocument.objects.update_or_create(
            user=user,
            document_type=document_type,
            defaults={
                'front_image': front_image,
                'back_image': back_image,
                'status': 'pending',
            }
        )

        # Transition user kyc_status to 'submitted' so platform admin can action it
        if user.kyc_status in ('pending', 'rejected'):
            user.kyc_status = 'submitted'
            user.save(update_fields=['kyc_status'])

        logger.info('kyc_document_submitted', user_id=user.id, doc_type=document_type, created=created)

        return Response({
            'message': 'KYC documents submitted successfully. Verification is pending review.',
            'kyc_status': user.kyc_status,
            'document_id': str(doc.id),
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class KYCStatusView(APIView):
    """Returns the authenticated user's current KYC verification status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        documents = KYCDocument.objects.filter(user=user).values(
            'document_type', 'status', 'reviewed_at'
        )
        return Response({
            'kyc_status': user.kyc_status,
            'documents': list(documents),
            'requires_kyc_for_roles': ['chairperson', 'treasurer'],
        })
