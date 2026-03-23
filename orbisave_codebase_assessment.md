# OrbiSave Codebase Assessment
> As of March 2026 — Full stack review across backend, frontend, packages, docs, and config.

---

## 1. What Is OrbiSave?

OrbiSave is a **digital financial coordination platform** for community savings groups (chamas/ROSCAs) targeting East and West Africa — starting with Kenya, Rwanda, and Ghana.

The model: members contribute to a common pool, and one member receives the pooled payout per rotation cycle ("merry-go-round"). Loans, penalties, and governance sit on top of this core.

The stack:
- **Backend**: Django REST Framework (Python), Celery + Redis, PostgreSQL
- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind)
- **Packages**: Shared TypeScript types and utilities in a Turborepo monorepo
- **Infrastructure**: Docker Compose, multi-database per country

---

## 2. Phase Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Monorepo scaffolding, Docker, CI hooks, Next.js init | ✅ Done |
| 1 | Core database models (Users, Groups, Ledger, Loans, Payouts) | ✅ Done |
| 2 | RS256 JWT auth, token endpoint, rate limiting, AuditLog | ✅ Done |
| 3 | Groups API, invites, RBAC permissions, Redis caching | ✅ Done |
| 4 | Financial engine: advisory locks, idempotent webhooks, dynamic fees, loan approval, payout engine | ✅ Done |
| 5+ | Frontend UI, real payment providers (M-Pesa/MTN), notifications, meetings, analytics | ❌ Not Started |

---

## 3. What's Actually Good (Genuinely Impressive)

### Architecture & Design
- **Monorepo (Turborepo)** is correctly set up with `apps/`, `packages/`, and root workspace scripts.
- **Modular Django** with 13 focused apps (`accounts`, `groups`, `contributions`, `loans`, `ledger`, `payouts`, `payments`, `audit`, `notifications`, `meetings`, `admin_portal`, `analytics`, `payments`). Each has its own concern.
- **Multi-database routing** ([OrbiSaveRouter](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/config/routers.py#3-57)) — platform data (users, audit) on `default`, financial data per country. This is a serious architectural decision and it's done correctly.
- **[CountryMiddleware](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/middleware.py#11-35)** cleanly sets thread-local context for routing, with a critical note that service methods must explicitly `using(country)` — and they do.

### Financial Engine
- **`pg_advisory_xact_lock`** on contribution initiation — correct, using a hash of `user_id + group_id`. Prevents simultaneous double-contribution clicks at the DB level.
- **`select_for_update()` in the webhook** — correct. If a provider fires 3 simultaneous callbacks, only one processes; the rest see `status != 'pending'` and acknowledge gracefully.
- **`LedgerEntry.save()` raises `PermissionError` on update** — clean immutability enforcement at the ORM level.
- **SHA-256 hash chaining** on [LedgerEntry](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/ledger/models.py#5-48) (each entry hashes the previous one) — proper append-only ledger.
- **[DailyLedgerCheckpoint](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/ledger/models.py#50-74)** with Merkle root — excellent forward-thinking for external auditability.
- **`SystemConfiguration.get_withdrawal_fee_pct()`** — fees are DB-stored and versioned, not hardcoded. Correct.
- **[PayoutService](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/payouts/services.py#14-84)** correctly reads the dynamic fee, calculates `gross → fee → net`, creates the Payout record and LedgerEntry atomically.
- **[AuditLog](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/audit/models.py#4-43) model** is immutable (raises on update/delete), tracks `previous_state`, `new_state`, `ip_address`, `user_agent`, `session_id`. Very thorough.

### Security
- **RS256 asymmetric JWT** — private key signs tokens, public key verifies. Frontend session is fully decoupled from the Django DB. Access tokens are 15 min, refresh is 7 days with rotation + blacklist.
- `SECRET_KEY = os.environ['SECRET_KEY']` — **fails hard** if not set (no default). Correct.
- `DEBUG = False` in base settings. Dev/prod override correctly.
- **RBAC permissions**: [IsGroupMember](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/permissions.py#7-19), [IsGroupChairperson](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/permissions.py#20-29), [IsGroupTreasurer](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/permissions.py#30-39), [IsGroupLeader](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/permissions.py#40-46), [IsPlatformAdmin](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/permissions.py#47-50), [IsSuperAdmin](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/permissions.py#51-54), [IsKYCVerified](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/permissions.py#55-60) — all clean, all log RBAC violations via structlog.
- **Argon2id for transaction PIN** — high-risk financial operations (loan approval) require a separately hashed PIN beyond the session JWT.
- `AllowAny` on the webhook endpoint is intentional and noted — the webhook has no user context, which is correct. The provider reference ties it to existing data.

### Database & Performance
- `Decimal` fields everywhere — no float arithmetic on money. ✅
- `max_digits=14, decimal_places=2` — handles up to 999 billion. Fine for African currencies.
- `select_related` and `annotate(members_count=Count(...))` in GroupViewSet eliminates N+1. ✅
- `WalletCalculations.get_cached_group_wallet()` — Redis-cached aggregation, 24-hour TTL, invalidated by signals. This is the right approach. ✅
- Pagination at the DRF level via `StandardPagination`. ✅
- `shared-types` package keeps enums in sync between Django (Python string choices) and Next.js (TypeScript `as const`). Smart.

---

## 4. Real Bugs & Inconsistencies Found

These are actual problems in the code as it stands:

### 🔴 Critical / Will Cause Runtime Errors

**1. [GroupMember](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/models.py#54-68) FK field name mismatch**
In [groups/models.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/models.py), the FK to User is [user](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/accounts/models.py#6-12), but across multiple views and services it is accessed as [member](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/serializers.py#92-96):
- [contributions/views.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/contributions/views.py) line 53: `member=request.user`
- [payouts/services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/payouts/services.py) line 38: `member=target_member`
- `GroupMember.objects.get(group=group, member=authorizing_member)` in [loans/services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services.py) line 34

The model defines `user = models.ForeignKey(...)`. Querying `.member` will raise `FieldError`. **This is a systemic bug throughout the financial engine.**

**2. [payouts/services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/payouts/services.py) — wrong `Payout.create()` field names**
- [services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services.py) line 40: `amount=` → model has `gross_amount`
- [services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services.py) line 41: `system_fee=` → model has `service_fee`
- [services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services.py) line 39: `member=` → model has `recipient`
- [services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services.py) line 43: `status='pending_async'` → not a valid choice (valid: `upcoming`, `processing`, `completed`, `failed`, `skipped`)

**3. [loans/services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services.py) — wrong [Loan](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/models.py#4-36) field names**
- Line 44: `loan.status = 'approved'` — OK, but `loan.approved_by` and `loan.approved_at` don't exist on the model. The model uses `chair_approved_by`, `chair_approved_at`, `treasurer_approved_by`, etc. per each stage.
- Line 55: `member=loan.member` — the model calls it `borrower`.
- Line 57: `amount=loan.principal_amount` — model calls it `amount` (no `principal_amount` field).
- Line 22: `loan.status != 'pending'` — the actual initial status is `'pending_chair'`, not `'pending'`.

**4. [contributions/views.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/contributions/views.py) line 64 — `transaction.atomic(using=group.country)`**
`group.country` is a raw string like `'kenya'`. This is passed directly as the DB alias. Works in theory, but if country is anything unexpected (e.g., empty string on a bad record), this will silently fall back incorrectly. No guard.

**5. [loans/views.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/views.py) line 43 — audit action doesn't exist**
`log_audit(action='loan_cryptographically_approved', ...)` — this action string is not in `AuditLog.ACTION_TYPES`. Will raise a Django validation error or silently truncate.

### 🟡 Medium — Logic Gaps / Security Concerns

**6. Webhook has no signature verification**
[ContributionWebhookView](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/contributions/views.py#108-167) accepts `AllowAny` with no HMAC or shared secret validation. Any actor can POST to this endpoint with a crafted payload and a valid `provider_reference` to flip a contribution to `paid`. Real payment providers (Safaricom, MTN) send a shared secret header that must be validated.

**7. `PayoutView` — no `Group.objects.get()` exception handling**
Line 23: `group = Group.objects.get(id=group_pk)` — no try/except. Will return an unhandled 500 if the group doesn't exist instead of a clean 404.

**8. `LoanEngine.approve_loan()` uses `check_password()` for PIN verification**
`authorizing_member.check_password(provided_pin)` checks the **login password**, not the transaction PIN (`transaction_pin` / `transaction_pin_hash`). These are two completely different fields. This means the PIN check is actually checking the wrong credential right now.

**9. [GroupMember](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/models.py#54-68) model has no `role` or `left_at` field**
Views reference `membership.role` (line 128, 147) and `membership.left_at` (lines 132, 167) but neither are defined in the [GroupMember](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/models.py#54-68) model. Only `status`, `rotation_position`, `joined_at` are defined.

**10. `running_balance` is hardcoded `Decimal('0.00')`**
In every `LedgerEntry.objects.create()` call across contributions, payouts, and loans, `running_balance=Decimal('0.00')`. This field exists but is never computed. The ledger cannot be reconciled without correct running balances.

### 🟢 Minor / Code Quality

**11. Overly dramatic prose in error messages and comments**
Strings like `"Loan radically approved. Ledger permanently mutated."`, `"System state critically fractured globally."`, `"structurally pending contribution"`, `"extremely injection-hardened"` — these are production API error messages and log strings. They are confusing, unprofessional, and hard to parse in a post-mortem. Replace with clean, factual messages.

**12. Many apps have empty files**
[serializers.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/audit/serializers.py), [tasks.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/audit/tasks.py), [admin.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/admin.py) across `contributions`, `payments`, `loans`, `payouts`, `ledger`, `audit` are all empty (0 bytes or minimal stubs). That's fine for now but means most of the domain isn't serializable/testable via API yet.

**13. Frontend (`apps/web`) is essentially a Next.js skeleton**
The `app/` directory exists but no pages, components, or API routes have been built beyond scaffolding. The UI work has not started.

**14. `contributions/views.py` uses `'paid'` but model status is `'confirmed'`**
Line 146: `contrib.status = 'paid'` — the model's `STATUS` choices are `scheduled`, `initiated`, `pending`, `confirmed`, `failed`. `'paid'` is not valid.

---

## 5. What Is Still Missing (vs. Checklists)

### Financial Engine Checklist — Not Yet Implemented
- [ ] Rotation schedule entity (who gets paid, in what order, per cycle)
- [ ] Cycle tracking (expected vs actual contributions per cycle)
- [ ] Payout eligibility engine (threshold check before triggering)
- [ ] Penalty rules model and auto-application
- [ ] Member exit settlement calculation
- [ ] Deceased member policy
- [ ] Partial/overpayment handling
- [ ] Contribution deadline enforcement (Celery beat tasks)
- [ ] Loan repayment scheduling auto-generation
- [ ] Interest calculation engine
- [ ] `running_balance` computation in the ledger

### System Design Checklist — Not Yet Implemented
- [ ] Real payment providers (M-Pesa, MTN MoMo) — only `MockProvider` exists
- [ ] Webhook HMAC/signature validation
- [ ] Rate limiting on financial endpoints (contrib, payout, loan)
- [ ] Celery tasks (`tasks.py` files are empty everywhere)
- [ ] SMS/Email notifications (app stubbed, not built)
- [ ] Meeting module (stubbed, not built)
- [ ] Admin portal (stubbed, not built)
- [ ] Analytics (stubbed, not built)
- [ ] KYC integration (model exists, no provider connected)
- [ ] Any frontend UI (zero pages built)
- [ ] CI/CD pipeline
- [ ] Production deployment config (no Nginx, no Gunicorn config, no prod CORS)
- [ ] API documentation content (drf-spectacular configured but no schema annotations)
- [ ] Load/stress testing (threading tests mentioned in phase doc but not found in codebase)

---

## 6. Overall Verdict

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Architecture | ⭐⭐⭐⭐⭐ | Genuinely excellent. Multi-DB, modular, clean separation of concerns |
| Financial Safety Design | ⭐⭐⭐⭐ | Advisory locks, idempotency, immutable ledger — right ideas, wrong execution in places |
| Security Design | ⭐⭐⭐⭐ | RS256, PIN, RBAC all solid — webhook has no sig check (critical gap) |
| Code Correctness | ⭐⭐ | Multiple field name mismatches between models and service/view callers. Engine would crash on first real use |
| Completeness | ⭐⭐ | Core financial loop not runnable end-to-end yet (no real providers, empty tasks, no UI) |
| Test Coverage | ⭐ | Tests mentioned in phase docs but no test files found |
| Code Cleanliness | ⭐⭐⭐ | Structurally clean; error message language is chaotic and unprofessional |

**Summary**: The architectural thinking behind OrbiSave is genuinely strong — the multi-DB routing, the ledger hash chain, the advisory locks, and the abstracted payment provider interface are all well-conceived. However, **the financial engine code has multiple field-name mismatches between models and service/view callers** that would cause immediate `FieldError` crashes in any real run. These must be resolved before anything in Phase 4 is considered actually complete. The checklist items are checked off on paper, but the implementation has gaps. The platform is not yet runnable end-to-end.

---

## 7. Recommended Priority Order

1. **Fix the field name bugs** — `GroupMember.user` vs `member`, `Payout` field names, `Loan` field names, `GroupMember` missing `role`/`left_at`. These are blockers.
2. **Fix PIN verification** in `LoanEngine` — currently checks login password, not transaction PIN.
3. **Add webhook HMAC validation** — security critical.
4. **Fix contribution/payout status strings** — `'paid'` → `'confirmed'`, `'pending_async'` → valid choice.
5. **Implement `running_balance` computation** in ledger entries.
6. **Write Celery tasks** (contribution deadline checks, scheduled payouts, notifications).
7. **Build the real M-Pesa and MTN providers** replacing `MockProvider`.
8. **Start frontend** — zero UI exists.
9. **Add missing models** — RotationSchedule, PenaltyRule, ContributionCycle.
10. **Write integration tests** — the test suite is completely absent.
