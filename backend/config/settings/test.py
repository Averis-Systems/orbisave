from .base import *

# Use SQLite in-memory for fast tests
# We define all country aliases to point to the same in-memory DB for simplicity in tests
# since cross-db joins aren't used here anyway. Django's test runner dedupes
# the identical configs into one physical test database shared by all aliases.
# NOTE: do not replace this with TEST MIRROR — pytest-django's
# databases=[...] markers reject mirrored aliases (breaks ~28 tests).
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': 'file:orbisave_test?mode=memory&cache=shared',
    }
}
DATABASES['kenya'] = DATABASES['default']
DATABASES['rwanda'] = DATABASES['default']
DATABASES['ghana'] = DATABASES['default']

# Hermetic test infrastructure: no Redis or other external services required.
# Cache semantics (set/get/delete, on-commit invalidation) are identical through
# Django's cache API, so wallet-cache tests remain meaningful.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'orbisave-tests',
    }
}
CHANNEL_LAYERS = {
    'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}
}

# Run Celery tasks synchronously in tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Disable rate limiting in tests
RATELIMIT_ENABLE = False

# DRF throttles off by default: a test that makes twenty calls in a loop is not
# abuse, and leaving them on would make unrelated suites fail intermittently
# depending on execution order. Tests that exercise throttling re-enable the
# rates they need with override_settings, so the behaviour is still covered.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {key: None for key in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']},
}

# The test client connects from 127.0.0.1, so trusting it here lets the
# X-Forwarded-For handling be exercised directly.
TRUSTED_PROXY_IPS = ['127.0.0.1']

# Faster password hasher for tests
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# Bypass JWT RS256 in tests (use HS256 with a simple secret)
SIMPLE_JWT = {
    **SIMPLE_JWT,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': 'test-secret-key-not-used-in-production',
    'VERIFYING_KEY': None,
}
