from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, KYCDocument
from apps.accounts.serializers import KYCDocumentSerializer, UserSerializer
from common.admin_scope import resolve_admin_country, scope_filter
from common.pagination import paginate_admin_queryset
import structlog

logger = structlog.get_logger(__name__)


# ── Permission helpers ───────────────────────────────────────────────────────
# Re-exported from common.permissions: two shadowed definitions of these
# classes used to coexist (this module's and common's), and the common pair
# 500'd on anonymous requests. One implementation now serves both import
# paths, since most admin_portal modules import from `.views`.
from common.permissions import IsPlatformAdmin, IsSuperAdmin  # noqa: F401


# ── Country Admin Views ──────────────────────────────────────────────────────

class AdminDashboardStatsView(APIView):
    """
    GET /api/admin/stats/
    Country-scoped stats for platform_admin users.
    super_admin sees all countries aggregated.
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        user = request.user
        is_super = user.role == 'super_admin'

        country = resolve_admin_country(request)
        users_qs = User.objects.filter(**scope_filter(country))
        kyc_qs   = KYCDocument.objects.filter(user__in=users_qs)

        stats = {
            'country':          country or 'all',
            'total_users':      users_qs.count(),
            'total_members':    users_qs.filter(role='member').count(),
            'verified_users':   users_qs.filter(kyc_status='verified').count(),
            'pending_kyc':      users_qs.filter(kyc_status='submitted').count(),
            'rejected_kyc':     users_qs.filter(kyc_status='rejected').count(),
            'platform_admins':  users_qs.filter(role='platform_admin').count(),
        }

        if is_super:
            # Breakdown per country for super admin
            stats['by_country'] = [
                {
                    'country':       c,
                    'total_users':   User.objects.filter(country=c).count(),
                    'pending_kyc':   User.objects.filter(country=c, kyc_status='submitted').count(),
                    'verified_users': User.objects.filter(country=c, kyc_status='verified').count(),
                }
                for c in ['kenya', 'rwanda', 'ghana']
            ]

        return Response(stats)


class AdminKYCQueueView(APIView):
    """
    GET /api/admin/kyc/queue/
    Returns pending KYC submissions for the admin's country.
    Supports ?status=submitted|approved|rejected filter.
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        kyc_status = request.query_params.get('status', 'submitted')

        qs = KYCDocument.objects.filter(status=kyc_status).select_related('user', 'reviewed_by')

        country = resolve_admin_country(request)
        qs = qs.filter(**scope_filter(country, field='user__country'))

        # This queue used to serialize every matching row with no bound at
        # all, the only admin list that was fully unbounded rather than capped.
        page_items, meta = paginate_admin_queryset(request, qs.order_by('-created_at'))
        serializer = KYCDocumentSerializer(page_items, many=True, context={'request': request})
        return Response({**meta, 'results': serializer.data})


class AdminKYCReviewView(APIView):
    """
    POST /api/admin/kyc/<kyc_id>/review/
    Body: { "action": "approve" | "reject", "rejection_reason": "..." }
    Updates KYCDocument status and syncs user.kyc_status.
    """
    permission_classes = [IsPlatformAdmin]

    def post(self, request, kyc_id):
        action           = request.data.get('action')
        rejection_reason = request.data.get('rejection_reason', '')

        if action not in ('approve', 'reject'):
            return Response(
                {'error': 'action must be "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if action == 'reject' and not rejection_reason.strip():
            return Response(
                {'error': 'rejection_reason is required when rejecting.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            kyc_doc = KYCDocument.objects.select_related('user').get(id=kyc_id)
        except KYCDocument.DoesNotExist:
            return Response({'error': 'KYC submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce country scope for non-super admins
        if request.user.role != 'super_admin':
            if kyc_doc.user.country != request.user.country:
                return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        if action == 'approve':
            kyc_doc.status      = 'approved'
            kyc_doc.reviewed_at = now
            kyc_doc.reviewed_by = request.user
            kyc_doc.save(update_fields=['status', 'reviewed_at', 'reviewed_by'])

            # Activate user
            kyc_doc.user.kyc_status = 'verified'
            kyc_doc.user.save(update_fields=['kyc_status'])
            from apps.groups.lifecycle import verify_pending_groups_for_chairperson
            verify_pending_groups_for_chairperson(
                kyc_doc.user,
                verified_by=request.user,
                note='Chairperson KYC approved.',
            )

            logger.info('kyc_approved', kyc_id=str(kyc_id), admin=str(request.user.id))
            return Response({'message': 'KYC approved. User account activated.', 'kyc_status': 'verified'})

        else:  # reject
            kyc_doc.status           = 'rejected'
            kyc_doc.rejection_reason = rejection_reason
            kyc_doc.reviewed_at      = now
            kyc_doc.reviewed_by      = request.user
            kyc_doc.save(update_fields=['status', 'rejection_reason', 'reviewed_at', 'reviewed_by'])

            kyc_doc.user.kyc_status = 'rejected'
            kyc_doc.user.save(update_fields=['kyc_status'])

            logger.info('kyc_rejected', kyc_id=str(kyc_id), admin=str(request.user.id))
            return Response({'message': 'KYC rejected.', 'kyc_status': 'rejected'})


class AdminUserListView(APIView):
    """
    GET /api/admin/users/
    Lists users for the admin's country with optional filters:
      ?kyc_status=pending|submitted|verified|rejected
      ?role=member|chairperson|...
      ?search=name_or_email
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        # Same central-resolver semantics as the group list: authorisation
        # checked ?country=, and a country-less platform_admin is refused.
        country = resolve_admin_country(request)
        qs = User.objects.filter(**scope_filter(country))

        kyc_status = request.query_params.get('kyc_status')
        role       = request.query_params.get('role')
        search     = request.query_params.get('search', '').strip()

        if kyc_status: qs = qs.filter(kyc_status=kyc_status)
        if role:       qs = qs.filter(role=role)
        if search:     qs = qs.filter(full_name__icontains=search) | qs.filter(email__icontains=search)

        # Exclude super admins from the list for security
        qs = qs.exclude(role='super_admin')

        page_items, meta = paginate_admin_queryset(request, qs.order_by('-created_at'))
        serializer = UserSerializer(page_items, many=True)
        return Response({**meta, 'results': serializer.data})
