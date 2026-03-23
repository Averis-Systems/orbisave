# OrbiSave Web Platform — Master Build Phases
> **Version:** 1.0 | **Date:** March 2025 | **Scope:** Web Platform Only (mobile excluded)
> **Stack:** Next.js 14 (App Router) · Django 5 · PostgreSQL 16 · Redis 7 · Celery 5 · Docker · Turborepo

---

## How to Use This Document

Each phase below is self-contained and can be assigned to a separate developer or coding agent. Every phase includes:
- **Goal** — what this phase delivers
- **Prerequisites** — what must be complete before starting
- **Exact steps** — commands, file paths, code patterns
- **Acceptance criteria** — how to verify the phase is done correctly
- **Handoff notes** — what the next phase needs from this one

> [!IMPORTANT]
> Read the full [OrbiSave_Master_Build_Prompt.md](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/OrbiSave_Master_Build_Prompt.md) spec before starting any phase. All architectural decisions in that document are mandatory. Do not substitute libraries, simplify data models, or deviate from the stack.

> [!WARNING]
> OrbiSave handles real community funds. Security, ledger integrity, and financial logic are non-negotiable. Every phase has a security checklist — do not skip it.

---

## Repository Layout (Turborepo Monorepo)

```
orbisave/
├── apps/
│   └── web/                   # Next.js 14 web platform
├── packages/
│   ├── shared-types/          # TypeScript types shared with API
│   ├── shared-utils/          # Currency formatting, date utils, country config
│   └── ui/                    # Design tokens (consumed by web)
├── backend/                   # Django 5 project (Python 3.12)
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml
│       └── Dockerfiles/
├── .github/workflows/
├── turbo.json
└── package.json
```

---

## Phase Dependency Map

```
Phase 0 (Repo + Tooling)
    └── Phase 1 (Backend Models)
            └── Phase 2 (Backend Auth API)
                    └── Phase 3 (Groups, Members, Invites)
                            └── Phase 4 (Financial Engine)
                                    └── Phase 5 (Admin, Real-time, Notifications)
Phase 0
    └── Phase 6 (Frontend Foundation)
            └── Phase 7 (Public Pages)
                    └── Phase 8 (Onboarding)
                            └── Phase 9 (Member Dashboard)
                                    └── Phase 10 (Chairperson)
                                            └── Phase 11 (Treasurer)
                                                    └── Phase 12 (Admin Dashboard)
                                                            └── Phase 13 (Super Admin)
Phase 5 + Phase 13
    └── Phase 14 (Real-time, Offline, Meetings)
            └── Phase 15 (Testing + CI/CD)
```

Phases 1–5 (backend) and Phases 6–13 (frontend) can run in **parallel** after Phase 0 is complete. Frontend phases from 7 onward can use a **mock API layer** until the backend phases are merged.

---

## Phase 0 — Repository & Tooling Setup

**Owner:** Lead Engineer / DevOps  
**Estimated effort:** 0.5–1 day  
**Prerequisites:** None

### Goal
Stand up the Turborepo monorepo, configure all development tooling, and verify the Docker Compose environment starts cleanly. Every subsequent phase depends on this being correct.

### Steps

#### 0.1 Initialise the monorepo
```bash
# In an empty project root directory:
npx create-turbo@latest . --package-manager npm
# When prompted: choose npm workspaces
```

Update `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "lint":  {},
    "test":  { "dependsOn": ["^build"] },
    "type-check": {}
  }
}
```

Root `package.json` workspaces:
```json
{
  "name": "orbisave",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build":      "turbo run build",
    "dev":        "turbo run dev",
    "lint":       "turbo run lint",
    "type-check": "turbo run type-check",
    "test":       "turbo run test",
    "format":     "prettier --write \"**/*.{ts,tsx,js,json,md}\""
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "^3.2",
    "husky": "^9.0",
    "lint-staged": "^15.0"
  }
}
```

#### 0.2 Create directory structure
```bash
mkdir -p apps/web
mkdir -p packages/shared-types/src
mkdir -p packages/shared-utils/src
mkdir -p packages/ui/src
mkdir -p backend
mkdir -p infrastructure/docker/Dockerfiles
mkdir -p .github/workflows
```

#### 0.3 Initialise Next.js app
```bash
cd apps/web
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-git
```

`apps/web/package.json` — set name to `"name": "@orbisave/web"`.

#### 0.4 Configure TypeScript strict mode

`apps/web/tsconfig.json` — ensure:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Create `packages/shared-types/tsconfig.json` and `packages/shared-utils/tsconfig.json` with the same strict flags.

#### 0.5 ESLint, Prettier, Husky
```bash
# From root
npm install --save-dev \
  eslint-config-airbnb-typescript \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-import \
  eslint-plugin-jsx-a11y \
  eslint-plugin-react \
  eslint-plugin-react-hooks

npx husky init
```

`.husky/pre-commit`:
```bash
npx lint-staged
```

Root `.lintstagedrc.json`:
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

#### 0.6 Shared packages scaffold

`packages/shared-types/package.json`:
```json
{
  "name": "@orbisave/shared-types",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

`packages/shared-types/src/index.ts`:
```typescript
export * from './enums';
export * from './api';
```

`packages/shared-types/src/enums.ts`:
```typescript
export const USER_ROLES = ['member','chairperson','treasurer','platform_admin','super_admin'] as const;
export type UserRole = typeof USER_ROLES[number];

export const COUNTRIES = ['kenya','rwanda','ghana'] as const;
export type Country = typeof COUNTRIES[number];

export const CURRENCIES: Record<Country, string> = {
  kenya: 'KES', rwanda: 'RWF', ghana: 'GHS',
};

export const CURRENCY_SYMBOLS: Record<Country, string> = {
  kenya: 'KSh', rwanda: 'RF', ghana: 'GH₵',
};

export const LOAN_STATUSES = [
  'pending_chair','pending_treasurer','pending_admin',
  'approved','disbursed','active','repaid','defaulted','rejected'
] as const;
export type LoanStatus = typeof LOAN_STATUSES[number];

export const CONTRIBUTION_STATUSES = ['scheduled','initiated','pending','confirmed','failed'] as const;
export type ContributionStatus = typeof CONTRIBUTION_STATUSES[number];

export const PAYMENT_METHODS = ['mpesa','airtel','mtn_momo','bank'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];
```

`packages/shared-utils/src/currency.ts`:
```typescript
import { Country, CURRENCY_SYMBOLS } from '@orbisave/shared-types';

export function formatCurrency(amount: number, country: Country): string {
  const symbol = CURRENCY_SYMBOLS[country];
  return `${symbol} ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
```

#### 0.7 Docker Compose environment

`infrastructure/docker/docker-compose.yml`:
```yaml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: orbisave
      POSTGRES_USER: orbisave
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orbisave"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ../../backend
      dockerfile: ../infrastructure/docker/Dockerfiles/backend.Dockerfile
    volumes:
      - ../../backend:/app
    ports:
      - "8000:8000"
    env_file: ../../backend/.env
    environment:
      - DATABASE_URL=postgresql://orbisave:dev_password@db:5432/orbisave
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=True
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"

  celery:
    build:
      context: ../../backend
      dockerfile: ../infrastructure/docker/Dockerfiles/backend.Dockerfile
    volumes:
      - ../../backend:/app
    env_file: ../../backend/.env
    environment:
      - DATABASE_URL=postgresql://orbisave:dev_password@db:5432/orbisave
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    command: celery -A celery_app worker -l info

  celery-beat:
    build:
      context: ../../backend
      dockerfile: ../infrastructure/docker/Dockerfiles/backend.Dockerfile
    volumes:
      - ../../backend:/app
    env_file: ../../backend/.env
    environment:
      - DATABASE_URL=postgresql://orbisave:dev_password@db:5432/orbisave
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    command: celery -A celery_app beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

  flower:
    image: mher/flower:2.0
    ports:
      - "5555:5555"
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis

  web:
    build:
      context: ../../apps/web
      dockerfile: ../../infrastructure/docker/Dockerfiles/web.Dockerfile
    volumes:
      - ../../apps/web:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    environment:
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=dev_secret_change_in_production
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

`infrastructure/docker/Dockerfiles/backend.Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/development.txt
COPY . .
EXPOSE 8000
```

`infrastructure/docker/Dockerfiles/web.Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
```

#### 0.8 Environment files

`backend/.env` (development — never commit):
```env
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend
DATABASE_URL=postgresql://orbisave:dev_password@db:5432/orbisave
REDIS_URL=redis://redis:6379/0
SIMPLE_JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
SIMPLE_JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
# Mocked in dev — real values added in staging
MPESA_ENVIRONMENT=sandbox
MTN_ENVIRONMENT=sandbox
AFRICASTALKING_USERNAME=sandbox
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
```

`apps/web/.env.local` (development — never commit):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev_secret_change_in_production
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```

Add `.env`, `.env.local`, `*.env` to root `.gitignore`.

#### 0.9 Verify

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
# Verify:
# ✅ db: logs show "database system is ready"
# ✅ redis: logs show "Ready to accept connections"
# ✅ backend: http://localhost:8000 returns Django response
# ✅ web: http://localhost:3000 renders Next.js default page
# ✅ flower: http://localhost:5555 shows Celery dashboard

npm run lint     # zero errors
npm run type-check  # zero errors
```

### Acceptance Criteria
- [ ] All Docker services start without errors
- [ ] `npm run lint` and `npm run type-check` pass from repo root
- [ ] Turborepo pipeline resolves package dependency graph correctly
- [ ] `.gitignore` covers all env files, `node_modules`, `__pycache__`, `.next`, `dist`
- [ ] `packages/shared-types` exports `UserRole`, `Country`, `LoanStatus`, `ContributionStatus`
- [ ] `packages/shared-utils` exports `formatCurrency`

### Handoff to Phase 1
- Docker Compose environment is running
- Monorepo root is at `orbisave/`
- Backend directory is at `orbisave/backend/`
- Shared types package is at `orbisave/packages/shared-types/`

---

## Phase 1 — Backend Foundation (Django Models & Migrations)

**Owner:** Backend Engineer  
**Estimated effort:** 2–3 days  
**Prerequisites:** Phase 0 complete

### Goal
Scaffold the full Django project, define all data models, and run migrations. This is the schema layer — every financial object in the system is defined here. Get this right before building any APIs.

### Steps

#### 1.1 Scaffold Django project
```bash
cd backend
pip install django==5.0.* djangorestframework==3.15.*
django-admin startproject config .
# Result: backend/config/ and backend/manage.py
```

Restructure settings into `config/settings/`:
```
config/settings/
  __init__.py
  base.py
  development.py
  production.py
  test.py
```

`config/settings/base.py` — key items:
```python
import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ['SECRET_KEY']
DEBUG = False

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'corsheaders',
    'django_celery_beat',
    'django_celery_results',
    # Local apps
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

AUTH_USER_MODEL = 'accounts.User'

DATABASES = {
    'default': dj_database_url.parse(os.environ['DATABASE_URL'])
}

# manage.py uses: DJANGO_SETTINGS_MODULE=config.settings.development
```

`config/settings/development.py`:
```python
from .base import *
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend']
```

#### 1.2 Install all backend dependencies

`backend/requirements/base.txt`:
```
django==5.0.*
djangorestframework==3.15.*
dj-database-url==2.*
psycopg2-binary==2.*
django-redis==5.*
celery[redis]==5.*
django-celery-beat==2.*
django-celery-results==2.*
djangorestframework-simplejwt==5.*
drf-spectacular==0.27.*
django-cors-headers==4.*
django-ratelimit==4.*
django-encrypted-model-fields==0.6.*
argon2-cffi==23.*
structlog==24.*
boto3==1.*
Pillow==10.*
python-decouple==3.*
```

`backend/requirements/development.txt`:
```
-r base.txt
pytest-django==4.*
factory-boy==3.*
responses==0.25.*
freezegun==1.*
coverage==7.*
```

```bash
pip install -r requirements/development.txt
```

#### 1.3 Create all Django apps
```bash
cd backend
python manage.py startapp accounts apps/accounts
python manage.py startapp groups    apps/groups
python manage.py startapp contributions apps/contributions
python manage.py startapp loans     apps/loans
python manage.py startapp ledger    apps/ledger
python manage.py startapp payouts   apps/payouts
python manage.py startapp payments  apps/payments
python manage.py startapp notifications apps/notifications
python manage.py startapp meetings  apps/meetings
python manage.py startapp admin_portal apps/admin_portal
python manage.py startapp audit     apps/audit
python manage.py startapp analytics apps/analytics
```

#### 1.4 BaseModel (common/models.py)
```python
# backend/common/models.py
import uuid
from django.db import models

class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

#### 1.5 Define all models

**`apps/accounts/models.py`** — Custom User model (must be defined BEFORE any migration is run):
```python
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from common.models import BaseModel

class UserManager(BaseUserManager):
    def create_user(self, email, phone, full_name, password=None, **extra_fields):
        email = self.normalize_email(email)
        user = self.model(email=email, phone=phone, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, phone, full_name, password=None, **extra_fields):
        extra_fields.setdefault('role', 'super_admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, phone, full_name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    ROLES = [
        ('member', 'Member'),
        ('chairperson', 'Chairperson'),
        ('treasurer', 'Treasurer'),
        ('platform_admin', 'Platform Admin'),
        ('super_admin', 'Super Admin'),
    ]
    COUNTRIES = [('kenya','Kenya'), ('rwanda','Rwanda'), ('ghana','Ghana')]
    KYC_STATUS = [
        ('pending','Pending'), ('submitted','Submitted'),
        ('verified','Verified'), ('rejected','Rejected'),
    ]

    email                  = models.EmailField(unique=True)
    phone                  = models.CharField(max_length=20, unique=True)
    full_name              = models.CharField(max_length=255)
    date_of_birth          = models.DateField(null=True, blank=True)
    national_id            = models.CharField(max_length=50, null=True, blank=True)
    role                   = models.CharField(max_length=20, choices=ROLES, default='member')
    country                = models.CharField(max_length=10, choices=COUNTRIES, null=True, blank=True)
    avatar                 = models.ImageField(upload_to='avatars/', null=True, blank=True)
    kyc_status             = models.CharField(max_length=20, choices=KYC_STATUS, default='pending')
    kyc_provider_ref       = models.CharField(max_length=255, null=True, blank=True)
    phone_verified         = models.BooleanField(default=False)
    two_factor_enabled     = models.BooleanField(default=False)
    transaction_pin_hash   = models.CharField(max_length=255, null=True, blank=True)
    mobile_money_provider  = models.CharField(max_length=50, null=True, blank=True)
    mobile_money_number    = models.CharField(max_length=20, null=True, blank=True)
    is_active              = models.BooleanField(default=True)
    is_staff               = models.BooleanField(default=False)
    last_login_ip          = models.GenericIPAddressField(null=True, blank=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['phone', 'full_name']
    objects = UserManager()

    def __str__(self): return f"{self.full_name} <{self.email}>"

class KYCDocument(BaseModel):
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kyc_documents')
    document_type   = models.CharField(max_length=50)  # national_id | passport | drivers_license
    front_image     = models.FileField(upload_to='kyc/front/')
    back_image      = models.FileField(upload_to='kyc/back/', null=True, blank=True)
    provider_job_id = models.CharField(max_length=255, null=True, blank=True)
    status          = models.CharField(max_length=20, default='pending')
    reviewed_at     = models.DateTimeField(null=True, blank=True)

class PhoneOTP(BaseModel):
    """One-time codes for phone number verification."""
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='phone_otps')
    code       = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    used       = models.BooleanField(default=False)
```

**`apps/groups/models.py`**:
```python
import secrets
from django.db import models
from django.utils import timezone
from common.models import BaseModel

class Group(BaseModel):
    CONTRIBUTION_FREQUENCY = [
        ('weekly','Weekly'), ('biweekly','Bi-weekly'),
        ('monthly','Monthly'), ('harvest','Harvest Season'),
    ]
    ROTATION_METHODS = [
        ('sequential','Sequential'), ('random','Random Draw'), ('manual','Manual'),
    ]
    STATUS   = [('active','Active'), ('paused','Paused'), ('closed','Closed')]
    COUNTRIES = [('kenya','Kenya'), ('rwanda','Rwanda'), ('ghana','Ghana')]

    name                      = models.CharField(max_length=255)
    description               = models.TextField(blank=True)
    country                   = models.CharField(max_length=10, choices=COUNTRIES)
    chairperson               = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='chaired_groups')
    treasurer                 = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='treasured_groups', null=True, blank=True)
    max_members               = models.PositiveIntegerField(default=20)
    contribution_amount       = models.DecimalField(max_digits=14, decimal_places=2)
    contribution_frequency    = models.CharField(max_length=20, choices=CONTRIBUTION_FREQUENCY)
    contribution_day          = models.PositiveIntegerField()
    harvest_start_month       = models.PositiveIntegerField(null=True, blank=True)
    harvest_end_month         = models.PositiveIntegerField(null=True, blank=True)
    rotation_savings_pct      = models.DecimalField(max_digits=5, decimal_places=2, default=70)
    loan_pool_pct             = models.DecimalField(max_digits=5, decimal_places=2, default=30)
    max_loan_multiplier       = models.DecimalField(max_digits=5, decimal_places=2, default=3)
    loan_term_weeks           = models.PositiveIntegerField(default=12)
    loan_interest_rate_monthly = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    rotation_method           = models.CharField(max_length=20, choices=ROTATION_METHODS, default='sequential')
    status                    = models.CharField(max_length=20, choices=STATUS, default='active')
    invite_code               = models.CharField(max_length=50, unique=True)
    invite_expires_at         = models.DateTimeField()
    currency                  = models.CharField(max_length=5)  # KES | RWF | GHS
    trust_account_ref         = models.CharField(max_length=255, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(20)
        from datetime import timedelta
        if not self.invite_expires_at:
            self.invite_expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

class GroupMember(BaseModel):
    STATUS = [('active','Active'), ('suspended','Suspended'), ('left','Left')]
    group             = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user              = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='group_memberships')
    rotation_position = models.PositiveIntegerField()
    status            = models.CharField(max_length=20, choices=STATUS, default='active')
    joined_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('group','user'), ('group','rotation_position')]

class GroupInvite(BaseModel):
    STATUS = [('pending','Pending'), ('accepted','Accepted'), ('expired','Expired'), ('cancelled','Cancelled')]
    group        = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='invites')
    invited_by   = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    contact      = models.CharField(max_length=255)
    contact_type = models.CharField(max_length=10)  # email | phone
    token        = models.CharField(max_length=255, unique=True)
    status       = models.CharField(max_length=20, choices=STATUS, default='pending')
    accepted_by  = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='accepted_invites')
    expires_at   = models.DateTimeField()
    accepted_at  = models.DateTimeField(null=True, blank=True)
```

**`apps/ledger/models.py`** — IMMUTABLE double-entry ledger:
```python
import hashlib, json
from django.db import models
from common.models import BaseModel

class LedgerEntry(BaseModel):
    ENTRY_TYPES = [
        ('contribution','Contribution'), ('payout','Payout'),
        ('loan_disbursement','Loan Disbursement'), ('loan_repayment','Loan Repayment'),
        ('service_fee','Service Fee'), ('interest','Interest'),
        ('refund','Refund'), ('reconciliation_adjustment','Reconciliation Adjustment'),
    ]
    DIRECTIONS = [('credit','Credit'), ('debit','Debit')]

    group               = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='ledger_entries')
    member              = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True)
    entry_type          = models.CharField(max_length=40, choices=ENTRY_TYPES)
    direction           = models.CharField(max_length=10, choices=DIRECTIONS)
    amount              = models.DecimalField(max_digits=14, decimal_places=2)
    currency            = models.CharField(max_length=5)
    running_balance     = models.DecimalField(max_digits=14, decimal_places=2)
    description         = models.TextField()
    reference           = models.CharField(max_length=255, unique=True)
    related_contribution = models.ForeignKey('contributions.Contribution', on_delete=models.PROTECT, null=True, blank=True)
    related_loan        = models.ForeignKey('loans.Loan', on_delete=models.PROTECT, null=True, blank=True)
    related_payout      = models.ForeignKey('payouts.Payout', on_delete=models.PROTECT, null=True, blank=True)
    recorded_by         = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, related_name='ledger_entries_recorded')
    hash                = models.CharField(max_length=64)

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Ledger entries are immutable — no updates permitted.")
        # Build chain hash before saving
        previous = LedgerEntry.objects.filter(group=self.group).order_by('-created_at').first()
        prev_hash = previous.hash if previous else '0' * 64
        payload = f"{prev_hash}{self.group_id}{self.entry_type}{self.amount}{self.reference}"
        self.hash = hashlib.sha256(payload.encode()).hexdigest()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Ledger entries cannot be deleted.")
```

**`apps/contributions/models.py`**:
```python
from django.db import models
from common.models import BaseModel

class Contribution(BaseModel):
    METHODS = [('mpesa','M-Pesa'), ('airtel','Airtel Money'), ('mtn_momo','MTN MoMo'), ('bank','Bank Transfer')]
    STATUS  = [('scheduled','Scheduled'), ('initiated','Initiated'), ('pending','Pending'), ('confirmed','Confirmed'), ('failed','Failed')]

    group              = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='contributions')
    member             = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='contributions')
    amount             = models.DecimalField(max_digits=14, decimal_places=2)
    currency           = models.CharField(max_length=5)
    method             = models.CharField(max_length=20, choices=METHODS)
    mobile_number      = models.CharField(max_length=20)
    provider_reference = models.CharField(max_length=255, null=True, blank=True)
    platform_reference = models.CharField(max_length=255, unique=True)
    status             = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    scheduled_date     = models.DateField()
    initiated_at       = models.DateTimeField(null=True, blank=True)
    confirmed_at       = models.DateTimeField(null=True, blank=True)
    failure_reason     = models.TextField(null=True, blank=True)
    retry_count        = models.PositiveIntegerField(default=0)
    max_retries        = models.PositiveIntegerField(default=3)
```

**`apps/loans/models.py`**:
```python
from django.db import models
from common.models import BaseModel

class Loan(BaseModel):
    STATUS = [
        ('pending_chair','Pending Chairperson'), ('pending_treasurer','Pending Treasurer'),
        ('pending_admin','Pending Platform Admin'), ('approved','Approved'),
        ('disbursed','Disbursed'), ('active','Active'), ('repaid','Repaid'),
        ('defaulted','Defaulted'), ('rejected','Rejected'),
    ]
    group                    = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='loans')
    borrower                 = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='loans')
    amount                   = models.DecimalField(max_digits=14, decimal_places=2)
    currency                 = models.CharField(max_length=5)
    interest_rate_monthly    = models.DecimalField(max_digits=5, decimal_places=2)
    term_weeks               = models.PositiveIntegerField()
    purpose                  = models.CharField(max_length=255)
    purpose_detail           = models.TextField(blank=True)
    status                   = models.CharField(max_length=25, choices=STATUS, default='pending_chair')
    # Approval chain
    chair_approved_by        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='chair_approved_loans')
    chair_approved_at        = models.DateTimeField(null=True, blank=True)
    chair_rejection_reason   = models.TextField(null=True, blank=True)
    treasurer_approved_by    = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='treasurer_approved_loans')
    treasurer_approved_at    = models.DateTimeField(null=True, blank=True)
    treasurer_rejection_reason = models.TextField(null=True, blank=True)
    admin_approved_by        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='admin_approved_loans')
    admin_approved_at        = models.DateTimeField(null=True, blank=True)
    admin_rejection_reason   = models.TextField(null=True, blank=True)
    disbursed_at             = models.DateTimeField(null=True, blank=True)
    disbursement_reference   = models.CharField(max_length=255, null=True, blank=True)
    fully_repaid_at          = models.DateTimeField(null=True, blank=True)

class LoanRepayment(BaseModel):
    STATUS = [('upcoming','Upcoming'), ('paid','Paid'), ('overdue','Overdue'), ('waived','Waived')]
    loan             = models.ForeignKey(Loan, on_delete=models.PROTECT, related_name='repayments')
    due_date         = models.DateField()
    principal_amount = models.DecimalField(max_digits=14, decimal_places=2)
    interest_amount  = models.DecimalField(max_digits=14, decimal_places=2)
    total_due        = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status           = models.CharField(max_length=20, choices=STATUS, default='upcoming')
    paid_at          = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=255, null=True, blank=True)
```

**`apps/payouts/models.py`**:
```python
from django.db import models
from common.models import BaseModel

class Payout(BaseModel):
    STATUS = [('upcoming','Upcoming'), ('processing','Processing'), ('completed','Completed'), ('failed','Failed'), ('skipped','Skipped')]
    group              = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='payouts')
    recipient          = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='payouts')
    rotation_position  = models.PositiveIntegerField()
    cycle_number       = models.PositiveIntegerField()
    gross_amount       = models.DecimalField(max_digits=14, decimal_places=2)
    service_fee        = models.DecimalField(max_digits=14, decimal_places=2)
    net_amount         = models.DecimalField(max_digits=14, decimal_places=2)
    currency           = models.CharField(max_length=5)
    method             = models.CharField(max_length=20)
    mobile_number      = models.CharField(max_length=20)
    provider_reference = models.CharField(max_length=255, null=True, blank=True)
    status             = models.CharField(max_length=20, choices=STATUS, default='upcoming')
    processed_by       = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='processed_payouts')
    processed_at       = models.DateTimeField(null=True, blank=True)
    scheduled_date     = models.DateField()
```

**`apps/audit/models.py`** — IMMUTABLE audit log:
```python
from django.db import models
from common.models import BaseModel

class AuditLog(BaseModel):
    ACTION_TYPES = [
        ('user_login','User Login'), ('user_logout','User Logout'),
        ('kyc_submitted','KYC Submitted'), ('kyc_verified','KYC Verified'), ('kyc_rejected','KYC Rejected'),
        ('group_created','Group Created'), ('group_paused','Group Paused'), ('group_closed','Group Closed'),
        ('member_joined','Member Joined'), ('member_suspended','Member Suspended'), ('member_reinstated','Member Reinstated'),
        ('contribution_scheduled','Contribution Scheduled'), ('contribution_initiated','Contribution Initiated'),
        ('contribution_confirmed','Contribution Confirmed'), ('contribution_failed','Contribution Failed'),
        ('loan_requested','Loan Requested'), ('loan_chair_approved','Loan Chair Approved'),
        ('loan_chair_rejected','Loan Chair Rejected'), ('loan_treasurer_approved','Loan Treasurer Approved'),
        ('loan_treasurer_rejected','Loan Treasurer Rejected'), ('loan_admin_approved','Loan Admin Approved'),
        ('loan_admin_rejected','Loan Admin Rejected'), ('loan_disbursed','Loan Disbursed'),
        ('loan_repayment_received','Loan Repayment Received'), ('payout_processed','Payout Processed'),
        ('invite_sent','Invite Sent'), ('invite_accepted','Invite Accepted'),
        ('admin_action','Admin Action'), ('transaction_pin_changed','Transaction PIN Changed'),
        ('password_changed','Password Changed'), ('2fa_enabled','2FA Enabled'), ('2fa_disabled','2FA Disabled'),
    ]
    action       = models.CharField(max_length=50, choices=ACTION_TYPES)
    actor        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True)
    target_user  = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='audit_targets')
    target_group = models.ForeignKey('groups.Group', on_delete=models.PROTECT, null=True, blank=True)
    country      = models.CharField(max_length=10, null=True, blank=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    user_agent   = models.TextField(null=True, blank=True)
    metadata     = models.JSONField(default=dict)
    session_id   = models.CharField(max_length=255, null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Audit log entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Audit log entries cannot be deleted.")
```

**`apps/meetings/models.py`**:
```python
from django.db import models
from common.models import BaseModel

class Meeting(BaseModel):
    STATUS = [('scheduled','Scheduled'), ('live','Live'), ('ended','Ended'), ('cancelled','Cancelled')]
    group          = models.ForeignKey('groups.Group', on_delete=models.CASCADE, related_name='meetings')
    title          = models.CharField(max_length=255)
    agenda         = models.TextField(blank=True)
    scheduled_at   = models.DateTimeField()
    started_at     = models.DateTimeField(null=True, blank=True)
    ended_at       = models.DateTimeField(null=True, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    livekit_room   = models.CharField(max_length=255, null=True, blank=True)
    created_by     = models.ForeignKey('accounts.User', on_delete=models.PROTECT)
    minutes        = models.TextField(blank=True)

class MeetingAttendance(BaseModel):
    meeting   = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='attendances')
    member    = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='meeting_attendances')
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('meeting','member')]
```

**`apps/notifications/models.py`**:
```python
from django.db import models
from common.models import BaseModel

class Notification(BaseModel):
    TYPE_CHOICES = [
        ('contribution_confirmed','Contribution Confirmed'),
        ('contribution_failed','Contribution Failed'),
        ('loan_status_changed','Loan Status Changed'),
        ('payout_processed','Payout Processed'),
        ('loan_approval_required','Loan Approval Required'),
        ('new_member_joined','New Member Joined'),
        ('meeting_starting','Meeting Starting'),
        ('admin_alert','Admin Alert'),
        ('reminder','Reminder'),
    ]
    CHANNEL_CHOICES = [('in_app','In-App'), ('sms','SMS'), ('email','Email'), ('push','Push')]

    recipient  = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=50, choices=TYPE_CHOICES)
    channel    = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='in_app')
    title      = models.CharField(max_length=255)
    body       = models.TextField()
    metadata   = models.JSONField(default=dict)
    read       = models.BooleanField(default=False)
    read_at    = models.DateTimeField(null=True, blank=True)
    sent_at    = models.DateTimeField(null=True, blank=True)
    delivered  = models.BooleanField(default=False)
```

#### 1.6 Run initial migrations
```bash
cd backend
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py makemigrations accounts groups ledger contributions loans payouts payments notifications meetings admin_portal audit analytics
python manage.py migrate
```

> [!IMPORTANT]
> The `accounts` migration must run first because all other apps reference `accounts.User`. Django handles this via migration dependency declarations automatically, but verify the dependency graph if you get errors.

#### 1.7 Configure Celery
```python
# backend/celery_app.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
app = Celery('orbisave')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

Add to `config/settings/base.py`:
```python
CELERY_BROKER_URL  = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT  = ['json']
```

#### 1.8 Configure pytest
```ini
# backend/pytest.ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = tests.py test_*.py *_tests.py
```

`config/settings/test.py`:
```python
from .base import *
DATABASES = {'default': {'ENGINE':'django.db.backends.sqlite3', 'NAME': ':memory:'}}
CELERY_TASK_ALWAYS_EAGER = True
```

Write the first passing test:
```python
# backend/tests/test_smoke.py
import pytest
@pytest.mark.django_db
def test_database_accessible():
    from apps.accounts.models import User
    assert User.objects.count() == 0
```

```bash
pytest tests/test_smoke.py  # must pass
```

### Acceptance Criteria
- [ ] `python manage.py migrate` runs with zero errors
- [ ] `python manage.py check` produces no warnings
- [ ] All 12 apps are registered in `INSTALLED_APPS`
- [ ] `AUTH_USER_MODEL = 'accounts.User'` set before first migration
- [ ] `LedgerEntry.save()` raises `PermissionError` on update attempt
- [ ] `AuditLog.save()` raises `PermissionError` on update attempt
- [ ] `pytest tests/test_smoke.py` passes
- [ ] No hardcoded secrets in any settings file

### Handoff to Phase 2
- All models and migrations exist
- `accounts.User` is the AUTH_USER_MODEL
- pytest infrastructure is ready
- Django development server starts cleanly on port 8000

---

## Phase 2 — Backend Auth & User API

**Owner:** Backend Engineer  
**Estimated effort:** 2–3 days  
**Prerequisites:** Phase 1 complete

### Goal
Implement all authentication endpoints — registration, login, token refresh, logout, phone OTP verification, password reset, and the `/me` profile endpoint. Apply rate limiting and audit logging to all auth actions.

### Steps

#### 2.1 JWT configuration (RS256)

Generate RSA keys (store in secrets manager in production; store locally in dev):
```bash
openssl genrsa -out backend/secrets/jwt_private.pem 2048
openssl rsa -in backend/secrets/jwt_private.pem -pubout -out backend/secrets/jwt_public.pem
```

Add to `.gitignore`: `backend/secrets/`

`config/settings/base.py`:
```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=int(os.environ.get('SIMPLE_JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 15))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('SIMPLE_JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'RS256',
    'SIGNING_KEY':   open(os.environ.get('JWT_PRIVATE_KEY_PATH', 'secrets/jwt_private.pem')).read(),
    'VERIFYING_KEY': open(os.environ.get('JWT_PUBLIC_KEY_PATH', 'secrets/jwt_public.pem')).read(),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}
```

#### 2.2 DRF global settings
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES':     ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_SCHEMA_CLASS':           'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS':       'common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'common.exceptions.orbisave_exception_handler',
}
```

#### 2.3 Standard response envelope

`common/exceptions.py`:
```python
from rest_framework.views import exception_handler
from rest_framework.response import Response

def orbisave_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return Response({
            'success': False,
            'data': None,
            'message': str(exc),
            'errors': response.data,
            'meta': None,
        }, status=response.status_code)
    return response
```

`common/serializers.py` — base mixin that wraps responses:
```python
def success_response(data, message='', status_code=200, meta=None):
    from rest_framework.response import Response
    return Response({
        'success': True,
        'data': data,
        'message': message,
        'errors': None,
        'meta': meta,
    }, status=status_code)
```

#### 2.4 Custom permissions
```python
# common/permissions.py
from rest_framework.permissions import BasePermission

class IsGroupMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.memberships.filter(user=request.user, status='active').exists()

class IsGroupChairperson(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.chairperson == request.user

class IsGroupTreasurer(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.treasurer == request.user

class IsGroupLeader(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.chairperson == request.user or obj.treasurer == request.user

class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ('platform_admin', 'super_admin')

class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'super_admin'

class IsKYCVerified(BasePermission):
    message = 'KYC verification is required to perform financial actions.'
    def has_permission(self, request, view):
        return request.user.kyc_status == 'verified'
```

#### 2.5 Registration endpoint

`apps/accounts/serializers.py`:
```python
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['full_name', 'email', 'phone', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
```

`apps/accounts/views.py`:
```python
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework import status
from common.serializers import success_response
from apps.audit.services import log_audit

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_audit(action='user_login', actor=user, ip_address=get_client_ip(request))
        return success_response(
            data={'id': str(user.id), 'email': user.email},
            message='Account created successfully.',
            status_code=status.HTTP_201_CREATED,
        )
```

#### 2.6 Rate limiting on auth endpoints
```python
# Apply django-ratelimit to login and register:
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/15m', method='POST', block=True)
def post(self, request):
    ...
```

#### 2.7 Phone OTP verification endpoints
```
POST /api/v1/auth/verify-phone/         → generate 6-digit OTP, mock SMS in dev
POST /api/v1/auth/verify-phone/confirm/ → confirm OTP, set phone_verified=True
```

OTP logic: generate 6-digit code, store in `PhoneOTP` with 10-minute expiry, mark used after confirmation.

In development, log the OTP to the Django console instead of sending a real SMS.

#### 2.8 Password reset
```
POST /api/v1/auth/forgot-password/ → send reset email with signed token
POST /api/v1/auth/reset-password/  → validate token, set new password
```

Use Django's `PasswordResetTokenGenerator` for signed tokens. In dev, print email content to console.

#### 2.9 Transaction PIN endpoints
```
POST /api/v1/auth/me/set-transaction-pin/ → hash with Argon2id, store in transaction_pin_hash
```

```python
import argon2
ph = argon2.PasswordHasher()
user.transaction_pin_hash = ph.hash(pin)
user.save(update_fields=['transaction_pin_hash'])
```

A helper `verify_transaction_pin(user, pin) -> bool` must be in `apps/accounts/services.py`. This is called server-side before every financial action.

#### 2.10 URL routing

`apps/accounts/urls.py`:
```python
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from . import views

urlpatterns = [
    path('register/',              views.RegisterView.as_view()),
    path('token/',                 views.LoginView.as_view()),
    path('token/refresh/',         TokenRefreshView.as_view()),
    path('token/blacklist/',       TokenBlacklistView.as_view()),
    path('verify-phone/',          views.InitiatePhoneVerificationView.as_view()),
    path('verify-phone/confirm/',  views.ConfirmPhoneVerificationView.as_view()),
    path('forgot-password/',       views.ForgotPasswordView.as_view()),
    path('reset-password/',        views.ResetPasswordView.as_view()),
    path('me/',                    views.MeView.as_view()),
    path('me/change-password/',    views.ChangePasswordView.as_view()),
    path('me/set-transaction-pin/', views.SetTransactionPINView.as_view()),
    path('me/mobile-money/',       views.LinkMobileMoneyView.as_view()),
]
```

`config/urls.py`:
```python
from django.urls import path, include
urlpatterns = [
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
]
```

#### 2.11 KYC endpoints
```
POST /api/v1/kyc/documents/ → upload front + back images, store to S3 (local filesystem in dev), update kyc_status='submitted'
GET  /api/v1/kyc/status/    → return current kyc_status
POST /api/v1/kyc/webhook/   → internal — receive callback from Smile Identity (mock in dev: set kyc_status='verified' after 5s Celery delay)
```

#### 2.12 Audit service helper
```python
# apps/audit/services.py
from apps.audit.models import AuditLog

def log_audit(action, actor=None, target_user=None, target_group=None,
              ip_address=None, user_agent=None, metadata=None, session_id=None):
    AuditLog.objects.create(
        action=action, actor=actor, target_user=target_user,
        target_group=target_group, ip_address=ip_address,
        user_agent=user_agent or '', metadata=metadata or {},
        session_id=session_id, country=actor.country if actor else None,
    )
```

Call `log_audit()` at every auth event: login, logout, register, password change, PIN change, KYC status change.

#### 2.13 OpenAPI schema
```bash
python manage.py spectacular --color --file schema.yml
# Verify schema produces /auth/ endpoint group
```

### Acceptance Criteria
- [ ] `POST /api/v1/auth/register/` creates user and returns 201
- [ ] `POST /api/v1/auth/token/` returns access + refresh tokens
- [ ] `POST /api/v1/auth/token/refresh/` rotates refresh token
- [ ] `POST /api/v1/auth/token/blacklist/` invalidates refresh token (logout)
- [ ] `/api/v1/auth/me/` returns user profile for authenticated user, 401 for unauthenticated
- [ ] Rate limiting blocks after 5 login attempts from same IP in 15 minutes
- [ ] Transaction PIN is hashed with Argon2id — plain-text PIN is never stored
- [ ] Every auth action writes an `AuditLog` entry
- [ ] `pytest apps/accounts/` passes — auth, permission, rate limit tests all green
- [ ] OpenAPI schema is valid

### Handoff to Phase 3
- All `/api/v1/auth/` endpoints operational
- JWT tokens can be obtained and used to authenticate requests
- `IsKYCVerified`, `IsPlatformAdmin`, `IsSuperAdmin` permission classes defined
- `log_audit()` helper available in `apps.audit.services`

---

## Phase 3 — Backend: Groups, Members & Invites

**Owner:** Backend Engineer  
**Estimated effort:** 2–3 days  
**Prerequisites:** Phase 2 complete

### Goal
Build all Group management endpoints — create/update groups, member management, and the invite system (link + SMS + email). Every endpoint enforces role-based permissions and writes audit logs.

### Steps

#### 3.1 Group serializers
```python
# apps/groups/serializers.py
class GroupCreateSerializer(serializers.ModelSerializer):
    """Used by chairpersons to create a group."""
    class Meta:
        model  = Group
        fields = ['name','description','country','max_members','contribution_amount',
                  'contribution_frequency','contribution_day','rotation_savings_pct',
                  'loan_pool_pct','max_loan_multiplier','loan_term_weeks',
                  'loan_interest_rate_monthly','rotation_method']

    def validate(self, data):
        total = data['rotation_savings_pct'] + data['loan_pool_pct']
        if total != 100:
            raise serializers.ValidationError('rotation_savings_pct + loan_pool_pct must equal 100.')
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        currency_map = {'kenya':'KES','rwanda':'RWF','ghana':'GHS'}
        validated_data['currency'] = currency_map[validated_data['country']]
        validated_data['chairperson'] = user
        return super().create(validated_data)
```

#### 3.2 Group endpoints
```
GET  /api/v1/groups/          → list groups the authenticated user belongs to
POST /api/v1/groups/          → create group (sets request.user as chairperson)
GET  /api/v1/groups/{id}/     → group detail (must be member)
PATCH /api/v1/groups/{id}/    → update settings (chairperson only)
POST /api/v1/groups/{id}/pause/ → pause group (chairperson only, with reason)
POST /api/v1/groups/{id}/close/ → close group (chairperson only)
GET  /api/v1/groups/{id}/wallet/ → return computed pool balances from ledger
```

**Wallet balance** is ALWAYS computed live from `LedgerEntry` aggregations — never stored separately:
```python
def get_wallet(group):
    from django.db.models import Sum, Q
    entries = group.ledger_entries.all()
    total_credits = entries.filter(direction='credit').aggregate(Sum('amount'))['amount__sum'] or 0
    total_debits  = entries.filter(direction='debit').aggregate(Sum('amount'))['amount__sum']  or 0
    total = total_credits - total_debits
    rotation_pool = total * (group.rotation_savings_pct / 100)
    loan_pool     = total * (group.loan_pool_pct / 100)
    return {'total': total, 'rotation_pool': rotation_pool, 'loan_pool': loan_pool,
            'currency': group.currency}
```

#### 3.3 Member management endpoints
```
GET  /api/v1/groups/{id}/members/          → list members (all group members)
POST /api/v1/groups/{id}/members/remove/   → chairperson removes member (log audit)
POST /api/v1/groups/{id}/members/suspend/  → chairperson suspends member
POST /api/v1/groups/{id}/members/reinstate/ → chairperson reinstates member
```

All member change actions write both a `GroupMember` update and an `AuditLog` entry.

#### 3.4 Invite system
```
GET  /api/v1/groups/{id}/invites/                → list invites (chairperson)
POST /api/v1/groups/{id}/invites/                → send invite (email or phone)
POST /api/v1/groups/{id}/invites/regenerate-link/ → regenerate invite_code (invalidates old)
GET  /api/v1/invites/{code}/                     → public — get invite details (no auth required)
POST /api/v1/invites/{code}/accept/              → accept invite (authenticated user)
```

Invite dispatch flow:
1. Create `GroupInvite` record with unique token, 7-day expiry
2. Queue Celery task `send_invite_notification` — sends SMS via Africa's Talking (mocked in dev) or email
3. `GET /api/v1/invites/{code}/` is public (no auth) — returns group name, chairperson name, contribution amount, currency, member count
4. `POST /api/v1/invites/{code}/accept/` — validates token not expired, creates `GroupMember`, sets `rotation_position` to next available slot, marks invite as accepted, logs audit

#### 3.5 Role promotion on first group creation
When a user creates their first group via `POST /api/v1/groups/`, promote them from `member` to `chairperson`:
```python
if user.role == 'member':
    user.role = 'chairperson'
    user.save(update_fields=['role'])
```

#### 3.6 URL routing
```python
# config/urls.py additions
path('api/v1/groups/', include('apps.groups.urls')),
path('api/v1/invites/', include('apps.groups.invite_urls')),
```

### Acceptance Criteria
- [ ] Only `chairperson` role can create a group
- [ ] Only the group's chairperson can update, pause, close, or manage members
- [ ] Wallet balance is computed from ledger aggregation — not a stored field
- [ ] Invite link is unique per group, 7-day expiry, can be regenerated
- [ ] `GET /api/v1/invites/{code}/` works without authentication
- [ ] Accepting an invite creates a `GroupMember` and writes an audit log
- [ ] `pytest apps/groups/` passes

---

## Phase 4 — Backend: Financial Engine

**Owner:** Senior Backend Engineer (financial logic — careful review required)  
**Estimated effort:** 4–5 days  
**Prerequisites:** Phase 3 complete

### Goal
Implement the full financial engine: contribution scheduling, STK Push/MTN MoMo initiation, payment webhook handling, immutable ledger entries with hash chains, 3-stage loan approval workflow, payout processing with service fee calculation, and all Celery async tasks.

> [!CAUTION]
> Every financial operation must be covered by a database transaction (`atomic`), use idempotency keys, and produce a `LedgerEntry`. Missing a ledger entry for any financial event is a critical bug.

### Steps

#### 4.1 Payment provider abstraction
```python
# apps/payments/base.py
from abc import ABC, abstractmethod
from decimal import Decimal

class PaymentProvider(ABC):
    @abstractmethod
    def initiate_collection(self, phone: str, amount: Decimal, reference: str, description: str) -> dict: ...
    @abstractmethod
    def initiate_disbursement(self, phone: str, amount: Decimal, reference: str, remarks: str) -> dict: ...
    @abstractmethod
    def query_transaction_status(self, reference: str) -> dict: ...
    @abstractmethod
    def parse_callback(self, payload: dict) -> dict: ...
```

Create stub implementations for dev (`MockProvider`) that instantly return success. Real `MpesaProvider` and `MTNMoMoProvider` call live API endpoints (activated via environment variable).

```python
# apps/payments/selector.py
def get_payment_provider(country: str, method: str) -> PaymentProvider:
    from .providers.mock import MockProvider
    from .providers.mpesa import MpesaProvider
    from .providers.mtn_momo import MTNMoMoProvider
    if os.environ.get('MPESA_ENVIRONMENT') == 'sandbox':
        return MockProvider()
    providers = {
        ('kenya','mpesa'): MpesaProvider,
        ('kenya','airtel'): MockProvider,
        ('rwanda','mtn_momo'): MTNMoMoProvider,
        ('ghana','mtn_momo'): MTNMoMoProvider,
    }
    cls = providers.get((country, method))
    if not cls:
        raise ValueError(f'No provider for {country}/{method}')
    return cls()
```

#### 4.2 Contribution endpoints
```
GET  /api/v1/groups/{id}/contributions/              → list contributions for group
POST /api/v1/groups/{id}/contributions/initiate/     → trigger payment push
POST /api/v1/contributions/webhook/mpesa/            → M-Pesa callback (IP whitelisted)
POST /api/v1/contributions/webhook/mtn/              → MTN MoMo callback
POST /api/v1/groups/{id}/contributions/record-manual/ → treasurer manual cash entry
```

**Contribution initiation flow:**
```python
@transaction.atomic
def initiate_contribution(contribution_id: str, user):
    # 1. Acquire advisory lock (prevents duplicate pushes)
    from django.db import connection
    cursor = connection.cursor()
    cursor.execute('SELECT pg_advisory_xact_lock(%s)', [hash(contribution_id) % (2**31)])
    
    contribution = Contribution.objects.select_for_update().get(id=contribution_id)
    if contribution.status != 'scheduled':
        return  # Already initiated — idempotency guard
    
    provider = get_payment_provider(contribution.group.country, contribution.method)
    result = provider.initiate_collection(
        phone=contribution.mobile_number,
        amount=contribution.amount,
        reference=contribution.platform_reference,
        description=f'OrbiSave contribution - {contribution.group.name}',
    )
    contribution.status = 'initiated'
    contribution.initiated_at = timezone.now()
    contribution.save(update_fields=['status','initiated_at'])
    log_audit('contribution_initiated', actor=user, target_group=contribution.group)
```

**Webhook callback handler:**
```python
def process_payment_callback(contribution_id: str, provider_data: dict):
    with transaction.atomic():
        contribution = Contribution.objects.select_for_update().get(id=contribution_id)
        normalized = provider.parse_callback(provider_data)
        
        if normalized['status'] == 'success':
            contribution.status = 'confirmed'
            contribution.provider_reference = normalized['transaction_id']
            contribution.confirmed_at = timezone.now()
            contribution.save()
            
            # Write ledger entries (double-entry)
            _write_contribution_ledger_entries(contribution)
            
            # Send WebSocket event + SMS notification
            notify_contribution_confirmed(contribution)
        elif normalized['status'] == 'failed':
            contribution.status = 'failed'
            contribution.failure_reason = normalized.get('reason','')
            contribution.save()
            notify_contribution_failed(contribution)
```

**Ledger entry for confirmed contribution:**
```python
def _write_contribution_ledger_entries(contribution):
    group   = contribution.group
    prev    = LedgerEntry.objects.filter(group=group).order_by('-created_at').first()
    balance = (prev.running_balance if prev else Decimal('0')) + contribution.amount
    
    LedgerEntry.objects.create(
        group=group, member=contribution.member,
        entry_type='contribution', direction='credit',
        amount=contribution.amount, currency=contribution.currency,
        running_balance=balance,
        description=f'Contribution from {contribution.member.full_name}',
        reference=f'CONTRIB-{contribution.platform_reference}',
        related_contribution=contribution,
    )
```

#### 4.3 Loan endpoints
```
GET  /api/v1/groups/{id}/loans/             → list loans for group
POST /api/v1/groups/{id}/loans/             → request loan (member, requires KYC)
GET  /api/v1/loans/{id}/
POST /api/v1/loans/{id}/chair-approve/      → chairperson approves (requires transaction PIN)
POST /api/v1/loans/{id}/chair-reject/
POST /api/v1/loans/{id}/treasurer-approve/  → treasurer approves (requires transaction PIN)
POST /api/v1/loans/{id}/treasurer-reject/
POST /api/v1/loans/{id}/admin-approve/      → triggers disbursement (requires transaction PIN)
POST /api/v1/loans/{id}/admin-reject/
POST /api/v1/loans/{id}/repayments/         → record repayment
GET  /api/v1/loans/{id}/repayments/
```

**Loan eligibility check (called before creating loan):**
```python
def check_loan_eligibility(member, group) -> dict:
    # 1. Contribution history: at least 3 confirmed contributions
    confirmed = Contribution.objects.filter(member=member, group=group, status='confirmed').count()
    # 2. No active outstanding loans in this group
    has_active = Loan.objects.filter(borrower=member, group=group, status__in=['active','disbursed']).exists()
    # 3. Loan pool balance sufficient
    wallet = get_wallet(group)
    max_eligible = wallet['loan_pool'] * group.max_loan_multiplier
    return {
        'eligible': confirmed >= 3 and not has_active,
        'max_amount': max_eligible,
        'reasons': {
            'contribution_history': confirmed >= 3,
            'no_outstanding_loans': not has_active,
            'pool_balance': wallet['loan_pool'] > 0,
        },
    }
```

**On admin approval — triggers disbursement:**
```python
@transaction.atomic
def admin_approve_loan(loan_id, admin_user, pin, admin_notes=''):
    from apps.accounts.services import verify_transaction_pin
    if not verify_transaction_pin(admin_user, pin):
        raise PermissionError('Invalid transaction PIN.')
    
    loan = Loan.objects.select_for_update().get(id=loan_id)
    if loan.status != 'pending_admin':
        raise ValueError('Loan is not in pending_admin state.')
    
    loan.status = 'approved'
    loan.admin_approved_by = admin_user
    loan.admin_approved_at = timezone.now()
    loan.admin_rejection_reason = ''
    loan.save()
    
    # Queue disbursement as async Celery task
    disburse_approved_loan.delay(str(loan.id), str(admin_user.id))
    log_audit('loan_admin_approved', actor=admin_user, target_group=loan.group, metadata={'loan_id': str(loan.id)})
```

On successful disbursement, write two ledger entries:
1. `loan_disbursement` DEBIT from loan pool
2. Send SMS to borrower with disbursement amount and reference

#### 4.4 Payout endpoints
```
GET  /api/v1/groups/{id}/payouts/           → list payout schedule
POST /api/v1/groups/{id}/payouts/process/   → treasurer processes next payout
GET  /api/v1/payouts/{id}/
```

Service fee calculation:
```python
SERVICE_FEE_RATES = {'kenya': Decimal('0.03'), 'rwanda': Decimal('0.025'), 'ghana': Decimal('0.025')}

def calculate_payout(group, gross_amount):
    rate    = SERVICE_FEE_RATES.get(group.country, Decimal('0.03'))
    fee     = (gross_amount * rate).quantize(Decimal('0.01'))
    net     = gross_amount - fee
    return {'gross': gross_amount, 'fee': fee, 'net': net}
```

On payout processed: write `payout` DEBIT ledger entry + `service_fee` DEBIT ledger entry as separate entries.

#### 4.5 Ledger endpoints (read-only)
```
GET /api/v1/groups/{id}/ledger/        → paginated ledger (filter by type, member, date, direction)
GET /api/v1/groups/{id}/ledger/export/ → CSV export (treasurer/admin only)
```

#### 4.6 Celery tasks
```python
# apps/contributions/tasks.py
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def initiate_contribution_stk_push(self, contribution_id):
    """Triggered by contribution schedule. Calls initiate_contribution()."""

@shared_task
def process_payment_callback(contribution_id, provider_data): ...

@shared_task
def retry_failed_contributions():
    """Hourly cron: retry failed contributions with retry_count < max_retries."""

@shared_task
def schedule_contribution_cycle():
    """Daily cron 00:05 UTC: create Contribution records for all groups due today."""

# apps/loans/tasks.py
@shared_task
def disburse_approved_loan(loan_id, admin_user_id): ...

@shared_task
def check_overdue_repayments():
    """Daily 06:00 UTC: mark overdue LoanRepayments and notify borrowers."""

# apps/notifications/tasks.py
@shared_task
def send_sms_notification(phone, message, country): ...

@shared_task
def send_contribution_reminders():
    """Daily 08:00 UTC: SMS reminder 24h before each scheduled contribution."""
```

Celery beat schedule (add to `config/settings/base.py`):
```python
CELERY_BEAT_SCHEDULE = {
    'schedule-daily-contributions': {
        'task': 'apps.contributions.tasks.schedule_contribution_cycle',
        'schedule': crontab(hour=0, minute=5),
    },
    'retry-failed-contributions': {
        'task': 'apps.contributions.tasks.retry_failed_contributions',
        'schedule': crontab(minute=0),
    },
    'check-overdue-repayments': {
        'task': 'apps.loans.tasks.check_overdue_repayments',
        'schedule': crontab(hour=6, minute=0),
    },
    'send-contribution-reminders': {
        'task': 'apps.notifications.tasks.send_contribution_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
}
```

#### 4.7 Fraud detection task
After every payment event, queue:
```python
@shared_task
def run_fraud_checks(contribution_id):
    c = Contribution.objects.get(id=contribution_id)
    # Check 1: amount > group.contribution_amount * 1.2 → flag
    # Check 2: 3rd failed attempt this cycle → flag + notify admin
    # Check 3: mobile_number != member.mobile_money_number → flag + notify
    if flagged:
        AuditLog.objects.create(action='admin_action', metadata={'fraud_flag': reason, ...})
        send_admin_alert.delay(message=reason)
```

### Acceptance Criteria
- [ ] Contribution initiation is idempotent — duplicate calls for same contribution return same state
- [ ] Advisory lock prevents duplicate STK pushes
- [ ] Every confirmed contribution creates exactly one `LedgerEntry` debit and one credit (double-entry)
- [ ] Ledger `hash` chain is unbroken — verified by test
- [ ] `LedgerEntry` cannot be updated or deleted
- [ ] Loan requires 3 approval steps in sequence (chair → treasurer → admin)
- [ ] Transaction PIN verified server-side on every loan approval action
- [ ] Admin approval triggers `disburse_approved_loan` Celery task
- [ ] Payout writes two ledger entries: net payout debit + service fee debit
- [ ] All Celery tasks registered and visible in Flower dashboard
- [ ] `pytest apps/contributions/ apps/loans/ apps/ledger/ apps/payouts/` passes

### Handoff to Phase 5
- All financial endpoints operational with mocked payment providers
- Celery tasks running and visible in Flower
- Ledger hash chain integrity verified by tests
- Audit log entries for all financial actions

---

## Phase 5 — Backend: Admin Endpoints, Real-time & Notifications

**Owner:** Backend Engineer  
**Estimated effort:** 2–3 days  
**Prerequisites:** Phase 4 complete

### Goal
Build platform admin and super admin API endpoints, add Django Channels WebSocket server for real-time events, integrate Africa's Talking SMS (mocked in dev), and generate the final OpenAPI schema for frontend consumption.

### Steps

#### 5.1 Admin endpoints
```
# Platform Admin (country-scoped)
GET  /api/v1/admin/dashboard/
GET  /api/v1/admin/groups/
GET  /api/v1/admin/groups/{id}/
POST /api/v1/admin/groups/{id}/flag/
GET  /api/v1/admin/loans/pending/
GET  /api/v1/admin/users/
POST /api/v1/admin/users/{id}/suspend/
POST /api/v1/admin/users/{id}/reinstate/
GET  /api/v1/admin/trust-account/
POST /api/v1/admin/trust-account/reconcile/
GET  /api/v1/admin/audit/
GET  /api/v1/admin/analytics/

# Super Admin (all countries)
GET  /api/v1/superadmin/overview/
GET  /api/v1/superadmin/country/{country}/
```

All admin endpoints enforce `IsPlatformAdmin` permission. Country scoping: `platform_admin` can only see groups/users/loans from their own `user.country`. `super_admin` sees everything.

**Dashboard KPIs** computed via DB aggregation — not stored:
```python
def get_admin_dashboard(admin_user):
    country = admin_user.country if admin_user.role == 'platform_admin' else None
    groups  = Group.objects.filter(country=country) if country else Group.objects.all()
    return {
        'total_active_groups': groups.filter(status='active').count(),
        'total_members': GroupMember.objects.filter(group__in=groups, status='active').count(),
        'loan_default_rate': _calc_default_rate(groups),
        'transaction_volume_this_month': _calc_monthly_volume(groups),
        'compliance_rate': _calc_compliance_rate(groups),
    }
```

#### 5.2 Django Channels WebSocket server

Install: `pip install channels daphne channels-redis`

`config/asgi.py`:
```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.notifications.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

`apps/notifications/consumers.py`:
```python
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user.is_authenticated:
            await self.close()
            return
        self.group_name = f'user_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))
```

`apps/notifications/routing.py`:
```python
from django.urls import path
from .consumers import NotificationConsumer
websocket_urlpatterns = [path('ws/notifications/', NotificationConsumer.as_asgi())]
```

Add to `config/settings/base.py`:
```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379/0')]},
    }
}
```

**Broadcasting an event:**
```python
# apps/notifications/services.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_websocket_event(user_id: str, event_type: str, payload: dict):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{user_id}',
        {'type': 'notification.event', 'payload': {'type': event_type, **payload}}
    )
```

Call `send_websocket_event()` from within contribution confirmation, loan status changes, payout completion, etc.

#### 5.3 Africa's Talking SMS integration
```python
# apps/notifications/sms.py
import africastalking

def send_sms(phone: str, message: str, country: str):
    username = os.environ.get('AFRICASTALKING_USERNAME', 'sandbox')
    api_key  = os.environ.get('AFRICASTALKING_API_KEY', '')
    if username == 'sandbox':
        # Dev mode — log to console only
        print(f'[SMS MOCK] To: {phone} | Message: {message}')
        return
    africastalking.initialize(username, api_key)
    sms = africastalking.SMS
    sms.send(message, [phone])
```

#### 5.4 LiveKit meeting token generation
```python
# apps/meetings/services.py
from livekit import AccessToken, VideoGrants

def generate_livekit_token(user, meeting) -> str:
    token = AccessToken(
        os.environ['LIVEKIT_API_KEY'],
        os.environ['LIVEKIT_API_SECRET'],
    )
    token.identity = str(user.id)
    token.name     = user.full_name
    token.add_grants(VideoGrants(room=str(meeting.id), room_join=True))
    return token.to_jwt()
```

`POST /api/v1/meetings/{id}/join/` → returns `{token: '<livekit_jwt>'}` — frontend passes this to LiveKit SDK.

#### 5.5 Finalise OpenAPI schema and generate TypeScript types
```bash
# In Docker backend container:
python manage.py spectacular --color --file /tmp/schema.yml

# In packages/shared-types:
npx openapi-typescript http://localhost:8000/api/schema/ -o src/api.d.ts
```

Commit `src/api.d.ts` to the repo — this is the contract between backend and frontend.

#### 5.6 Run Daphne in Docker
Update `backend` Docker command:
```bash
sh -c "python manage.py migrate && daphne -b 0.0.0.0 -p 8000 config.asgi:application"
```

### Acceptance Criteria
- [ ] Admin dashboard returns correct KPIs filtered by admin's country
- [ ] Super admin sees all countries
- [ ] WebSocket connection established on `ws://localhost:8000/ws/notifications/`
- [ ] Confirmed contribution pushes a `CONTRIBUTION_CONFIRMED` WS event to member
- [ ] Loan status change pushes `LOAN_STATUS_CHANGED` event to borrower
- [ ] SMS mock logs to console in dev
- [ ] LiveKit token generated correctly (verified by decoding JWT)
- [ ] `packages/shared-types/src/api.d.ts` generated from live schema
- [ ] `pytest apps/admin_portal/ apps/notifications/ apps/meetings/` passes

### Handoff to Phase 6
- WebSocket server operational on `ws://localhost:8000/ws/notifications/`
- `api.d.ts` available in shared-types package
- SMS mock in place (real credentials deferred to staging)
- All backend API endpoints documented in OpenAPI schema

---

## Phase 6 — Frontend Foundation

**Owner:** Frontend Engineer  
**Estimated effort:** 2–3 days  
**Prerequisites:** Phase 0 complete; Phase 2 backend running (or mock API)

### Goal
Set up the complete Next.js 14 App Router foundation: TypeScript strict mode, Tailwind design tokens, fonts, shadcn/ui, NextAuth JWT integration with Django backend, Axios API client, Zustand stores, TanStack Query, route groups, and auth middleware.

### Steps

#### 6.1 Install all frontend dependencies
```bash
cd apps/web
npm install \
  @tanstack/react-query@5 @tanstack/react-table@8 \
  zustand axios \
  react-hook-form zod @hookform/resolvers \
  next-auth@5 \
  recharts \
  sonner \
  lucide-react \
  date-fns \
  @livekit/components-react livekit-client \
  @react-pdf/renderer \
  qrcode.react \
  cmdk

npm install --save-dev \
  @types/qrcode.react vitest @testing-library/react @testing-library/jest-dom \
  playwright @playwright/test
```

#### 6.2 Install shadcn/ui
```bash
npx shadcn-ui@latest init
# Choose: TypeScript, Tailwind CSS, App Router, CSS variables

npx shadcn-ui@latest add button card badge input select textarea dialog
npx shadcn-ui@latest add table tabs dropdown-menu popover command
npx shadcn-ui@latest add avatar progress separator skeleton toast
npx shadcn-ui@latest add alert alert-dialog sheet scroll-area
```

All shadcn components live in `components/ui/` — they are owned by this codebase, not external dependencies. Customise them freely to match OrbiSave branding.

#### 6.3 Tailwind design tokens
`apps/web/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F0FAF4', 100: '#D8F3DC', 200: '#B7E4C7', 300: '#74C69D',
          400: '#52B788', 500: '#40916C', 600: '#2D6A4F',
          700: '#1B4332', 800: '#143227', 900: '#081C15',
        },
        amber: { DEFAULT: '#E9C46A', dark: '#C49A21' },
        coral: { DEFAULT: '#E76F51', dark: '#C94A2B' },
        surface: { page: '#F7F8FA', card: '#FFFFFF', pale: '#F0FAF4' },
        status: {
          success: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
          pending: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
          failed:  { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
          info:    { bg: '#E0F2FE', text: '#075985', border: '#7DD3FC' },
        },
      },
      fontFamily: {
        sans:  ['var(--font-dm-sans)',    'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-serif)',   'Georgia',   'serif'],
        mono:  ['var(--font-jetbrains)', 'Menlo',     'monospace'],
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-md':'0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.05)',
        'card-lg':'0 8px 24px rgba(0,0,0,0.10), 0 16px 48px rgba(0,0,0,0.06)',
      },
      borderRadius: { card: '16px', btn: '10px', tag: '6px' },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
} satisfies Config;
```

#### 6.4 Global fonts (`app/layout.tsx`)
```typescript
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';

const dmSans    = DM_Sans({ subsets:['latin'], variable:'--font-dm-sans', display:'swap' });
const dmSerif   = DM_Serif_Display({ subsets:['latin'], weight:'400', variable:'--font-dm-serif', display:'swap' });
const jetbrains = JetBrains_Mono({ subsets:['latin'], variable:'--font-jetbrains', display:'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable} ${jetbrains.variable}`}>
      <body className="bg-surface-page font-sans antialiased">{children}</body>
    </html>
  );
}
```

#### 6.5 Axios API client
```typescript
// lib/api/client.ts
import axios from 'axios';
import { getSession } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — sign out
      await signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(error);
  }
);

export default api;
```

Create typed API modules per domain:
```typescript
// lib/api/auth.ts    → register, login, me
// lib/api/groups.ts  → list, create, get, members, wallet
// lib/api/loans.ts   → request, approve, reject, repayments
// lib/api/contributions.ts
// lib/api/ledger.ts
// lib/api/admin.ts
```

#### 6.6 NextAuth configuration
```typescript
// lib/auth/config.ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import axios from 'axios';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/token/`, credentials);
        if (res.data.access) {
          return {
            accessToken:  res.data.access,
            refreshToken: res.data.refresh,
            ...res.data.user,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) Object.assign(token, user);
      return token;
    },
    async session({ session, token }) {
      session.accessToken  = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.user         = token as any;
      return session;
    },
  },
  pages: { signIn: '/login' },
};
```

#### 6.7 Zustand stores
```typescript
// lib/stores/auth.ts
import { create } from 'zustand';
import type { UserRole, Country } from '@orbisave/shared-types';

interface AuthState {
  role:    UserRole | null;
  country: Country  | null;
  kyc:     'pending' | 'submitted' | 'verified' | 'rejected' | null;
  setUser: (u: Partial<AuthState>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null, country: null, kyc: null,
  setUser: (u) => set(u),
}));

// lib/stores/ui.ts
interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}
export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
```

#### 6.8 TanStack Query provider
```typescript
// app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
```

Wrap `app/layout.tsx` body with `<Providers>`.

#### 6.9 Route groups and middleware

Create route group directories:
```
app/
  (public)/           # No auth required
    page.tsx          # Landing page
    login/page.tsx
    register/page.tsx
    invite/[code]/page.tsx
  (auth)/             # Requires auth + KYC
    layout.tsx        # AppShell
    dashboard/
    group/
    contributions/
    loans/
    ledger/
    meetings/
    settings/
    onboarding/       # Auth required but no KYC check
  (chairperson)/
    chair/
  (treasurer)/
    treasurer/
  (admin)/
    admin/
```

`middleware.ts` at repo root:
```typescript
import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn    = !!session;
  const isPublicRoute = nextUrl.pathname.startsWith('/login')
    || nextUrl.pathname.startsWith('/register')
    || nextUrl.pathname.startsWith('/invite')
    || nextUrl.pathname === '/';

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }
  if (isLoggedIn && session.user.kyc !== 'verified'
    && !nextUrl.pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding/profile', nextUrl));
  }
  // Role guard: admin routes → redirect members
  if (nextUrl.pathname.startsWith('/admin')
    && !['platform_admin','super_admin'].includes(session?.user?.role ?? '')) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }
  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
});

export const config = { matcher: ['/((?!_next|favicon.ico|api).*)'] };
```

#### 6.10 App shell layout (`app/(auth)/layout.tsx`)
```typescript
import { Sidebar }  from '@/components/layout/Sidebar';
import { Header }   from '@/components/layout/Header';
import { Toaster }  from 'sonner';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden">
      <Sidebar role={session.user.role} country={session.user.country} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
```

**Sidebar component** (`components/layout/Sidebar.tsx`):  
- 240px expanded / 72px collapsed (icon-only)
- Collapse state in `localStorage` and `useUIStore`
- Navigation items filtered by role (see Section 10.2 of master spec)
- Active item: 3px brand-700 left border, brand-50 background
- Hover: brand-50 background, 150ms transition
- Section labels: 11px uppercase, letter-spacing 0.08em, gray-400
- User card at bottom: avatar, name, email, role badge, chevron menu

**Header component** (`components/layout/Header.tsx`):  
- Left: hamburger (mobile) + global search (`⌘K` → opens cmdk command palette)
- Right: notification bell (unread count badge) + user avatar dropdown (Profile / Settings / Sign Out)

### Acceptance Criteria
- [ ] `npm run dev` starts Next.js on port 3000 without errors
- [ ] `npm run type-check` passes with zero errors
- [ ] Navigating to `/dashboard` without a session redirects to `/login`
- [ ] After login, user with unverified KYC redirects to `/onboarding/profile`
- [ ] `platform_admin` navigating to `/admin` is allowed; `member` is redirected to `/dashboard`
- [ ] Sidebar shows correct navigation items per role
- [ ] Sidebar collapse persists across page refresh (localStorage)
- [ ] `formatCurrency(284500, 'kenya')` returns `'KSh 284,500.00'`
- [ ] Sonner toasts appear top-right
- [ ] Security headers present on all responses

---

## Phase 7 — Frontend: Public Pages

**Owner:** Frontend Engineer  
**Estimated effort:** 1–2 days  
**Prerequisites:** Phase 6 complete

### Goal
Build the statically generated landing page, login page, registration page, and invite accept page.

### Steps

#### 7.1 Landing page (`app/(public)/page.tsx`)
```typescript
export const dynamic = 'force-static'; // SSG — no per-request data
```

Sections to implement (in order):

1. **Sticky nav** — blur backdrop (`backdrop-blur-md bg-white/80`), OrbiSave SVG logo (green leaf + wordmark), nav links, `Sign In` + `Get Started` CTA buttons

2. **Hero** — full-width, min-height 100vh, `bg-brand-700`, DM Serif Display headline (48–60px, white), subheading paragraph, two CTA buttons. Background: SVG topographic line pattern at 6% opacity. Three trust indicator pills below CTAs ("Bank-regulated funds", "Encrypted transactions", "Verified identities").

3. **How It Works** — 3-step horizontal flow: (1) Create or join a group, (2) Contribute automatically via M-Pesa/MoMo, (3) Receive your payout on schedule. White background, numbered circles in brand-100.

4. **For Communities** — brand-50 background, left column text, right column: static illustration card styled like a financial dashboard widget (not a live component — design it with HTML/CSS).

5. **Country Coverage** — three cards: Kenya 🇰🇪, Rwanda 🇷🇼, Ghana 🇬🇭. Each: flag, currency, mobile money providers, "Partner Bank (TBD)", status badge.

6. **Security & Trust** — dark green (`bg-brand-700`), four pillars: Bank-regulated, End-to-end encrypted, Identity verified, Audit trail. "Your money never leaves a regulated bank" as headline.

7. **Testimonials** — placeholder layout with "Pilot group feedback coming soon" copy.

8. **Footer** — dark green, logo + tagline, 4 link columns, social icons, legal links, `© 2025 OrbiSave. Built for Africa.`

#### 7.2 Login page (`app/(public)/login/page.tsx`)
Submit via **Next.js Server Action** (no client fetch):
```typescript
'use server';
async function loginAction(formData: FormData) {
  const result = await signIn('credentials', {
    email: formData.get('email'),
    password: formData.get('password'),
    redirect: false,
  });
  if (result?.error) redirect('/login?error=invalid_credentials');
  redirect('/dashboard');
}
```

Layout: split-screen. Left (brand-700, 40%): logo, tagline, illustration. Right (white, 60%): form.

Form fields: Email, Password (show/hide toggle), Remember me checkbox, "Forgot password?" link.  
Error: displayed inline below form, styled with `status.failed` colors.

#### 7.3 Register page (`app/(public)/register/page.tsx`)
Server Action posts to `/api/v1/auth/register/` then signs in:
```typescript
'use server';
async function registerAction(formData: FormData) {
  // 1. POST to backend register endpoint
  // 2. If successful: sign in with credentials
  // 3. redirect('/onboarding/profile')
}
```

Fields: Full name, Email, Phone (with country code selector +254/+250/+233), Password, Confirm password, Terms checkbox.

Validation via Zod:
```typescript
const registerSchema = z.object({
  full_name:        z.string().min(3),
  email:            z.email(),
  phone:            z.string().regex(/^\+[1-9]\d{6,14}$/),
  password:         z.string().min(8),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
```

#### 7.4 Invite accept page (`app/(public)/invite/[code]/page.tsx`)
This is a **Server Component** — fetch invite details server-side:
```typescript
export default async function InviteAcceptPage({ params }: { params: { code: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invites/${params.code}/`, {
    cache: 'no-store',
  });
  if (!res.ok) return <InviteExpiredState />;
  const invite = await res.json();
  return <InviteAcceptCard invite={invite.data} />;
}
```

`InviteAcceptCard` (client component): shows group name, chairperson, contribution amount, member count. Two buttons: "Create New Account" (→ `/register?invite=${code}`) | "I already have an account" (→ `/login?invite=${code}`).

On login/register, store invite code in session and call `POST /api/v1/invites/{code}/accept/` during onboarding completion.

### Acceptance Criteria
- [ ] Landing page renders statically — no server-side fetching
- [ ] Landing page has all 8 sections with correct colors and typography
- [ ] Login form submits via Server Action (no client-side fetch)
- [ ] Incorrect credentials shows inline error below form
- [ ] Register form validates with Zod before submission
- [ ] Invite page with valid code shows group info card
- [ ] Invite page with invalid/expired code shows graceful error state
- [ ] All pages pass `npm run type-check`
- [ ] Lighthouse performance score ≥ 90 on landing page

---

## Phase 8 — Frontend: Onboarding Flow

**Owner:** Frontend Engineer  
**Estimated effort:** 2 days  
**Prerequisites:** Phase 6 complete; Phase 2 backend running (or mock)

### Goal
Build the 5-step onboarding flow: profile, KYC upload with status polling, phone OTP verification, country/mobile money setup, and completion screen.

### Steps

#### 8.1 Onboarding layout (`app/(auth)/onboarding/layout.tsx`)
```typescript
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Left panel — 35%, brand-700 */}
      <div className="hidden lg:flex w-[35%] bg-brand-700 flex-col p-10 text-white">
        <OrbiSaveLogo />
        <OnboardingProgressSidebar />{/* vertical 5-step progress indicator */}
        <OnboardingContextText />    {/* encouragement text per step */}
      </div>
      {/* Right panel — 65%, white */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="flex-1 flex items-center justify-center p-8">
          {children}
        </div>
        {/* Sticky Next button rendered by each step */}
      </div>
    </div>
  );
}
```

**Progress indicator:** 5 vertical steps with connecting line. Colors: completed = brand-400 + check icon, current = brand-400 solid circle + white text, upcoming = gray-300 circle.

#### 8.2 Step 1 — Profile (`/onboarding/profile`)
Form fields: Full name (pre-filled from session), Date of birth (date picker, must be 18+), National ID number, Home county/district (text), Profile photo (circular upload with cropper — use `react-image-crop`).

Submit: `PATCH /api/v1/auth/me/` with profile data. Redirect to `/onboarding/kyc`.

18+ validation:
```typescript
const isAdult = differenceInYears(new Date(), new Date(dob)) >= 18;
```

#### 8.3 Step 2 — KYC (`/onboarding/kyc`)
- Document type radio: National ID | Passport | Driver's Licence
- Front image: drag-and-drop zone (`react-dropzone`), JPEG/PNG/PDF, max 5 MB, preview thumbnail
- Back image: conditionally shown (hidden for Passport)
- Submit: `POST /api/v1/kyc/documents/` (multipart/form-data)

After submission, poll KYC status using TanStack Query:
```typescript
const { data } = useQuery({
  queryKey: ['kyc-status'],
  queryFn: () => api.get('/kyc/status/').then(r => r.data.data),
  refetchInterval: (data) => data?.kyc_status === 'verified' ? false : 10_000,
});

useEffect(() => {
  if (data?.kyc_status === 'verified') router.push('/onboarding/verify-phone');
  if (data?.kyc_status === 'rejected') setRejectionReason(data.rejection_reason);
}, [data?.kyc_status]);
```

Interim state: animated progress bar with "Verification in progress — usually 2–5 minutes" copy.

#### 8.4 Step 3 — Phone OTP (`/onboarding/verify-phone`)
- Phone shown read-only, small "Change" link → back to profile
- "Send Code" button → `POST /api/v1/auth/verify-phone/`
- 6-box OTP input (individual `<input maxLength=1>` with auto-focus-next on input and auto-focus-prev on backspace)
- Countdown timer: "Resend in 45s" then active "Resend" link
- Submit: `POST /api/v1/auth/verify-phone/confirm/` → if success redirect to `/onboarding/country`

OTP box component:
```typescript
// components/forms/OTPInput.tsx
export function OTPInput({ length = 6, onComplete }: OTPInputProps) {
  const refs = useRef<HTMLInputElement[]>([]);
  // Auto-advance on input, auto-back on backspace
  // Call onComplete when all boxes filled
}
```

#### 8.5 Step 4 — Country & Mobile Money (`/onboarding/country`)
- Three large clickable country cards: Kenya 🇰🇪 (KES, M-Pesa + Airtel Money), Rwanda 🇷🇼 (RWF, MTN MoMo), Ghana 🇬🇭 (GHS, MTN MoMo). Selected card: brand-700 border + brand-50 bg.
- Mobile money provider radio cards (rendered based on selected country)
- Mobile money number input — auto-populated from registration phone if matching country code
- Submit: `PATCH /api/v1/auth/me/` + `POST /api/v1/auth/me/mobile-money/`

#### 8.6 Step 5 — Complete (`/onboarding/complete`)
- Animated check circle (CSS keyframe: scale + opacity in)
- "Welcome to OrbiSave, [First Name]." — DM Serif Display, 36px
- "Your account is verified and ready."
- Two paths:
  - **"Create a Group"** (primary button) → `/chair/group-setup`
  - **"Join with Invite Code"** (secondary button) → inline input for 6-char code + "Join" button → `POST /api/v1/invites/{code}/accept/` → redirect to `/dashboard`
- Below: "Waiting for an invitation? Your chairperson will share a link when your group is ready."

If invite code was stored from Step 7.4, auto-populate the invite input and auto-accept.

### Acceptance Criteria
- [ ] Full 5-step onboarding flow navigates correctly
- [ ] KYC polling stops when status becomes `verified` or `rejected`
- [ ] `rejected` KYC shows rejection reason and allows re-upload
- [ ] OTP boxes auto-advance focus on input and auto-back on backspace
- [ ] Country selection updates mobile money provider options
- [ ] Completion animation renders correctly
- [ ] Invite code from URL param is auto-filled in completion step
- [ ] Onboarding step persists in session — refreshing browser returns to correct step

---

## Phase 9 — Frontend: Member Dashboard & Pages

**Owner:** Frontend Engineer  
**Estimated effort:** 3 days  
**Prerequisites:** Phase 6, 8 complete; Phase 3–4 backend available (or mock)

### Goal
Build the authenticated member experience: the main dashboard and all member-level pages (Group, Contributions, Loans, Ledger, Meetings, Settings).

### Key components to build

#### 9.1 Member Dashboard (`app/(auth)/dashboard/page.tsx`)
Server Component. Fetches initial data server-side; chart/table interactivity via Client Components.

**Group Wallet Hero Card:**
- Full-width, `linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #40916C 100%)`
- Left: group name label (12px, brand-300, uppercase), balance (42px, DM Serif, white), change vs last cycle
- Right: action buttons (`+ Contribute`, `Request Loan`, `View Payout`) — white bg, brand-700 text
- Bottom strip: Rotation Pool balance | Loan Pool balance | My Position # | — stat pills in brand-100

**Cash Flow Section (2 columns):**
- Left (65%): `ComposedChart` (Recharts, `ResponsiveContainer`), Weekly/Monthly toggle (client component). Positive bars brand-400, negative bars coral. Custom tooltip with formatted currency.
- Right (35%): stacked Income card + Expense card

**Three Summary Cards:**
1. **My Contributions** — progress bar (paid/required), status badge, next due date, "Make Contribution" button if due
2. **Next Payout** — date (DM Serif 22px), estimated amount, rotation circles visual, countdown
3. **Loan Eligibility** — max eligible amount or "Not eligible" with reason, eligibility checklist, "Request Loan" button

**Recent Activity Table** (TanStack Table):
- Columns: Type (icon + label), Member, Amount, Status, Method, Date
- Filters: type dropdown, date range picker
- Pagination: 10 rows/page

**Group Members Panel** (1/3 width right column on lg screens):
- Overlapping avatar stack (up to 8), `+N more`
- Key info: Chairperson, Treasurer, Next Payout Member, Next Meeting
- "View Full Group" link

#### 9.2 Other member pages

| Page | Path | Key behaviors |
|---|---|---|
| My Group | `/group` | Group info, member list, rotation schedule, group wallet summary |
| Contributions | `/contributions` | History table (filterable by cycle/status), "Make Contribution" button if dues outstanding |
| Loans | `/loans` | Active loans, repayment schedule, `POST /groups/{id}/loans/` request form |
| Ledger | `/ledger` | Read-only ledger view (same component as treasurer's, without export) |
| Meetings | `/meetings` | Scheduled meetings list, join button (opens LiveKit room), attendance history |
| Settings | `/settings` | 4 tabs: Profile, Security (password, 2FA, transaction PIN), Mobile Money, Notifications |

#### 9.3 Reusable components to build in this phase
- `StatusBadge` — takes status string → renders correct colour pill (success/pending/failed/info)
- `CurrencyAmount` — renders amount with correct symbol and locale per country
- `RotationCircles` — numbered circles with current position highlighted
- `EmptyState` — icon + message + optional CTA (reused everywhere)
- `LoadingSkeleton` — skeleton placeholders for all card types
- `ConfirmDialog` — two-step confirmation modal with optional PIN input

### Acceptance Criteria
- [ ] Dashboard fetches and displays real data from API (or MSW mock)
- [ ] Cash flow chart toggles between weekly and monthly without page reload
- [ ] All three summary cards show loading skeletons while fetching
- [ ] Activity table is filterable and paginated
- [ ] Contributions page shows current cycle compliance status
- [ ] Loan request form validates eligibility before showing form
- [ ] All currency amounts use `formatCurrency` from shared-utils
- [ ] Settings tabs save correctly and show success toast
- [ ] All pages show `EmptyState` when there is no data

---

## Phase 10 — Frontend: Chairperson Dashboard & Pages

**Owner:** Frontend Engineer  
**Estimated effort:** 3 days  
**Prerequisites:** Phase 9 complete

### Goal
Build all chairperson-specific views: extended dashboard, group setup wizard, member management, loan approvals (chair gate), and invite members page.

### Key components to build

#### 10.1 Chairperson Dashboard extensions
Extends the member dashboard with:
- Four action buttons in hero: `+ Invite Member`, `Schedule Meeting`, `View Reports`, `Group Settings`
- Additional stats: Total Members (N/max), Active Loans, Contribution Compliance %, Next Payout Date

**Contribution Compliance Chart:**
- Horizontal bar chart (Recharts). One row per member.
- Bar fill: brand-400 (100% paid), amber (partial), coral (0%)
- Sorted descending. Labels: member name + paid/required amount.

**Pending Loan Approvals Panel:**
- Each pending loan (status `pending_chair`): avatar, name, amount, purpose badge, date, Approve/Reject buttons
- Approve → `ConfirmDialog` with loan summary table + 6-digit PIN input → `POST /loans/{id}/chair-approve/`
- Reject → reason textarea → `POST /loans/{id}/chair-reject/`

#### 10.2 Group setup wizard (`/chair/group-setup`)
Multi-step form (5 steps, client state via Zustand, single server submission on final step).

Step indicator at top. Steps:
1. **Group Identity** — name, description, country (locked to user's), max members (slider 5–50)
2. **Contribution Rules** — amount, frequency (segmented control), contribution day, rotation method (radio cards with explanations)
3. **Pool Allocation** — slider: "X% Rotation / Y% Loan Pool" (enforced sum = 100). Max loan multiplier, term weeks, interest rate.
4. **Assign Treasurer** — search by phone/email → `GET /groups/{id}/members/`. "Skip — assign later" option.
5. **Review** — full summary. "Create Group" → `POST /api/v1/groups/` → on success: redirect to `/chair/invite` with new invite link displayed.

#### 10.3 Member management (`/chair/members`)
TanStack Table. Columns: Avatar + Name, Phone, Rotation Position, Status, KYC Status, Contributions (N confirmed), Actions.

Actions: Suspend (with reason dialog) | Remove (with confirmation) | View profile.

#### 10.4 Invite members (`/chair/invite`)

**Hero card (brand-700):**
- Invite link in styled monospace input, "Copy Link" button (2s copied state)
- "Download QR Code" (PNG via `qrcode.react`)
- "Expires in N days" | "Regenerate" (with warning: old link stops working)

**Tabs:** Send via SMS | Send via Email | Pending Invites
- **SMS tab:** textarea for phone numbers (comma/line separated), validation, "Send N Invites"
- **Email tab:** email inputs (add/remove), optional personal message
- **Pending Invites:** TanStack Table — Contact, Type, Sent At, Status, Resend/Cancel actions

#### 10.5 Reports (`/chair/reports`)
- Cycle summary: total contributions, payouts, active loans, compliance %
- PDF export button → generates report via `@react-pdf/renderer`
- Charts: contribution trend (last 6 cycles), member compliance ranking

### Acceptance Criteria
- [ ] Group setup wizard persists all step data in Zustand until final submission
- [ ] Pool allocation slider enforces X + Y = 100
- [ ] Loan approval requires valid transaction PIN before submitting
- [ ] Invite link copies to clipboard and shows 2s feedback
- [ ] QR code downloads as PNG
- [ ] Regenerating invite link shows warning modal first
- [ ] SMS invite validation rejects incorrectly formatted phone numbers
- [ ] Chairperson cannot access `/admin` routes

---

## Phase 11 — Frontend: Treasurer Dashboard & Pages

**Owner:** Frontend Engineer  
**Estimated effort:** 3 days  
**Prerequisites:** Phase 9 complete

### Goal
Build all treasurer-specific views: dashboard extensions, contribution tracker, payout schedule + processing, loan approvals (treasurer gate), full ledger, and reconciliation.

### Key components to build

#### 11.1 Treasurer Dashboard extensions
- Hero buttons: "Record Contribution", "Process Payout", "Review Loan", "Reconcile"
- Stats: Rotation Pool | Loan Pool | Total Outstanding Loans | Service Fees Collected (all from ledger aggregations)

#### 11.2 Contribution Tracker (`/treasurer/contributions`)
Full-width TanStack Table. Columns: Member (avatar + name) | Required Amount | Paid Amount | Method | Provider Ref | Date Paid | Status | Actions.

Actions column:
- `pending`/`failed` → "Mark as Paid" modal: date paid field, provider reference input, "Confirm" button → `POST /groups/{id}/contributions/record-manual/`
- Any status → "Send Reminder" → POST SMS reminder (mocked in dev)

Summary footer row: Total Required | Total Collected | Shortfall  
Export button: CSV download of current cycle.

#### 11.3 Payout Schedule (`/treasurer/payouts`)
Visual timeline of rotation. Each row: position #, avatar + name, scheduled date, amount (after fee), status badge.

Current rotation row highlighted with brand-400 border + "Next" badge.

"Process Payout" on current row → `ConfirmDialog`:
- Recipient name + mobile number
- Gross amount, Service fee (calculated as `gross × fee_rate`), **Net payout** (large, DM Serif)
- Payment method icon
- Transaction PIN input (6 digits masked)
- "Confirm & Send" → `POST /groups/{id}/payouts/process/`
- Loading: "Sending to [Name]'s M-Pesa..."
- Success: green tick animation + toast + table update

#### 11.4 Loan Approvals — Treasurer Gate (`/treasurer/loan-approvals`)
Same structure as chairperson loan approvals but for loans with status `pending_treasurer`.
Shows chairperson approval timestamp. Treasurer adds own notes before approving.
`POST /loans/{id}/treasurer-approve/`

#### 11.5 Full Ledger View (`/treasurer/ledger`)
Filter panel (collapsible): date range, entry type (multi-select), member (searchable select), direction, amount range.

Table: Date | Type (icon + label) | Description | Member | Debit | Credit | Running Balance
- Debit: coral text. Credit: brand-600. Running balance: 600 weight.
- Each row expandable: reference, related IDs, recorded_by, hash snippet.

Export: PDF ledger report (letterhead, group info, date range, paginated entries, opening/closing balance) via `@react-pdf/renderer`.

#### 11.6 Reconciliation (`/treasurer/reconciliation`)
- CSV upload zone for bank statement
- Results table: Matched (brand-50 bg) | Unmatched platform entry (amber) | Unmatched bank entry (coral)
- Actions: Confirm match | Create adjustment entry with note | Flag for admin review

### Acceptance Criteria
- [ ] Contribution tracker shows correct paid/unpaid status per member per cycle
- [ ] "Mark as Paid" creates a manual ledger entry and updates contribution status
- [ ] Payout modal shows correctly calculated service fee and net amount
- [ ] Transaction PIN required and verified by backend before payout processed
- [ ] Ledger view shows debit in coral and credit in brand-600
- [ ] Ledger export generates valid PDF with correct headers and balances
- [ ] Reconciliation highlights unmatched entries in correct colors

---

## Phase 12 — Frontend: Platform Admin Dashboard & Pages

**Owner:** Frontend Engineer  
**Estimated effort:** 3–4 days  
**Prerequisites:** Phase 9 complete; Phase 5 backend admin endpoints available

### Goal
Build the complete platform admin experience: admin-specific layout, dashboard KPIs, groups management, the critical loan verification slide-over, trust account monitor, audit logs, and user management.

### Key components to build

#### 12.1 Admin layout
Same sidebar/header shell but admin navigation only (no group-specific items).  
Country badge in header: flag emoji + country name showing which country admin is scoped to.

#### 12.2 Admin Dashboard (`/admin`)
**Country Overview Hero** (dark green):
- `[Flag] Admin Dashboard — Kenya`
- Stats: Total Active Groups, Total Registered Members, Transaction Volume This Month, Loan Default Rate %, Compliance Rate %

**Three KPI Cards:**
1. Groups Health donut (Recharts PieChart) — Active/Paused/Closed
2. Monthly Transaction Volume vs Previous Month (BarChart)
3. Loan Performance (HorizontalBarChart) — disbursed/repaid/defaulted

**Alerts Panel:** flagged items (loans pending approval, failed contributions above threshold, members with 3+ missed contributions). Each alert is a clickable row linking to relevant page.

#### 12.3 Groups List (`/admin/groups`)
Server-side paginated TanStack Table. Filter/sort params sent as URL query params to API.

Columns: Group Name | Country | Members (N/max) | Chairperson | Total Balance | Compliance % | Active Loans | Status | Last Activity | Actions

Actions: View Detail | Pause (with reason modal) | Flag for Review

#### 12.4 Group Detail (`/admin/groups/[groupId]`)
Tabbed page using shadcn/ui `Tabs`:
- **Overview:** group info card + financial summary (pool balances, cycle stats)
- **Members:** full member table with KYC status, contribution history, loan history
- **Ledger:** read-only ledger (reuse `LedgerView` component from Phase 11, read-only mode)
- **Loans:** all loans for group, all statuses, filterable
- **Audit:** all audit log entries for group (non-interactive)
- **Settings:** admin can pause/close group, adjust rules (with audit log write)

#### 12.5 Loan Verification (`/admin/loans`) — Critical
> [!IMPORTANT]
> This is the highest-stakes UI in the system. Every decision here triggers real money movement. Design for full context and no ambiguity.

Table of loans at `pending_admin` status. "Review" → opens full-screen `Sheet` (shadcn/ui slide-over panel):

**Left column — Borrower Profile:**
- Photo, name, phone, country, KYC status badge
- Member since date, rotation position
- Last 12 contributions table with status
- Outstanding loans, loan repayment history

**Right column — Loan Details:**
- Amount, purpose, purpose detail
- Group loan pool current balance → pool available after this loan
- Interest rate, term, projected repayment schedule table
- Chairperson approval: name, date, notes
- Treasurer approval: name, date, notes
- Fraud check results: system checks summary (green/flagged)
- Admin notes textarea
- Transaction PIN input
- "Approve & Disburse" (full-width, brand-700) | "Reject" (coral outline)

On Approve: `POST /loans/{id}/admin-approve/` → shows disbursement in-progress → success with provider reference.

#### 12.6 Trust Account Monitor (`/admin/trust-account`)
- Current balance (large DM Serif), available for disbursement, held pending reconciliation
- Last reconciliation: date, status, matched/unmatched count
- "Run Reconciliation" button → triggers backend task
- Transaction ledger comparing trust account vs platform ledger

#### 12.7 Audit Logs (`/admin/audit`)
Read-only, non-interactive, append-only display.

Server-side paginated TanStack Table: Timestamp | Action | Actor (name + role) | Target | IP Address | Session ID | Details

"Details" opens shadcn Dialog with full `metadata` JSON for that entry.

Filter by: action type, actor, date range. CSV export for regulatory reporting.

#### 12.8 User Management (`/admin/users`)
Table: Name | Email | Phone | Role | KYC Status | Country | Joined | Status | Actions

Actions: View Profile | Suspend (with reason) | Reinstate | Reset Password (sends email) | Promote Role

KYC pill: Verified (success), Submitted (info), Pending (pending), Rejected (failed).

### Acceptance Criteria
- [ ] Admin sees only groups/users/loans from their own country
- [ ] Dashboard KPIs match backend aggregation values
- [ ] Loan verification slide-over shows complete borrower context
- [ ] Disbursement cannot proceed without valid transaction PIN
- [ ] Approve action shows in-progress state then success with provider reference
- [ ] Audit log is non-interactive and export works as CSV
- [ ] Group detail tabs all render correct data

---

## Phase 13 — Frontend: Super Admin

**Owner:** Frontend Engineer  
**Estimated effort:** 1–2 days  
**Prerequisites:** Phase 12 complete

### Goal
Extend the admin experience for super admin: global overview with system health, country cards, and the ability to view/act on any country's admin data.

### Key components to build

#### 13.1 Global Overview (`/admin` when role is `super_admin`)
**Hero:** "Super Admin — OrbiSave Global Platform"

Global stats: Total Countries (3), Total Groups, Total Members, Total Volume This Month (USD equivalent), System Health status.

**System Health Panel:**
- Service status indicators: API | Payment Gateway Kenya | Payment Gateway Rwanda/Ghana | Database | Redis | Celery Workers
- Each shows green/red status dot + last checked timestamp
- Data from `GET /api/v1/superadmin/overview/`

#### 13.2 Country Cards
Three equal-width cards: Kenya 🇰🇪, Rwanda 🇷🇼, Ghana 🇬🇭.  
Each: flag, country name, key stats (groups, members, volume, compliance %, active loans), "View Country" button → `/admin/country/[code]`.

#### 13.3 Country View (`/admin/country/[countryCode]`)
Renders the same platform admin dashboard scoped to the selected country. Super admin has full read and action permissions across all countries.

Implementation: pass `?country=kenya` query param to all API calls when super admin is in a country view. The `IsSuperAdmin` permission class on the backend grants access.

### Acceptance Criteria
- [ ] Super admin sees global stats (all countries combined)
- [ ] System health panel shows live status for all services
- [ ] Country cards show correct per-country stats
- [ ] Clicking "View Country" scopes all dashboard data to that country
- [ ] Super admin can approve loans, suspend users, and view audit logs in any country
- [ ] `member` and `platform_admin` roles cannot access super admin routes

---

## Phase 14 — Real-time, Offline Support & Meetings

**Owner:** Frontend Engineer  
**Estimated effort:** 2–3 days  
**Prerequisites:** Phase 13 complete; Phase 5 backend WebSocket server and LiveKit running

### Goal
Connect the frontend to the Django Channels WebSocket server for real-time notifications and cache updates, implement offline support with IndexedDB queuing, and build the LiveKit group meeting room.

### Steps

#### 14.1 WebSocket hook (`lib/hooks/useWebSocket.ts`)
```typescript
'use client';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export function useWebSocket() {
  const { data: session } = useSession();
  const ws  = useRef<WebSocket | null>(null);
  const qc  = useQueryClient();
  const reconnectDelay = useRef(1000);

  useEffect(() => {
    if (!session?.accessToken) return;

    function connect() {
      ws.current = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/notifications/?token=${session.accessToken}`
      );

      ws.current.onmessage = (e) => {
        const event = JSON.parse(e.data);
        handleWebSocketEvent(event, qc);
      };

      ws.current.onclose = () => {
        setTimeout(connect, reconnectDelay.current);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000); // exponential backoff
      };

      ws.current.onopen = () => { reconnectDelay.current = 1000; };
    }

    connect();
    return () => ws.current?.close();
  }, [session?.accessToken]);
}

function handleWebSocketEvent(event: any, qc: any) {
  switch (event.type) {
    case 'CONTRIBUTION_CONFIRMED':
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['contributions'] });
      toast.success(`Contribution confirmed: ${event.payload.memberName}`);
      break;
    case 'CONTRIBUTION_FAILED':
      toast.error(`Contribution failed: ${event.payload.reason}`);
      break;
    case 'LOAN_STATUS_CHANGED':
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.info(`Loan status updated`);
      break;
    case 'PAYOUT_PROCESSED':
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['payouts'] });
      toast.success(`Payout processed: ${event.payload.amount}`);
      break;
    case 'LOAN_APPROVAL_REQUIRED':
      toast.warning(`Loan approval needed: ${event.payload.borrowerName}`);
      break;
    case 'MEETING_STARTING':
      toast.info(`Meeting starting: ${event.payload.title}`);
      break;
  }
}
```

Mount `useWebSocket()` in `app/(auth)/layout.tsx` so it runs on all authenticated pages.

#### 14.2 Offline indicator component
```typescript
// components/shared/OfflineBanner.tsx
'use client';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const go = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online',  go);
    window.addEventListener('offline', go);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', go); };
  }, []);

  if (!isOffline) return null;
  return (
    <div className="bg-amber text-white text-sm text-center py-2 px-4">
      You are offline. Financial transactions are unavailable.
      Governance actions will sync when you reconnect.
    </div>
  );
}
```

Render `<OfflineBanner />` just below the `<Header>` in the auth layout.

#### 14.3 Offline queue with IndexedDB
Install `idb`: `npm install idb`

```typescript
// lib/hooks/useOfflineSync.ts
import { openDB } from 'idb';

const dbPromise = openDB('orbisave-offline', 1, {
  upgrade(db) { db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true }); },
});

export async function queueOfflineAction(action: { url: string; method: string; body: any }) {
  const db = await dbPromise;
  await db.add('queue', { ...action, queuedAt: new Date().toISOString() });
}

export async function replayOfflineQueue(axiosInstance: any) {
  const db = await dbPromise;
  const all = await db.getAll('queue');
  for (const item of all) {
    try {
      await axiosInstance({ method: item.method, url: item.url, data: item.body });
      await db.delete('queue', item.id);
    } catch (e) {
      console.error('Failed to replay offline action:', e);
    }
  }
}
```

`useOfflineSync.ts` hook: listen for `navigator.onLine` becoming `true` → call `replayOfflineQueue()`.

Offline-queued actions: meeting attendance, governance votes, loan approval decisions.

#### 14.4 Group Meeting Room (`app/(auth)/meetings/[meetingId]/page.tsx`)
```typescript
'use client';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, ControlBar } from '@livekit/components-react';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

export default function MeetingRoom({ params }: { params: { meetingId: string } }) {
  const [token, setToken] = useState('');

  useEffect(() => {
    api.post(`/meetings/${params.meetingId}/join/`)
       .then(r => setToken(r.data.data.token));
  }, [params.meetingId]);

  if (!token) return <MeetingLoadingState />;

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      className="h-screen"
    >
      <VideoConference />
      <RoomAudioRenderer />
      <ControlBar />
    </LiveKitRoom>
  );
}
```

On leaving meeting: `POST /api/v1/meetings/{meetingId}/attendance/` to record departure time.

### Acceptance Criteria
- [ ] WebSocket connects on page load for authenticated users
- [ ] Contribution confirmation toast appears within 2s of backend confirming
- [ ] TanStack Query cache invalidates correctly on WS events
- [ ] WebSocket reconnects with exponential backoff on disconnect
- [ ] Offline banner appears when `navigator.onLine` is false
- [ ] Offline queue stores governance actions when offline and replays on reconnect
- [ ] LiveKit meeting room connects and displays video conference
- [ ] Leaving meeting records attendance departure

---

## Phase 15 — Testing, QA & CI/CD

**Owner:** Full-stack engineer / QA  
**Estimated effort:** 4–5 days  
**Prerequisites:** All phases 0–14 complete

### Goal
Achieve full test coverage on critical paths, set up CI/CD pipeline, and run the final security and financial integrity checklist.

### Steps

#### 15.1 Backend test suite

**Pattern for every API endpoint:**
```python
# 1. Unauthenticated → 401
# 2. Wrong role → 403
# 3. Invalid payload → 400 with correct error keys
# 4. Happy path → 2xx with correct response
# 5. Edge cases and business logic
# 6. Audit log entry created
# 7. DB state correct after action
```

**Loan approval flow test (most critical):**
```python
@pytest.mark.django_db
def test_loan_full_approval_flow(client, member_user, chair_user, treasurer_user, admin_user, group_with_pool, loan):
    # 1. Unauthenticated → 401
    r = client.post(f'/api/v1/loans/{loan.id}/chair-approve/', {}, HTTP_AUTHORIZATION='')
    assert r.status_code == 401

    # 2. Member tries chair approve → 403
    # 3. Chair approves → 200, status = pending_treasurer
    # 4. Chair tries to approve again → 400
    # 5. Treasurer approves → 200, status = pending_admin
    # 6. Admin approves with valid PIN → 200, Celery task queued
    # 7. loan.status == 'disbursed'
    # 8. Two ledger entries created (loan debit + fee)
    # 9. Audit log has all 3 approval events
    # 10. Hash chain unbroken
```

**Ledger integrity test:**
```python
@pytest.mark.django_db
def test_ledger_hash_chain_integrity(group_with_many_entries):
    entries = LedgerEntry.objects.filter(group=group_with_many_entries).order_by('created_at')
    prev_hash = '0' * 64
    for entry in entries:
        payload = f"{prev_hash}{entry.group_id}{entry.entry_type}{entry.amount}{entry.reference}"
        expected = hashlib.sha256(payload.encode()).hexdigest()
        assert entry.hash == expected, f"Hash broken at entry {entry.id}"
        prev_hash = entry.hash

@pytest.mark.django_db
def test_ledger_entry_immutable():
    entry = LedgerEntryFactory()
    with pytest.raises(PermissionError):
        entry.amount = Decimal('999')
        entry.save()
```

Required test files:
```
backend/tests/
  accounts/   test_register.py  test_login.py  test_kyc.py  test_phone_otp.py
  groups/     test_create.py  test_members.py  test_invites.py
  contributions/ test_initiation.py  test_webhook.py  test_retry.py
  loans/      test_eligibility.py  test_approval_flow.py  test_disbursement.py
  ledger/     test_integrity.py  test_immutability.py
  payouts/    test_fee_calculation.py  test_processing.py
  admin/      test_country_scoping.py  test_loan_verification.py
  audit/      test_immutability.py  test_entries_written.py
```

#### 15.2 Frontend component tests (Vitest + React Testing Library)

```typescript
// Example: ConfirmDialog with PIN
describe('ConfirmDialog', () => {
  it('disables confirm button until PIN is 6 digits', () => { ... });
  it('calls onConfirm with PIN value when submitted', () => { ... });
  it('resets PIN input on close', () => { ... });
});

// Example: CurrencyAmount
describe('CurrencyAmount', () => {
  it.each([
    [284500, 'kenya',  'KSh 284,500.00'],
    [10000,  'rwanda', 'RF 10,000.00'],
    [5000,   'ghana',  'GH₵ 5,000.00'],
  ])('formats %d in %s as %s', (amount, country, expected) => {
    render(<CurrencyAmount amount={amount} country={country} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
```

Required component tests: `StatusBadge`, `CurrencyAmount`, `OTPInput`, `ConfirmDialog`, `EmptyState`, `LedgerTable` (filtering/sorting), `ContributionProgressBar`.

#### 15.3 Playwright E2E tests

Critical paths — all must pass:
```typescript
// playwright/tests/
  auth.spec.ts          // register → onboarding → dashboard
  login-roles.spec.ts   // login as each of 5 roles → verify correct dashboard
  contribution.spec.ts  // initiate → webhook sim → confirm → ledger + wallet update
  loan-flow.spec.ts     // request → chair approve → treasurer approve → admin approve → disbursement
  invite.spec.ts        // generate link → new user accepts → joins group → appears in member list
  payout.spec.ts        // treasurer processes → fee deducted → ledger entries correct
  audit.spec.ts         // verify all events appear in admin audit log
  offline.spec.ts       // go offline → attempt governance action → reconnect → confirm sync
```

Run with real Docker environment:
```bash
docker compose up -d
npx playwright test
```

#### 15.4 GitHub Actions CI pipeline

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:  { branches: [main, develop] }
  pull_request: { branches: [main, develop] }

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: orbisave_test }
        options: --health-cmd pg_isready
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements/development.txt
      - run: cd backend && bandit -r apps/ -c bandit.yml
      - run: cd backend && python -m pytest --cov=apps --cov-report=xml -x

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  e2e:
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: docker compose -f infrastructure/docker/docker-compose.yml up -d --build
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

#### 15.5 Final security checklist

Verify every item before marking Phase 15 complete:

**Security:**
- [ ] No hardcoded secrets anywhere in the codebase (`git grep -r 'secret\|password\|key' --include='*.py' --include='*.ts'` — results reviewed)
- [ ] All financial endpoints require `IsKYCVerified` permission class
- [ ] Transaction PIN verified server-side on every financial action
- [ ] `LedgerEntry` cannot be updated or deleted (model + DB trigger if implemented)
- [ ] `AuditLog` cannot be updated or deleted
- [ ] Rate limiting active on `/api/v1/auth/token/` and `/api/v1/auth/register/`
- [ ] JWT tokens use RS256 (verified by inspecting token header)
- [ ] HTTPS enforced in staging/production (TLS 1.3 minimum)

**Financial Integrity:**
- [ ] Every contribution confirmation creates a ledger credit entry
- [ ] Every payout creates two ledger debit entries (net payout + service fee)
- [ ] Every loan disbursement creates a debit from the loan pool
- [ ] Every loan repayment creates a credit back to the loan pool
- [ ] Ledger hash chain unbroken (verified by automated test)
- [ ] Pool balances computed from ledger aggregation — never a stored field that can drift
- [ ] Idempotency keys prevent duplicate STK pushes

**UX:**
- [ ] Loading skeletons on all async operations
- [ ] Empty states on all tables and lists
- [ ] Error states with retry option
- [ ] Confirmation dialogs on all destructive actions
- [ ] Currency amounts formatted correctly per country (KSh / RF / GH₵)
- [ ] Responsive layout usable at 375px width (mobile)

**Accessibility:**
- [ ] All interactive elements keyboard-reachable
- [ ] Status communicated by colour AND text/icon (not colour alone)
- [ ] Focus indicators visible
- [ ] Form errors linked to inputs via `aria-describedby`

### Acceptance Criteria
- [ ] `pytest` passes with 100% of critical path tests green
- [ ] `npm run test` passes with all component tests green
- [ ] `playwright test` passes all 8 E2E specs
- [ ] GitHub Actions CI pipeline green on `main` branch
- [ ] All items in the security checklist verified
- [ ] All items in the financial integrity checklist verified

---

## Summary: Phase Ownership Matrix

| Phase | Name | Owner | Effort | Depends On |
|---|---|---|---|---|
| 0 | Repo & Tooling | Lead/DevOps | 0.5–1d | None |
| 1 | Backend Models | Backend | 2–3d | 0 |
| 2 | Backend Auth API | Backend | 2–3d | 1 |
| 3 | Groups, Members, Invites | Backend | 2–3d | 2 |
| 4 | Financial Engine | Senior Backend | 4–5d | 3 |
| 5 | Admin, Real-time, Notifications | Backend | 2–3d | 4 |
| 6 | Frontend Foundation | Frontend | 2–3d | 0 |
| 7 | Public Pages | Frontend | 1–2d | 6 |
| 8 | Onboarding Flow | Frontend | 2d | 6 |
| 9 | Member Dashboard | Frontend | 3d | 8 |
| 10 | Chairperson Dashboard | Frontend | 3d | 9 |
| 11 | Treasurer Dashboard | Frontend | 3d | 9 |
| 12 | Admin Dashboard | Frontend | 3–4d | 9 |
| 13 | Super Admin | Frontend | 1–2d | 12 |
| 14 | Real-time, Offline, Meetings | Frontend | 2–3d | 13 |
| 15 | Testing & CI/CD | Full-stack / QA | 4–5d | 14 |

**Total estimated effort:** ~37–47 developer-days (roughly 8–10 weeks with a team of 2 engineers working in parallel on backend and frontend tracks)

---

*End of OrbiSave Master Build Phases v1.0*  
*Web platform only. Mobile app excluded from scope.*  
*Reference document: [OrbiSave_Master_Build_Prompt.md](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/OrbiSave_Master_Build_Prompt.md) (supersedes this document on any conflict)*
