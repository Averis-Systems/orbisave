import os

from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend', '0.0.0.0']

# Show full Django error pages in development
INTERNAL_IPS = ['127.0.0.1']

# Disable rate limiting in dev so manual testing isn't blocked
RATELIMIT_ENABLE = False

# Throttles read the cache on every request, so base.py's Redis backend became
# a hard dependency of the whole request path. A developer without Redis
# running would otherwise get a connection error and a fail-open warning on
# every single call. Local memory has identical semantics through Django's
# cache API; set REDIS_URL explicitly to rehearse against real Redis.
# REDIS_URL is usually set in .env even on machines where Redis is not running,
# so this probes rather than trusting the setting. Development only, one
# connection attempt at boot, never reached in production.
def _redis_reachable(url):
    import socket
    from urllib.parse import urlparse

    parsed = urlparse(url)
    try:
        with socket.create_connection((parsed.hostname or 'localhost', parsed.port or 6379), timeout=0.25):
            return True
    except OSError:
        return False


if not _redis_reachable(os.environ.get('REDIS_URL', 'redis://localhost:6379/1')):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'orbisave-dev',
        }
    }
    # django_ratelimit rejects a non-shared cache, correctly: local memory is
    # per-process, so with multiple workers each would keep its own counter and
    # the real limit would be N times what it says. That matters in production
    # and not on a single-process dev server, and RATELIMIT_ENABLE is False
    # here anyway. Silenced only on this fallback path, never for a deployment.
    SILENCED_SYSTEM_CHECKS = [
        *globals().get('SILENCED_SYSTEM_CHECKS', []),
        'django_ratelimit.E003',
        'django_ratelimit.W001',
    ]
    print('Redis unreachable: using local-memory cache for this dev run.')

# The Next proxies run on this host in development, so their forwarded client
# address can be believed. Production must name its real proxy addresses via
# TRUSTED_PROXY_IPS; every entry is permission to claim an arbitrary client IP.
TRUSTED_PROXY_IPS = ['127.0.0.1', '::1']

# DRF throttles stay ON in development so a rate problem surfaces here rather
# than in production, but with enough headroom that hot reload and repeated
# manual testing do not trip them. Override per-rate via the THROTTLE_* env
# vars if a specific flow needs more room.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {
        **REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
        'burst': os.environ.get('THROTTLE_BURST', '300/min'),
        'admin_list': os.environ.get('THROTTLE_ADMIN_LIST', '200/min'),
        'auth': os.environ.get('THROTTLE_AUTH', '60/min'),
    },
}

# Dev-safe console email backend (prints codes to the terminal) — UNLESS a
# Resend key is configured, in which case base.py's real SMTP delivery stands.
# This lets you rehearse actual verification-email delivery locally before deploy.
if not os.environ.get('RESEND_API_KEY'):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
