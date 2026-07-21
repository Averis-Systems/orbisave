import math

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

# Detail views embed a short "recent activity" list (audit trail on a user,
# API calls on a provider). That bound is a product decision, not a truncation
# bug: the full history belongs to a paginated list endpoint, the detail view
# shows enough to orient. One named constant so every detail view agrees and
# the number is searchable.
RECENT_LIMIT = 50


def resolve_admin_ordering(request, allowed, default='-created_at'):
    """
    The whitelisted ?ordering= value as an order_by string.

    `allowed` names the plain field names that may be sorted on; the param may
    prefix any of them with '-'. Anything else falls back to the default,
    rather than passing user input to order_by, which would open ordering by
    related fields nobody audited (user__password does not leak values, but
    ordering by it is still probing), and rather than erroring so a stale
    bookmark cannot break a list.
    """
    requested = (request.query_params.get('ordering') or '').strip()
    field = requested[1:] if requested.startswith('-') else requested
    return requested if field and field in allowed else default


def apply_admin_ordering(request, qs, allowed, default='-created_at'):
    """resolve_admin_ordering applied to a queryset."""
    return qs.order_by(resolve_admin_ordering(request, allowed, default))


def _read_page_params(request, default_page_size, max_page_size):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        size = int(request.query_params.get('page_size', default_page_size))
    except (TypeError, ValueError):
        size = default_page_size
    size = max(1, min(size, max_page_size))
    return page, size


def paginate_sharded(request, aliases, build_qs, sort_key, reverse=True, default_page_size=50, max_page_size=100):
    """
    Page a per-country sharded model across one or more database aliases.

    Groups, loans and contributions live in the country databases, so a
    country-scoped admin reads exactly their own shard while a super_admin
    operating platform-wide must read all of them. Django cannot sort or offset
    across aliases, so this gathers each shard's first (offset + page_size)
    rows already ordered, merges them, sorts once in Python by sort_key, and
    slices the requested window. That per-shard bound is the most any single
    shard could contribute to the page, so no row that belongs on the page is
    missed, and no shard streams its whole table.

    This is the same gather-then-page shape the reconciliation views use,
    generalised so the sharded list endpoints stop reading the wrong database:
    a super_admin has country=None and thread-local routing sends an unscoped
    query to 'default', where the sharded tables are empty, so those lists
    silently returned nothing platform-wide.

    aliases:  DB aliases to read (one for a scoped admin, all for platform-wide).
    build_qs: alias -> a queryset scoped to that alias with .using(alias),
              already filtered and ordered.
    sort_key: row -> comparable; applied after the merge, descending, so the
              merged order matches each shard's own ordering.
    """
    page, size = _read_page_params(request, default_page_size, max_page_size)
    bound = page * size

    gathered = []
    total = 0
    for alias in aliases:
        qs = build_qs(alias)
        total += qs.count()
        gathered.extend(list(qs[:bound]))

    gathered.sort(key=sort_key, reverse=reverse)
    offset = (page - 1) * size
    items = gathered[offset:offset + size]
    meta = {
        'count': total,
        'page': page,
        'page_size': size,
        'total_pages': max(1, math.ceil(total / size)) if total else 1,
    }
    return items, meta


def paginate_admin_queryset(request, qs, default_page_size=50, max_page_size=100):
    """
    Page + slice for the hand-rolled admin list views.

    These views predate DRF generics and build their result dicts inline, so
    they cannot use a DRF pagination class without being rewritten wholesale.
    They used to cap output with hardcoded slices ([:200], [:100]) instead:
    anything past the cap was silently invisible, which on an oversight surface
    means an admin can be looking at an incomplete loan book with no signal
    that rows are missing.

    The page size is clamped server-side no matter what the client asks for,
    which is what makes pagination a scraping control rather than a
    convenience.

    Returns (items, meta). `meta` supersets the {count, results} shape the
    portals already consume, so adopting it is additive for every caller.
    Accepts a queryset or a pre-sorted list (the reconciliation views merge
    rows from several country databases in Python).
    """
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        size = int(request.query_params.get('page_size', default_page_size))
    except (TypeError, ValueError):
        size = default_page_size
    size = max(1, min(size, max_page_size))

    total = qs.count() if hasattr(qs, 'count') and not isinstance(qs, (list, tuple)) else len(qs)
    offset = (page - 1) * size
    items = qs[offset:offset + size]
    meta = {
        'count': total,
        'page': page,
        'page_size': size,
        'total_pages': max(1, math.ceil(total / size)) if total else 1,
    }
    return items, meta


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'data': data,
            'message': '',
            'errors': None,
            'meta': {
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
            },
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'data': schema,
                'message': {'type': 'string'},
                'errors': {'nullable': True},
                'meta': {
                    'type': 'object',
                    'properties': {
                        'count': {'type': 'integer'},
                        'next': {'type': 'string', 'nullable': True},
                        'previous': {'type': 'string', 'nullable': True},
                        'page': {'type': 'integer'},
                        'total_pages': {'type': 'integer'},
                    },
                },
            },
        }
