# OrbiSave Full QA Continuation Report

Date: 2026-06-20  
Workspace: `C:\Users\ADMIN\Desktop\Orbisave App\orbisave`  
Audience: Claude / engineering handoff  
Scope: full-stack QA continuation covering frontend apps, backend APIs, finance engine, ledger integrity, onboarding, dashboards, admin portals, test posture, security posture, and blue/green deployment readiness.

## 1. Executive Verdict

OrbiSave has a strong product direction and several important financial safety foundations are already present: append-only ledger entries, idempotency keys on key payment paths, multi-country database routing, transaction PIN checks for loan approval, provider reconciliation exception handling, and meaningful dashboard/onboarding surfaces.

However, the app is not yet ready for production financial operation or blue/green deployment. The highest-risk issues are:

1. Ledger chain integrity is not concurrency-safe enough for real money movement.
2. Wallet balances can become stale because the 24-hour group wallet cache does not appear to be invalidated by ledger writes.
3. Payout accounting is incomplete: gross rotation payout is debited, but service fee and provider settlement movements are not fully represented as ledger entries.
4. Admin apps currently have a critical API path mismatch and CSS/dev-rendering failures, making them unreliable for operations.
5. Backend tests are not green, linting is not CI-ready, and npm audit reports production dependency vulnerabilities across the frontend apps.
6. Deployment configuration is dev-oriented and does not yet support blue/green, canary, immutable images, readiness gates, or safe migration choreography.

Recommended immediate posture: treat OrbiSave as an active pre-production system. Do not process real customer funds until the P0 financial integrity and operational readiness items below are fixed and verified.

## 2. Severity Scale

- P0: Blocks real-money production use or can corrupt financial/accounting state.
- P1: Blocks reliable operations, admin control, deployment safety, or test confidence.
- P2: Important product, UX, security, or maintainability issue that should be fixed before wider beta.
- P3: Polish, consistency, or lower-risk hardening.

## 3. Systems Reviewed

### Backend

- Django 5 backend under `backend/`.
- Financial apps reviewed include:
  - `backend/apps/ledger/`
  - `backend/apps/contributions/`
  - `backend/apps/payouts/`
  - `backend/apps/loans/`
  - `backend/apps/groups/`
  - `backend/apps/admin_portal/`
- Multi-database country model reviewed through routes and model usage.

### Frontend Apps

- Main member web app: `frontend/`, Next 16.
- Country manager portal: `apps/manager/`, Next 14.
- Super admin console: `apps/console/`, Next 14.

### Infra

- Docker compose stack: `infrastructure/docker/docker-compose.yml`.
- Existing docs under `docs/`.
- GitHub workflows were not deeply audited, but repository search did not reveal a blue/green or canary deployment pipeline.

## 4. Evidence Collected

### Build Results

| Area | Command | Result |
| --- | --- | --- |
| Main frontend | `npm run build` in `frontend` | Passed. Next 16.2.1 generated 43 routes. |
| Manager app | `npm run build` in `apps/manager` | Passed. Next 14.2.35 generated 18 routes. |
| Console app | `npm run build` in `apps/console` | Passed on rerun. Next 14.2.35 generated 21 routes. |
| Backend check | `python manage.py check` in `backend` with venv | Passed. |

### Test Results

| Area | Command | Result |
| --- | --- | --- |
| Frontend unit tests | `npx vitest run` in `frontend` | Passed: 3 files, 7 tests. |
| Backend pytest | `SECRET_KEY=django-insecure-dev-key pytest` in `backend` | Failed: 67 passed, 1 failed, 6 errors. |

Backend test failures:

- `apps/contributions/tests/test_penalty_service.py`: six fixture errors because tests still create `Contribution(..., phone=...)` while the model now uses `mobile_number`.
- `apps/groups/tests/test_groups.py::TestGroupRBAC::test_group_creation`: `DatabaseOperationForbidden` because the test queries the `kenya` database without allowing that database in the pytest marker/config.

### Lint Results

| Area | Command | Result |
| --- | --- | --- |
| Main frontend | `npm run lint` | Failed because `next lint` is no longer valid in this setup and is interpreted as an invalid project dir. |
| Manager app | `npm run lint` | Failed by opening interactive ESLint setup prompt. |
| Console app | `npm run lint` | Failed by opening interactive ESLint setup prompt. |

The repo currently lacks non-interactive lint commands suitable for CI across all frontend apps.

### Dependency Audit Results

| Area | Result |
| --- | --- |
| `frontend` | 11 production vulnerabilities: 9 high, 2 moderate. Includes direct or transitive issues in `axios`, `js-cookie`, `next`, `react-simple-maps`/`d3`, `form-data`, `follow-redirects`, and `postcss`. |
| `apps/manager` | 4 production vulnerabilities: 3 high, 1 moderate. Includes `form-data`, `js-cookie`, `next`, `postcss`. |
| `apps/console` | 4 production vulnerabilities: 3 high, 1 moderate. Includes `form-data`, `js-cookie`, `next`, `postcss`. |

### Security Scan

Bandit scan command:

```powershell
.\venv\Scripts\python.exe -m bandit -q -r apps common config -x '*/tests/*,*/migrations/*'
```

Findings:

- High: `backend/apps/contributions/views.py` uses MD5 to derive an advisory lock seed. This is likely non-cryptographic use, but it still should be replaced with a safer hash or explicitly documented/suppressed.
- Medium: `backend/config/settings/development.py` allows `0.0.0.0` in `ALLOWED_HOSTS`. Acceptable for local development only, not production.

### Browser / Runtime QA

Main frontend:

- `http://localhost:3000/` rendered successfully.
- Login page rendered and showed validation errors on empty submit.
- Unauthenticated `/dashboard` redirected to `/login`.
- Public routes and dashboard shell routes returned HTTP 200 during route checks.
- Some CTA accessible names are duplicated, causing strict Playwright locators like `Start a Group` and `Get Started` to be ambiguous.

Admin console:

- `http://localhost:3002/` initially showed a Next dev runtime error: `TypeError: Cannot read properties of undefined (reading 'call')`.
- `/login` had DOM content but visual screenshot was black.
- CSS URL from dev HTML returned 404: `/_next/static/css/app/layout.css?...`.

Manager portal:

- `http://localhost:3003/` timed out or rendered a black viewport in browser testing.
- `/login` had DOM content but visual screenshot was black.
- CSS URL from dev HTML returned 404: `/_next/static/css/app/layout.css?...`.

This means the admin portals cannot be considered visually or operationally usable in their current dev runtime state, even though their production builds passed.

## 5. P0 Findings

### P0-01: Ledger Chain Writes Are Not Concurrency-Safe Enough

Relevant files:

- `backend/apps/ledger/models.py`
- `backend/apps/ledger/services.py`
- `backend/apps/contributions/views.py`
- `backend/apps/payouts/services.py`
- `backend/apps/loans/services/loan_engine.py`

Observed design:

- `LedgerEntry` is append-only: updates raise `PermissionError`, deletes are forbidden.
- Each entry has `previous_hash`, `hash`, `running_balance`, `account_stream`, `direction`, and optional `idempotency_key`.
- `append_ledger_entry()` checks existing idempotency key and then creates an entry inside a transaction.

Risk:

`LedgerEntry.save()` determines the previous entry by selecting the latest ledger row for the same group/account stream/currency. That lookup does not appear to use a stream-level lock, `select_for_update()`, or another serialized append mechanism. Two concurrent writes to the same stream can both see the same previous entry, compute the same `previous_hash`, and produce conflicting running balances.

Impact:

- The hash chain can fork.
- Running balances can become stale or wrong.
- Reconciliation later becomes much harder because both entries may individually look valid.
- In a real payment spike, this can create silent accounting drift.

Recommendation:

Create a ledger stream lock model or database-level lock per `(country_db, group_id, account_stream, currency)` and require every ledger append path to acquire it before computing previous hash/running balance. Then add a concurrency regression test that fires parallel appends and proves the chain remains linear.

Minimum acceptance criteria:

- All ledger writes go through one append service.
- The append service serializes writes per stream.
- Tests prove no duplicate `previous_hash` sibling entries for the same stream under concurrency.
- Running balance equals the ordered sum for every tested stream.

### P0-02: Group Wallet Cache Can Serve Stale Financial Balances

Relevant file:

- `backend/apps/groups/serializers.py`

Observed design:

- `WalletCalculations.get_cached_group_wallet()` caches `group_wallet_{group.id}` for 24 hours.
- Code comments indicate invalidation should happen via a `LedgerEntry` signal.
- Repository search did not find an actual `post_save`/cache invalidation signal for ledger entries.

Risk:

Any contribution, payout, loan disbursement, refund, or adjustment can change the underlying ledger while dashboard and payout code continue to use a stale 24-hour cached wallet.

Impact:

- Dashboard balances can be wrong.
- Rotation payout availability can be calculated from stale funds.
- Members and admins can see inconsistent financial state.
- Payout code may approve or reject movement based on outdated balances.

Recommendation:

Replace the current cache approach with one of:

1. Synchronous invalidation on every ledger append.
2. Short-lived cache with ledger version key.
3. Materialized balance table updated transactionally with ledger append.

For financial operations, do not use a stale dashboard cache as the source of truth. Payout and loan decisions should derive from a locked ledger/balance record inside the same transaction.

Minimum acceptance criteria:

- Every `LedgerEntry` creation invalidates or advances a group wallet version.
- Payout availability does not read the 24-hour cached serializer value.
- Tests cover contribution -> wallet update, payout -> wallet update, loan disbursement -> wallet update, refund/adjustment -> wallet update.

### P0-03: Rotation Payout Accounting Is Incomplete

Relevant file:

- `backend/apps/payouts/services.py`

Observed design:

- Rotation payout execution debits the rotation account stream using idempotency key `payout:{payout.id}:rotation`.
- Service fee is computed.
- Provider disbursement is invoked.

Risk:

Only the gross rotation payout movement appears to be ledgered. The service fee and provider settlement movement are not clearly recorded as separate ledger entries, such as:

- Debit rotation pool for gross payout.
- Credit/disburse member net amount.
- Credit company revenue for fee.
- Record provider payable/settlement clearing movement.

Impact:

- Company revenue may not reconcile to collected fees.
- Provider settlement totals may not reconcile to bank/mobile-money statements.
- It becomes hard to prove where the fee went.
- Audit trails around payout completion remain incomplete.

Recommendation:

Define a double-entry or at least balanced single-ledger convention for payout execution. Every payout should produce a complete accounting event group with linked entry IDs and consistent idempotency keys.

Minimum acceptance criteria:

- Payout has explicit ledger entries for member net, platform fee, and provider settlement.
- Reconciliation can compare provider statement totals against provider settlement stream.
- Tests assert the exact ledger event set for successful payout and failed/reversed payout.

### P0-04: Admin Console Login API Path Is Wrong

Relevant files:

- `apps/console/lib/api.ts`
- `apps/console/app/login/page.tsx`
- `backend/apps/admin_portal/urls.py`

Observed behavior:

- Console API base URL defaults to `http://localhost:8000/api/v1/admin-portal`.
- Console login posts to `/admin-portal/auth/login/`.
- Combined path becomes `/api/v1/admin-portal/admin-portal/auth/login/`.
- Verified correct backend endpoint is `/api/v1/admin-portal/auth/login/`.
- Verified doubled endpoint returns 404.

Impact:

The super admin console login path is broken by default. This blocks super admin operations, country configuration, provider management, trust controls, and operational response.

Recommendation:

Either set console base URL to `http://localhost:8000/api/v1` or change console request paths to `/auth/login/` relative to `/admin-portal`. Align manager and console API clients so both use the same convention.

Minimum acceptance criteria:

- Console login succeeds with a known super admin account.
- Manager login succeeds with a known country admin or super admin account as appropriate.
- API client URL joining is tested for all admin auth endpoints.

### P0-05: Admin Portals Render as Blank/Black in Dev Runtime

Relevant areas:

- `apps/manager/`
- `apps/console/`

Observed behavior:

- Production builds pass, but dev browser testing showed blank/black pages.
- Admin login DOM content exists, but CSS fails to load from `/_next/static/css/app/layout.css?...`.
- Requests for the referenced CSS returned 404.
- Console also produced a Next dev runtime error on `/`.

Impact:

Admin UI cannot be reliably QA-tested or operated locally. This blocks country operations, super admin operations, visual consistency review, and operational training.

Recommendation:

Clean and standardize Next build/dev artifacts for `apps/manager` and `apps/console`. Confirm each app can run from a clean checkout with:

```powershell
Remove-Item -Recurse -Force .next
npm install
npm run dev
```

Then verify `/login` and dashboard routes visually in browser. Avoid mixing stale production build artifacts with dev server output.

Minimum acceptance criteria:

- Browser screenshot shows visible login UI for both apps.
- CSS routes return 200.
- Console root route no longer throws Next runtime errors.
- A simple smoke test is committed for each admin app.

## 6. P1 Findings

### P1-01: Backend Test Suite Is Not Green

Observed result:

- `67 passed, 1 failed, 6 errors`.

Why it matters:

The failing tests are in financial and group modules. A finance app cannot treat red tests as background noise because they can mask ledger, routing, or lifecycle regressions.

Recommendation:

- Update contribution test fixtures from `phone` to `mobile_number`.
- Add proper multi-database pytest markers for `kenya` database access.
- Make backend CI require the full suite to pass with the same env vars used locally.

### P1-02: Frontend Linting Is Not CI-Ready

Observed result:

- Main frontend lint script fails due obsolete `next lint` usage.
- Admin apps ask interactive ESLint setup questions.

Impact:

CI cannot enforce frontend quality automatically. Developers can merge syntax/style regressions or unused code without a consistent gate.

Recommendation:

- Replace deprecated `next lint` commands with explicit ESLint commands.
- Add non-interactive ESLint config to all three apps.
- Make lint mandatory in CI.

### P1-03: Production Dependency Vulnerabilities Are Present

Observed result:

- Main frontend: 11 prod vulnerabilities.
- Manager and console: 4 prod vulnerabilities each.

Highest concern:

- `js-cookie`: token storage dependency and direct app usage.
- `axios`: HTTP client vulnerability range in main frontend.
- `next`: framework vulnerabilities in all frontend apps.
- `form-data` / `follow-redirects` / `postcss`: transitive exposure.

Recommendation:

Upgrade dependencies deliberately, then rerun:

```powershell
npm audit --omit=dev
npm run build
npx vitest run
```

For Next upgrades, test route rendering and auth flows because the admin apps already show dev/runtime fragility.

### P1-04: JS-Readable Auth Cookies Are High Risk for a Finance App

Relevant files:

- `frontend/store/auth.ts`
- `frontend/lib/api.ts`
- `apps/manager/store/auth.ts`
- `apps/console/store/auth.ts`

Observed design:

- Access and refresh tokens are stored using `js-cookie`.
- These cookies are readable by JavaScript.

Risk:

Any XSS bug can exfiltrate bearer tokens. This is especially serious for member accounts with transaction capabilities and admin accounts with operational controls.

Recommendation:

Move to HttpOnly, Secure, SameSite cookies set by the backend or a backend-for-frontend layer. If that is not immediately possible, reduce token lifetime, remove refresh token from JS-readable storage, add strict CSP, and audit all rich text/user-generated surfaces.

### P1-05: Financial Multi-DB Fallbacks Can Hide Routing Mistakes

Relevant areas:

- Database router and country database helpers.
- Financial model usage across contributions, loans, payouts, groups, and ledger.

Observed design:

- Financial apps route to the current country database.
- Some helpers fall back to default database when country is missing or not configured.
- Cross-database foreign keys are represented with `db_constraint=False`.

Risk:

Silent fallback to default is dangerous for financial writes. It can put country financial data in the wrong database or mask missing country context.

Recommendation:

In production mode, fail closed for financial writes if country database context is missing or invalid. Keep fallback only for explicit local/dev fixtures.

Minimum acceptance criteria:

- Financial write without country context raises a clear exception.
- Tests cover Kenya/Rwanda/Ghana route selection.
- Admin dashboards show country DB health/status.

### P1-06: Loan Disbursement Bypasses the Central Ledger Append Service

Relevant file:

- `backend/apps/loans/services/loan_engine.py`

Observed behavior:

- `LoanEngine.disburse_loan()` creates `LedgerEntry` directly with `.objects.using(db_alias).create(...)`.
- It does not appear to use `append_ledger_entry()` or provide a strong idempotency key.

Impact:

Ledger behavior can diverge between contributions, payouts, and loans. Direct writes also make it harder to enforce future stream locks, accounting event groups, and idempotency.

Recommendation:

Route loan disbursement through the same ledger append service used by other financial operations. Add idempotency key `loan:{loan.id}:disbursement` or equivalent.

### P1-07: Future Adjustment Workflow Is Incomplete

Relevant areas:

- `backend/apps/ledger/models.py`
- `backend/apps/ledger/services.py`

Positive foundation:

- Ledger supports `refund`, `reconciliation_adjustment`, and `suspense`.
- `record_reconciliation_exception()` can credit observed money to suspense.

Gap:

There is no complete formal workflow for future adjustments:

- No clear reversal entry linked to original ledger entry.
- No reason codes or adjustment categories.
- No dual approval or separation of duties.
- No dashboard for pending adjustment review.
- No immutable adjustment packet including evidence attachment/reference.

Recommendation:

Implement a formal adjustment/reversal subsystem before production. Financial corrections should never edit existing ledger rows; they should create linked compensating entries with approvals and evidence.

Minimum acceptance criteria:

- Every adjustment references the original event/entry.
- Adjustment requires role-based approval.
- Adjustment reason and evidence are mandatory.
- Dashboard displays original, adjustment, approver, and net effect.

## 7. P2 Findings

### P2-01: Contribution Lifecycle Can Re-run on Confirmed Save

Relevant file:

- `backend/apps/contributions/models.py` or contribution lifecycle code called from model save.

Observed risk:

`Contribution.save()` triggers confirmed contribution lifecycle when status is confirmed. Re-saving a confirmed contribution can re-enter lifecycle logic unless every downstream effect is strictly idempotent.

Recommendation:

Only trigger lifecycle on transition into confirmed, not every save while confirmed. Track previous status or move lifecycle orchestration out of model `save()` into explicit service methods.

### P2-02: Advisory Lock Uses the Default DB Connection

Relevant file:

- `backend/apps/contributions/views.py`

Observed risk:

Contribution initiation uses an advisory lock seed but the lock context appears to use `django.db.connection`, which is the default connection, not necessarily the country database connection. In a multi-country deployment, that can reduce or eliminate protection for country-specific writes.

Recommendation:

Acquire advisory locks on `connections[db_alias]` after country DB resolution. Replace MD5 seed derivation or document it as non-security use with a safer alternative.

### P2-03: Main Frontend API Client Logs Too Much

Relevant file:

- `frontend/lib/api.ts`

Observed behavior:

- API request interceptor logs method, URL, baseURL, headers, and other metadata.
- Authorization is redacted, which is good, but production logging is still too noisy for a finance app.

Recommendation:

Gate request logging behind a local debug flag and default it off. Avoid logging request/response payloads in auth, KYC, payment, and ledger areas.

### P2-04: Admin Error Logging Can Expose Sensitive Details

Relevant file:

- `apps/manager/app/login/page.tsx`

Observed behavior:

- Login error handler logs raw `err.response || err`.

Recommendation:

Log sanitized operational error codes only. Avoid dumping raw auth responses into browser console.

### P2-05: Onboarding Is Strong Structurally but Needs End-to-End QA

Relevant files:

- `frontend/app/onboarding/page.tsx`
- `frontend/app/chama-onboarding/page.tsx`

Observed positives:

- Role selection exists.
- Chama onboarding is a multi-step flow: role, account, group, location, review, security PIN.
- Country-aware phone validation appears to be present.
- Privacy/terms acceptance appears to be included.
- Flow creates user, token, profile, group, and transaction PIN.

Gaps:

- End-to-end test with a disposable account was not completed in this continuation due browser/runtime constraints.
- Need cleanup-safe test account creation.
- Need validation of failure states: duplicate phone/email, weak PIN, invalid invitation, provider/API outage.
- Visual branding differs from homepage/dashboard.

Recommendation:

Add an E2E onboarding test suite with seeded or disposable accounts for:

- New group creation.
- Invite acceptance.
- Member-only registration.
- Invalid country/phone combinations.
- Failed group creation rollback.
- PIN setup and later transaction PIN use.

### P2-06: Logo / Brand Area Is Inconsistent Across Major Surfaces

Observed variants:

- Main homepage uses a green square `O` and wordmark.
- Main onboarding uses a dark `O` mark plus gradient wordmark and also an `OS` welcome badge.
- Chama onboarding uses another small green `O` mark and text.
- Dashboard shell uses `OS` abbreviation block.
- Manager and console share duplicated `Logo.tsx` components with a different layered icon/wordmark implementation.

Impact:

The product feels like several adjacent apps rather than one trusted financial system. In a finance product, brand consistency is part of trust and operational clarity.

Recommendation:

Create a shared logo component/specification for:

- Full logo horizontal.
- Compact app icon.
- Sidebar collapsed mark.
- Admin portal variant if needed.

Then replace ad hoc logo blocks in homepage, onboarding, dashboard, manager, and console.

### P2-07: Dashboard Route Coverage Is Broad but Needs Authenticated Data QA

HTTP 200 route checks passed for:

- `/dashboard`
- `/dashboard/overview`
- `/dashboard/my-group`
- `/dashboard/contributions`
- `/dashboard/members`
- `/dashboard/meetings`
- `/dashboard/my-loans`
- `/dashboard/rotation-control`
- `/dashboard/reports`
- `/dashboard/settings`

Important caveat:

These were shell/route availability checks, not full authenticated data correctness checks. The next QA pass must log in as seeded roles and verify actual dashboard data against backend fixtures and ledger balances.

Recommended role matrix:

| Role | Dashboard areas to verify |
| --- | --- |
| Member | Overview, contributions, savings, loans, meetings, reports, settings. |
| Chairperson | Group wallet, members, rotation control, loan approvals, contribution tracking. |
| Treasurer | Ledger-derived balances, payouts, reports, contribution exceptions. |
| Country admin | KYC, group operations, country provider config, payment controls. |
| Super admin | Countries, global stats, provider config, trust/audit logs, admin management. |

### P2-08: CTA Accessible Names Are Ambiguous

Observed behavior:

- `Start a Group` appears multiple times with the same accessible name.
- `Get Started` appears multiple times with the same accessible name.

Impact:

This makes automated tests brittle and can reduce screen-reader clarity if context is insufficient.

Recommendation:

Use more specific aria labels, for example:

- `Start a Group from hero`
- `Start a Group from final call to action`
- `Get Started as a member`
- `Get Started from navigation`

## 8. P3 Findings

### P3-01: Onboarding Button Hover Style Is Contradictory

Relevant file:

- `frontend/app/onboarding/page.tsx`

Observed behavior:

The role card action uses a green inline `backgroundColor` while class names include a blue hover background. Inline style wins, so hover intent is unclear.

Recommendation:

Move colors into classes/tokens and remove contradictory inline style.

### P3-02: Duplicate Admin Logo Component

Relevant files:

- `apps/manager/components/ui/Logo.tsx`
- `apps/console/components/ui/Logo.tsx`

Observed behavior:

Manager and console have duplicated logo components.

Recommendation:

Extract into a shared package or copy from a canonical app-level design system until a package is available.

### P3-03: Prior QA Docs Should Be Linked from a Living QA Index

Existing docs include:

- `docs/orbisave_codebase_quality_security_review_2026-06-11.md`
- `docs/qa_system_audit_2026-06-12.md`
- `docs/orbisave_product_architecture_decisions_2026-06-11.md`

Recommendation:

Create `docs/QA_INDEX.md` summarizing current status, latest audit, and open P0/P1 remediation checklist.

## 9. Finance Engine Deep Dive

### 9.1 What Is Already Good

The finance engine has several correct instincts:

- Ledger entries are append-only.
- Ledger entries include previous hash and current hash.
- Ledger entries track account streams.
- Idempotency keys are used on contribution webhooks and payout ledger writes.
- Suspense handling exists for reconciliation exceptions.
- Contribution webhook processing uses transaction and row locking patterns.
- Loan approval requires transaction PIN and locks after repeated failures.
- Separate country databases exist for financial data.

These are strong foundations and should be preserved.

### 9.2 Primary Integrity Model

The intended financial data model appears to be:

1. Contributions enter through provider initiation/webhook.
2. Confirmed contributions are split into account streams such as savings, loaning, and rotation.
3. Group wallet and dashboard summaries derive from ledger entries.
4. Loans and payouts debit/credit relevant streams.
5. Exceptions go to suspense for reconciliation.
6. Daily checkpoint model can record merkle roots for ledger proof.

The biggest issue is that the model is partially implemented but not yet enforced end-to-end.

### 9.3 Ledger Append Requirements

All future financial movement should satisfy this checklist:

- Requires idempotency key.
- Happens inside a DB transaction.
- Acquires stream lock.
- Computes previous hash while lock is held.
- Computes running balance while lock is held.
- Writes exactly once.
- Invalidates or advances wallet balance version in same transaction.
- Emits audit event.
- Links to business object: contribution, payout, loan, fee, adjustment, or reconciliation event.

### 9.4 Ledger Checkpointing

`DailyLedgerCheckpoint` exists and is immutable except `exported_to_s3`, but no generation/export job was found in this continuation.

Recommendation:

- Add scheduled checkpoint generation per country DB, group, date, and account stream.
- Store merkle root plus ordered ledger range.
- Export signed checkpoint file to immutable object storage.
- Add admin view for checkpoint status.
- Add verification command to recompute checkpoint from DB.

### 9.5 Reconciliation and Suspense

The existence of `suspense` and reconciliation exception recording is positive. The missing pieces are operational:

- Exception queue dashboard.
- Assignment and notes.
- Evidence attachment/reference.
- Resolution action: allocate, reverse, refund, write-off, or provider dispute.
- SLA tracking.
- Immutable audit trail.

Recommended states:

1. `detected`
2. `under_review`
3. `awaiting_provider`
4. `approved_for_adjustment`
5. `resolved`
6. `closed`

### 9.6 Future Adjustments

For future adjustments, do not update old ledger rows. Use linked compensating entries.

Suggested adjustment model:

- `AdjustmentCase`
  - country
  - group
  - opened_by
  - reason_code
  - description
  - evidence_reference
  - status
  - approved_by
  - approved_at
- `AdjustmentLine`
  - case
  - original_ledger_entry nullable
  - account_stream
  - direction
  - amount
  - currency
  - generated_ledger_entry

Suggested reason codes:

- `provider_duplicate`
- `provider_reversal`
- `wrong_member`
- `wrong_group`
- `amount_mismatch`
- `fee_correction`
- `loan_disbursement_reversal`
- `payout_failure_reversal`
- `manual_reconciliation`

## 10. Blue/Green Deployment Readiness

### 10.1 Current State

`infrastructure/docker/docker-compose.yml` is development-oriented:

- Uses bind mounts.
- Runs frontend apps with `npm run dev`.
- Uses `DEBUG=True`.
- Contains development database credentials.
- Runs migrations during backend container startup.
- Has healthchecks for db/redis but not full readiness for app services.

This is acceptable for local development but not for production release orchestration.

### 10.2 Blue/Green Gaps

Missing pieces:

- Immutable production images per service.
- Separate blue and green environments.
- Load balancer or ingress traffic switch.
- Health/readiness endpoints for backend and frontend apps.
- Migration strategy that supports old and new app versions simultaneously.
- Rollback plan.
- Static asset versioning and cache control strategy.
- Release metadata endpoint exposing git SHA/build version.
- Smoke tests before traffic promotion.
- Database backup and restore drill before financial migrations.
- Per-country migration orchestration.

### 10.3 Migration Risk

Financial systems need expand/contract migration discipline:

1. Expand schema without breaking old code.
2. Deploy code that writes both old/new if needed.
3. Backfill.
4. Verify counts and balances.
5. Switch reads.
6. Remove old schema in later release.

Do not run irreversible financial migrations automatically at app container startup in production.

### 10.4 Recommended Release Gates

Before promoting green to production:

- Backend tests pass.
- Frontend tests pass.
- Lint passes.
- Dependency audit has no high/critical production findings or accepted waivers.
- Ledger chain verification command passes for every country DB.
- Wallet aggregate verification command passes.
- Smoke tests pass:
  - login
  - dashboard
  - contribution initiate dry run / sandbox
  - webhook sandbox
  - payout sandbox
  - admin login
  - provider config read
- Health endpoints pass.
- Error rate and latency are within thresholds.
- Rollback switch is tested.

### 10.5 Recommended Health Endpoints

Backend:

- `/health/live`: process is alive.
- `/health/ready`: DB, Redis, migrations, and required config are ready.
- `/health/finance`: country DB connectivity, ledger append dry-run disabled or safe check, provider config presence.

Frontend/admin:

- `/api/health` or equivalent static health route with build version.
- Smoke route that verifies critical CSS/static asset delivery.

## 11. Onboarding QA Details

### 11.1 Flows to Validate

Main onboarding surfaces:

- `/onboarding`
- `/chama-onboarding`
- `/register`
- `/login`
- invited member registration if invite links are active

Must-test scenarios:

1. New user creates a new group.
2. New user joins existing group by invite.
3. Duplicate email.
4. Duplicate phone.
5. Invalid phone for selected country.
6. Weak password.
7. PIN mismatch.
8. Group creation succeeds but profile fetch fails.
9. User creation succeeds but group creation fails.
10. Refresh/reload mid-wizard.
11. Back button through wizard.
12. Mobile viewport completion.

### 11.2 Data Integrity During Onboarding

Onboarding should not leave half-created financial objects without clear recovery.

Recommendation:

- Track onboarding state server-side.
- Make each step idempotent.
- Provide resume/retry.
- Use cleanup jobs for abandoned pre-financial accounts if allowed by policy.
- Do not create ledger-affecting records until required identity/group validations are complete.

### 11.3 Branding

The user asked specifically for logo area consistency. Current state is inconsistent across homepage, onboarding, dashboard, manager, and console.

Recommendation:

Define brand components:

- `LogoFull`
- `LogoMark`
- `LogoCompact`
- `LogoAdmin`

Use the same spacing, color tokens, and mark geometry across all apps.

## 12. Dashboard QA Details

### 12.1 Main Member Dashboard

Areas present or referenced:

- Overview
- My Group
- Contributions
- Members
- Meetings
- My Loans
- Rotation Control
- Reports
- Settings
- Savings
- Fines
- Notifications
- Loan approvals
- Rotations

Primary dashboard risk:

Financial dashboard values may derive from stale wallet cache rather than live ledger-safe aggregate.

QA requirement:

Every financial number shown on dashboard should have:

- Source definition.
- API endpoint.
- Ledger/account stream mapping.
- Test fixture expected value.
- Empty/error/loading state.
- Role permission expectation.

### 12.2 Country Manager Dashboard

Expected responsibilities:

- Country-level groups.
- KYC review.
- Members/users.
- Contributions.
- Loans.
- Savings.
- Trust account.
- Support.
- Settings.

Current blocker:

Manager app visual rendering failed in dev because CSS route returned 404 or page appeared black. Production build passed, but local operational QA cannot proceed until dev/runtime rendering is fixed.

### 12.3 Super Admin Console

Expected responsibilities:

- Global stats.
- Country configuration.
- Payment provider controls.
- Meeting/KYC provider config.
- Admin management.
- Audit logs.
- Trust/finance controls.

Current blockers:

- Login API path mismatch.
- Dev runtime error on root route.
- Blank/black visual rendering due CSS/static issue.

## 13. Security and Privacy Notes

Priority issues:

- JS-readable access and refresh tokens.
- Dependency vulnerabilities in production dependencies.
- Excessive browser console logging.
- Raw auth errors logged to console.
- Dev settings must never leak into production.

Recommended hardening:

- HttpOnly cookies or backend-for-frontend session handling.
- Strict CSP.
- Remove production console logs.
- Sentry or equivalent with PII scrubbing.
- Security headers on all apps.
- Rate limits on auth, PIN, contribution initiation, webhook endpoints.
- Admin IP/device/session risk controls.
- Audit event for every admin financial action.

## 14. Claude Handoff: Recommended Implementation Sequence

Give Claude this order of work. Do not start with visual polish. Fix financial correctness and operational blockers first.

### Phase 1: Financial Integrity P0

1. Implement serialized ledger append service.
2. Make all financial writes use that service.
3. Add idempotency keys to loan disbursement and any missing payout/fee writes.
4. Add wallet cache invalidation or materialized balances.
5. Add tests for concurrent ledger writes and wallet updates.
6. Add payout accounting event group: member net, platform fee, provider settlement.

### Phase 2: Admin Operational Recovery

1. Fix console API base URL/path mismatch.
2. Fix manager/console dev CSS/static rendering.
3. Add login smoke tests for manager and console.
4. Add admin dashboard route smoke tests.

### Phase 3: Test and Security Gates

1. Fix backend pytest errors.
2. Replace interactive/deprecated frontend lint commands.
3. Upgrade vulnerable dependencies or document accepted waivers.
4. Move auth away from JS-readable refresh tokens.
5. Remove noisy production console logging.

### Phase 4: Onboarding and Dashboard QA

1. Add E2E onboarding tests for create-group and join-group flows.
2. Add dashboard fixture-based financial number verification.
3. Validate all major dashboards by role.
4. Standardize logo components across apps.

### Phase 5: Blue/Green Readiness

1. Build immutable production images.
2. Add health/readiness endpoints.
3. Add release metadata endpoints.
4. Create expand/contract migration policy.
5. Add smoke tests before traffic switch.
6. Add rollback and database backup drill.

## 15. Claude Handoff Prompt

Use this prompt for the next implementation agent:

```text
You are working in the OrbiSave monorepo. Treat this as a financial application. First read docs/orbisave_full_qa_continuation_report_2026-06-20.md and prior QA docs. Do not begin with UI polish. Start with P0 financial integrity:

1. Implement a serialized ledger append path for each country DB and account stream.
2. Make contributions, payouts, loan disbursements, fees, suspense entries, refunds, and adjustments use the same append service with idempotency keys.
3. Fix wallet balance cache invalidation or replace it with transactionally maintained balances.
4. Add concurrency tests proving the ledger hash chain cannot fork and running balances are correct.
5. Fix payout accounting so platform fees and provider settlement movements are ledgered.
6. Keep all changes compatible with future blue/green deployments by using expand/contract migrations and avoiding startup-time production migrations.

After the P0 financial work, fix the admin console API path mismatch and admin CSS/rendering failures, then restore backend tests and CI lint gates.
```

## 16. Open Questions

1. Is OrbiSave intended to be single-entry ledger with audit hash, double-entry accounting, or a hybrid? The payout/fee model needs an explicit accounting policy.
2. Which object is the legal source of truth for member wallet balance: ledger aggregate, materialized balance table, provider statement, or group wallet cache?
3. Are service fees collected at contribution time, payout time, loan interest time, or multiple points?
4. Should country databases be physically isolated in production or separated schemas in one cluster?
5. What is the target production platform: Docker VM, Kubernetes, Vercel plus Django elsewhere, Cloud Run, or another setup?
6. What provider sandbox credentials and callback URLs should be used for E2E payment tests?
7. What roles are legally allowed to create adjustments and approve reversals?

## 17. Acceptance Criteria for Production Beta

Before beta with real users and any real funds:

- Backend tests are green.
- Frontend lint/build/tests are green.
- Admin console and manager portal can log in and render dashboards.
- No known P0 financial findings remain.
- Ledger concurrency test passes.
- Wallet balance verification command passes.
- Payout accounting event tests pass.
- Reconciliation/suspense workflow is visible to admins.
- Auth token storage is hardened or risk-accepted explicitly.
- Production dependency audit has no untriaged high/critical issues.
- Blue/green deployment plan exists and has been rehearsed in staging.
- Rollback plan is documented and tested.

## 18. Final QA Position

The app is promising and has many of the right primitives, but the current state is not production-safe for real money. The most important next move is not another redesign. It is making the ledger append path, wallet balance source of truth, payout accounting, and admin operations boringly reliable.

Once those foundations are fixed, the existing onboarding and dashboard surfaces can become a strong user experience. Until then, UI polish may accidentally make an unsafe financial system look more ready than it is.
