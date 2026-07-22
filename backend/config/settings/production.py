from django.core.exceptions import ImproperlyConfigured

from .base import *

DEBUG = False

# ─── JWT keys are non-negotiable in production ───────────────────────────────
# base.py falls back to signing JWTs with HS256 + SECRET_KEY when the RSA key
# files are missing. That fallback is evaluated while base's own DEBUG=True
# still holds (this module flips DEBUG only AFTER the import), so without this
# check a production deployment missing its key files would QUIETLY sign every
# session with SECRET_KEY. The development SECRET_KEY has been committed to a
# public repository, so that quiet downgrade is a full authentication bypass:
# anyone could mint a super_admin token. Refusing to boot is the only safe
# behaviour.
if not JWT_PRIVATE_KEY or not JWT_PUBLIC_KEY:
    raise ImproperlyConfigured(
        'Production requires RSA JWT keys. Set JWT_PRIVATE_KEY_PATH and '
        'JWT_PUBLIC_KEY_PATH to readable PEM files; the HS256/SECRET_KEY '
        'development fallback is not permitted here.'
    )

# Production security
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

# Enable S3 in production
USE_S3 = True
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
