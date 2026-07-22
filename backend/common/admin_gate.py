"""
Pre-DRF rate gate for the admin portal.

DRF's APIView.initial checks permissions BEFORE throttle classes, so a request
that is going to be denied never reaches a throttle: an anonymous caller or an
authenticated non-admin could hammer /api/v1/admin-portal/ endpoints for
unlimited 401/403s. No data leaks that way, but it is an unbounded request
sink and a free oracle for probing which admin routes exist. Closing it needs
a check that runs ahead of DRF entirely, which means middleware.

This gate counts requests per client IP per minute for admin-portal paths
only, with a ceiling far above anything the DRF throttles allow through
(admin_list is 40/min; this defaults to 300/min), so a legitimate admin can
never hit this limit before hitting the polite DRF one. It is an abuse
backstop, not the working rate limit.

Ordering: must sit AFTER ClientIPMiddleware, which rewrites REMOTE_ADDR to the
real client address behind the Next proxies. Before that rewrite every caller
would share the proxy's bucket.

Fails open on cache errors, loudly, matching the throttles: a broken Redis
must degrade rate limiting, never take the platform down.
"""
import time

import structlog
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = structlog.get_logger(__name__)

GATED_PREFIX = '/api/v1/admin-portal/'


class AdminPortalGateMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.per_minute = int(getattr(settings, 'ADMIN_GATE_PER_MINUTE', 300))

    def __call__(self, request):
        if self.per_minute > 0 and request.path.startswith(GATED_PREFIX):
            denied = self._over_limit(request)
            if denied:
                return denied
        return self.get_response(request)

    def _over_limit(self, request):
        ip = request.META.get('REMOTE_ADDR', 'unknown')
        # Fixed one-minute window. Coarse is fine for a backstop: the polite,
        # precise limits live in the DRF throttles behind this.
        window = int(time.time() // 60)
        key = f'admin-gate:{ip}:{window}'
        try:
            # add() is atomic create-if-absent; incr() is atomic on Redis.
            if cache.add(key, 1, timeout=120):
                return None
            count = cache.incr(key)
        except Exception as exc:
            logger.error(
                'admin_gate_backend_unavailable',
                error=str(exc),
                note='Request allowed without gating. The admin-portal gate is NOT in effect.',
            )
            return None

        if count <= self.per_minute:
            return None

        if count == self.per_minute + 1:
            # Log once per window per IP, not once per rejected request, so an
            # attack cannot flood the logs through the very control meant to
            # stop it.
            logger.warning('admin_gate_tripped', ip=ip, per_minute=self.per_minute, path=request.path)

        return JsonResponse(
            {'error': 'Too many requests. Slow down and try again shortly.'},
            status=429,
        )
