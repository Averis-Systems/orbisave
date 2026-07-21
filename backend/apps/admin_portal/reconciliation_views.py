"""
Reconciliation queue — the human half of the fail-closed design.

The statement import and webhook flows open ReconciliationRun/Item rows for
anything the bank and the ledger disagree on; these endpoints are how country
admins SEE and RESOLVE them. platform_admins are scoped to their country;
super_admins see everything.
"""
import math

import structlog
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ledger.models import ReconciliationItem, ReconciliationRun
from common.admin_scope import resolve_admin_country
from common.db_utils import financial_db_aliases
from common.pagination import paginate_admin_queryset
from common.permissions import IsPlatformAdmin

logger = structlog.get_logger(__name__)


def _country_scope(request):
    """
    None = platform-wide (super_admin); else the authorised country.

    Central resolver: refuses a country-less platform_admin instead of
    returning None (which here would have meant UNRESTRICTED, the opposite of
    the intended scoping), and authorisation-checks any ?country= param.
    """
    return resolve_admin_country(request)


def _gather_bound(request, max_page_size=100):
    """
    Per-alias fetch bound for gather-then-page: the requested page could in
    the worst case come entirely from one alias, so each must contribute its
    first (offset + page_size) rows and no more. Inputs are clamped the same
    way paginate_admin_queryset clamps them, so a hostile page/page_size pair
    cannot inflate the gather.
    """
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        size = int(request.query_params.get('page_size', 50))
    except (TypeError, ValueError):
        size = 50
    size = max(1, min(size, max_page_size))
    return page * size


def _collect(model, scope_country, filters=None, order='-created_at', limit=200):
    """Merge rows across financial aliases, tagging each with its alias."""
    rows = []
    for alias in financial_db_aliases():
        qs = model.objects.using(alias).all()
        if filters:
            qs = qs.filter(**filters)
        if scope_country:
            qs = qs.filter(country=scope_country) if hasattr(model, 'country') else qs
        for obj in qs.order_by(order)[:limit]:
            obj._alias = alias
            rows.append(obj)
    return rows


class ReconciliationRunListView(APIView):
    """GET /api/v1/admin-portal/reconciliation/runs/"""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        scope = _country_scope(request)

        # Runs are sharded per country, and Django cannot sort across aliases,
        # so pagination is gather-then-page: each alias contributes only its
        # first (offset + page_size) rows, already sorted, which is the most
        # any of them could possibly place on the requested page. The merged
        # list is then sorted once and sliced. The old version capped each
        # alias at a flat 100 with no way to see past it, and sorted AFTER
        # serialization by string-formatted date.
        runs = []
        total = 0
        for alias in financial_db_aliases():
            qs = ReconciliationRun.objects.using(alias).all()
            if scope:
                qs = qs.filter(country=scope)
            total += qs.count()
            for run in qs.order_by('-business_date', '-created_at')[:_gather_bound(request)]:
                run._alias = alias
                runs.append(run)

        runs.sort(key=lambda r: (r.business_date, r.created_at), reverse=True)
        page_items, meta = paginate_admin_queryset(request, runs)
        meta['count'] = total
        meta['total_pages'] = max(1, math.ceil(total / meta['page_size']))

        results = []
        for run in page_items:
            # Counted only for the rows on this page, not every gathered row:
            # this query used to run once per run per alias, page or not.
            open_items = (
                ReconciliationItem.objects.using(run._alias)
                .filter(run=run, status__in=['open', 'investigating'])
                .count()
            )
            results.append({
                'id': str(run.id),
                'country': run.country,
                'provider_code': run.provider_code,
                'account_stream': run.account_stream,
                'account_number': run.account_number,
                'business_date': str(run.business_date),
                'status': run.status,
                'expected_closing_balance': str(run.expected_closing_balance) if run.expected_closing_balance is not None else None,
                'observed_closing_balance': str(run.observed_closing_balance) if run.observed_closing_balance is not None else None,
                'open_items': open_items,
                'created_at': run.created_at.isoformat(),
            })
        return Response({**meta, 'results': results})


class ReconciliationItemListView(APIView):
    """GET /api/v1/admin-portal/reconciliation/items/?status=open"""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        scope = _country_scope(request)
        wanted_status = request.query_params.get('status', 'open')
        search = (request.query_params.get('search') or '').strip()

        # Same gather-then-page shape as the runs view above.
        items = []
        total = 0
        for alias in financial_db_aliases():
            qs = ReconciliationItem.objects.using(alias).select_related('run', 'group')
            if wanted_status != 'all':
                statuses = ['open', 'investigating'] if wanted_status == 'open' else [wanted_status]
                qs = qs.filter(status__in=statuses)
            if scope:
                qs = qs.filter(run__country=scope)
            if search:
                # References are how an admin traces a specific discrepancy
                # back to a provider or bank record.
                qs = qs.filter(
                    Q(reference__icontains=search)
                    | Q(provider_reference__icontains=search)
                    | Q(bank_reference__icontains=search)
                )
            total += qs.count()
            items.extend(qs.order_by('-created_at')[:_gather_bound(request)])

        items.sort(key=lambda i: i.created_at, reverse=True)
        page_items, meta = paginate_admin_queryset(request, items)
        meta['count'] = total
        meta['total_pages'] = max(1, math.ceil(total / meta['page_size']))

        results = []
        for item in page_items:
            results.append({
                'id': str(item.id),
                'issue_type': item.issue_type,
                'status': item.status,
                'severity': item.severity,
                'account_stream': item.account_stream,
                'reference': item.reference,
                'provider_reference': item.provider_reference,
                'bank_reference': item.bank_reference,
                'expected_amount': str(item.expected_amount) if item.expected_amount is not None else None,
                'observed_amount': str(item.observed_amount) if item.observed_amount is not None else None,
                'currency': item.currency,
                'group_name': item.group.name if item.group_id else None,
                'run_id': str(item.run_id) if item.run_id else None,
                'business_date': str(item.run.business_date) if item.run_id else None,
                'details': item.details,
                'created_at': item.created_at.isoformat(),
            })
        return Response({**meta, 'results': results})


class ReconciliationItemActionView(APIView):
    """
    POST /api/v1/admin-portal/reconciliation/items/<item_id>/action/
    Body: {action: 'investigating'|'resolved'|'escalated', note: '...'}
    Resolution here NEVER edits the ledger — money corrections are posted as
    compensating reconciliation_adjustment entries through the ledger service.
    """
    permission_classes = [IsPlatformAdmin]

    ALLOWED = {'investigating', 'resolved', 'escalated'}

    def post(self, request, item_id):
        action = str(request.data.get('action', '')).lower()
        note = str(request.data.get('note', '')).strip()
        if action not in self.ALLOWED:
            return Response(
                {'error': f"action must be one of {sorted(self.ALLOWED)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if action in ('resolved', 'escalated') and not note:
            return Response(
                {'error': 'A note is required when resolving or escalating.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item = None
        for alias in financial_db_aliases():
            item = ReconciliationItem.objects.using(alias).select_related('run').filter(id=item_id).first()
            if item is not None:
                break
        if item is None:
            return Response({'error': 'Reconciliation item not found.'}, status=status.HTTP_404_NOT_FOUND)

        scope = _country_scope(request)
        if scope and item.run_id and item.run.country != scope:
            return Response({'error': 'Forbidden — different country.'}, status=status.HTTP_403_FORBIDDEN)

        item.status = action
        details = dict(item.details or {})
        details.setdefault('resolution_log', []).append({
            'action': action,
            'note': note,
            'by': request.user.email,
            'at': timezone.now().isoformat(),
        })
        item.details = details
        update_fields = ['status', 'details', 'updated_at']
        if action == 'resolved':
            item.resolved_at = timezone.now()
            item.resolved_by = request.user
            update_fields += ['resolved_at', 'resolved_by']
        item.save(update_fields=update_fields)

        from apps.audit.services import log_audit
        log_audit(
            action='reconciliation_item_action',
            actor=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'item_id': str(item.id), 'action': action, 'issue_type': item.issue_type},
        )
        logger.info('reconciliation_item_action', item_id=str(item.id), action=action, by=request.user.email)
        return Response({'status': item.status})
