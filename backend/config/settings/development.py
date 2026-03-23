from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend', '0.0.0.0']

# Show full Django error pages in development
INTERNAL_IPS = ['127.0.0.1']

# Disable rate limiting in dev so manual testing isn't blocked
RATELIMIT_ENABLE = False

# Console email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
