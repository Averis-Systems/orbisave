from .base import *

# Use SQLite in-memory for fast tests
# We define all country aliases to point to the same in-memory DB for simplicity in tests
# since cross-db joins aren't used here anyway.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': 'file:orbisave_test?mode=memory&cache=shared',
    }
}
DATABASES['kenya'] = DATABASES['default']
DATABASES['rwanda'] = DATABASES['default']
DATABASES['ghana'] = DATABASES['default']

# Run Celery tasks synchronously in tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Disable rate limiting in tests
RATELIMIT_ENABLE = False

# Faster password hasher for tests
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# Bypass JWT RS256 in tests (use HS256 with a simple secret)
SIMPLE_JWT = {
    **SIMPLE_JWT,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': 'test-secret-key-not-used-in-production',
    'VERIFYING_KEY': None,
}
