from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
import structlog

from apps.accounts.models import User, KYCDocument
from apps.audit.models import AuditLog
from common.admin_scope import resolve_admin_country, scope_filter
from common.pagination import paginate_admin_queryset
from common.permissions import IsPlatformAdmin

logger = structlog.get_logger(__name__)

class AdminKYCListView(APIView):
    """
    GET /api/v1/admin-portal/kyc/
    
    Lists KYC submissions for review. 
    Platform Admins see only users in their country.
    Super Admins see all.
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        queryset = KYCDocument.objects.select_related('user').all()

        country = resolve_admin_country(request)
        queryset = queryset.filter(**scope_filter(country, field='user__country'))

        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Serialized every row unbounded before this; reviewers page now.
        page_items, meta = paginate_admin_queryset(request, queryset.order_by('-created_at'))
        data = []
        for doc in page_items:
            data.append({
                'id': doc.id,
                'user': {
                    'full_name': doc.user.full_name,
                    'email': doc.user.email,
                    'country': doc.user.country,
                },
                'document_type': doc.document_type,
                'status': doc.status,
                'created_at': doc.created_at,
                'front_image': doc.front_image.url if doc.front_image else None,
                'back_image': doc.back_image.url if doc.back_image else None,
                'selfie_image': doc.selfie_image.url if doc.selfie_image else None,
            })

        # Envelope, matching every other admin list. Previously a bare array;
        # no frontend consumes this endpoint today (both portals use
        # /kyc/queue/), so the shape change strands nobody.
        return Response({**meta, 'results': data})

class AdminKYCVerifyView(APIView):
    """
    POST /api/v1/admin-portal/kyc/<uuid:pk>/verify/
    
    Approve or Reject a KYC submission.
    """
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        admin = request.user
        doc = get_object_or_404(KYCDocument, pk=pk)

        # Permission check: Platform admin must be in same country
        if admin.role == 'platform_admin' and doc.user.country != admin.country:
            return Response({'error': 'Access denied to this jurisdiction'}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action') # 'approve' or 'reject'
        reason = request.data.get('reason', '')

        if action == 'approve':
            doc.status = 'approved'
            doc.user.kyc_status = 'verified'
            doc.user.save()
            from apps.groups.lifecycle import verify_pending_groups_for_chairperson
            verify_pending_groups_for_chairperson(
                doc.user,
                verified_by=admin,
                note='Chairperson KYC approved.',
            )
        elif action == 'reject':
            if not reason:
                return Response({'error': 'Rejection reason required'}, status=status.HTTP_400_BAD_REQUEST)
            doc.status = 'rejected'
            doc.rejection_reason = reason
            doc.user.kyc_status = 'rejected'
            doc.user.save()
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        doc.reviewed_by = admin
        doc.reviewed_at = timezone.now()
        doc.save()

        # Audit log
        AuditLog.objects.create(
            action=f'kyc_{action}',
            actor=admin,
            target_user=doc.user,
            metadata={'reason': reason} if action == 'reject' else {},
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        logger.info(f'kyc_{action}', admin_email=admin.email, user_email=doc.user.email)

        return Response({'message': f'KYC {action}d successfully'})
