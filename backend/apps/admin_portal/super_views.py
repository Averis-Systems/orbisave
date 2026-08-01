"""Super Admin only views, global oversight, country drilldown, system health, admin management."""
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate, TruncMonth
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.groups.models import Group, GroupMember
from apps.accounts.models import User
from apps.loans.models import Loan
from apps.contributions.models import Contribution
from apps.ledger.models import LedgerEntry
from apps.audit.models import AuditLog
from common.db_utils import get_db_for_country
from common.pagination import RECENT_LIMIT
from .views import IsSuperAdmin
import structlog, time

logger = structlog.get_logger(__name__)

COUNTRIES = ['kenya', 'rwanda', 'ghana']

# Each country settles in its own currency, so revenue is reported per country
# and never summed into one platform figure. Summing KES + RWF + GHS would be a
# meaningless number presented as if it meant something.
COUNTRY_CURRENCY = {'kenya': 'KES', 'rwanda': 'RWF', 'ghana': 'GHS'}

MEMBER_ROLES = ['member', 'chairperson', 'treasurer']


def _month_starts(count):
    """The first-of-month datetimes for the last `count` months, oldest first."""
    now = timezone.now()
    anchor = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months = []
    for i in range(count - 1, -1, -1):
        # Walk back i months by stepping through the first of each month.
        m = anchor
        for _ in range(i):
            m = (m - timedelta(days=1)).replace(day=1)
        months.append(m)
    return months


def _signups_trend(months=6):
    """
    New members per month across the platform.

    Reads accounts on `default`, which is genuinely global (not sharded), so
    this is one grouped query and needs no fan-out. Counts are people, not
    money, so they are safe to aggregate platform-wide. Only member-facing
    roles are counted; staff and super admins are excluded so the curve tracks
    real product growth rather than internal account creation.
    """
    starts = _month_starts(months)
    window_start = starts[0]
    rows = (
        User.objects.filter(created_at__gte=window_start, role__in=MEMBER_ROLES)
        .annotate(m=TruncMonth('created_at'))
        .values('m')
        .annotate(n=Count('id'))
    )
    by_month = {r['m'].strftime('%Y-%m'): r['n'] for r in rows if r['m'] is not None}
    return [
        {'month': s.strftime('%b'), 'key': s.strftime('%Y-%m'), 'signups': by_month.get(s.strftime('%Y-%m'), 0)}
        for s in starts
    ]


SIGNUP_TREND_PERIODS = ('this_month', '3m', '6m', 'this_year')


def _signups_trend_window(period):
    """
    New-member counts for a selectable window. 'this_month' buckets by day;
    the rest bucket by month (3 / 6 months back, or January-to-date for the
    year). Same source and rules as _signups_trend: accounts on `default`,
    member-facing roles only. Points carry a pre-formatted `month` label so the
    chart never has to know the granularity.
    """
    now = timezone.now()
    member_qs = User.objects.filter(role__in=MEMBER_ROLES)

    if period == 'this_month':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        rows = (
            member_qs.filter(created_at__gte=start)
            .annotate(d=TruncDate('created_at'))
            .values('d')
            .annotate(n=Count('id'))
        )
        by_day = {r['d'].isoformat(): r['n'] for r in rows if r['d'] is not None}
        points = []
        day = start
        while day.date() <= now.date():
            points.append({
                'month': f"{day.strftime('%b')} {day.day}",
                'signups': by_day.get(day.date().isoformat(), 0),
            })
            day = day + timedelta(days=1)
        return points

    months = {'3m': 3, '6m': 6, 'this_year': now.month}.get(period, 6)
    starts = _month_starts(months)
    window_start = starts[0]
    rows = (
        member_qs.filter(created_at__gte=window_start)
        .annotate(m=TruncMonth('created_at'))
        .values('m')
        .annotate(n=Count('id'))
    )
    by_month = {r['m'].strftime('%Y-%m'): r['n'] for r in rows if r['m'] is not None}
    return [
        {'month': s.strftime('%b'), 'signups': by_month.get(s.strftime('%Y-%m'), 0)}
        for s in starts
    ]


def _country_revenue(country):
    """
    Platform service-fee revenue for one country, in that country's currency.

    Revenue is the immutable ledger record, never recomputed from group
    settings: credits to the company_revenue stream with entry_type
    service_fee, written when a rotation payout succeeds. Read with an explicit
    .using(alias) for the same sharding reason as _country_kpis.
    """
    alias = get_db_for_country(country)
    now = timezone.now()
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = day_start.replace(day=1)
    year_start = day_start.replace(month=1, day=1)
    qs = LedgerEntry.objects.using(alias).filter(
        group__country=country,
        account_stream='company_revenue',
        entry_type='service_fee',
        direction='credit',
    )

    def total_since(start):
        return float(qs.filter(created_at__gte=start).aggregate(t=Sum('amount'))['t'] or 0)

    return {
        'country': country,
        'currency': COUNTRY_CURRENCY.get(country, ''),
        'today': total_since(day_start),
        'mtd': total_since(month_start),
        'ytd': total_since(year_start),
        'total': float(qs.aggregate(t=Sum('amount'))['t'] or 0),
    }


def _country_kpis(country):
    """
    KPIs for one country.

    Group, Contribution and Loan are sharded per country by OrbiSaveRouter, so
    they must be read with an explicit .using(alias). Filtering by the country
    column alone is not enough: CountryMiddleware runs before DRF's JWT auth,
    so request.user is anonymous when routing is decided, and a super admin has
    country=None and therefore resolves to 'default'. Without .using(), every
    financial figure on this endpoint silently read the wrong database and
    reported zero rather than erroring.

    User lives in a platform app on 'default' and is genuinely global, so it is
    filtered by column and left unrouted on purpose.
    """
    alias = get_db_for_country(country)
    gq = Group.objects.using(alias).filter(country=country)
    uq = User.objects.filter(country=country)
    cq = Contribution.objects.using(alias).filter(group__country=country)
    lq = Loan.objects.using(alias).filter(group__country=country)
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


class SuperAdminNavCountsView(APIView):
    """
    GET /api/v1/admin-portal/superadmin/nav-counts/

    The small set of "something is waiting for you" counts the sidebar shows as
    badges, so the navigation itself tells a super admin where the work is
    before they open a page. COUNT-only and deliberately cheap: this is polled
    on navigation, so it must not do the overview's full KPI fan-out.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Groups are sharded per country; a bare COUNT per shard is cheap.
        groups_pending = 0
        for c in COUNTRIES:
            groups_pending += (
                Group.objects.using(get_db_for_country(c))
                .filter(country=c, verification_status='pending_review')
                .count()
            )

        # Members live on 'default' and are globally queryable.
        kyc_pending = User.objects.filter(kyc_status='submitted').count()

        # Reconciliation exceptions are sharded too; open + investigating are
        # the states that need a human.
        from apps.ledger.models import ReconciliationItem
        from common.db_utils import financial_db_aliases
        trust_open = 0
        for alias in financial_db_aliases():
            trust_open += (
                ReconciliationItem.objects.using(alias)
                .filter(status__in=['open', 'investigating'])
                .count()
            )

        return Response({
            'groups_pending': groups_pending,
            'kyc_pending': kyc_pending,
            'trust_open': trust_open,
        })


class SuperAdminOverviewView(APIView):
    """GET /api/v1/superadmin/overview/, global KPI summary across all countries."""
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
            'signups_trend': _signups_trend(6),
            'revenue_by_country': [_country_revenue(c) for c in COUNTRIES],
            'recent_alerts': recent_alerts,
        })


class SuperAdminCountryView(APIView):
    """GET /api/v1/superadmin/country/<country>/, full drilldown for one country."""
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
            # Same sharding rule as _country_kpis: read the country's own DB.
            val = Contribution.objects.using(get_db_for_country(country)).filter(
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


class SuperAdminDemographicsView(APIView):
    """
    GET /api/v1/superadmin/demographics/, cross-country member and group
    demographics: signups per country, gender split (global and per country),
    and the top regions / sub-regions per country.

    These are cheap live aggregates, not the deferred nightly financial
    rollup: signups and gender come from `accounts` (default DB, globally
    queryable by the country column); regions come from Group.region /
    sub_region, which live on the sharded country DBs, so that part fans out
    one query per country. Counts aggregate freely, people are not currency.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        member_qs = User.objects.exclude(role__in=['platform_admin', 'super_admin'])
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # ── Signups per country (default DB) ──────────────────────────────
        signups_by_country = [
            {
                'country': c,
                'total': member_qs.filter(country=c).count(),
                'this_month': member_qs.filter(country=c, created_at__gte=month_start).count(),
            }
            for c in COUNTRIES
        ]

        # ── Gender split, global and per country (default DB) ─────────────
        GENDER_LABELS = dict(User.GENDER_CHOICES)

        def gender_dist(qs):
            by_key = {(r['gender'] or ''): r['count']
                      for r in qs.values('gender').annotate(count=Count('id'))}
            dist = [{'gender': k, 'label': label, 'count': by_key.get(k, 0)}
                    for k, label in GENDER_LABELS.items()]
            not_specified = by_key.get('', 0)
            if not_specified:
                dist.append({'gender': '', 'label': 'Not specified', 'count': not_specified})
            return [d for d in dist if d['count'] > 0]

        gender_global = gender_dist(member_qs)
        gender_by_country = {c: gender_dist(member_qs.filter(country=c)) for c in COUNTRIES}

        # ── Top regions / sub-regions per country (sharded, fan out) ─────
        regions_by_country = {}
        for c in COUNTRIES:
            gq = Group.objects.using(get_db_for_country(c)).filter(country=c)

            region_rows = gq.values('region').annotate(count=Count('id')).order_by('-count')
            regions = [
                {'region': (r['region'] or '').strip() or 'Not specified', 'groups': r['count']}
                for r in region_rows
            ][:10]

            sub_rows = (
                gq.exclude(sub_region='')
                .values('region', 'sub_region')
                .annotate(count=Count('id'))
                .order_by('-count')
            )
            sub_regions = [
                {
                    'region': (r['region'] or '').strip() or 'Not specified',
                    'sub_region': r['sub_region'].strip(),
                    'groups': r['count'],
                }
                for r in sub_rows
            ][:10]

            regions_by_country[c] = {'regions': regions, 'sub_regions': sub_regions}

        return Response({
            'signups_by_country': signups_by_country,
            'gender_global': gender_global,
            'gender_by_country': gender_by_country,
            'regions_by_country': regions_by_country,
        })


class SuperAdminGroupMembersView(APIView):
    """
    GET /api/v1/superadmin/groups/<group_id>/members/

    A group's roster for the Console drill-down. Cross-DB safe: the group, its
    memberships and contributions live on the country shard, but the member
    Users live on default. So the group is located across shards, memberships
    are read on that shard, and the Users are batch-resolved from default,
    never through the cross-DB FK (which would raise OperationalError).

    super_admin only. Member PII is fetched on demand by an authorised admin and
    is never part of the groups-list payload, so it cannot leak to a lower role
    or to an unauthenticated client.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request, group_id):
        group = None
        alias = None
        for c in COUNTRIES:
            candidate_alias = get_db_for_country(c)
            g = Group.objects.using(candidate_alias).filter(id=group_id).first()
            if g is not None:
                group, alias = g, candidate_alias
                break
        if group is None:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        memberships = list(
            GroupMember.objects.using(alias)
            .filter(group_id=group.id)
            .order_by('rotation_position', 'joined_at')
            .values('id', 'member_id', 'role', 'status', 'rotation_position', 'joined_at')
        )
        member_ids = [m['member_id'] for m in memberships]
        users = {
            str(u.id): u
            for u in User.objects.filter(id__in=member_ids).only(
                'id', 'full_name', 'email', 'phone', 'kyc_status', 'gender'
            )
        }
        confirmed = {
            str(r['member_id']): r['n']
            for r in Contribution.objects.using(alias)
            .filter(group_id=group.id, status='confirmed')
            .values('member_id')
            .annotate(n=Count('id'))
        }

        gender_labels = dict(User.GENDER_CHOICES)
        members = []
        for m in memberships:
            uid = str(m['member_id'])
            u = users.get(uid)
            members.append({
                'membership_id': str(m['id']),
                'full_name': u.full_name if u else 'Unknown',
                'email': u.email if u else '',
                'phone': u.phone if u else '',
                'kyc_status': u.kyc_status if u else '',
                'gender': gender_labels.get(getattr(u, 'gender', ''), '') if u else '',
                'role': m['role'],
                'status': m['status'],
                'rotation_position': m['rotation_position'],
                'joined_at': m['joined_at'].isoformat() if m['joined_at'] else None,
                'contributions_confirmed': confirmed.get(uid, 0),
                'has_first_contribution': confirmed.get(uid, 0) > 0,
            })

        return Response({
            'group': {
                'id': str(group.id),
                'name': group.name,
                'country': group.country,
                'currency': group.currency,
                'invite_code': group.invite_code,
                'invite_expires_at': group.invite_expires_at.isoformat() if group.invite_expires_at else None,
                'max_members': group.max_members,
                'member_count': len(members),
            },
            'members': members,
        })


class SuperAdminSignupsTrendView(APIView):
    """
    GET /api/v1/superadmin/signups-trend/?period=this_month|3m|6m|this_year

    New-member growth for a selectable window, so the overview chart is not
    locked to a vague six months. Cheap: one grouped query on the global
    accounts table.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        period = request.query_params.get('period', '6m')
        if period not in SIGNUP_TREND_PERIODS:
            period = '6m'
        return Response({'period': period, 'points': _signups_trend_window(period)})


class SuperAdminQuickSearchView(APIView):
    """
    GET /api/v1/superadmin/quick-search/?q=

    Global header search for the Console: top groups across every country
    shard and top members from the platform users table, each tagged with a
    Console destination (a list page pre-filtered by the same `search` param
    the tables already read from the URL). Cheap and capped, this backs a
    dropdown, not a report.
    """
    permission_classes = [IsSuperAdmin]

    COUNTRY_LABEL = {'kenya': 'Kenya', 'rwanda': 'Rwanda', 'ghana': 'Ghana'}

    def get(self, request):
        from urllib.parse import quote

        query = (request.query_params.get('q') or '').strip()
        if len(query) < 2:
            return Response({'groups': [], 'members': []})

        groups = []
        for c in COUNTRIES:
            remaining = 6 - len(groups)
            if remaining <= 0:
                break
            for g in (
                Group.objects.using(get_db_for_country(c))
                .filter(country=c, name__icontains=query)
                .only('id', 'name', 'status', 'country')[:remaining]
            ):
                groups.append({
                    'type': 'group',
                    'id': str(g.id),
                    'label': g.name,
                    'detail': f'{g.get_status_display()} · {self.COUNTRY_LABEL.get(c, c.title())}',
                    'href': f'/dashboard/groups?search={quote(g.name)}',
                })

        members = [
            {
                'type': 'member',
                'id': str(u.id),
                'label': u.full_name or u.email,
                'detail': f'{u.email} · {self.COUNTRY_LABEL.get(u.country, (u.country or "").title())}',
                'href': f'/dashboard/users?tab=members&search={quote(u.full_name or u.email)}',
            }
            for u in (
                User.objects.exclude(role__in=['platform_admin', 'super_admin'])
                .filter(Q(full_name__icontains=query) | Q(email__icontains=query))
                .only('id', 'full_name', 'email', 'country')[:6]
            )
        ]

        return Response({'groups': groups, 'members': members})


class SuperAdminApiHealthView(APIView):
    """
    GET /api/v1/superadmin/api-health/

    The ops read for "is anything failing, act fast": database and cache
    reachability with latency, a 24h count of API errors and slow requests, and
    the most recent anomalies (5xx or slow) recorded by ApiMetricsMiddleware,
    each a row an engineer can act on. Full peak-hour traffic and latency
    percentiles belong in an APM (Datadog), not the app database.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        checks = {}
        try:
            t = time.time()
            User.objects.count()
            checks['database'] = {'status': 'ok', 'latency_ms': int((time.time() - t) * 1000)}
        except Exception as e:
            checks['database'] = {'status': 'error', 'error': str(e)}

        try:
            from django.core.cache import cache
            t = time.time()
            cache.set('api_health_ping', '1', 5)
            ok = cache.get('api_health_ping') == '1'
            checks['cache'] = {'status': 'ok' if ok else 'degraded', 'latency_ms': int((time.time() - t) * 1000)}
        except Exception as e:
            checks['cache'] = {'status': 'error', 'error': str(e)}

        from apps.admin_portal.models import ApiEvent
        since = timezone.now() - timedelta(hours=24)
        recent_qs = ApiEvent.objects.using('default').filter(created_at__gte=since)
        recent = list(
            ApiEvent.objects.using('default')
            .order_by('-created_at')[:25]
            .values('method', 'path', 'status_code', 'duration_ms', 'kind', 'actor_email', 'created_at')
        )

        return Response({
            'checks': checks,
            'api': {
                'errors_24h': recent_qs.filter(kind='error').count(),
                'slow_24h': recent_qs.filter(kind='slow').count(),
            },
            'recent': recent,
            'slow_threshold_ms': 2000,
            'checked_at': timezone.now().isoformat(),
        })


class SuperAdminSystemHealthView(APIView):
    """GET /api/v1/superadmin/system-health/, DB, Celery, and provider connectivity."""
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
    """GET /api/v1/superadmin/admins/, all platform_admins across countries."""
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
    """GET/PATCH /api/v1/superadmin/admins/<id>/, detail + edit."""
    permission_classes = [IsSuperAdmin]

    def get(self, request, admin_id):
        try:
            u = User.objects.get(id=admin_id, role='platform_admin')
        except User.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=404)

        logs = AuditLog.objects.filter(actor=u).order_by('-created_at')[:RECENT_LIMIT]
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
    """GET /api/v1/superadmin/audit/, cross-country audit trail."""
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
