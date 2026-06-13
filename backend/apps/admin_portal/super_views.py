"""Super Admin only views — global oversight, country drilldown, system health, admin management."""
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.groups.models import Group
from apps.accounts.models import User
from apps.loans.models import Loan
from apps.contributions.models import Contribution
from apps.audit.models import AuditLog
from .views import IsSuperAdmin
import structlog, time

logger = structlog.get_logger(__name__)

COUNTRIES = ['kenya', 'rwanda', 'ghana']


def _country_kpis(country):
    gq = Group.objects.filter(country=country)
    uq = User.objects.filter(country=country)
    cq = Contribution.objects.filter(group__country=country)
    lq = Loan.objects.filter(group__country=country)
    return {
        'country': country,
        'total_groups':       gq.count(),
        'active_groups':      gq.filter(status='active').count(),
        'pending_review':     gq.filter(verification_status='pending_review').count(),
        'total_members':      uq.filter(role__in=['member','chairperson','treasurer']).count(),
        'kyc_verified':       uq.filter(kyc_status='verified').count(),
        'kyc_pending':        uq.filter(kyc_status='submitted').count(),
        'active_loans':       lq.filter(status='active').count(),
        'defaulted_loans':    lq.filter(status='defaulted').count(),
        'pending_admin_loans':lq.filter(status='pending_admin').count(),
        'contributions_confirmed': float(
            cq.filter(status='confirmed').aggregate(t=Sum('amount'))['t'] or 0
        ),
        'loan_book_value': float(
            lq.filter(status__in=['active','disbursed']).aggregate(t=Sum('amount'))['t'] or 0
        ),
    }


class SuperAdminOverviewView(APIView):
    """GET /api/v1/superadmin/overview/ — global KPI summary across all countries."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        per_country = [_country_kpis(c) for c in COUNTRIES]
        totals = {
            'total_groups':   sum(c['total_groups'] for c in per_country),
            'total_members':  sum(c['total_members'] for c in per_country),
            'active_loans':   sum(c['active_loans'] for c in per_country),
            'pending_review': sum(c['pending_review'] for c in per_country),
            'kyc_pending':    sum(c['kyc_pending'] for c in per_country),
            'total_contributions': sum(c['contributions_confirmed'] for c in per_country),
            'total_loan_book':     sum(c['loan_book_value'] for c in per_country),
            'platform_admins': User.objects.filter(role='platform_admin').count(),
        }
        recent_alerts = list(
            AuditLog.objects.filter(
                action__in=['group_rejected','loan_admin_rejected','kyc_rejected','admin_action']
            ).select_related('actor').order_by('-created_at')[:10].values(
                'action','country','created_at','metadata'
            )
        )
        return Response({
            'totals': totals,
            'by_country': per_country,
            'recent_alerts': recent_alerts,
        })


class SuperAdminCountryView(APIView):
    """GET /api/v1/superadmin/country/<country>/ — full drilldown for one country."""
    permission_classes = [IsSuperAdmin]

    def get(self, request, country):
        if country not in COUNTRIES:
            return Response({'error': 'Invalid country.'}, status=400)

        kpis = _country_kpis(country)

        # Monthly trend (last 6 months)
        from datetime import timedelta
        now = timezone.now()
        trend = []
        for i in range(5, -1, -1):
            ms = (now.replace(day=1) - timedelta(days=30*i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0)
            me = (ms + timedelta(days=32)).replace(day=1)
            val = Contribution.objects.filter(
                group__country=country, status='confirmed',
                confirmed_at__gte=ms, confirmed_at__lt=me
            ).aggregate(t=Sum('amount'))['t'] or 0
            trend.append({'month': ms.strftime('%b %Y'), 'contributions': float(val)})

        admins = list(User.objects.filter(
            role='platform_admin', country=country
        ).values('id','full_name','email','last_login_ip','is_active','created_at'))

        from apps.payments.models import BankProvider
        providers = list(BankProvider.objects.filter(country=country).values(
            'id','name','provider_code','environment','status',
            'last_tested_at','last_test_status'
        ))

        recent_audit = list(AuditLog.objects.filter(
            country=country
        ).select_related('actor').order_by('-created_at')[:20].values(
            'action','actor__full_name','ip_address','metadata','created_at'
        ))

        return Response({
            'kpis': kpis,
            'monthly_trend': trend,
            'admin_staff': admins,
            'payment_providers': providers,
            'recent_audit': recent_audit,
        })


class SuperAdminSystemHealthView(APIView):
    """GET /api/v1/superadmin/system-health/ — DB, Celery, and provider connectivity."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        checks = {}

        # DB
        try:
            t = time.time()
            User.objects.count()
            checks['database'] = {'status': 'ok', 'latency_ms': int((time.time()-t)*1000)}
        except Exception as e:
            checks['database'] = {'status': 'error', 'error': str(e)}

        # Redis/Celery
        try:
            import django_redis
            from django.core.cache import cache
            t = time.time()
            cache.set('health_ping', '1', 5)
            ok = cache.get('health_ping') == '1'
            checks['cache_redis'] = {'status': 'ok' if ok else 'error',
                                     'latency_ms': int((time.time()-t)*1000)}
        except Exception as e:
            checks['cache_redis'] = {'status': 'error', 'error': str(e)}

        # Active providers per country
        from apps.payments.models import BankProvider
        provider_status = {}
        for c in COUNTRIES:
            active = BankProvider.objects.filter(country=c, status='active').first()
            provider_status[c] = {
                'provider': active.name if active else None,
                'status': active.status if active else 'not_configured',
                'last_tested': active.last_tested_at.isoformat() if active and active.last_tested_at else None,
                'last_test_status': active.last_test_status if active else None,
            }

        # Pending queue depths
        checks['pending_loans'] = Loan.objects.filter(status='pending_admin').count()
        checks['pending_kyc']   = User.objects.filter(kyc_status='submitted').count()
        checks['pending_groups'] = Group.objects.filter(verification_status='pending_review').count()

        return Response({
            'checks': checks,
            'payment_providers': provider_status,
            'checked_at': timezone.now().isoformat(),
        })


class SuperAdminAdminListView(APIView):
    """GET /api/v1/superadmin/admins/ — all platform_admins across countries."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        country = request.query_params.get('country')
        qs = User.objects.filter(role='platform_admin').order_by('country', '-created_at')
        if country:
            qs = qs.filter(country=country)
        results = []
        for u in qs:
            audit_count = AuditLog.objects.filter(actor=u).count()
            results.append({
                'id': str(u.id),
                'full_name': u.full_name,
                'email': u.email,
                'phone': u.phone,
                'country': u.country,
                'is_active': u.is_active,
                'last_login_ip': u.last_login_ip,
                'created_at': u.created_at.isoformat(),
                'total_actions': audit_count,
            })
        return Response({'count': len(results), 'results': results})


class SuperAdminAdminDetailView(APIView):
    """GET/PATCH /api/v1/superadmin/admins/<id>/ — detail + edit."""
    permission_classes = [IsSuperAdmin]

    def get(self, request, admin_id):
        try:
            u = User.objects.get(id=admin_id, role='platform_admin')
        except User.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=404)

        logs = AuditLog.objects.filter(actor=u).order_by('-created_at')[:50]
        return Response({
            'id': str(u.id),
            'full_name': u.full_name,
            'email': u.email,
            'phone': u.phone,
            'country': u.country,
            'is_active': u.is_active,
            'last_login_ip': u.last_login_ip,
            'created_at': u.created_at.isoformat(),
            'audit_trail': [
                {
                    'action': a.action,
                    'country': a.country,
                    'ip_address': a.ip_address,
                    'metadata': a.metadata,
                    'created_at': a.created_at.isoformat(),
                }
                for a in logs
            ],
        })

    def patch(self, request, admin_id):
        try:
            u = User.objects.get(id=admin_id, role='platform_admin')
        except User.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=404)

        allowed = ['full_name', 'phone', 'country', 'is_active']
        for field in allowed:
            if field in request.data:
                setattr(u, field, request.data[field])
        u.save(update_fields=[f for f in allowed if f in request.data] + ['updated_at'])

        from apps.audit.services import log_audit
        log_audit(action='admin_action', actor=request.user, target_user=u,
                  ip_address=request.META.get('REMOTE_ADDR'),
                  metadata={'action': 'edit_admin', 'fields': list(request.data.keys())})
        return Response({'message': f'{u.full_name} updated.', 'id': str(u.id)})


class SuperAdminAdminSuspendView(APIView):
    """POST /api/v1/superadmin/admins/<id>/toggle-status/"""
    permission_classes = [IsSuperAdmin]

    def post(self, request, admin_id):
        try:
            u = User.objects.get(id=admin_id, role='platform_admin')
        except User.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=404)

        u.is_active = not u.is_active
        u.save(update_fields=['is_active'])
        action_taken = 'reinstated' if u.is_active else 'suspended'

        from apps.audit.services import log_audit
        log_audit(action='admin_action', actor=request.user, target_user=u,
                  ip_address=request.META.get('REMOTE_ADDR'),
                  metadata={'action': action_taken})
        return Response({'message': f'Admin {action_taken}.', 'is_active': u.is_active})


class SuperAdminGlobalAuditView(APIView):
    """GET /api/v1/superadmin/audit/ — cross-country audit trail."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = AuditLog.objects.select_related('actor', 'target_user').order_by('-created_at')

        country = request.query_params.get('country')
        action  = request.query_params.get('action')
        search  = request.query_params.get('search', '').strip()
        date_from = request.query_params.get('from')
        date_to   = request.query_params.get('to')

        if country:    qs = qs.filter(country=country)
        if action:     qs = qs.filter(action=action)
        if search:     qs = qs.filter(Q(actor__full_name__icontains=search)|Q(actor__email__icontains=search))
        if date_from:  qs = qs.filter(created_at__date__gte=date_from)
        if date_to:    qs = qs.filter(created_at__date__lte=date_to)

        page      = int(request.query_params.get('page', 1))
        page_size = 50
        offset    = (page - 1) * page_size
        total     = qs.count()

        results = [
            {
                'id': str(a.id),
                'action': a.action,
                'actor': a.actor.full_name if a.actor_id else 'System',
                'actor_email': a.actor.email if a.actor_id else None,
                'target_user': a.target_user.full_name if a.target_user_id else None,
                'country': a.country,
                'ip_address': a.ip_address,
                'metadata': a.metadata,
                'created_at': a.created_at.isoformat(),
            }
            for a in qs[offset:offset+page_size]
        ]
        return Response({'count': total, 'page': page, 'results': results})
