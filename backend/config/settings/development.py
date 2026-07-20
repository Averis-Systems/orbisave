import os

from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend', '0.0.0.0']

# Show full Django error pages in development
INTERNAL_IPS = ['127.0.0.1']

# Disable rate limiting in dev so manual testing isn't blocked
RATELIMIT_ENABLE = False

# Dev-safe console email backend (prints codes to the terminal) — UNLESS a
# Resend key is configured, in which case base.py's real SMTP delivery stands.
# This lets you rehearse actual verification-email delivery locally before deploy.
if not os.environ.get('RESEND_API_KEY'):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
