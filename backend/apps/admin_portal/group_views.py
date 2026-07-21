"""
Admin Portal — Group Management Views
=======================================
Country-scoped group listing, verification, and stats for the Manager portal.
Super admin can see and manage all countries.
"""
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.groups.models import Group, GroupMember
from apps.groups.serializers import GroupSerializer
from apps.audit.services import log_audit
from common.admin_scope import resolve_admin_country, scope_filter, shard_aliases
from common.pagination import (
    apply_admin_ordering,
    paginate_admin_queryset,
    paginate_sharded,
    resolve_admin_ordering,
)
import structlog

from .views import IsPlatformAdmin, IsSuperAdmin

logger = structlog.get_logger(__name__)

COUNTRY_DATABASE_ALIASES = ['kenya', 'rwanda', 'ghana']


def _admin_country_aliases(user):
    if user.role == 'super_admin':
        return COUNTRY_DATABASE_ALIASES
    if user.country in COUNTRY_DATABASE_ALIASES:
        return [user.country]
    return ['default']


def _get_group_for_admin(user, group_id):
    for alias in _admin_country_aliases(user):
        group = Group.objects.using(alias).filter(id=group_id).first()
        if group:
            return group
    return None


class AdminGroupListView(APIView):
    """
    GET /api/v1/admin-portal/groups/
    Lists groups scoped to the admin's country.
    super_admin sees all countries.

    Query params:
      ?verification_status=pending_review|verified|rejected
      ?status=active|paused|closed
      ?country=kenya|rwanda|ghana   (super_admin only)
      ?search=name
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        # Central resolver: honours ?country= for super admins, refuses it for
        # anyone else (it used to be silently ignored, so the URL looked like
        # it worked), and refuses a platform_admin with no country outright.
        country = resolve_admin_country(request)

        v_status = request.query_params.get('verification_status')
        g_status = request.query_params.get('status')
        search   = request.query_params.get('search', '').strip()

        ordering = resolve_admin_ordering(
            request, allowed={'created_at', 'name', 'country', 'status', 'verification_status'},
        )
        sort_field = ordering.lstrip('-')

        def build_qs(alias):
            # Group is sharded per country, so read each shard explicitly.
            # Filtering by the country column alone is not enough: an unscoped
            # super_admin query routes to 'default', where no groups live.
            qs = Group.objects.using(alias).all()
            if country:
                qs = qs.filter(country=country)
            if v_status:
                qs = qs.filter(verification_status=v_status)
            if g_status:
                qs = qs.filter(status=g_status)
            if search:
                qs = qs.filter(name__icontains=search)
            return qs.order_by(ordering)

        page_items, meta = paginate_sharded(
            request,
            shard_aliases(country),
            build_qs,
            sort_key=lambda g: getattr(g, sort_field),
            reverse=ordering.startswith('-'),
        )

        # Inline minimal serialization (avoid importing full group serializer cross-DB)
        results = []
        for g in page_items:
            results.append({
                'id':                  str(g.id),
                'name':                g.name,
                'description':         g.description,
                'country':             g.country,
                'status':              g.status,
                'verification_status': g.verification_status,
                'verification_note':   g.verification_note,
                'verified_at':         g.verified_at.isoformat() if g.verified_at else None,
                'verified_by':         g.verified_by.full_name if g.verified_by else None,
                'chairperson_name':    g.chairperson.full_name if g.chairperson_id else None,
                'chairperson_email':   g.chairperson.email if g.chairperson_id else None,
                'contribution_amount': str(g.contribution_amount),
                'currency':            g.currency,
                'max_members':         g.max_members,
                'created_at':          g.created_at.isoformat(),
            })

        return Response({**meta, 'results': results})


class AdminGroupVerifyView(APIView):
    """
    POST /api/v1/admin-portal/groups/<group_id>/verify/

    Body:
        action  – 'verify' or 'reject'
        note    – optional for verify, required for reject

    Enforces country scope: platform_admin can only act on their own country's groups.
    """
    permission_classes = [IsPlatformAdmin]

    def post(self, request, group_id):
        action = request.data.get('action', '').lower()
        note   = request.data.get('note', '').strip()

        if action not in ('verify', 'reject'):
            return Response(
                {'error': "action must be 'verify' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if action == 'reject' and not note:
            return Response(
                {'error': 'note (rejection reason) is required when rejecting a group.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = _get_group_for_admin(request.user, group_id)
        if group is None:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        db_alias = group._state.db or group.country

        # Enforce country scope
        if request.user.role != 'super_admin':
            if group.country != request.user.country:
                return Response({'error': 'Forbidden — this group belongs to a different country.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()

        if action == 'verify':
            # Governance gate: a group cannot be verified until its chairperson
            # has completed KYC. Chairpersons control invites, payouts, and loan
            # approvals — verifying a group under an unverified identity would
            # let real money move under an unknown person.
            from apps.accounts.models import User
            chairperson = User.objects.filter(id=group.chairperson_id).first()
            if chairperson is None or chairperson.kyc_status != 'verified':
                return Response(
                    {
                        'error': (
                            'Group cannot be verified: the chairperson has not completed KYC '
                            'verification. Review their KYC submission first (KYC Review queue), '
                            'then verify the group.'
                        ),
                        'chairperson_kyc_status': getattr(chairperson, 'kyc_status', 'missing'),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            group.verification_status = 'verified'
            group.status              = 'pending_activation'
            group.verification_note   = note
            group.verified_by         = request.user
            group.verified_at         = now
            group.save(using=db_alias, update_fields=['verification_status', 'status', 'verification_note', 'verified_by', 'verified_at'])
            GroupMember.objects.using(db_alias).filter(
                group=group,
                role='chairperson',
                status='pending_approval',
            ).update(status='pending_session_refresh')

            from apps.notifications.services import notify_group_verification
            notify_group_verification(group, 'verify', note)

            log_audit(
                action='group_verified',
                actor=request.user,
                target_group=group,
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'note': note},
            )
            logger.info('group_verified', group_id=str(group_id), admin=str(request.user.id))
            return Response({
                'message': f'Group "{group.name}" has been verified. First contribution is required before activation.',
                'verification_status': 'verified',
                'status': 'pending_activation',
            })

        else:  # reject
            group.verification_status = 'rejected'
            group.status              = 'paused'
            group.verification_note   = note
            group.verified_by         = request.user
            group.verified_at         = now
            group.save(using=db_alias, update_fields=['verification_status', 'status', 'verification_note', 'verified_by', 'verified_at'])

            from apps.notifications.services import notify_group_verification
            notify_group_verification(group, 'reject', note)

            log_audit(
                action='group_rejected',
                actor=request.user,
                target_group=group,
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'reason': note},
            )
            logger.info('group_rejected', group_id=str(group_id), admin=str(request.user.id))
            return Response({'message': f'Group "{group.name}" has been rejected.', 'verification_status': 'rejected'})


class AdminGroupStatsView(APIView):
    """
    GET /api/v1/admin-portal/group-stats/
    Returns group counts broken down by verification_status for the admin's country.
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        is_super = request.user.role == 'super_admin'
        country = resolve_admin_country(request)
        base_qs = Group.objects.filter(**scope_filter(country))

        from apps.accounts.models import User
        stats = {
            'country':        country or 'all',
            'total_groups':   base_qs.count(),
            'total_members':  User.objects.filter(**scope_filter(country)).filter(role='member').count(),
            'pending_review': base_qs.filter(verification_status='pending_review').count(),
            'verified':       base_qs.filter(verification_status='verified').count(),
            'rejected':       base_qs.filter(verification_status='rejected').count(),
            'active':         base_qs.filter(status='active').count(),
            'paused':         base_qs.filter(status='paused').count(),
            'closed':         base_qs.filter(status='closed').count(),
        }

        if is_super:
            stats['by_country'] = [
                {
                    'country':        c,
                    'total':          Group.objects.filter(country=c).count(),
                    'pending_review': Group.objects.filter(country=c, verification_status='pending_review').count(),
                    'verified':       Group.objects.filter(country=c, verification_status='verified').count(),
                }
                for c in ['kenya', 'rwanda', 'ghana']
            ]

        return Response(stats)


class AdminPlatformAdminListView(APIView):
    """
    GET /api/v1/admin-portal/platform-admins/
    Super admin only. Lists all country admins across all countries.

    Returns an explicit field list rather than UserSerializer. Console's staff
    view needs is_active and last_login to tell a working account from a
    suspended or never-used one, and UserSerializer carries neither. Widening
    that serializer was the alternative, but it also serves the member app's
    own profile endpoints, so the extra fields are scoped to this view instead.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.accounts.models import User

        qs = User.objects.filter(role='platform_admin')

        country = request.query_params.get('country')
        if country:
            qs = qs.filter(country=country)

        # Search and paging exist because Console's staff table offers both.
        # A search box wired to an endpoint that ignores the term is exactly
        # the decorative control the standing rule forbids.
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(full_name__icontains=search) | Q(email__icontains=search))

        qs = apply_admin_ordering(
            request, qs, allowed={'created_at', 'full_name', 'country', 'last_login'},
            default='country',
        )
        page_items, meta = paginate_admin_queryset(request, qs)

        results = list(page_items.values(
            'id', 'email', 'full_name', 'phone', 'country',
            'is_active', 'email_verified', 'last_login', 'created_at',
        ))
        for row in results:
            row['id'] = str(row['id'])

        return Response({**meta, 'results': results})
