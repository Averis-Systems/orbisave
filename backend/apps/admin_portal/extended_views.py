"""Admin Portal — Extended views for groups, loans, contributions, audit, analytics."""
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.groups.models import Group, GroupMember
from apps.loans.models import Loan
from apps.contributions.models import Contribution
from apps.audit.models import AuditLog
from apps.accounts.models import User
from .views import IsPlatformAdmin, IsSuperAdmin
from common.admin_scope import resolve_admin_country, scope_filter, shard_aliases
from common.pagination import (
    RECENT_LIMIT,
    paginate_admin_queryset,
    paginate_sharded,
    resolve_admin_ordering,
)
import structlog

logger = structlog.get_logger(__name__)


def _country_scope(request):
    """
    Queryset filter kwargs for this admin's authorised country.

    Thin adapter over the central resolver so the thirteen call sites in this
    file keep their `**scope` shape. The semantics changed with the move: a
    platform_admin with no country is now refused (it used to filter to
    {'country': None} and silently match NULL rows), and ?country= is honoured
    for super admins while being authorisation-checked for everyone else.
    """
    return scope_filter(resolve_admin_country(request))


# ── Group Detail ─────────────────────────────────────────────────────────────

class AdminGroupDetailView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, group_id):
        scope = _country_scope(request)
        try:
            g = Group.objects.get(
                id=group_id, **scope
            )
        except Group.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=404)

        from apps.ledger.models import LedgerEntry
        from apps.payouts.models import Payout

        wallet = LedgerEntry.objects.filter(group=g).aggregate(
            total_contributions=Sum('amount', filter=Q(entry_type='contribution', direction='credit')),
            total_payouts=Sum('amount', filter=Q(entry_type='payout', direction='debit')),
            total_loans_out=Sum('amount', filter=Q(entry_type='loan_disbursement', direction='debit')),
            total_repaid=Sum('amount', filter=Q(entry_type='loan_repayment', direction='credit')),
        )

        members = GroupMember.objects.filter(group=g)
        loans = Loan.objects.filter(group=g)
        contribs = Contribution.objects.filter(group=g)

        return Response({
            'id': str(g.id),
            'name': g.name,
            'description': g.description,
            'country': g.country,
            'currency': g.currency,
            'status': g.status,
            'verification_status': g.verification_status,
            'verification_note': g.verification_note,
            'verified_at': g.verified_at.isoformat() if g.verified_at else None,
            'verified_by': g.verified_by.full_name if g.verified_by else None,
            'chairperson': {
                'id': str(g.chairperson.id),
                'name': g.chairperson.full_name,
                'email': g.chairperson.email,
                'phone': g.chairperson.phone,
                'kyc_status': g.chairperson.kyc_status,
            } if g.chairperson_id else None,
            'treasurer': {
                'id': str(g.treasurer.id),
                'name': g.treasurer.full_name,
                'email': g.treasurer.email,
            } if g.treasurer_id else None,
            'contribution_amount': str(g.contribution_amount),
            'contribution_frequency': g.contribution_frequency,
            'max_members': g.max_members,
            'rotation_savings_pct': str(g.rotation_savings_pct),
            'loan_pool_pct': str(g.loan_pool_pct),
            'max_loan_multiplier': str(g.max_loan_multiplier),
            'loan_interest_rate_monthly': str(g.loan_interest_rate_monthly),
            'invite_code': g.invite_code,
            'trust_account_ref': g.trust_account_ref,
            'created_at': g.created_at.isoformat(),
            'member_count': members.filter(status='active').count(),
            'wallet': {
                'total_contributions': str(wallet['total_contributions'] or 0),
                'total_payouts': str(wallet['total_payouts'] or 0),
                'total_loans_disbursed': str(wallet['total_loans_out'] or 0),
                'total_loan_repayments': str(wallet['total_repaid'] or 0),
            },
            'loan_summary': {
                'total': loans.count(),
                'pending_admin': loans.filter(status='pending_admin').count(),
                'active': loans.filter(status='active').count(),
                'defaulted': loans.filter(status='defaulted').count(),
            },
            'contribution_summary': {
                'total': contribs.count(),
                'confirmed': contribs.filter(status='confirmed').count(),
                'failed': contribs.filter(status='failed').count(),
                'pending': contribs.filter(status__in=['scheduled', 'initiated', 'pending']).count(),
            },
        })


class AdminGroupMembersView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, group_id):
        scope = _country_scope(request)
        try:
            g = Group.objects.get(id=group_id, **scope)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=404)

        members = GroupMember.objects.filter(group=g).order_by('rotation_position')
        results = []
        for m in members:
            u = m.member
            confirmed = Contribution.objects.filter(group=g, member=u, status='confirmed').count()
            total_scheduled = Contribution.objects.filter(group=g, member=u).count()
            results.append({
                'membership_id': str(m.id),
                'user_id': str(u.id),
                'full_name': u.full_name,
                'email': u.email,
                'phone': u.phone,
                'kyc_status': u.kyc_status,
                'role': m.role if hasattr(m, 'role') else 'member',
                'status': m.status,
                'rotation_position': m.rotation_position,
                'joined_at': m.joined_at.isoformat(),
                'contributions_confirmed': confirmed,
                'contributions_total': total_scheduled,
                'compliance_rate': round((confirmed / total_scheduled * 100) if total_scheduled else 0, 1),
            })
        return Response({'count': len(results), 'results': results})


class AdminGroupContributionsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, group_id):
        scope = _country_scope(request)
        try:
            g = Group.objects.get(id=group_id, **scope)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=404)

        qs = Contribution.objects.filter(group=g).order_by('-created_at')
        s = request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)

        page_items, meta = paginate_admin_queryset(request, qs)
        results = []
        for c in page_items:
            results.append({
                'id': str(c.id),
                'member_name': c.member.full_name,
                'member_phone': c.member.phone,
                'amount': str(c.amount),
                'currency': c.currency,
                'method': c.method,
                'mobile_number': c.mobile_number,
                'provider_reference': c.provider_reference,
                'platform_reference': c.platform_reference,
                'status': c.status,
                'scheduled_date': c.scheduled_date.isoformat() if c.scheduled_date else None,
                'confirmed_at': c.confirmed_at.isoformat() if c.confirmed_at else None,
                'failure_reason': c.failure_reason,
                'retry_count': c.retry_count,
                'created_at': c.created_at.isoformat(),
            })
        return Response({**meta, 'results': results})


class AdminGroupLoansView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, group_id):
        scope = _country_scope(request)
        try:
            g = Group.objects.get(id=group_id, **scope)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=404)

        qs = Loan.objects.filter(group=g).order_by('-created_at')
        s = request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)

        page_items, meta = paginate_admin_queryset(request, qs)
        results = []
        for loan in page_items:
            results.append({
                'id': str(loan.id),
                'borrower_name': loan.borrower.full_name,
                'borrower_phone': loan.borrower.phone,
                'amount': str(loan.amount),
                'currency': loan.currency,
                'purpose': loan.purpose,
                'status': loan.status,
                'interest_rate_monthly': str(loan.interest_rate_monthly),
                'term_weeks': loan.term_weeks,
                'disbursed_at': loan.disbursed_at.isoformat() if loan.disbursed_at else None,
                'fully_repaid_at': loan.fully_repaid_at.isoformat() if loan.fully_repaid_at else None,
                'created_at': loan.created_at.isoformat(),
            })
        return Response({**meta, 'results': results})


class AdminGroupLedgerView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, group_id):
        scope = _country_scope(request)
        try:
            g = Group.objects.get(id=group_id, **scope)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=404)

        from apps.ledger.models import LedgerEntry
        qs = LedgerEntry.objects.filter(group=g).order_by('-created_at')

        page_items, meta = paginate_admin_queryset(request, qs)
        results = []
        for e in page_items:
            results.append({
                'id': str(e.id),
                'entry_type': e.entry_type,
                'direction': e.direction,
                'amount': str(e.amount),
                'currency': e.currency,
                'running_balance': str(e.running_balance),
                'description': e.description,
                'reference': e.reference,
                'member_name': e.member.full_name if e.member_id else None,
                'hash': e.hash[:16] + '...' if e.hash else None,
                'created_at': e.created_at.isoformat(),
            })
        return Response({**meta, 'results': results})


# ── Loan Administration ───────────────────────────────────────────────────────

class AdminLoanListView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        country = resolve_admin_country(request)
        status_filter = request.query_params.get('status')
        search = (request.query_params.get('search') or '').strip()

        ordering = resolve_admin_ordering(
            request, allowed={'created_at', 'amount', 'status'},
        )
        sort_field = ordering.lstrip('-')

        # Borrowers are Users on 'default', while loans are on the country
        # shards, so a borrower-name search cannot be a join (cross-database
        # joins are not possible). Resolve matching borrower ids from 'default'
        # first, then filter loans by id. select_related is limited to 'group'
        # for the same reason: the group is on the shard, the borrower is not.
        borrower_ids = None
        if search:
            borrower_ids = list(
                User.objects.filter(full_name__icontains=search).values_list('id', flat=True)
            )

        def build_qs(alias):
            # Read each shard with an explicit .using(): an unscoped super_admin
            # query routes to 'default', where no loans live, so the
            # platform-wide list came back empty.
            qs = Loan.objects.using(alias).select_related('group')
            if country:
                qs = qs.filter(group__country=country)
            if status_filter:
                qs = qs.filter(status=status_filter)
            if search:
                qs = qs.filter(
                    Q(borrower_id__in=borrower_ids) | Q(group__name__icontains=search)
                )
            return qs.order_by(ordering)

        page_items, meta = paginate_sharded(
            request,
            shard_aliases(country),
            build_qs,
            sort_key=lambda loan: getattr(loan, sort_field),
            reverse=ordering.startswith('-'),
        )
        # Borrowers are on 'default'; fetch every borrower on this page in one
        # query and map by id, rather than lazy-loading each (which would be a
        # cross-database round trip per row).
        borrowers = {
            str(u['id']): u
            for u in User.objects.filter(
                id__in=[loan.borrower_id for loan in page_items]
            ).values('id', 'full_name', 'phone')
        }

        results = []
        for loan in page_items:
            borrower = borrowers.get(str(loan.borrower_id), {})
            results.append({
                'id': str(loan.id),
                'borrower_name': borrower.get('full_name', 'Unknown'),
                'borrower_phone': borrower.get('phone', ''),
                'group_name': loan.group.name,
                'group_country': loan.group.country,
                'amount': str(loan.amount),
                'currency': loan.currency,
                'purpose': loan.purpose,
                'status': loan.status,
                'created_at': loan.created_at.isoformat(),
                'chair_approved_at': loan.chair_approved_at.isoformat() if loan.chair_approved_at else None,
                'treasurer_approved_at': loan.treasurer_approved_at.isoformat() if loan.treasurer_approved_at else None,
            })
        return Response({**meta, 'results': results})


class AdminLoanApproveView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, loan_id):
        # Admin traffic cannot rely on thread-local country routing (the
        # middleware runs before JWT auth) — locate the loan wherever it lives.
        from common.db_utils import find_across_financial_dbs
        loan = find_across_financial_dbs(Loan, id=loan_id)
        if loan is None:
            return Response({'error': 'Loan not found.'}, status=404)
        loan = Loan.objects.using(loan._state.db or 'default').select_related('group').get(id=loan_id)

        if request.user.role != 'super_admin':
            if loan.group.country != request.user.country:
                return Response({'error': 'Forbidden.'}, status=403)

        action = request.data.get('action')
        reason = request.data.get('reason', '').strip()

        if action == 'approve':
            if loan.status != 'pending_admin':
                return Response({'error': f'Loan is not pending admin approval (current: {loan.status}).'}, status=400)
            loan.status = 'approved'
            loan.admin_approved_by = request.user
            loan.admin_approved_at = timezone.now()
            loan.save(update_fields=['status', 'admin_approved_by', 'admin_approved_at'])
            from apps.audit.services import log_audit
            log_audit(action='loan_admin_approved', actor=request.user,
                      target_user=loan.borrower, target_group=loan.group,
                      ip_address=request.META.get('REMOTE_ADDR'),
                      metadata={'amount': str(loan.amount)})
            return Response({'message': 'Loan approved. Disbursement is pending.', 'status': 'approved'})

        elif action == 'disburse':
            if loan.status != 'approved':
                return Response({'error': f'Loan is not approved for disbursement (current: {loan.status}).'}, status=400)
            from apps.loans.services import LoanEngine
            loan = LoanEngine.disburse_loan(
                loan,
                actor=request.user,
                disbursement_reference=request.data.get('disbursement_reference') or None,
            )
            from apps.audit.services import log_audit
            log_audit(action='loan_disbursed', actor=request.user,
                      target_user=loan.borrower, target_group=loan.group,
                      ip_address=request.META.get('REMOTE_ADDR'),
                      metadata={'amount': str(loan.amount), 'reference': loan.disbursement_reference})
            return Response({'message': 'Loan disbursed.', 'status': loan.status})

        elif action == 'reject':
            if not reason:
                return Response({'error': 'Reason required for rejection.'}, status=400)
            loan.status = 'rejected'
            loan.admin_rejection_reason = reason
            loan.admin_approved_by = request.user
            loan.admin_approved_at = timezone.now()
            loan.save(update_fields=['status', 'admin_rejection_reason', 'admin_approved_by', 'admin_approved_at'])
            from apps.audit.services import log_audit
            log_audit(action='loan_admin_rejected', actor=request.user,
                      target_user=loan.borrower, target_group=loan.group,
                      ip_address=request.META.get('REMOTE_ADDR'),
                      metadata={'reason': reason})
            return Response({'message': 'Loan rejected.', 'status': 'rejected'})

        return Response({'error': 'action must be "approve" or "reject".'}, status=400)


# ── Contributions Monitor ─────────────────────────────────────────────────────

class AdminContributionsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        # Contribution is sharded per country, and its member is a User on
        # 'default'. Same two constraints as the loans list: read each shard
        # explicitly so a super_admin does not query the empty 'default'
        # tables, and never join to the member across databases.
        country = resolve_admin_country(request)
        status_filter = request.query_params.get('status')
        search = (request.query_params.get('search') or '').strip()

        ordering = resolve_admin_ordering(request, allowed={'created_at', 'amount', 'status'})
        sort_field = ordering.lstrip('-')

        member_ids = None
        if search:
            member_ids = list(
                User.objects.filter(full_name__icontains=search).values_list('id', flat=True)
            )

        def build_qs(alias):
            qs = Contribution.objects.using(alias).select_related('group')
            if country:
                qs = qs.filter(group__country=country)
            if status_filter:
                qs = qs.filter(status=status_filter)
            if search:
                qs = qs.filter(
                    Q(member_id__in=member_ids) | Q(provider_reference__icontains=search)
                )
            return qs.order_by(ordering)

        page_items, meta = paginate_sharded(
            request,
            shard_aliases(country),
            build_qs,
            sort_key=lambda c: getattr(c, sort_field),
            reverse=ordering.startswith('-'),
        )

        members = {
            str(u['id']): u
            for u in User.objects.filter(
                id__in=[c.member_id for c in page_items]
            ).values('id', 'full_name', 'phone')
        }

        results = []
        for c in page_items:
            member = members.get(str(c.member_id), {})
            results.append({
                'id': str(c.id),
                'member_name': member.get('full_name', 'Unknown'),
                'member_phone': member.get('phone', ''),
                'group_name': c.group.name,
                'group_country': c.group.country,
                'amount': str(c.amount),
                'currency': c.currency,
                'method': c.method,
                'provider_reference': c.provider_reference,
                'status': c.status,
                'scheduled_date': c.scheduled_date.isoformat() if c.scheduled_date else None,
                'confirmed_at': c.confirmed_at.isoformat() if c.confirmed_at else None,
                'failure_reason': c.failure_reason,
                'retry_count': c.retry_count,
                'created_at': c.created_at.isoformat(),
            })
        return Response({**meta, 'results': results})


# ── Audit Trail ───────────────────────────────────────────────────────────────

class AdminAuditView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        scope = _country_scope(request)
        qs = AuditLog.objects.select_related('actor', 'target_user').order_by('-created_at')
        if 'country' in scope:
            qs = qs.filter(country=scope['country'])

        action_filter = request.query_params.get('action')
        search = request.query_params.get('search', '').strip()
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')

        if action_filter:
            qs = qs.filter(action=action_filter)
        if search:
            qs = qs.filter(
                Q(actor__full_name__icontains=search) |
                Q(actor__email__icontains=search)
            )
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        page_items, meta = paginate_admin_queryset(request, qs)
        results = []
        for log in page_items:
            results.append({
                'id': str(log.id),
                'action': log.action,
                'actor_name': log.actor.full_name if log.actor_id else 'System',
                'actor_email': log.actor.email if log.actor_id else None,
                'target_user': log.target_user.full_name if log.target_user_id else None,
                'country': log.country,
                'ip_address': log.ip_address,
                'metadata': log.metadata,
                'previous_state': log.previous_state,
                'new_state': log.new_state,
                'session_id': log.session_id,
                'created_at': log.created_at.isoformat(),
            })
        return Response({**meta, 'results': results})


# ── Analytics ─────────────────────────────────────────────────────────────────

class AdminAnalyticsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        scope = _country_scope(request)
        country = scope.get('country') or request.query_params.get('country')

        group_qs = Group.objects.all()
        user_qs = User.objects.all()
        contrib_qs = Contribution.objects.all()
        loan_qs = Loan.objects.all()

        if country:
            group_qs = group_qs.filter(country=country)
            user_qs = user_qs.filter(country=country)
            contrib_qs = contrib_qs.filter(group__country=country)
            loan_qs = loan_qs.filter(group__country=country)

        from django.utils.timezone import now
        from datetime import timedelta
        this_month = now().replace(day=1, hour=0, minute=0, second=0)
        last_month = (this_month - timedelta(days=1)).replace(day=1)

        contrib_this_month = contrib_qs.filter(
            status='confirmed', confirmed_at__gte=this_month
        ).aggregate(total=Sum('amount'))['total'] or 0

        contrib_last_month = contrib_qs.filter(
            status='confirmed',
            confirmed_at__gte=last_month,
            confirmed_at__lt=this_month
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Monthly contribution trend (last 6 months)
        monthly_trend = []
        for i in range(5, -1, -1):
            month_start = (now().replace(day=1) - timedelta(days=30 * i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            val = contrib_qs.filter(
                status='confirmed',
                confirmed_at__gte=month_start,
                confirmed_at__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            monthly_trend.append({
                'month': month_start.strftime('%b %Y'),
                'contributions': float(val),
            })

        return Response({
            'summary': {
                'total_groups': group_qs.count(),
                'active_groups': group_qs.filter(status='active').count(),
                'pending_review': group_qs.filter(verification_status='pending_review').count(),
                'total_members': user_qs.filter(role__in=['member', 'chairperson', 'treasurer']).count(),
                'kyc_verified': user_qs.filter(kyc_status='verified').count(),
                'kyc_pending': user_qs.filter(kyc_status='submitted').count(),
                'total_contributions_this_month': float(contrib_this_month),
                'total_contributions_last_month': float(contrib_last_month),
                'active_loans': loan_qs.filter(status='active').count(),
                'pending_admin_loans': loan_qs.filter(status='pending_admin').count(),
                'defaulted_loans': loan_qs.filter(status='defaulted').count(),
                'total_loan_value': float(
                    loan_qs.filter(status__in=['active', 'disbursed']).aggregate(
                        t=Sum('amount'))['t'] or 0
                ),
            },
            'monthly_contribution_trend': monthly_trend,
        })


# ── User Actions ──────────────────────────────────────────────────────────────

class AdminUserDetailView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, user_id):
        scope = _country_scope(request)
        try:
            u = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        if 'country' in scope and u.country != scope['country']:
            return Response({'error': 'Forbidden.'}, status=403)

        # Membership lives on the member's country shard, not 'default'. Read
        # it explicitly, or a super_admin (routed to 'default') sees no groups
        # for anyone. A member with no country has no shard and no membership.
        if u.country:
            from common.db_utils import get_db_for_country
            memberships = list(
                GroupMember.objects.using(get_db_for_country(u.country))
                .filter(member=u)
                .select_related('group')
            )
        else:
            memberships = []
        # Deliberately bounded recent-activity view, not a truncation bug: the
        # full history belongs to the paginated audit list endpoint.
        audit_logs = AuditLog.objects.filter(
            Q(actor=u) | Q(target_user=u)
        ).order_by('-created_at')[:RECENT_LIMIT]

        from apps.accounts.serializers import KYCDocumentSerializer
        kyc_docs = u.kyc_documents.all()

        return Response({
            'id': str(u.id),
            'full_name': u.full_name,
            'email': u.email,
            'phone': u.phone,
            'role': u.role,
            'country': u.country,
            'kyc_status': u.kyc_status,
            'phone_verified': u.phone_verified,
            'two_factor_enabled': u.two_factor_enabled,
            'mobile_money_provider': u.mobile_money_provider,
            'mobile_money_number': u.mobile_money_number,
            'last_login_ip': u.last_login_ip,
            'is_active': u.is_active,
            'date_of_birth': u.date_of_birth.isoformat() if u.date_of_birth else None,
            'national_id': u.national_id,
            'created_at': u.created_at.isoformat(),
            'kyc_documents': KYCDocumentSerializer(kyc_docs, many=True, context={'request': request}).data,
            'group_memberships': [
                {
                    'group_id': str(m.group.id),
                    'group_name': m.group.name,
                    'role': m.role if hasattr(m, 'role') else 'member',
                    'status': m.status,
                    'joined_at': m.joined_at.isoformat(),
                }
                for m in memberships
            ],
            'recent_audit': [
                {
                    'action': a.action,
                    'actor': a.actor.full_name if a.actor_id else 'System',
                    'country': a.country,
                    'ip_address': a.ip_address,
                    'created_at': a.created_at.isoformat(),
                    'metadata': a.metadata,
                }
                for a in audit_logs
            ],
        })


class AdminUserSuspendView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, user_id):
        try:
            u = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        scope = _country_scope(request)
        if 'country' in scope and u.country != scope['country']:
            return Response({'error': 'Forbidden.'}, status=403)
        if u.role in ('super_admin', 'platform_admin'):
            return Response({'error': 'Cannot suspend admin accounts from this portal.'}, status=403)

        action = request.data.get('action', 'suspend')
        reason = request.data.get('reason', '')

        if action == 'suspend':
            u.is_active = False
            u.save(update_fields=['is_active'])
            from apps.audit.services import log_audit
            log_audit(action='admin_action', actor=request.user, target_user=u,
                      country=u.country, ip_address=request.META.get('REMOTE_ADDR'),
                      metadata={'action': 'suspend', 'reason': reason})
            return Response({'message': f'{u.full_name} suspended.', 'is_active': False})
        else:
            u.is_active = True
            u.save(update_fields=['is_active'])
            from apps.audit.services import log_audit
            log_audit(action='admin_action', actor=request.user, target_user=u,
                      country=u.country, ip_address=request.META.get('REMOTE_ADDR'),
                      metadata={'action': 'reinstate'})
            return Response({'message': f'{u.full_name} reinstated.', 'is_active': True})


class AdminUserKycResetView(APIView):
    """
    POST /api/v1/admin-portal/users/<id>/kyc-reset/  {reason}

    Returns a member's KYC to 'pending' so they can resubmit from scratch.

    This is the recovery path for the states the normal review flow cannot fix:
    a wrong rejection the member cannot appeal, a wrong approval that must be
    withdrawn, or a submission stuck behind an unreadable document. Any open
    'submitted' document is rejected with the admin's reason at the same time,
    so the review queue does not keep showing paperwork that no longer counts.

    Deliberately NOT offered for admins, and a reason is mandatory because the
    member sees the effect (their app returns to the KYC step) and other admins
    see the audit row. Resetting a verified chairperson does not un-verify
    their group: group verification is a separate decision with its own flow,
    and silently cascading it here would be a surprise with financial side
    effects.
    """
    permission_classes = [IsPlatformAdmin]

    def post(self, request, user_id):
        try:
            u = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        scope = _country_scope(request)
        if 'country' in scope and u.country != scope['country']:
            return Response({'error': 'Forbidden.'}, status=403)
        if u.role in ('super_admin', 'platform_admin'):
            return Response({'error': 'Admin accounts do not go through member KYC.'}, status=403)

        reason = str(request.data.get('reason', '')).strip()
        if not reason:
            return Response({'error': 'A reason is required to reset KYC.'}, status=400)
        if u.kyc_status == 'pending' and not u.kyc_documents.filter(status='submitted').exists():
            return Response({'error': 'KYC is already pending with nothing to reset.'}, status=400)

        previous = u.kyc_status

        # Close any open submission so the review queue stays truthful.
        from django.utils import timezone as tz
        u.kyc_documents.filter(status='submitted').update(
            status='rejected',
            rejection_reason=f'Reset by admin: {reason}',
            reviewed_by=request.user,
            reviewed_at=tz.now(),
        )

        u.kyc_status = 'pending'
        u.save(update_fields=['kyc_status'])

        from apps.audit.services import log_audit
        log_audit(
            action='admin_action',
            actor=request.user,
            target_user=u,
            country=u.country,
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'action': 'kyc_reset', 'reason': reason, 'previous_status': previous},
        )

        return Response({
            'message': f"{u.full_name}'s KYC was reset. They can resubmit documents now.",
            'kyc_status': 'pending',
        })


# ── Trust Account ─────────────────────────────────────────────────────────────

class AdminTrustAccountView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        scope = _country_scope(request)
        country = scope.get('country') or request.query_params.get('country', 'kenya')

        # Fetch live balance from configured bank provider
        balance_data = {'balance': None, 'currency': None, 'error': None, 'source': 'bank_api'}
        try:
            from apps.payments.selector import get_payment_provider
            provider = get_payment_provider(country)
            if hasattr(provider, 'get_account_balance'):
                raw = provider.get_account_balance()
                balance_data['balance'] = raw.get('balances', [{}])[0].get('amount', 0)
                balance_data['currency'] = raw.get('balances', [{}])[0].get('currency', '')
                balance_data['fetched_at'] = timezone.now().isoformat()
            else:
                balance_data['error'] = 'Provider does not support account balance queries.'
        except Exception as exc:
            balance_data['error'] = str(exc)
            balance_data['source'] = 'error'

        # Ledger total for this country
        from apps.ledger.models import LedgerEntry
        ledger_total = LedgerEntry.objects.filter(
            group__country=country
        ).aggregate(
            credits=Sum('amount', filter=Q(direction='credit')),
            debits=Sum('amount', filter=Q(direction='debit')),
        )
        ledger_net = float(ledger_total['credits'] or 0) - float(ledger_total['debits'] or 0)

        return Response({
            'country': country,
            'bank_balance': balance_data,
            'ledger_net': ledger_net,
            'delta': float(balance_data.get('balance') or 0) - ledger_net,
            'last_reconciled_at': None,  # TODO: store reconciliation records
        })
