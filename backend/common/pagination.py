import math

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

# Detail views embed a short "recent activity" list (audit trail on a user,
# API calls on a provider). That bound is a product decision, not a truncation
# bug: the full history belongs to a paginated list endpoint, the detail view
# shows enough to orient. One named constant so every detail view agrees and
# the number is searchable.
RECENT_LIMIT = 50


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
