"""
Throttle classes.

Before this existed REST_FRAMEWORK declared no throttles at all, so the only
rate limit in the backend was one decorator on member login. An authenticated
platform_admin could page the entire user, group, loan, contribution, ledger
and audit tables as fast as the network allowed. That is the scraping exposure
these close.

Two layers apply to ordinary traffic:

  burst      catches a script hammering one endpoint
  sustained  catches a slow crawl that stays under the burst limit all day

Both are needed. A single limit either has to be loose enough to allow normal
bursts, which permits an all-day crawl, or tight enough to stop the crawl,
which breaks a page that legitimately fires several requests on load.

The admin and auth throttles select themselves by URL prefix rather than being
listed on each view. Annotating roughly thirty view classes would mean any
endpoint added later silently inherits only the ordinary user rate, and the
whole point is that admin surfaces are the exposure. Prefix matching makes
coverage structural: a new admin endpoint is throttled the moment it is
routed.

Note on ordering
----------------
DRF's APIView.initial checks permissions BEFORE these throttle classes, so a
request that is going to be denied never reaches them: 401/403 responses are
not limited here. That gap is closed by common/admin_gate.py, a pre-DRF
middleware backstop on the admin-portal paths.
"""
import structlog
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

logger = structlog.get_logger(__name__)

# Kept in one place because these prefixes are load bearing: a route moved out
# from under one of them loses its throttle silently.
ADMIN_PREFIXES = ('/api/v1/admin-portal/',)

# Credential and one-time-code endpoints, member and admin alike.
AUTH_PATH_MARKERS = (
    '/auth/login/',
    '/auth/register/',
    '/auth/token/',
    '/auth/verify-email/',
    '/auth/password-reset/',
    '/auth/email/',
    '/auth/otp/',
    '/auth/kyc/',
)


class CacheResilientThrottleMixin:
    """
    Never let a cache outage take the API down.

    Throttle state lives in Redis and is read on EVERY request, which is a
    dependency the request path did not have before throttling existed. DRF's
    SimpleRateThrottle calls cache.get() with no error handling, so an
    unreachable Redis raises out of allow_request and turns every single
    request into a 500. The rate limit failing is bad; the whole platform
    failing because the rate limiter cannot reach its store is much worse.

    So this fails open, and says so loudly. The log line is the alert: a rate
    limit that is silently not running is exactly the state an attacker wants,
    so it must never be quiet.
    """

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception as exc:
            logger.error(
                'throttle_backend_unavailable',
                scope=getattr(self, 'scope', None),
                path=request.path,
                error=str(exc),
                note='Request allowed without rate limiting. Rate limits are NOT in effect.',
            )
            return True


class BurstRateThrottle(CacheResilientThrottleMixin, UserRateThrottle):
    """Short window. Sized so a dashboard page loading many widgets is fine."""
    scope = 'burst'


class SustainedRateThrottle(CacheResilientThrottleMixin, UserRateThrottle):
    """Long window. Sized well above a working day of real human use."""
    scope = 'sustained'


class PublicRateThrottle(CacheResilientThrottleMixin, AnonRateThrottle):
    """
    Unauthenticated traffic: invite previews, public group lookups.

    Keyed on IP, which is only meaningful because ClientIPMiddleware recovers
    the real client address from behind the Next proxy. Without it every
    anonymous caller would share one bucket.
    """
    scope = 'public'


class AdminListThrottle(CacheResilientThrottleMixin, UserRateThrottle):
    """
    Everything under the admin portal, which is where records belonging to
    other people are served.

    Deliberately far below the ordinary user limits. Reviewing a KYC queue or
    paging groups is human-paced work; anything faster is enumeration. Applies
    only to admin-portal paths, so a member's own dashboard is unaffected.
    """
    scope = 'admin_list'

    def allow_request(self, request, view):
        if not request.path.startswith(ADMIN_PREFIXES):
            return True
        return super().allow_request(request, view)


class AdminExportThrottle(CacheResilientThrottleMixin, UserRateThrottle):
    """
    Bulk export endpoints.

    An export is one request that returns what a list endpoint would take
    hundreds of requests to gather, so the list rate is not a meaningful
    ceiling on it. Priced per hour instead. Set explicitly on export views via
    throttle_classes, since exports are not identifiable by prefix.
    """
    scope = 'admin_export'


class AuthRateThrottle(CacheResilientThrottleMixin, AnonRateThrottle):
    """
    Credential-handling endpoints: sign-in, registration, password reset,
    email and OTP codes.

    Keyed by IP rather than user, because the caller is by definition not
    authenticated yet. This is what gives admin auth a limit at all, and it
    protects code-entry endpoints where an unthrottled caller could work
    through a six digit space far faster than the per-record attempt counter
    intends.
    """
    scope = 'auth'

    def allow_request(self, request, view):
        if not any(marker in request.path for marker in AUTH_PATH_MARKERS):
            return True
        return super().allow_request(request, view)
