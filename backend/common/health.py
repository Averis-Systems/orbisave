"""Liveness and readiness probes for load balancers / uptime monitors (H1).

These are intentionally unauthenticated and unthrottled: an external monitor or
a VPS/orchestrator health check cannot present a token, and it polls often
enough that DRF throttling would eventually 429 it. They are plain Django views
(not DRF) so they sit outside auth/throttling entirely, and they are terse:
they leak no exception text, host, or port to an anonymous caller.

  /healthz  liveness   the process is up. Never touches the DB, so a transient
                       database outage does not make an orchestrator kill an
                       otherwise healthy app that is merely waiting on its DB.
  /readyz   readiness  every configured DB shard answers SELECT 1. Returns 503
                       if any shard is unreachable, so a load balancer stops
                       routing traffic to a node that cannot actually serve it.
"""
from django.db import connections
from django.http import JsonResponse
from django.views.decorators.cache import never_cache


@never_cache
def healthz(request):
    """Liveness: the process can accept and answer a request. No dependencies."""
    return JsonResponse({'status': 'ok'})


@never_cache
def readyz(request):
    """Readiness: every configured database shard answers a trivial query."""
    databases = {}
    all_ok = True
    for alias in connections:
        try:
            with connections[alias].cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
            databases[alias] = 'ok'
        except Exception:
            # Deliberately no exception text: this endpoint is anonymous and the
            # raw error can carry the DB host/port. The alias alone is enough for
            # an operator to see which shard is down.
            databases[alias] = 'error'
            all_ok = False
    return JsonResponse(
        {'status': 'ok' if all_ok else 'error', 'databases': databases},
        status=200 if all_ok else 503,
    )
