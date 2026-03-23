# OrbiSave — Master System Build Prompt v2.0
## A Production-Grade, Banking-Level Full-Stack Specification
### For use with Claude AI, GitHub Copilot, or any senior-capable code generation model

---

> **INSTRUCTION TO THE MODEL**
>
> Read this entire document before writing a single line of code. This is not a simple CRUD application. OrbiSave is a regulated financial infrastructure platform operating across multiple sovereign jurisdictions, handling real community funds, and subject to banking-grade compliance requirements. Every architectural decision in this document exists for a reason. Do not substitute libraries, simplify data models, skip security layers, or deviate from the stack unless a specific section instructs you to consider alternatives. Build the system in the phases specified. Confirm completion of each phase before proceeding. If you encounter genuine ambiguity, ask — do not assume.

---

## SECTION 1 — WHAT ORBISAVE IS

OrbiSave is a **digital financial orchestration and governance platform** for community savings groups — known locally as chamas, VSLAs (Village Savings and Loan Associations), farmer cooperatives, and informal savings circles. These groups have existed across Africa for generations. OrbiSave does not replace them. It gives them a regulated, automated, transparent digital infrastructure.

**The core financial model:**
OrbiSave never holds user funds. Every shilling, franc, or cedi contributed by a member is routed into a dedicated trust account held by a licensed partner bank in that country. OrbiSave operates the software orchestration layer — the ledger, the governance rules, the payment triggers, the approvals — while the bank holds custody. This is the hybrid financial infrastructure model used by leading global payment platforms to avoid classification as a deposit-taking institution while still enabling full financial automation.

**The three launch markets:**
- Kenya — KES, M-Pesa (Safaricom Daraja API), Airtel Money
- Rwanda — RWF, MTN MoMo
- Ghana — GHS, MTN MoMo

Each market operates as an independent unit with its own trust account, its own regulatory compliance posture, its own currency, and its own mobile money integrations. The platform is architected to add new countries without structural changes.

**The five strategic outcomes the platform must deliver:**
1. Eliminate manual bookkeeping and calculation errors in savings groups
2. Prevent financial mismanagement through automated governance rules
3. Enable automated contributions and payouts via mobile money
4. Create verifiable, tamper-proof financial histories for every group member
5. Build the data foundation that enables future integration with formal banking and lending institutions

**Scale target:** Millions of users, hundreds of thousands of groups, high transaction volumes across at least three countries simultaneously.

---

## SECTION 2 — TECHNOLOGY STACK DECISION

This stack is chosen at banking-grade standards. Every choice prioritises security, auditability, scalability, and long-term maintainability over developer convenience.

### 2.1 Frontend — Web Platform

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Server-side rendering for security-sensitive pages, static generation for marketing, API routes for lightweight BFF patterns, first-class TypeScript, and the only React framework production-proven at fintech scale |
| Language | **TypeScript 5 (strict mode)** | Financial systems cannot have type ambiguity. Strict mode enforced across the entire codebase |
| Styling | **Tailwind CSS v3 + shadcn/ui** | shadcn/ui provides accessible, unstyled primitives that are owned by the codebase (not a dependency). Tailwind provides the design token layer. Together they produce banking-grade UI without a heavy component library lock-in |
| State — Server | **TanStack Query v5** | Handles all async server state, caching, background refetch, and stale-while-revalidate for financial data |
| State — Client | **Zustand** | Minimal, performant, non-opinionated client state for auth session, UI state, and optimistic updates |
| Forms | **React Hook Form + Zod** | Schema-validated forms with zero re-renders. Zod schemas are shared between frontend validation and API contract typing |
| Tables | **TanStack Table v8** | Required for complex sortable, filterable, paginated ledger and audit tables |
| Charts | **Recharts** | Composable, well-maintained, no external dependencies |
| Authentication | **Better Auth (Next.js session manager via RS256 JWT from Django) v5 (Auth.js)** | Handles JWT session management, OAuth if needed, and integrates cleanly with Django backend tokens |
| HTTP Client | **Axios** with a typed API layer | Interceptors for token injection, error normalisation, and retry logic |
| Real-time | **native WebSocket** client with reconnection logic | For live transaction notifications and meeting signalling |
| Video Meetings | **LiveKit SDK** (React) | Production WebRTC media server SDK used by fintech and enterprise platforms |
| Internationalisation | **next-intl** | Multi-locale support for English (primary), Swahili, Kinyarwanda, Twi (planned) |
| Icons | **Lucide React** | |
| Date handling | **date-fns** | |
| Notifications | **Sonner** (toast library) | |
| PDF/Export | **@react-pdf/renderer** | For generating ledger reports, statements, and audit documents |
| QR Codes | **qrcode.react** | For invite link QR generation |
| Offline sync | **Workbox** (via next-pwa) | Service worker for offline governance recording that syncs on reconnect |
| Testing | **Vitest + React Testing Library + Playwright** | Unit, integration, and E2E. Financial flows must have full E2E coverage |
| Code quality | **ESLint (airbnb-typescript) + Prettier + Husky + lint-staged** | |

### 2.2 Backend — API and Business Logic

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Django 5.x** | Mandated by the project architecture documents. Mature, battle-tested, security-first defaults |
| API layer | **Django REST Framework (DRF) 3.15** | The project's specified API layer |
| API schema | **drf-spectacular** | Generates OpenAPI 3.1 schema consumed by frontend for type-safe API contracts |
| Language | **Python 3.12** | |
| Database — Primary | **PostgreSQL 16 (Multi-database routing: default for platform, separate logical DBs for Kenya, Rwanda, Ghana)** | ACID-compliant, row-level security, native JSON, advisory locks for concurrent transaction safety |
| Database — Cache / Session | **Redis 7** | Session storage, rate limiting, Celery broker, real-time pub/sub channel layer |
| Async tasks | **Celery 5 + Redis broker** | STK Push initiation, payout scheduling, loan disbursement triggers, KYC webhook processing, reconciliation jobs |
| Task monitoring | **Flower** | Celery task dashboard |
| Authentication | **djangorestframework-simplejwt** | Short-lived access tokens (15 min), long-lived refresh tokens (7 days), token rotation and blacklisting |
| KYC | **Smile Identity API** (primary), **Prembly API** (fallback) | As specified in the financial infrastructure document |
| Payment — Kenya | **Safaricom Daraja API** — STK Push, B2C (payouts), C2B (contributions), transaction status query |
| Payment — Rwanda/Ghana | **MTN MoMo API** — Collections (contributions), Disbursements (payouts) |
| Real-time | **Django Channels 4** + **Daphne** | WebSocket server for live notifications, transaction confirmations, meeting signalling |
| Search | **PostgreSQL full-text search** (initial), **Elasticsearch** (when groups exceed 10k) | |
| Object storage | **AWS S3** (or S3-compatible: MinIO for self-hosted) | KYC documents, profile photos, meeting recordings |
| Email | **AWS SES** or **SendGrid** | Transactional emails |
| SMS | **Africa's Talking API** | Pan-African SMS gateway, handles Kenya, Rwanda, Ghana from one integration |
| Monitoring | **Sentry** (errors) + **Prometheus + Grafana** (metrics) | |
| Logging | **structlog** + centralised log shipping to **AWS CloudWatch** or **Elasticsearch** | Every financial event must produce a structured, immutable log entry |
| Security scanning | **Bandit** (Python SAST) + **Safety** (dependency CVE scanning) | |
| Rate limiting | **django-ratelimit** + Redis | |
| Testing | **pytest-django + factory_boy + responses + freezegun** | |

### 2.3 Infrastructure

| Concern | Choice |
|---|---|
| Containerisation | **Docker** + **Docker Compose** (local), **Kubernetes** (production) |
| Container registry | **AWS ECR** or **Docker Hub** |
| Cloud provider | **AWS** (primary target) — EKS, RDS, ElastiCache, S3, SES, CloudFront, WAF |
| CI/CD | **GitHub Actions** — lint, test, build, deploy pipelines |
| Infrastructure as Code | **Terraform** |
| Secrets management | **AWS Secrets Manager** or **HashiCorp Vault** |
| CDN | **AWS CloudFront** |
| TLS | **AWS ACM** / **Let's Encrypt** — TLS 1.3 minimum |
| Database backups | Automated daily snapshots via RDS, point-in-time recovery enabled |
| WAF | **AWS WAF** — blocks OWASP Top 10, rate limits API endpoints |

### 2.4 Mobile Application (separate codebase, referenced here for API contract alignment)
The project documents specify **Flutter** for mobile. The API built here must serve both the Next.js web platform and the Flutter mobile app. All endpoints must therefore be REST-standard, versioned, and schema-documented. Mobile-specific considerations (push notifications via FCM, USSD fallback) are handled in the mobile codebase but the backend must expose the required endpoints.

---

## SECTION 3 — MONOREPO STRUCTURE

Use a **Turborepo** monorepo. This is the correct structure for a scaling fintech platform with shared types, shared validation schemas, and multiple deployable applications.

```
orbisave/
├── apps/
│   ├── web/                          # Next.js 14 web platform
│   │   ├── app/                      # App Router directory
│   │   │   ├── (public)/             # Route group — no auth required
│   │   │   │   ├── page.tsx          # Landing page (/)
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── forgot-password/
│   │   │   │   └── invite/[code]/
│   │   │   ├── (auth)/               # Route group — requires authentication
│   │   │   │   ├── layout.tsx        # AppShell layout (sidebar + header)
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── profile/
│   │   │   │   │   ├── kyc/
│   │   │   │   │   ├── verify-phone/
│   │   │   │   │   ├── country/
│   │   │   │   │   └── complete/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── group/
│   │   │   │   ├── contributions/
│   │   │   │   ├── loans/
│   │   │   │   ├── ledger/
│   │   │   │   ├── meetings/
│   │   │   │   └── settings/
│   │   │   ├── (chairperson)/        # Route group — role: chairperson
│   │   │   │   ├── chair/
│   │   │   │   │   ├── members/
│   │   │   │   │   ├── loan-approvals/
│   │   │   │   │   ├── invite/
│   │   │   │   │   ├── group-setup/
│   │   │   │   │   └── reports/
│   │   │   ├── (treasurer)/          # Route group — role: treasurer
│   │   │   │   ├── treasurer/
│   │   │   │   │   ├── contributions/
│   │   │   │   │   ├── loan-approvals/
│   │   │   │   │   ├── payouts/
│   │   │   │   │   ├── ledger/
│   │   │   │   │   └── reconciliation/
│   │   │   ├── (admin)/              # Route group — role: platform_admin | super_admin
│   │   │   │   ├── admin/
│   │   │   │   │   ├── page.tsx      # Admin dashboard
│   │   │   │   │   ├── groups/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [groupId]/
│   │   │   │   │   ├── loans/
│   │   │   │   │   ├── users/
│   │   │   │   │   ├── trust-account/
│   │   │   │   │   ├── audit/
│   │   │   │   │   └── country/
│   │   │   │   │       └── [countryCode]/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── ui/                   # shadcn/ui components (owned, not external)
│   │   │   ├── charts/
│   │   │   ├── forms/
│   │   │   └── shared/
│   │   ├── lib/
│   │   │   ├── api/                  # Axios API client layer
│   │   │   ├── auth/                 # Better Auth (Next.js session manager via RS256 JWT from Django) config
│   │   │   ├── hooks/
│   │   │   ├── stores/               # Zustand stores
│   │   │   └── utils/
│   │   ├── public/
│   │   ├── middleware.ts             # Auth middleware, country routing
│   │   ├── next.config.ts
│   │   └── tailwind.config.ts
│   └── docs/                         # Internal documentation site (optional, Nextra)
├── packages/
│   ├── shared-types/                 # TypeScript types shared between web and backend contract
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── group.ts
│   │   │   ├── member.ts
│   │   │   ├── contribution.ts
│   │   │   ├── loan.ts
│   │   │   ├── ledger.ts
│   │   │   └── admin.ts
│   │   └── package.json
│   ├── shared-utils/                 # Currency formatting, date utils, country config
│   └── ui/                           # Base design system tokens (consumed by web)
├── backend/                          # Django project (Python)
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   ├── production.py
│   │   │   └── test.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py                  # Django Channels entry point
│   ├── apps/
│   │   ├── accounts/                # User auth, profiles, KYC
│   │   ├── groups/                  # Group creation, membership, governance
│   │   ├── contributions/           # Contribution scheduling, STK Push, confirmation
│   │   ├── loans/                   # Loan engine, eligibility, approval workflow
│   │   ├── ledger/                  # Immutable double-entry ledger
│   │   ├── payouts/                 # Rotation payout scheduling and execution
│   │   ├── payments/                # Payment gateway abstraction layer
│   │   │   ├── providers/
│   │   │   │   ├── mpesa.py         # Safaricom Daraja integration
│   │   │   │   ├── mtn_momo.py      # MTN MoMo integration
│   │   │   │   └── airtel.py        # Airtel Money integration
│   │   ├── notifications/           # SMS, email, push, in-app notifications
│   │   ├── meetings/                # Meeting scheduling, attendance, LiveKit token generation
│   │   ├── admin_portal/            # Platform admin views and reporting
│   │   ├── audit/                   # Immutable audit log (append-only model)
│   │   └── analytics/               # Aggregated reporting, compliance exports
│   ├── common/
│   │   ├── models.py                # BaseModel with UUID PK, created_at, updated_at
│   │   ├── permissions.py           # Custom DRF permission classes per role
│   │   ├── pagination.py
│   │   ├── exceptions.py            # Custom exception handlers
│   │   └── serializers.py           # Base serializer with audit fields
│   ├── celery_app.py
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   └── production.txt
│   └── tests/
│       ├── accounts/
│       ├── groups/
│       ├── contributions/
│       ├── loans/
│       ├── ledger/
│       └── payments/
├── infrastructure/
│   ├── terraform/
│   ├── kubernetes/
│   └── docker/
│       ├── docker-compose.yml
│       ├── docker-compose.prod.yml
│       └── Dockerfiles/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── turbo.json
├── package.json                     # Turborepo root
└── README.md
```

---

## SECTION 4 — DATA MODELS

### 4.1 Django Models (Backend)

All models inherit from a `BaseModel` abstract class:

```python
# common/models.py
import uuid
from django.db import models

class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

**accounts/models.py**
```python
class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    ROLES = [
        ('member', 'Member'),
        ('chairperson', 'Chairperson'),
        ('treasurer', 'Treasurer'),
        ('platform_admin', 'Platform Admin'),
        ('super_admin', 'Super Admin'),
    ]
    COUNTRIES = [('kenya', 'Kenya'), ('rwanda', 'Rwanda'), ('ghana', 'Ghana')]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=50, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLES, default='member')
    country = models.CharField(max_length=10, choices=COUNTRIES, null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    kyc_status = models.CharField(
        max_length=20,
        choices=[('pending','Pending'),('submitted','Submitted'),('verified','Verified'),('rejected','Rejected')],
        default='pending'
    )
    kyc_provider_ref = models.CharField(max_length=255, null=True, blank=True)
    phone_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    transaction_pin_hash = models.CharField(max_length=255, null=True, blank=True)
    mobile_money_provider = models.CharField(max_length=50, null=True, blank=True)
    mobile_money_number = models.CharField(max_length=20, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    # Required for custom user model
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone', 'full_name']


class KYCDocument(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kyc_documents')
    document_type = models.CharField(max_length=50)  # national_id, passport, drivers_license
    front_image = models.FileField(upload_to='kyc/front/')
    back_image = models.FileField(upload_to='kyc/back/', null=True, blank=True)
    provider_job_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')
    reviewed_at = models.DateTimeField(null=True, blank=True)
```

**groups/models.py**
```python
class Group(BaseModel):
    CONTRIBUTION_FREQUENCY = [
        ('weekly', 'Weekly'), ('biweekly', 'Bi-weekly'),
        ('monthly', 'Monthly'), ('harvest', 'Harvest Season'),
    ]
    ROTATION_METHODS = [
        ('sequential', 'Sequential'), ('random', 'Random Draw'), ('manual', 'Manual'),
    ]
    STATUS = [('active','Active'), ('paused','Paused'), ('closed','Closed')]
    COUNTRIES = [('kenya','Kenya'), ('rwanda','Rwanda'), ('ghana','Ghana')]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    country = models.CharField(max_length=10, choices=COUNTRIES)
    chairperson = models.ForeignKey(User, on_delete=models.PROTECT, related_name='chaired_groups')
    treasurer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='treasured_groups', null=True, blank=True)
    max_members = models.PositiveIntegerField(default=20)
    contribution_amount = models.DecimalField(max_digits=14, decimal_places=2)
    contribution_frequency = models.CharField(max_length=20, choices=CONTRIBUTION_FREQUENCY)
    contribution_day = models.PositiveIntegerField()  # 0-6 for weekly, 1-31 for monthly
    harvest_start_month = models.PositiveIntegerField(null=True, blank=True)
    harvest_end_month = models.PositiveIntegerField(null=True, blank=True)
    rotation_savings_pct = models.DecimalField(max_digits=5, decimal_places=2, default=70.00)
    loan_pool_pct = models.DecimalField(max_digits=5, decimal_places=2, default=30.00)
    max_loan_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=3.00)
    loan_term_weeks = models.PositiveIntegerField(default=12)
    loan_interest_rate_monthly = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    rotation_method = models.CharField(max_length=20, choices=ROTATION_METHODS, default='sequential')
    status = models.CharField(max_length=20, choices=STATUS, default='active')
    invite_code = models.CharField(max_length=50, unique=True)
    invite_expires_at = models.DateTimeField()
    currency = models.CharField(max_length=5)  # KES, RWF, GHS
    trust_account_ref = models.CharField(max_length=255, null=True, blank=True)


class GroupMember(BaseModel):
    STATUS = [('active','Active'), ('suspended','Suspended'), ('left','Left')]

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_memberships')
    rotation_position = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS, default='active')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('group', 'user'), ('group', 'rotation_position')]


class GroupInvite(BaseModel):
    STATUS = [('pending','Pending'), ('accepted','Accepted'), ('expired','Expired'), ('cancelled','Cancelled')]

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='invites')
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    contact = models.CharField(max_length=255)  # email or phone
    contact_type = models.CharField(max_length=10)  # email or phone
    token = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='accepted_invites')
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
```

**ledger/models.py**
```python
class LedgerEntry (with previous_state/new_state JSON, PostgreSQL trigger-level immutability, Daily Merkle root checkpointing, and off-chain signed daily S3 exports)(BaseModel):
    """
    Double-entry ledger. Every financial event produces at minimum two entries.
    This model is APPEND-ONLY. No update or delete operations are permitted.
    """
    ENTRY_TYPES = [
        ('contribution', 'Contribution'),
        ('payout', 'Payout'),
        ('loan_disbursement', 'Loan Disbursement'),
        ('loan_repayment', 'Loan Repayment'),
        ('service_fee', 'Service Fee'),
        ('interest', 'Interest'),
        ('refund', 'Refund'),
        ('reconciliation_adjustment', 'Reconciliation Adjustment'),
    ]
    DIRECTIONS = [('credit', 'Credit'), ('debit', 'Debit')]

    group = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='ledger_entries')
    member = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True)
    entry_type = models.CharField(max_length=40, choices=ENTRY_TYPES)
    direction = models.CharField(max_length=10, choices=DIRECTIONS)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=5)
    running_balance = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.TextField()
    reference = models.CharField(max_length=255, unique=True)  # immutable external reference
    related_contribution = models.ForeignKey('contributions.Contribution', on_delete=models.PROTECT, null=True, blank=True)
    related_loan = models.ForeignKey('loans.Loan', on_delete=models.PROTECT, null=True, blank=True)
    related_payout = models.ForeignKey('payouts.Payout', on_delete=models.PROTECT, null=True, blank=True)
    recorded_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, related_name='ledger_entries_recorded')
    hash = models.CharField(max_length=64)  # SHA-256 chain hash of previous entry + this entry data

    class Meta:
        ordering = ['created_at']
        # Prevent any update or delete at the database level via DB triggers (document this in migration)

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Ledger entries are immutable.")
        super().save(*args, **kwargs)
```

**contributions/models.py**
```python
class Contribution(BaseModel):
    METHODS = [('mpesa','M-Pesa'), ('airtel','Airtel Money'), ('mtn_momo','MTN MoMo'), ('bank','Bank Transfer')]
    STATUS = [('scheduled','Scheduled'), ('initiated','Initiated'), ('pending','Pending'), ('confirmed','Confirmed'), ('failed','Failed')]

    group = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='contributions')
    member = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='contributions')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=5)
    method = models.CharField(max_length=20, choices=METHODS)
    mobile_number = models.CharField(max_length=20)
    provider_reference = models.CharField(max_length=255, null=True, blank=True)  # e.g. M-Pesa transaction ID
    platform_reference = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    scheduled_date = models.DateField()
    initiated_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
```

**loans/models.py**
```python
class Loan(BaseModel):
    STATUS = [
        ('pending_chair', 'Pending Chairperson'),
        ('pending_treasurer', 'Pending Treasurer'),
        ('pending_admin', 'Pending Platform Admin'),
        ('approved', 'Approved'),
        ('disbursed', 'Disbursed'),
        ('active', 'Active'),
        ('repaid', 'Repaid'),
        ('defaulted', 'Defaulted'),
        ('rejected', 'Rejected'),
    ]

    group = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='loans')
    borrower = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='loans')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=5)
    interest_rate_monthly = models.DecimalField(max_digits=5, decimal_places=2)
    term_weeks = models.PositiveIntegerField()
    purpose = models.CharField(max_length=255)
    purpose_detail = models.TextField(blank=True)
    status = models.CharField(max_length=25, choices=STATUS, default='pending_chair')
    # Approval chain
    chair_approved_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='chair_approved_loans')
    chair_approved_at = models.DateTimeField(null=True, blank=True)
    chair_rejection_reason = models.TextField(null=True, blank=True)
    treasurer_approved_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='treasurer_approved_loans')
    treasurer_approved_at = models.DateTimeField(null=True, blank=True)
    treasurer_rejection_reason = models.TextField(null=True, blank=True)
    admin_approved_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='admin_approved_loans')
    admin_approved_at = models.DateTimeField(null=True, blank=True)
    admin_rejection_reason = models.TextField(null=True, blank=True)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    disbursement_reference = models.CharField(max_length=255, null=True, blank=True)
    fully_repaid_at = models.DateTimeField(null=True, blank=True)


class LoanRepayment(BaseModel):
    STATUS = [('upcoming','Upcoming'), ('paid','Paid'), ('overdue','Overdue'), ('waived','Waived')]

    loan = models.ForeignKey(Loan, on_delete=models.PROTECT, related_name='repayments')
    due_date = models.DateField()
    principal_amount = models.DecimalField(max_digits=14, decimal_places=2)
    interest_amount = models.DecimalField(max_digits=14, decimal_places=2)
    total_due = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='upcoming')
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=255, null=True, blank=True)
```

**audit/models.py**
```python
class AuditLog(BaseModel):
    """
    Append-only audit trail. No updates or deletes.
    Every state change in the system writes an audit entry.
    """
    ACTION_TYPES = [
        ('user_login', 'User Login'),
        ('user_logout', 'User Logout'),
        ('kyc_submitted', 'KYC Submitted'),
        ('kyc_verified', 'KYC Verified'),
        ('kyc_rejected', 'KYC Rejected'),
        ('group_created', 'Group Created'),
        ('group_paused', 'Group Paused'),
        ('member_joined', 'Member Joined'),
        ('member_suspended', 'Member Suspended'),
        ('contribution_scheduled', 'Contribution Scheduled'),
        ('contribution_initiated', 'Contribution Initiated'),
        ('contribution_confirmed', 'Contribution Confirmed'),
        ('contribution_failed', 'Contribution Failed'),
        ('loan_requested', 'Loan Requested'),
        ('loan_chair_approved', 'Loan Chair Approved'),
        ('loan_chair_rejected', 'Loan Chair Rejected'),
        ('loan_treasurer_approved', 'Loan Treasurer Approved'),
        ('loan_treasurer_rejected', 'Loan Treasurer Rejected'),
        ('loan_admin_approved', 'Loan Admin Approved'),
        ('loan_admin_rejected', 'Loan Admin Rejected'),
        ('loan_disbursed', 'Loan Disbursed'),
        ('loan_repayment_received', 'Loan Repayment Received'),
        ('payout_processed', 'Payout Processed'),
        ('invite_sent', 'Invite Sent'),
        ('invite_accepted', 'Invite Accepted'),
        ('admin_action', 'Admin Action'),
    ]

    action = models.CharField(max_length=50, choices=ACTION_TYPES)
    actor = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True)
    target_user = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='audit_targets')
    target_group = models.ForeignKey('groups.Group', on_delete=models.PROTECT, null=True, blank=True)
    country = models.CharField(max_length=10, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)  # contextual data about the action
    session_id = models.CharField(max_length=255, null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Audit log entries are immutable.")
        super().save(*args, **kwargs)
```

### 4.2 TypeScript Types (Shared Package — `packages/shared-types`)

These types are generated from the OpenAPI schema using `openapi-typescript`. Do not write them manually — generate them:

```bash
# After backend is running:
npx openapi-typescript http://localhost:8000/api/schema/ -o packages/shared-types/src/api.d.ts
```

The shared package also exports manually-maintained enums and constants:

```typescript
// packages/shared-types/src/enums.ts
export const USER_ROLES = ['member', 'chairperson', 'treasurer', 'platform_admin', 'super_admin'] as const;
export type UserRole = typeof USER_ROLES[number];

export const COUNTRIES = ['kenya', 'rwanda', 'ghana'] as const;
export type Country = typeof COUNTRIES[number];

export const LOAN_STATUSES = [
  'pending_chair', 'pending_treasurer', 'pending_admin',
  'approved', 'disbursed', 'active', 'repaid', 'defaulted', 'rejected'
] as const;
export type LoanStatus = typeof LOAN_STATUSES[number];

export const CONTRIBUTION_STATUSES = ['scheduled', 'initiated', 'pending', 'confirmed', 'failed'] as const;
export type ContributionStatus = typeof CONTRIBUTION_STATUSES[number];
```

---

## SECTION 5 — API DESIGN CONTRACT

### 5.1 API Versioning and Base URL
```
Production:  https://api.orbisave.com/v1/
Staging:     https://api-staging.orbisave.com/v1/
Development: http://localhost:8000/api/v1/
```

### 5.2 Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```
Token endpoints:
```
POST /v1/auth/token/           → obtain token pair (email + password)
POST /v1/auth/token/refresh/   → refresh access token
POST /v1/auth/token/blacklist/ → logout (invalidate refresh token)
```

### 5.3 Core Endpoint Groups

```
# Authentication and Accounts
POST   /v1/auth/register/
POST   /v1/auth/token/
POST   /v1/auth/token/refresh/
POST   /v1/auth/token/blacklist/
POST   /v1/auth/verify-phone/         → initiate OTP
POST   /v1/auth/verify-phone/confirm/ → confirm OTP
POST   /v1/auth/forgot-password/
POST   /v1/auth/reset-password/
GET    /v1/auth/me/                   → current user profile
PATCH  /v1/auth/me/
POST   /v1/auth/me/change-password/
POST   /v1/auth/me/set-transaction-pin/
POST   /v1/auth/me/mobile-money/      → link mobile money account

# KYC
POST   /v1/kyc/documents/             → upload KYC documents
GET    /v1/kyc/status/                → poll KYC status
POST   /v1/kyc/webhook/               → Smile Identity / Prembly webhook (internal)

# Groups
GET    /v1/groups/                    → list user's groups
POST   /v1/groups/                    → create group (chairperson)
GET    /v1/groups/{id}/
PATCH  /v1/groups/{id}/               → update group settings (chairperson)
POST   /v1/groups/{id}/pause/
POST   /v1/groups/{id}/close/
GET    /v1/groups/{id}/wallet/        → group wallet balances (rotation pool, loan pool)
GET    /v1/groups/{id}/members/
POST   /v1/groups/{id}/members/remove/
POST   /v1/groups/{id}/members/suspend/
POST   /v1/groups/{id}/members/reinstate/

# Invites
GET    /v1/groups/{id}/invites/
POST   /v1/groups/{id}/invites/       → send invite (email or phone)
POST   /v1/groups/{id}/invites/regenerate-link/
GET    /v1/invites/{code}/            → get invite details (public — no auth)
POST   /v1/invites/{code}/accept/     → accept invite

# Contributions
GET    /v1/groups/{id}/contributions/
GET    /v1/contributions/{id}/
POST   /v1/groups/{id}/contributions/initiate/   → trigger STK Push
POST   /v1/contributions/webhook/mpesa/           → M-Pesa Daraja callback
POST   /v1/contributions/webhook/mtn/             → MTN MoMo callback
POST   /v1/groups/{id}/contributions/record-manual/ → treasurer manual entry

# Loans
GET    /v1/groups/{id}/loans/
POST   /v1/groups/{id}/loans/         → request loan
GET    /v1/loans/{id}/
POST   /v1/loans/{id}/chair-approve/
POST   /v1/loans/{id}/chair-reject/
POST   /v1/loans/{id}/treasurer-approve/
POST   /v1/loans/{id}/treasurer-reject/
POST   /v1/loans/{id}/admin-approve/  → triggers disbursement
POST   /v1/loans/{id}/admin-reject/
POST   /v1/loans/{id}/repayments/     → record repayment
GET    /v1/loans/{id}/repayments/

# Payouts
GET    /v1/groups/{id}/payouts/
POST   /v1/groups/{id}/payouts/process/  → treasurer initiates payout (confirmation required)
GET    /v1/payouts/{id}/

# Ledger
GET    /v1/groups/{id}/ledger/        → paginated, filterable ledger entries
GET    /v1/groups/{id}/ledger/export/ → CSV/PDF export

# Meetings
GET    /v1/groups/{id}/meetings/
POST   /v1/groups/{id}/meetings/
GET    /v1/meetings/{id}/
PATCH  /v1/meetings/{id}/
POST   /v1/meetings/{id}/join/        → get LiveKit access token
POST   /v1/meetings/{id}/attendance/  → mark attendance

# Notifications
GET    /v1/notifications/
POST   /v1/notifications/{id}/read/
POST   /v1/notifications/read-all/

# Admin — Platform Admin and Super Admin
GET    /v1/admin/dashboard/           → country-level KPIs (filtered by admin's country)
GET    /v1/admin/groups/              → all groups in country
GET    /v1/admin/groups/{id}/         → group detail with full member and ledger data
POST   /v1/admin/groups/{id}/flag/
GET    /v1/admin/loans/pending/       → all loans at pending_admin status in country
GET    /v1/admin/users/
POST   /v1/admin/users/{id}/suspend/
POST   /v1/admin/users/{id}/reinstate/
GET    /v1/admin/trust-account/       → trust account balance and reconciliation status
POST   /v1/admin/trust-account/reconcile/
GET    /v1/admin/audit/               → audit log with full filter capabilities
GET    /v1/admin/analytics/           → aggregated financial metrics

# Super Admin only
GET    /v1/superadmin/overview/       → all countries summary
GET    /v1/superadmin/country/{country}/
```

### 5.4 Standard Response Envelope

All API responses use this envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable message",
  "errors": null,
  "meta": {
    "pagination": {
      "count": 247,
      "next": "https://api.orbisave.com/v1/...",
      "previous": null,
      "page": 1,
      "page_size": 20
    }
  }
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": {
    "email": ["This email is already registered."],
    "phone": ["Phone number format is invalid."]
  },
  "meta": null
}
```

---

## SECTION 6 — SECURITY ARCHITECTURE

This section is non-negotiable. Every item must be implemented.

### 6.1 Authentication Security
- JWT access tokens expire in **15 minutes**. Refresh tokens expire in **7 days** with rotation and blacklisting on use.
- All tokens are signed with RS256 (asymmetric, not HS256). Private key stored in AWS Secrets Manager.
- Failed login attempts: rate-limited to **5 attempts per 15 minutes per IP** using `django-ratelimit` + Redis. After 5 failures, account is soft-locked for 15 minutes and an alert email is sent.
- Session IDs logged in every audit entry.
- 2FA: TOTP via RFC 6238 (`django-otp`). Backup codes generated on 2FA setup (10 single-use codes). 2FA is optional at launch, mandatory for chairpersons and treasurers in phase 2.
- Transaction PIN: a separate 4-6 digit PIN hashed with Argon2id, required before any financial action (contributions, loan approvals, payout processing). Verified on the backend, never on the frontend alone.

### 6.2 Transport and Data Security
- TLS 1.3 minimum on all endpoints
- HSTS with `max-age=63072000; includeSubDomains; preload`
- All API responses include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Referrer-Policy: strict-origin`
- KYC documents encrypted at rest in S3 using SSE-KMS. Access via pre-signed URLs with 5-minute expiry, never exposed directly.
- All PII fields in the database encrypted at the application layer using `django-encrypted-model-fields` with keys from AWS KMS. Fields: national_id, date_of_birth, mobile_money_number, transaction_pin_hash.
- Database connections: SSL enforced, connection pooling via PgBouncer.

### 6.3 Financial Transaction Security
- All financial operations protected by idempotency keys. Every payment initiation generates a UUID idempotency key stored in Redis (TTL 24 hours). Duplicate requests return the same response as the original.
- Ledger entries use a SHA-256 hash chain: each entry's hash = SHA-256(previous_entry_hash + entry_data). Any tampering is immediately detectable.
- Loan disbursement requires the transaction PIN of the platform admin authorising the disbursement, verified server-side.
- STK Push initiation uses database-level advisory locks (PostgreSQL `pg_advisory_xact_lock`) to prevent duplicate pushes for the same contribution.
- Fraud detection: a Celery task runs after every payment event to check:
  - Is the amount above the group's contribution amount by more than 20%? (potential error)
  - Is this the third failed attempt for this member this cycle? (flag for admin review)
  - Is the mobile number different from the member's registered number? (flag and notify)

### 6.4 Role-Based Access Control (Backend)
Define custom DRF permission classes:

```python
# common/permissions.py

class IsGroupMember(BasePermission):
    """User must be an active member of the group referenced in the URL."""

class IsGroupChairperson(BasePermission):
    """User must be the chairperson of the group."""

class IsGroupTreasurer(BasePermission):
    """User must be the treasurer of the group."""

class IsGroupLeader(BasePermission):
    """User must be chairperson OR treasurer of the group."""

class IsPlatformAdmin(BasePermission):
    """User role is platform_admin, and country matches the target group's country."""

class IsSuperAdmin(BasePermission):
    """User role is super_admin."""

class IsKYCVerified(BasePermission):
    """User's KYC status is 'verified'. Required for all financial actions."""
```

### 6.5 Next.js Middleware Security
```typescript
// apps/web/middleware.ts

export function middleware(request: NextRequest) {
  // 1. Check authentication token — redirect unauthenticated users to /login
  // 2. Check KYC status — redirect unverified users to /onboarding/kyc
  // 3. Check role against route group — redirect unauthorised roles to /dashboard
  // 4. Add security headers to all responses
  // 5. Log request metadata for suspicious pattern detection
}
```

---

## SECTION 7 — PAYMENT INTEGRATION LAYER

### 7.1 Payment Provider Abstraction

Design a clean abstraction so adding a new payment provider (e.g. Airtel Rwanda, Vodacom Tanzania) does not require changes to business logic:

```python
# apps/payments/base.py
from abc import ABC, abstractmethod

class PaymentProvider(ABC):
    @abstractmethod
    def initiate_stk_push(self, phone: str, amount: Decimal, reference: str, description: str) -> dict:
        """Prompt user's phone to approve payment."""

    @abstractmethod
    def initiate_disbursement(self, phone: str, amount: Decimal, reference: str, remarks: str) -> dict:
        """Send money to user's phone."""

    @abstractmethod
    def query_transaction_status(self, reference: str) -> dict:
        """Check the current status of a transaction."""

    @abstractmethod
    def parse_callback(self, payload: dict) -> dict:
        """Parse provider callback into normalised internal format."""
```

### 7.2 M-Pesa (Kenya)

Implement `MpesaProvider(PaymentProvider)` using the Safaricom Daraja API:
- OAuth 2.0 token endpoint: `https://api.safaricom.co.ke/oauth/v1/generate`
- STK Push: `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
- B2C (disbursements/payouts): `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`
- Transaction status query: `https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query`
- Callback handler: `POST /v1/contributions/webhook/mpesa/` — validate the Safaricom IP whitelist, verify the callback signature, update contribution status, write ledger entry, send notification

**STK Push flow:**
1. Platform calls Daraja STK Push endpoint
2. Member receives a payment prompt on their phone
3. Member approves and enters M-Pesa PIN
4. Safaricom sends a callback to our webhook endpoint
5. Celery task processes callback: updates contribution to `confirmed`, writes ledger credit entry, calculates pool allocations, sends in-app + SMS notification to member and chairperson
6. If callback not received within 90 seconds: Celery task polls transaction status API
7. If status is `failed` after 3 retries: mark as failed, send failure notification, log audit entry

### 7.3 MTN MoMo (Rwanda, Ghana)

Implement `MTNMoMoProvider(PaymentProvider)` using the MTN MoMo API:
- Collections (contributions): `POST /collection/v1_0/requesttopay`
- Disbursements (payouts/loan disbursements): `POST /disbursement/v1_0/transfer`
- Transaction status: `GET /collection/v1_0/requesttopay/{referenceId}`
- API user creation and key management per the MTN sandbox/production onboarding process
- Same callback and retry pattern as M-Pesa

### 7.4 Provider Selection Logic

```python
# apps/payments/selector.py

def get_payment_provider(country: str, method: str) -> PaymentProvider:
    providers = {
        ('kenya', 'mpesa'): MpesaProvider,
        ('kenya', 'airtel'): AirtelProvider,
        ('rwanda', 'mtn_momo'): MTNMoMoProvider,
        ('ghana', 'mtn_momo'): MTNMoMoProvider,
    }
    provider_class = providers.get((country, method))
    if not provider_class:
        raise ValueError(f"No provider configured for {country}/{method}")
    return provider_class()
```

---

## SECTION 8 — CELERY TASK DEFINITIONS

All async, scheduled, and time-critical operations run as Celery tasks:

```python
# apps/contributions/tasks.py
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def initiate_contribution_stk_push(self, contribution_id: str):
    """Trigger STK Push for a scheduled contribution."""

@shared_task
def process_payment_callback(contribution_id: str, provider_data: dict):
    """Process confirmed/failed payment from provider webhook."""

@shared_task
def retry_failed_contributions():
    """Cron: run every hour, retry eligible failed contributions."""

# apps/loans/tasks.py
@shared_task
def disburse_approved_loan(loan_id: str, admin_user_id: str):
    """Trigger disbursement via payment provider for admin-approved loan."""

@shared_task
def check_overdue_repayments():
    """Cron: run daily, mark overdue repayments and notify borrowers."""

# apps/payouts/tasks.py
@shared_task
def process_rotation_payout(payout_id: str, treasurer_user_id: str):
    """Execute payout for the next member in rotation."""

# apps/contributions/tasks.py
@shared_task
def schedule_contribution_cycle():
    """Cron: run daily at midnight UTC, create Contribution records for all groups due today."""

# apps/notifications/tasks.py
@shared_task
def send_sms_notification(phone: str, message: str, country: str):
    """Send SMS via Africa's Talking API."""

@shared_task
def send_contribution_reminders():
    """Cron: run 24 hours before each scheduled contribution date."""
```

Celery beat schedule (cron jobs):
```python
CELERY_BEAT_SCHEDULE = {
    'schedule-daily-contributions': {
        'task': 'apps.contributions.tasks.schedule_contribution_cycle',
        'schedule': crontab(hour=0, minute=5),  # 00:05 UTC daily
    },
    'retry-failed-contributions': {
        'task': 'apps.contributions.tasks.retry_failed_contributions',
        'schedule': crontab(minute=0),  # every hour
    },
    'check-overdue-repayments': {
        'task': 'apps.loans.tasks.check_overdue_repayments',
        'schedule': crontab(hour=6, minute=0),  # 06:00 UTC daily
    },
    'send-contribution-reminders': {
        'task': 'apps.notifications.tasks.send_contribution_reminders',
        'schedule': crontab(hour=8, minute=0),  # 08:00 UTC daily
    },
}
```

---

## SECTION 9 — FRONTEND DESIGN SYSTEM

### 9.1 Design Philosophy

The reference image provided (a clean financial dashboard with dark green accents, card-based layout, sidebar navigation, cash flow charts) defines the visual direction. OrbiSave's design system adapts this direction for a platform that must be trusted with real money by users who may have varying levels of digital literacy. Every design decision serves clarity, trust, and actionability.

**Core principles:**
- Surfaces are clean white cards with generous padding and subtle shadows — never dark mode by default (financial data must be maximally readable)
- Primary colour is deep forest green — instills trust, references agriculture, distinguishes from generic blue fintech
- Numbers are always in a larger, heavier type than labels
- Status is always communicated with colour AND text — never colour alone (accessibility)
- Destructive actions (suspend member, reject loan) are always two-step with an explicit confirmation

### 9.2 Design Tokens (`apps/web/tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F0FAF4',
          100: '#D8F3DC',
          200: '#B7E4C7',
          300: '#74C69D',
          400: '#52B788',
          500: '#40916C',
          600: '#2D6A4F',
          700: '#1B4332',
          800: '#143227',
          900: '#081C15',
        },
        amber: { DEFAULT: '#E9C46A', dark: '#C49A21' },
        coral: { DEFAULT: '#E76F51', dark: '#C94A2B' },
        surface: {
          page: '#F7F8FA',
          card: '#FFFFFF',
          pale: '#F0FAF4',
        },
        status: {
          success: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
          pending: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
          failed:  { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
          info:    { bg: '#E0F2FE', text: '#075985', border: '#7DD3FC' },
        },
      },
      fontFamily: {
        sans:  ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        mono:  ['var(--font-jetbrains)', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card:       '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-md':  '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.05)',
        'card-lg':  '0 8px 24px rgba(0,0,0,0.10), 0 16px 48px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        card: '16px',
        btn:  '10px',
        tag:  '6px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
} satisfies Config;
```

### 9.3 Next.js Font Setup (`apps/web/app/layout.tsx`)

```typescript
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});
```

### 9.4 shadcn/ui Setup

Initialise shadcn/ui and install these components (they live in `components/ui/` and are owned by the codebase):

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge input select textarea dialog
npx shadcn-ui@latest add table tabs dropdown-menu popover command
npx shadcn-ui@latest add avatar progress separator skeleton toast
npx shadcn-ui@latest add alert alert-dialog sheet scroll-area
```

Customise the shadcn theme to use OrbiSave brand colors. The `components/ui/` files are source-owned — modify them freely.

---

## SECTION 10 — APPLICATION LAYOUT AND NAVIGATION

### 10.1 App Shell Layout (`app/(auth)/layout.tsx`)

This server component wraps all authenticated pages:
```tsx
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (!session.user.kycVerified && !isOnboardingPath(request)) redirect('/onboarding/profile');

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden">
      <Sidebar userRole={session.user.role} country={session.user.country} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 10.2 Sidebar Navigation Specification

The sidebar is 240px wide when expanded, 72px when collapsed (icon-only mode). Collapse state persisted in localStorage.

**Navigation structure by role:**

```
GENERAL                              [All authenticated roles]
  Dashboard           /dashboard
  My Group            /group
  Contributions       /contributions
  Loans               /loans
  Ledger              /ledger
  Meetings            /meetings

MANAGEMENT                           [chairperson, treasurer]
  Members             /chair/members           [chairperson only]
  Loan Approvals      /chair/loan-approvals    [chairperson]
                      /treasurer/loan-approvals [treasurer]
  Invite Members      /chair/invite            [chairperson only]
  Contribution Tracker /treasurer/contributions [treasurer only]
  Payout Schedule     /treasurer/payouts       [treasurer only]
  Reconciliation      /treasurer/reconciliation [treasurer only]
  Reports             /chair/reports           [chairperson only]

ADMIN                                [platform_admin, super_admin]
  Overview            /admin
  All Groups          /admin/groups
  Loan Verification   /admin/loans
  Users               /admin/users
  Trust Account       /admin/trust-account
  Audit Logs          /admin/audit
  Countries           /admin/country/[code]    [super_admin only]

──────────────────────────────────────
  Settings            /settings
  Help                /help
──────────────────────────────────────
[User card: avatar, name, email, chevron]
```

**Active state:** 3px brand-700 left border, brand-50 background, brand-700 text, 600 weight.
**Hover state:** brand-50 background, smooth 150ms transition.
**Section labels:** 11px, uppercase, letter-spacing: 0.08em, text-gray-400, not interactive.

### 10.3 Header Specification

Left: hamburger (mobile) + global search bar (340px, `⌘K` shortcut opens command palette for fast navigation)
Right: date range selector → notification bell (badge count) → user avatar (dropdown: Profile, Settings, Switch Role if applicable, Sign Out)

Command palette (`⌘K`): uses `cmdk` library. Searches groups, members, transactions, and pages. Opens as a centered modal overlay.

---

## SECTION 11 — PUBLIC PAGES

### 11.1 Landing Page (`/`)

**This is a Next.js Server Component. It must be statically generated (`export const dynamic = 'force-static'`).**

Sections (in order):
1. **Navigation** — sticky, blur backdrop, OrbiSave logo (SVG wordmark with green leaf icon), nav links, Sign In + Get Started buttons
2. **Hero** — forest green (#1B4332) full-width section, min-height 100vh. DM Serif Display headline (48–60px), subheading paragraph, two CTA buttons. Background: subtle topographic line pattern at 6% opacity (SVG pattern). Three trust indicators below buttons.
3. **How It Works** — 3-step horizontal flow. White background. Numbered step indicators, icon in brand-100 circle, heading + paragraph per step.
4. **For Farmers** — brand-50 background. Left text column, right mock dashboard card preview (styled like the reference image but with OrbiSave branding). This card is a static illustration, not a live component.
5. **Country Coverage** — three animated cards for Kenya, Rwanda, Ghana. Each: flag, country name, currency, mobile money providers, partner bank (placeholder "Partner Bank TBD"), status badge.
6. **Security and Trust** — dark (#1B4332) section. 4 security pillars with shield/lock icons. "Your money never leaves a regulated bank" as the anchor statement.
7. **Testimonial placeholders** — "Coming soon from our pilot groups" — design the layout but use placeholder content.
8. **Footer** — dark green, logo + tagline, 4 link columns, social icons, legal links, "Built for Africa" tagline.

### 11.2 Login Page (`/login`)

Next.js Server Action handles form submission. No client-side fetch.

Layout: split screen. Left (brand-700 green): logo, tagline, decorative illustration. Right (white): form.

Fields: Email, Password (show/hide), Remember me, Forgot password link.
Submit: Server Action calls `signIn()` from Better Auth (Next.js session manager via RS256 JWT from Django), handles redirect.
Error: displayed inline below the form, not as a toast.

### 11.3 Register Page (`/register`)

Server Action posts to `/api/v1/auth/register/`. On success, creates Better Auth (Next.js session manager via RS256 JWT from Django) session and redirects to `/onboarding/profile`.

Fields: Full name, Email, Phone (country code selector), Password, Confirm password, Terms agreement.

### 11.4 Invite Accept Page (`/invite/[code]`)

This is a server component. On render, it fetches `GET /api/v1/invites/{code}/` server-side.
- If invalid/expired: renders error state
- If valid: renders group info card, chairperson name, group stats, two action buttons (New account | Existing account)

---

## SECTION 12 — ONBOARDING FLOW

All onboarding steps share a layout: `app/(auth)/onboarding/layout.tsx`.

Left panel (brand-700, 35% width): OrbiSave logo, step progress indicator (5 vertical steps with connecting line, current step in brand-400, completed in brand-400 with check, upcoming in gray-300), contextual encouragement text relevant to current step.

Right panel (white, 65% width): form content, Next button (sticky bottom-right).

Progress is stored in a server-side session (Better Auth (Next.js session manager via RS256 JWT from Django) session data). If user closes browser and returns, they resume at the correct step.

### Step 1 — Profile (`/onboarding/profile`)
Fields: Full name (pre-filled from registration), Date of birth (date picker, must be 18+), Gender (optional), National ID number, Home county/district, Profile photo (circular upload with cropper).

### Step 2 — KYC (`/onboarding/kyc`)
- Document type radio: National ID | Passport | Driver's Licence
- Front image: drag-and-drop upload zone, file type validation (JPEG/PNG/PDF, max 5MB), preview thumbnail
- Back image: shown conditionally (hidden for Passport)
- On submit: POST to `/api/v1/kyc/documents/`, start polling `/api/v1/kyc/status/` every 10 seconds via TanStack Query's `refetchInterval`
- Interim state: "Verification in progress — usually takes 2–5 minutes" with a progress animation
- On verified: auto-advance to Step 3
- On rejected: show rejection reason from provider, allow re-upload

### Step 3 — Phone Verification (`/onboarding/verify-phone`)
- Phone number displayed (read-only) with small "Change" link
- 6-box OTP input (individual character inputs, auto-focus next on input)
- "Send Code" button → POST to `/api/v1/auth/verify-phone/`
- Countdown timer: "Resend in 45s", then active "Resend" link
- Submit: POST to `/api/v1/auth/verify-phone/confirm/`

### Step 4 — Country and Mobile Money (`/onboarding/country`)
- Country selector: three large clickable cards (Kenya, Rwanda, Ghana), each showing flag emoji, country name, currency code, mobile money providers listed. Selected card has brand-700 border.
- Mobile money provider: rendered based on selected country as radio button cards
- Mobile money number: text input, auto-populated from registration phone if matching country code
- "Verify" button: sends a test transaction instruction (mocked/simulated in v1)

### Step 5 — Complete (`/onboarding/complete`)
- Animated success state: large check circle animates in (CSS keyframe, scale + opacity)
- "Welcome to OrbiSave, [First Name]." — DM Serif Display, 36px
- Subtext: "Your account is verified and ready."
- Two paths:
  - "Create a Group" — primary button, routes to `/chair/group-setup` (role promoted to chairperson pending first group creation)
  - "Join a Group" — secondary button, shows inline input for invite code with "Join" button
- Below: "Your chairperson will send you a link when your group is ready."

---

## SECTION 13 — MEMBER DASHBOARD

`app/(auth)/dashboard/page.tsx` — Server Component. Fetches initial data server-side using `fetch()` with the user's token from the Better Auth (Next.js session manager via RS256 JWT from Django) session. Client components handle interactivity.

### 13.1 Group Wallet Hero Card
Full-width card. Background: `linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #40916C 100%)`. Text: white.

```
Left column:
  [Label: "Group Wallet — Kisumu Farmers Circle" | 12px, brand-300, uppercase, letter-spacing]
  [Balance: "KSh 284,500.00" | 42px, DM Serif Display, white]
  [Change: "+12.4% vs last cycle" | 14px, brand-300, with up arrow icon]

Right column (action buttons):
  [+ Contribute] [Request Loan] [View Payout]
  — white background, brand-700 text, btn border-radius, 14px, 600 weight

Bottom strip (within same card, slightly darker bg):
  [Rotation Pool: KSh 184,500] [Loan Pool: KSh 100,000] [My Position: #4 of 12]
  — three inline stat pills, brand-100 text, 12px
```

### 13.2 Cash Flow Section
Two columns: main chart (65%) + income/expense summary (35%).

Chart card: "Contribution History" title, "Weekly / Monthly" toggle (segmented control, no page reload — client component). Recharts `ComposedChart` with `ResponsiveContainer`. Positive bars `#52B788` (contributions), negative bars `#E76F51` (expense events). Zero baseline. Custom tooltip showing formatted currency.

Summary cards (stacked right):
- Income card: down-left arrow icon in brand-100 bg, "Total Contributed", amount in 24px DM Serif, percentage change
- Expense card: up-right arrow icon in coral-100 bg, "Service Fees & Deductions", amount

### 13.3 Three Summary Cards
Side by side. Equal width. White cards with shadow-card.

**My Contributions card:**
Amount paid this cycle / required amount. Progress bar (brand-400 fill, gray-100 track, border-radius pill). "On track" badge (success) or "Missed" badge (failed). Next due date. "Make Contribution" button if payment due.

**Next Payout card:**
Date large (DM Serif, 22px). Estimated amount. Rotation position visual: numbered circles (1 through member count), current position highlighted in brand-400. "In N days" countdown. If this member's turn: "Your Payout" badge in amber.

**Loan Eligibility card:**
"Eligible for up to KSh 30,000" in brand-700 or "Not eligible" in coral with reason. Eligibility factors shown as small checklist: Contribution history (check/cross), No outstanding loans (check/cross), Pool balance sufficient (check/cross). "Request Loan" button.

### 13.4 Recent Activity Table
TanStack Table. Columns: Type (icon + label), Member Name, Amount (+ or - prefix, color coded), Status (pill), Method, Date.

Type icons (Lucide): ArrowDownLeft (contribution), ArrowUpRight (payout), Wallet (loan), RotateCcw (repayment), Percent (fee).

Filtering: Type filter dropdown, Date range picker. Sorting on all columns.

Pagination: 10 rows per page. Page controls with page number, previous/next. "X of Y entries" count.

### 13.5 Group Members Panel (right sidebar column, 1/3 width on large screens)
Card: "My Group" heading, group name in 18px DM Serif.
Member avatar stack: up to 8 overlapping circular avatars (36px, 1px white border for overlap separation), "+N more" text.
Key info list: Chairperson, Treasurer, Next Payout Member, Next Meeting.
"View Full Group" link.

---

## SECTION 14 — CHAIRPERSON DASHBOARD

All member dashboard components are included PLUS:

### 14.1 Chairperson Hero Card Additions
Four action buttons: `+ Invite Member`, `Schedule Meeting`, `View Reports`, `Group Settings`.
Bottom stats: Total Members (N/max), Active Loans, Contribution Compliance (%), Next Payout Date.

### 14.2 Contribution Compliance Chart
Horizontal bar chart (Recharts). One row per member. Bar fill: brand-400 (100% paid), amber (partial), coral (0%). Sorted by compliance descending. Right side labels: member name + amount paid / required. Summary line below chart.

### 14.3 Loan Approvals Panel
Card: "Pending Loan Requests" with count badge (amber, number).

Each pending loan (status: `pending_chair`):
- Member avatar + name + phone
- Requested amount in 18px DM Serif
- Purpose category badge
- Date requested
- Two buttons: "Approve" (brand-400 bg, white text) | "Reject" (white bg, coral border, coral text)
- Clicking Approve → Confirmation Dialog:
  - Shows loan summary table: Amount, Interest Rate, Term, Estimated Total Repayment
  - Transaction PIN input (6 digits, masked)
  - "Confirm Approval" button → POST `/api/v1/loans/{id}/chair-approve/` with transaction PIN

### 14.4 Invite Members Modal and Page (`/chair/invite`)

**Invite Page layout:**
Full-width hero card (brand-700):
- "Invite Members to [Group Name]"
- Current invite link in a styled code-block input, large, monospace font
- "Copy Link" button (copies to clipboard, shows copied state for 2s)
- "Download QR Code" button (generates PNG via `qrcode.react`, triggers download)
- Link expiry: "Expires in 6 days" | "Regenerate" button (with warning modal: "Old link will stop working")

Tabs below: "Send via SMS" | "Send via Email" | "Pending Invites"

**SMS Tab:**
Textarea: paste comma-separated or line-separated phone numbers.
Validation: each number validated against country format.
"Send N Invites" button → POST `/api/v1/groups/{id}/invites/` for each.
Status table updates after send: shows per-number delivery status.

**Email Tab:**
Email input(s) with add/remove, optional personal message, "Send Invite Emails" button.

**Pending Invites Tab:**
TanStack Table: Contact, Type, Sent At, Status (Pending/Accepted/Expired), Actions (Resend, Cancel).

### 14.5 Group Setup Flow (`/chair/group-setup`)

A multi-step wizard using client-side step state (Zustand) with a server action to submit on final step. Steps persist state in-memory (if user navigates away and returns they restart). Show a step indicator at the top.

**Step 1 — Group Identity:** Name, Description, Country (locked to user's country), Max members (slider 5–50).

**Step 2 — Contribution Rules:** Contribution amount (number input with currency symbol), Frequency (segmented control: Weekly/Biweekly/Monthly/Harvest), Contribution day (day picker conditional on frequency), Rotation method (radio cards with explanations).

**Step 3 — Pool Allocation:** Slider: "X% Rotation Savings — Y% Loan Pool" (X + Y = 100, enforced). Max loan multiplier (number input). Loan term weeks. Monthly interest rate.

**Step 4 — Assign Treasurer:** Search users by phone or email (GET `/api/v1/groups/{id}/members/`). Or "Skip — assign later". Note: if skipped, loan approvals require only chair until treasurer is assigned.

**Step 5 — Review:** Full summary of all settings. "Create Group" button → POST `/api/v1/groups/`. On success: redirect to `/chair/invite` with the new group's invite link displayed prominently.

---

## SECTION 15 — TREASURER DASHBOARD

Treasurer sees everything in the member dashboard plus financial management tools.

### 15.1 Treasurer Hero Card
Buttons: "Record Contribution", "Process Payout", "Review Loan", "Reconcile".
Stats: Rotation Pool, Loan Pool, Total Outstanding Loans, Service Fees Collected.

### 15.2 Contribution Tracker (`/treasurer/contributions`)

Full-width table. One row per member per contribution cycle.

Columns: Member (avatar + name) | Required Amount | Paid Amount | Mobile Money Method | Provider Ref | Date Paid | Status | Actions

Actions column:
- If `pending` or `failed`: "Mark as Paid" → opens modal: date paid, mobile money reference, confirmation button
- If any status: "Send Reminder" → POST reminder SMS to member (mocked in v1, real Africa's Talking in v2)

Summary footer row: Total Required | Total Collected | Shortfall.

Export button: generates CSV of current cycle's contributions (client-side or server-side PDF via `@react-pdf/renderer`).

### 15.3 Payout Schedule (`/treasurer/payouts`)

Visual timeline of rotation payouts. Each payout: position number, member avatar + name, date, amount (after service fee deduction), status (Upcoming/Processed/Skipped).

**Current rotation highlighted** with brand-400 border and "Next" badge.

"Process Payout" button on current row:
→ Confirmation modal:
- Recipient: [Name] — [Mobile Money Number]
- Gross amount: KSh 60,000
- Service fee (0.03 per shilling): KSh 1,800
- Net payout: **KSh 58,200** (large, DM Serif)
- Payment method: [provider icon] M-Pesa
- Transaction PIN input
- "Confirm & Send" → POST `/api/v1/groups/{id}/payouts/process/`
- Loading state: "Sending to [Name]'s M-Pesa..."
- Success: green tick animation, update table, toast notification

### 15.4 Loan Approvals (Treasurer Gate) (`/treasurer/loan-approvals`)

Same structure as chairperson loan approvals but these are loans with status `pending_treasurer` (chairperson has already approved).

Shows chairperson approval timestamp and any chair notes. Treasurer adds their own notes before approving.

On approval: POST `/api/v1/loans/{id}/treasurer-approve/` → loan moves to `pending_admin`.

### 15.5 Ledger View (`/treasurer/ledger`)

Full double-entry ledger view with advanced filtering.

Filter panel (collapsible, left sidebar or top): Date range, Entry type (multi-select), Member (searchable select), Direction (Credit/Debit/Both), Amount range.

Table: Date | Type (icon + label) | Description | Member | Debit | Credit | Running Balance

Debit amounts: coral text. Credit amounts: brand-600 text. Running balance: 600 weight.

Each row expandable to show: full reference number, related contribution/loan/payout ID, recorded by, hash snippet.

Export: PDF ledger report styled as a formal financial document (letterhead, group info, date range, paginated entries, opening/closing balance).

### 15.6 Reconciliation (`/treasurer/reconciliation`)

**Purpose:** Compare the platform's digital ledger with the bank trust account statement.

Upload section: CSV upload zone for bank statement export.
Auto-matching: Celery task attempts to match bank statement entries to ledger entries by amount, date, and reference.
Results table: Matched (green), Unmatched platform entry (amber), Unmatched bank entry (coral).
Actions: Confirm match, Create adjustment entry (with note), Flag for admin review.

---

## SECTION 16 — PLATFORM ADMIN DASHBOARD

This is a completely separate visual experience from the member/chairperson/treasurer dashboards. The admin is a platform operator, not a group member.

### 16.1 Admin Layout
Same sidebar/header shell but admin navigation only. No group-specific items. Country badge in header showing which country the admin is scoped to.

### 16.2 Admin Dashboard (`/admin`)

**Country Overview Hero:**
Dark green hero. "[Country Flag] Admin Dashboard — Kenya" (or Rwanda/Ghana). Key stats:
- Total Active Groups: [N] (+N this month)
- Total Registered Members: [N]
- Transaction Volume This Month: KSh [N]
- Loan Default Rate: [%]
- Compliance Rate: [%]

**Three KPI Cards:**
1. Groups Health Donut (Active/Paused/Closed) — Recharts PieChart
2. Monthly Transaction Volume vs Previous Month — Recharts BarChart
3. Loan Performance — Recharts HorizontalBarChart (disbursed/repaid/defaulted)

**Alerts Panel:**
Any flagged items: loans awaiting admin approval (count), failed contributions above threshold, members with 3+ missed contributions, groups flagged by auditor. Each alert is a clickable row.

### 16.3 Groups List (`/admin/groups`)

Advanced TanStack Table with server-side pagination, sorting, and filtering (all filter params sent as query params to the API).

Columns: Group Name | Country | Members (N/max) | Chairperson | Total Balance | Compliance % | Active Loans | Status | Last Activity | Actions

Column filters: Status multiselect, Compliance % range, Country.

Actions: "View Detail" | "Pause" (with reason modal) | "Flag for Review".

### 16.4 Group Detail (`/admin/groups/[groupId]`)

Tabbed page:
- **Overview:** Group info card + financial summary (pool balances, cycle stats)
- **Members:** Full member table with KYC status, contribution history per member, loan history
- **Ledger:** Full read-only ledger (same as treasurer view but labelled "Read Only")
- **Loans:** All loans for this group — all statuses. Filterable.
- **Audit:** All audit log entries for this group. Non-interactive.
- **Settings:** Admin can pause/close the group, change contribution rules (with audit log entry)

### 16.5 Loan Verification (`/admin/loans`)

This is the **final and most critical approval gate**. Only loans at `pending_admin` status appear here.

Table: Group | Borrower | Amount | Purpose | Chair Approved | Treasurer Approved | Days Waiting | Actions

"Review" button → opens a full-screen slide-over panel (not a small modal — this decision requires full context):

**Left column — Borrower Profile:**
- Photo, name, phone, country
- KYC verification status
- Member since [date], Rotation position
- Contribution record: table of last 12 contributions with status
- Outstanding loans: any current loans
- Loan history: previous loans and repayment performance

**Right column — Loan Details:**
- Requested amount, purpose, purpose detail
- Group loan pool current balance
- Loan pool available after this loan
- Interest rate, term, projected repayment schedule table
- Chairperson approval: [Name] on [Date] — "[Note]"
- Treasurer approval: [Name] on [Date] — "[Note]"
- Fraud check result: automatic system checks summary (all green or flagged items)
- Admin notes textarea
- Transaction PIN input
- Two buttons: "Approve & Disburse" (full-width, brand-700) | "Reject" (coral outline)

On "Approve & Disburse":
→ POST `/api/v1/loans/{id}/admin-approve/` with PIN and admin notes
→ Backend: validates PIN, writes approval to loan, triggers `disburse_approved_loan` Celery task
→ Celery: calls payment provider disbursement API, writes ledger entry, sends notification to borrower
→ Frontend: shows disbursement in progress state, then success with provider reference

### 16.6 Trust Account Monitor (`/admin/trust-account`)

Card: "Trust Account — [Bank Name] — [Country]"
- Current balance (large, DM Serif)
- Available for disbursement
- Held pending reconciliation
- Last reconciliation: date, status, matched/unmatched count
- "Run Reconciliation" button

Transaction ledger comparing trust account movements with platform ledger.

### 16.7 Audit Logs (`/admin/audit`)

Non-interactive, read-only append-only log.

Table (server-side paginated): Timestamp | Action | Actor (name + role) | Target | Country | IP Address | Session ID | Details link

"Details" opens a modal showing the full `metadata` JSON for that audit entry.

Filter by: action type (multi-select), actor, date range, country (super admin only).

Export: CSV of full audit log for regulatory reporting.

### 16.8 User Management (`/admin/users`)

Table: Name | Email | Phone | Role | KYC Status | Group | Country | Joined | Status | Actions

Actions: View Profile | Suspend (with reason) | Reinstate | Reset Password (sends email) | Promote Role

KYC status pill: Verified (success), Submitted (info), Pending (pending), Rejected (failed).

---

## SECTION 17 — SUPER ADMIN

Super admin has all platform admin capabilities across all countries.

### 17.1 Global Overview (`/admin` when role is `super_admin`)

Hero: "Super Admin — OrbiSave Global Platform"
Global stats: Total Countries (3), Total Groups, Total Members, Total Volume This Month (USD equivalent), System Health Status.

**System Health Panel:**
Service status indicators: API (green/red), Payment Gateway Kenya (green/red), Payment Gateway Rwanda/Ghana, Database, Redis, Celery Workers. Each shows last checked timestamp.

### 17.2 Country Cards
Three equal-width cards: Kenya, Rwanda, Ghana.
Each: flag, country name, key stats (groups, members, volume, compliance %, active loans), "View Country" button.

### 17.3 Country View (`/admin/country/[countryCode]`)
Renders the same platform admin dashboard scoped to the selected country. Super admin has full read and action permissions in any country.

---

## SECTION 18 — REAL-TIME FEATURES

### 18.1 WebSocket Connection
On authenticated page load, the Next.js client establishes a WebSocket connection to Django Channels:

```
wss://api.orbisave.com/ws/notifications/
```

Connection authenticated via `?token=<access_token>` query param (token validated server-side on connection).

### 18.2 Event Types (Server → Client)
```typescript
type WebSocketEvent =
  | { type: 'CONTRIBUTION_CONFIRMED';  payload: { contributionId: string; amount: number; memberName: string } }
  | { type: 'CONTRIBUTION_FAILED';     payload: { contributionId: string; reason: string } }
  | { type: 'LOAN_STATUS_CHANGED';     payload: { loanId: string; newStatus: LoanStatus } }
  | { type: 'PAYOUT_PROCESSED';        payload: { payoutId: string; amount: number } }
  | { type: 'LOAN_APPROVAL_REQUIRED';  payload: { loanId: string; borrowerName: string; amount: number } }
  | { type: 'NEW_MEMBER_JOINED';       payload: { memberName: string; groupId: string } }
  | { type: 'MEETING_STARTING';        payload: { meetingId: string; title: string } }
  | { type: 'ADMIN_ALERT';             payload: { alertType: string; message: string; groupId?: string } }
```

### 18.3 Client WebSocket Handler
Custom React hook `useWebSocket()` in `lib/hooks/useWebSocket.ts`:
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Rehydrates TanStack Query cache on relevant events (e.g. contribution confirmed → invalidate group wallet query)
- Shows Sonner toast for user-relevant events
- Exposes connection status for offline indicator in header

### 18.4 Digital Group Meetings (LiveKit)
Meeting page: `app/(auth)/meetings/[meetingId]/page.tsx`
- Server action: POST `/api/v1/meetings/{id}/join/` → backend generates LiveKit access token
- Client uses `@livekit/components-react` `<LiveKitRoom>` component
- Custom UI: participant grid, audio-only mode toggle for low bandwidth, screen share button, meeting chat (LiveKit data channel), attendance auto-recorded on join
- Leave meeting button: POST `/api/v1/meetings/{meetingId}/attendance/` to record departure time

---

## SECTION 19 — OFFLINE SUPPORT

Use Workbox (via `next-pwa`) for service worker registration.

**Offline capabilities:**
- Meeting attendance recording queued offline, synced on reconnect
- Governance votes queued offline, synced on reconnect
- Loan approval decisions queued offline, synced on reconnect

**Cache strategy:**
- Network-first for all API calls (serve stale if offline)
- Cache-first for static assets and fonts
- The offline queue is stored in IndexedDB via `idb` library

**Offline indicator:** A banner below the header: "You are offline. Financial transactions are unavailable. Governance actions will sync when you reconnect."

**Sync on reconnect:**
```typescript
// lib/hooks/useOfflineSync.ts
// On navigator.onLine event: iterate IndexedDB queue, replay in order, clear processed items
```

---

## SECTION 20 — TESTING STRATEGY

### 20.1 Backend Testing

```python
# Use pytest-django throughout
# Every API endpoint must have:
#   - Authentication tests (unauthenticated → 401, wrong role → 403, correct role → 2xx)
#   - Validation tests (invalid payload → 400 with correct error keys)
#   - Business logic tests (happy path + all edge cases)
#   - Ledger integrity tests (verify ledger entries created correctly after each financial event)
#   - Payment callback tests (using `responses` library to mock provider callbacks)

# Example loan approval test:
def test_loan_chair_approval_flow(client, member_user, chair_user, treasurer_user, admin_user, group, loan):
    # 1. Unauthenticated → 401
    # 2. Member tries to approve → 403
    # 3. Treasurer tries to approve at chair stage → 403
    # 4. Chair approves → 200, loan status = pending_treasurer
    # 5. Chair tries to approve again → 400 (already approved)
    # 6. Treasurer approves → 200, loan status = pending_admin
    # 7. Admin approves → 200, Celery task created, loan status = disbursed
    # 8. Verify ledger entry created with correct amount, direction, hash
```

### 20.2 Frontend Testing

```typescript
// Vitest + React Testing Library for components
// Test: renders correctly, user interactions, loading/error/empty states

// Playwright E2E for critical paths:
// - Full registration and onboarding flow
// - Login as each of 5 role types and verify correct dashboard renders
// - Contribution flow: initiate → webhook simulation → confirm → ledger update
// - Loan request → chair approval → treasurer approval → admin approval → disbursement
// - Invite link generation → new user accepts → joins group
// - Payout processing with fee deduction
// - Admin audit log shows all events
```

---

## SECTION 21 — ENVIRONMENT VARIABLES

### Backend (Django)
```env
# Core
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=api.orbisave.com
DATABASE_URL=postgresql://user:pass@host:5432/orbisave
REDIS_URL=redis://host:6379/0

# Auth
JWT_PRIVATE_KEY_PATH=
JWT_PUBLIC_KEY_PATH=
SIMPLE_JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
SIMPLE_JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=orbisave-documents
AWS_S3_REGION_NAME=eu-west-1

# Email
SENDGRID_API_KEY=
DEFAULT_FROM_EMAIL=noreply@orbisave.com

# SMS
AFRICASTALKING_USERNAME=
AFRICASTALKING_API_KEY=

# KYC
SMILE_IDENTITY_PARTNER_ID=
SMILE_IDENTITY_API_KEY=

# M-Pesa
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_B2C_INITIATOR_NAME=
MPESA_B2C_SECURITY_CREDENTIAL=
MPESA_CALLBACK_URL=https://api.orbisave.com/v1/contributions/webhook/mpesa/
MPESA_ENVIRONMENT=production  # or sandbox

# MTN MoMo
MTN_SUBSCRIPTION_KEY_COLLECTIONS=
MTN_SUBSCRIPTION_KEY_DISBURSEMENTS=
MTN_API_USER_ID=
MTN_API_KEY=
MTN_ENVIRONMENT=production

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=wss://livekit.orbisave.com

# Sentry
SENTRY_DSN=
```

### Frontend (Next.js)
```env
Better Auth (Next.js session manager via RS256 JWT from Django)_URL=https://app.orbisave.com
Better Auth (Next.js session manager via RS256 JWT from Django)_SECRET=
NEXT_PUBLIC_API_URL=https://api.orbisave.com/v1
NEXT_PUBLIC_WS_URL=wss://api.orbisave.com/ws
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.orbisave.com
NEXT_PUBLIC_SENTRY_DSN=
```

---

## SECTION 22 — DOCKER COMPOSE (Development)

```yaml
# infrastructure/docker/docker-compose.yml
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

  redis:
    image: redis:7-alpine
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
    environment:
      - DATABASE_URL=postgresql://orbisave:dev_password@db:5432/orbisave
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=True
    depends_on:
      - db
      - redis
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"

  celery:
    build:
      context: ../../backend
      dockerfile: ../infrastructure/docker/Dockerfiles/backend.Dockerfile
    volumes:
      - ../../backend:/app
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
    environment:
      - DATABASE_URL=postgresql://orbisave:dev_password@db:5432/orbisave
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    command: celery -A celery_app beat -l info

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
      - Better Auth (Next.js session manager via RS256 JWT from Django)_URL=http://localhost:3000
      - NEXT_PUBLIC_API_URL=http://localhost:8000/v1
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

---

## SECTION 23 — CI/CD PIPELINE

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-lint-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: --health-cmd pg_isready
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements/development.txt
      - run: cd backend && bandit -r . -c bandit.yml
      - run: cd backend && safety check
      - run: cd backend && python -m pytest --cov=. --cov-report=xml

  frontend-lint-test:
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
    needs: [backend-lint-test, frontend-lint-test]
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose -f infrastructure/docker/docker-compose.yml up -d
      - run: npm run test:e2e
      - run: docker-compose down
```

---

## SECTION 24 — BUILD SEQUENCE FOR THE MODEL

Build the system in this exact order. Confirm completion at each phase gate before continuing.

**Phase 0 — Repository and Tooling Setup**
- Initialise Turborepo monorepo
- Configure TypeScript strict mode across all packages
- Set up ESLint, Prettier, Husky, lint-staged
- Create Docker Compose environment and verify all services start

**Phase 1 — Backend Foundation**
- Django project scaffold with all settings files (base, development, production, test)
- Custom User model with all fields defined in Section 4
- All remaining models (Group, GroupMember, GroupInvite, Contribution, Loan, LoanRepayment, LedgerEntry (with previous_state/new_state JSON, PostgreSQL trigger-level immutability, Daily Merkle root checkpointing, and off-chain signed daily S3 exports), AuditLog, etc.)
- Database migrations
- Custom BaseModel, permissions, pagination, exception handlers
- pytest configuration and first passing test

**Phase 2 — Backend Auth and API**
- JWT authentication setup (djangorestframework-simplejwt, RS256 keys)
- Registration, login, token refresh, blacklist endpoints
- Phone OTP verification (mock SMS in dev)
- KYC document upload and webhook handler (mock Smile Identity response in dev)
- `/api/v1/auth/me/` profile endpoint
- OpenAPI schema generation with drf-spectacular

**Phase 3 — Backend Groups, Members, Invites**
- Group CRUD endpoints
- GroupMember management endpoints
- Invite generation, dispatch (mocked SMS/email), and acceptance
- Role-based permissions enforced on all endpoints

**Phase 4 — Backend Financial Engine**
- Contribution scheduling and STK Push initiation (mock payment provider in dev)
- Payment callback webhook handlers
- Ledger entry creation with hash chain
- Audit log entry on every state change
- Loan eligibility check, creation, and three-stage approval workflow
- Payout processing and service fee calculation
- Celery tasks for all async operations
- Celery beat for scheduled jobs

**Phase 5 — Backend Admin and Real-time**
- Platform admin and super admin endpoints
- Django Channels WebSocket consumer
- Africa's Talking SMS integration (mocked in dev)
- LiveKit meeting token generation
- OpenAPI schema finalised — generate TypeScript types for frontend

**Phase 6 — Frontend Foundation**
- Next.js 14 App Router setup with TypeScript strict
- Font setup (DM Sans, DM Serif Display, JetBrains Mono)
- Tailwind config with design tokens from Section 9
- shadcn/ui initialisation and component installation
- Better Auth (Next.js session manager via RS256 JWT from Django) configuration with Django JWT backend
- Axios API client with interceptors
- Zustand stores (auth, UI)
- TanStack Query provider
- Route groups and middleware (auth, KYC, role guards)

**Phase 7 — Frontend Public Pages**
- Landing page (server component, static)
- Login page (Server Action submit)
- Register page
- Invite accept page

**Phase 8 — Onboarding Flow**
- Onboarding layout with progress indicator
- All 5 onboarding steps
- KYC polling integration
- OTP input component
- Country selector cards

**Phase 9 — Member Dashboard and Pages**
- Member dashboard (server component, client chart components)
- Group page, Contributions page, Loans page (request flow), Ledger page, Meetings page
- Settings page (all four tabs)

**Phase 10 — Chairperson Dashboard and Pages**
- Chairperson dashboard (extends member dashboard)
- Group setup wizard
- Member management table
- Loan approvals (chair gate) with transaction PIN confirmation
- Invite members page (link, QR, SMS, email, pending table)
- Reports page

**Phase 11 — Treasurer Dashboard and Pages**
- Treasurer dashboard
- Contribution tracker with manual recording
- Payout schedule with processing modal and fee calculation
- Loan approvals (treasurer gate)
- Full ledger view with export
- Reconciliation tool

**Phase 12 — Admin Dashboard and Pages**
- Admin layout and navigation
- Admin dashboard (country overview KPIs)
- Groups list and group detail (tabbed)
- Loan verification slide-over (full borrower context, disbursement trigger)
- Trust account monitor
- Audit logs (read-only)
- User management

**Phase 13 — Super Admin**
- Global overview with system health panel
- Country cards and switcher
- Country-scoped views

**Phase 14 — Real-time and Offline**
- WebSocket hook with auto-reconnect
- Event handlers per event type
- TanStack Query cache invalidation on events
- Sonner toast notifications
- Workbox offline service worker
- IndexedDB offline queue
- Offline banner component

**Phase 15 — Testing and QA**
- Complete backend test suite
- Frontend component tests
- Playwright E2E for all critical paths listed in Section 20
- CI/CD pipeline running green on all tests

---

## SECTION 25 — FINAL CHECKLIST

Before declaring any phase complete, the model must verify:

**Security:**
- [ ] No hardcoded secrets anywhere in the codebase
- [ ] All financial endpoints require `IsKYCVerified` permission
- [ ] Transaction PIN verified server-side, never client-only
- [ ] Ledger entries cannot be updated or deleted (enforced at model level and DB level)
- [ ] Audit log entries cannot be updated or deleted
- [ ] All API endpoints return correct HTTP status codes (not just 200/500)
- [ ] Rate limiting applied to auth endpoints

**Financial Integrity:**
- [ ] Every contribution confirmation creates a ledger credit entry
- [ ] Every payout creates a ledger debit entry with service fee as a separate debit
- [ ] Every loan disbursement creates a ledger debit from the loan pool
- [ ] Every loan repayment creates a ledger credit back to the loan pool
- [ ] Hash chain is unbroken in the ledger
- [ ] Pool balances computed from ledger, not stored separately (or if cached, invalidated correctly)

**UX:**
- [ ] Loading states on all async operations (skeleton screens, button spinners)
- [ ] Empty states on all tables and lists
- [ ] Error states with retry actions
- [ ] Confirmation dialogs on all destructive actions
- [ ] All currency amounts formatted with correct symbol and locale per country (KSh, RF, GH₵)
- [ ] Mobile layout usable on 375px wide screens

**Accessibility:**
- [ ] All interactive elements reachable via keyboard
- [ ] Status communicated by colour AND text/icon
- [ ] Focus indicators visible
- [ ] Form errors associated with inputs via aria-describedby

---

*End of OrbiSave Master System Build Prompt v2.0*
*This document supersedes all previous versions.*
*Version: 2.0.0 | March 2025 | OrbiSave Platform Team*
*Stack: Next.js 14 + Django 5 + PostgreSQL 16 (Multi-database routing: default for platform, separate logical DBs for Kenya, Rwanda, Ghana) + Redis 7 + Celery 5 + Docker + Kubernetes*
