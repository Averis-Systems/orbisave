"""
Lightweight API anomaly recorder.

Times every /api/ request and, only when it fails (5xx) or runs slow, writes a
single ApiEvent row. Healthy requests touch nothing, so the hot path stays
clean and the table stays small. It never raises: telemetry must never break a
real request. This is the "is anything failing, act fast" signal behind the
Console API-health page, not a full traffic-analytics pipeline (use an APM such
as Datadog for peak-hour volume and latency percentiles).
"""
import time
from datetime import timedelta

from django.utils import timezone


class ApiMetricsMiddleware:
    SLOW_MS = 2000          # a request slower than this is worth a look
    PRUNE_EVERY = 250       # trim old rows every N writes, not every request
    RETENTION_DAYS = 30

    _writes = 0

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = int((time.perf_counter() - start) * 1000)
        status = getattr(response, 'status_code', 0)

        if status >= 500 or duration_ms > self.SLOW_MS:
            self._record(request, status, duration_ms, 'error' if status >= 500 else 'slow')
        return response

    def _record(self, request, status, duration_ms, kind):
        try:
            from apps.admin_portal.models import ApiEvent

            actor_email = ''
            user = getattr(request, 'user', None)
            if user is not None and getattr(user, 'is_authenticated', False):
                actor_email = (getattr(user, 'email', '') or '')[:255]

            ApiEvent.objects.using('default').create(
                method=(request.method or '')[:8],
                path=request.path[:255],
                status_code=status,
                duration_ms=duration_ms,
                kind=kind,
                actor_email=actor_email,
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            ApiMetricsMiddleware._writes += 1
            if ApiMetricsMiddleware._writes % self.PRUNE_EVERY == 0:
                cutoff = timezone.now() - timedelta(days=self.RETENTION_DAYS)
                ApiEvent.objects.using('default').filter(created_at__lt=cutoff).delete()
        except Exception:
            # Recording an anomaly must never itself become one.
            pass
