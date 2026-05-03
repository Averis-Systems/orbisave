import os
from pathlib import Path
import dj_database_url
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─── Security ────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ['SECRET_KEY']
DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')

# ─── Applications ────────────────────────────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'corsheaders',
    'django_celery_beat',
    'django_celery_results',
    'channels',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.groups',
    'apps.contributions',
    'apps.loans',
    'apps.ledger',
    'apps.payouts',
    'apps.payments',
    'apps.notifications',
    'apps.meetings',
    'apps.admin_portal',
    'apps.audit',
    'apps.analytics',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─── Middleware ───────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'common.middleware.CountryMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'

# ─── Database ────────────────────────────────────────────────────────────────
DATABASES = {
    'default': dj_database_url.parse(os.environ.get('DATABASE_URL', 'sqlite:///db.sqlite3'), conn_max_age=600),
    'kenya': dj_database_url.parse(os.environ.get('DATABASE_URL_KENYA', 'sqlite:///db_ke.sqlite3'), conn_max_age=600),
    'rwanda': dj_database_url.parse(os.environ.get('DATABASE_URL_RWANDA', 'sqlite:///db_rw.sqlite3'), conn_max_age=600),
    'ghana': dj_database_url.parse(os.environ.get('DATABASE_URL_GHANA', 'sqlite:///db_gh.sqlite3'), conn_max_age=600),
}

DATABASE_ROUTERS = ['config.routers.OrbiSaveRouter']

# ─── Custom User Model ───────────────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.User'

# ─── Password validation ─────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ─── Static & Media ──────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Django REST Framework ───────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.accounts.authentication.RS256JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'common.exceptions.orbisave_exception_handler',
}

# ─── Simple JWT (RS256) ──────────────────────────────────────────────────────
def _read_key(path_env_var: str, default: str = '') -> str:
    key_path = os.environ.get(path_env_var, default)
    # Inside Docker, BASE_DIR is /app (backend root). If run locally, it's backend.
    # To handle both, we just check if key_path exists in BASE_DIR directly.
    full_path = BASE_DIR / key_path if not os.path.isabs(key_path) else Path(key_path)
    try:
        return open(full_path).read()
    except FileNotFoundError:
        return ''  # Keys generated on first setup

JWT_PRIVATE_KEY = _read_key('JWT_PRIVATE_KEY_PATH', 'secrets/jwt_private.pem')
JWT_PUBLIC_KEY = _read_key('JWT_PUBLIC_KEY_PATH', 'secrets/jwt_public.pem')

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=int(os.environ.get('SIMPLE_JWT_ACCESS_TOKEN_LIFETIME_MINUTES', '15'))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=int(os.environ.get('SIMPLE_JWT_REFRESH_TOKEN_LIFETIME_DAYS', '7'))
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'RS256',
    'SIGNING_KEY': _read_key('JWT_PRIVATE_KEY_PATH', 'secrets/jwt_private.pem'),
    'VERIFYING_KEY': _read_key('JWT_PUBLIC_KEY_PATH', 'secrets/jwt_public.pem'),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ─── CORS ────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
]
CORS_ALLOW_CREDENTIALS = True
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-country',
]

# ─── DRF Spectacular (OpenAPI) ───────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'OrbiSave API',
    'DESCRIPTION': 'Digital financial orchestration for community savings groups.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# ─── Celery ──────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ─── Celery Beat Schedule ─────────────────────────────────────────────────────
# All financial enforcement tasks. Intervals are production-defaults and can be
# overridden via django_celery_beat admin UI without code changes.
CELERY_BEAT_SCHEDULE = {
    # Scans all groups for overdue contributions daily at 00:05 UTC
    'enforce-contribution-deadlines': {
        'task': 'apps.contributions.tasks.enforce_contribution_deadlines',
        'schedule': timedelta(hours=24),
        'options': {'expires': 3600},
    },
    # Reconciles pending penalties into ledger every 6 hours
    'apply-pending-penalties': {
        'task': 'apps.contributions.tasks.apply_pending_penalties',
        'schedule': timedelta(hours=6),
        'options': {'expires': 1800},
    },
    # Checks if all rotation cycle slots are paid out — closes cycle + starts next
    'check-cycle-completion': {
        'task': 'apps.groups.tasks.check_cycle_completion',
        'schedule': timedelta(hours=24),
        'options': {'expires': 3600},
    },
    # Flags loan repayments past due date
    'flag-overdue-loan-repayments': {
        'task': 'apps.loans.tasks.flag_overdue_loan_repayments',
        'schedule': timedelta(hours=24),
        'options': {'expires': 3600},
    },
    # Escalates loans with 2+ overdue repayments to 'defaulted'
    'check-loan-defaults': {
        'task': 'apps.loans.tasks.check_loan_defaults',
        'schedule': timedelta(hours=24),
        'options': {'expires': 3600},
    },
}

# ─── Django Channels (WebSockets) ────────────────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379/0')],
        },
    },
}

# ─── Cache (Redis) ────────────────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend',
)
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@orbisave.com')

# ─── Storage ──────────────────────────────────────────────────────────────────
USE_S3 = os.environ.get('USE_S3', 'False') == 'True'
if USE_S3:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None

# ─── Payment Providers ────────────────────────────────────────────────────────
MPESA_ENVIRONMENT = os.environ.get('MPESA_ENVIRONMENT', 'sandbox')
MPESA_CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET', '')
MPESA_SHORTCODE = os.environ.get('MPESA_SHORTCODE', '')
MPESA_PASSKEY = os.environ.get('MPESA_PASSKEY', '')
MPESA_CALLBACK_URL = os.environ.get('MPESA_CALLBACK_URL', '')

MTN_ENVIRONMENT = os.environ.get('MTN_ENVIRONMENT', 'sandbox')
MTN_SUBSCRIPTION_KEY = os.environ.get('MTN_SUBSCRIPTION_KEY', '')
MTN_CALLBACK_URL = os.environ.get('MTN_CALLBACK_URL', '')

AFRICASTALKING_USERNAME = os.environ.get('AFRICASTALKING_USERNAME', 'sandbox')
AFRICASTALKING_API_KEY = os.environ.get('AFRICASTALKING_API_KEY', '')

# ─── LiveKit ─────────────────────────────────────────────────────────────────
LIVEKIT_API_KEY = os.environ.get('LIVEKIT_API_KEY', '')
LIVEKIT_API_SECRET = os.environ.get('LIVEKIT_API_SECRET', '')
LIVEKIT_URL = os.environ.get('LIVEKIT_URL', 'ws://localhost:7880')
