# OrbiSave QA System Audit

Date: 2026-06-12
Reviewer: Codex, senior engineering audit
Scope: member frontend, console frontend, manager frontend, Django backend, multi-country data model, KYC, payment provider setup, ledger, reconciliation, translation readiness, Docker/E2E readiness.

## Executive Verdict

OrbiSave has the correct product direction and several strong foundations: country-aware databases, admin email verification, pending group approval, fresh-login chairperson unlock, immutable-ish ledger entries, idempotency keys, suspense reconciliation entries, and a super-admin payment provider hub.

It is not release-ready for real banking operations yet. The release blockers are concentrated in four areas:

1. Admin apps and backend test suite are not green.
2. Payment/webhook routes and provider configuration are incomplete.
3. Financial ledger streams exist, but important flows still write or calculate money as if there is one pooled account.
4. Translation and localization are not architecture-ready yet, especially for legal copy, backend validation messages, currency, locale, and dynamic user language.

The DRF DecimalField warning previously identified has been fixed and verified.

## Verification Run

- Backend system check: passed after the DecimalField fix.
- New serializer warning tests: passed, 2 tests.
- Migration check: passed, no model changes detected for the warning fix.
- Backend full pytest: failed, 3 failed, 36 passed, 6 errors.
- Member app build: passed.
- Console app build: failed, missing `date-fns`.
- Manager app build: failed, missing `date-fns`.
- Python dependency check: passed.
- NPM audit: high/critical vulnerabilities remain in frontend package trees.

## P0 Findings - Must Fix Before Real Money

### P0-01: Console and manager frontends do not build

Files:

- `apps/console/app/dashboard/payments/page.tsx`
- `apps/manager/app/dashboard/audit/page.tsx`

Both import `date-fns`, but the package is not installed in those apps. This blocks admin E2E tests, provider setup testing, KYC review testing, and operational dashboards.

Fix:

- Add `date-fns` to `apps/console/package.json` and `apps/manager/package.json`, or replace usages with native `Intl.DateTimeFormat`.
- Re-run builds for all three apps.

### P0-02: Backend tests are not green

Observed failures:

- `apps/groups/tests/test_groups.py::TestGroupRBAC::test_group_creation` fails because the test does not allow the `kenya` database alias.
- `apps/contributions/tests/test_penalty_service.py` errors because fixtures still pass `phone=` to `Contribution`, while the model uses `mobile_number`.
- `apps/contributions/tests/test_concurrency_locks.py` fails because `supported_mobile_methods__contains` is not supported by SQLite JSONField.

Fix:

- Add multi-database markers for tests that use country aliases.
- Update stale fixtures to `mobile_number`.
- Make provider method selection test-safe by using Postgres in tests or replacing JSON `contains` with a portable selector.

### P0-03: Payment webhook routing is split and incomplete

Files:

- `backend/config/urls.py`
- `backend/apps/payments/urls.py`
- `backend/apps/contributions/urls.py`

`backend/config/urls.py` does not mount `apps.payments.urls`, so `JengaWebhookView` is unreachable even though it exists. A separate contribution webhook exists under `/api/v1/contributions/webhook/<country>/<provider_id>/`.

Risk:

- Bank/provider callbacks may hit the wrong URL or never reach the backend.
- Reconciliation will be blind to provider settlement events if routing is fragmented.

Fix:

- Decide one canonical webhook surface per provider.
- Mount `apps.payments.urls`.
- Keep provider-specific signature verification in the provider layer.
- Route normalized events into contribution, payout, loan, and reconciliation handlers.

### P0-04: Group admin approval does not enforce chairperson KYC

File:

- `backend/apps/admin_portal/group_views.py`

`AdminGroupVerifyView` sets `verification_status='verified'` and `status='active'`, then moves the chairperson membership to `pending_session_refresh`. It does not check that the chairperson KYC is verified.

This conflicts with the product rule: KYC must be approved before chairperson-level capabilities unlock.

Fix:

- Before verifying a group, require `group.chairperson.kyc_status == 'verified'`.
- Add country-admin indicators for KYC risk: green, orange, red.
- Keep the existing fresh-login unlock behavior.

### P0-05: Mandatory savings is captured but not financially split

Files:

- `backend/apps/groups/models.py`
- `backend/apps/groups/serializers.py`
- `backend/apps/contributions/views.py`
- `backend/apps/ledger/models.py`

The group wizard captures `mandatory_savings_amount`, but confirmed contributions currently create one ledger entry in `account_stream='rotation'`. There is no actual split into:

- rotation trust account
- mandatory savings account
- loaning account
- company revenue account

Risk:

- The UI may promise separate accounts while the ledger records a single pooled movement.
- Bank reconciliation cannot prove account-level balances.

Fix:

- On contribution confirmation, calculate and write explicit ledger entries per stream.
- Savings should be amount-based or rule-based according to group configuration.
- Loaning pool should write to `account_stream='loaning'`.
- Company service fees should write to `account_stream='company_revenue'`.
- Reconciliation should run per country, provider, bank account, and account stream.

### P0-06: Ledger running balance is per group, not per account stream

File:

- `backend/apps/ledger/models.py`

`LedgerEntry.save()` finds the previous entry by `group` only. Since account streams now represent separate bank accounts, the running balance must be calculated by at least `(group, account_stream, currency)`, not just group.

Risk:

- A savings credit can affect the apparent running balance of the rotation stream.
- Loaning, savings, suspense, and company revenue balances become unreliable.

Fix:

- Chain and balance ledger entries by stream.
- Consider separate `LedgerAccount` records for trust, savings, loaning, revenue, suspense, and provider settlement accounts.

### P0-07: Loan disbursement writes to the default ledger stream

File:

- `backend/apps/loans/services/loan_engine.py`

`LoanEngine.disburse_loan()` creates a `LedgerEntry` without `account_stream`, so it falls back to the model default `rotation`.

Fix:

- Loan disbursement should debit `account_stream='loaning'`.
- Loan repayments should credit `account_stream='loaning'`.
- Admin approval and actual bank disbursement should remain separate states.

### P0-08: Payout service fee is calculated but not posted to company revenue

File:

- `backend/apps/payouts/services.py`

`execute_rotation_payout()` calculates a fee and net disbursement, but only writes a rotation payout ledger entry. There is no matching company revenue entry.

Fix:

- Write a debit from rotation for gross payout.
- Write a credit to company revenue for service fee.
- Write a debit or settlement entry for net bank disbursement.
- Make all entries share one idempotency group/reference.

### P0-09: Secrets are stored/exposed too loosely

Files:

- `backend/apps/admin_portal/provider_views.py`
- `backend/apps/admin_portal/models.py`
- `backend/apps/payments/models.py`

Provider serializer exposes `api_key` and `extra_config`. `SystemConfiguration` has an `is_encrypted` flag, but no encryption-at-rest implementation is visible.

Risk:

- Bank API keys, webhook secrets, RSA private keys, and Google Translation API keys can be exposed to admins or stored as plain text.

Fix:

- Encrypt provider credentials at rest.
- Make `api_key`, `api_secret`, `webhook_secret`, and sensitive `extra_config` fields write-only or masked.
- Store key material in a secrets service or encrypted field, not ordinary text.

### P0-10: Object permissions are easy to misuse

File:

- `backend/common/permissions.py`

Custom group permissions mainly implement `has_object_permission`. Endpoints that do not load a `Group` object through DRF object permission checks can accidentally bypass intended group checks.

Specific risk:

- `PenaltyViewSet.issue()` is a detail-false action using `IsGroupLeader`, then accepts `group` from request body.
- `GroupMemberActionViewSet` object checks may receive a `GroupMember`, while permissions expect a `Group`.

Fix:

- Add explicit `has_permission` where appropriate.
- For body-supplied group IDs, fetch the group and call a single shared authorization helper.
- Add negative tests: non-member, ordinary member, chairperson in another country, pending-session chairperson.

## P1 Findings - Required For Beta Quality

### P1-01: Translation readiness is not in place

Current state:

- User model stores `languages`.
- Layouts hardcode `lang='en'`.
- Most UI strings are inline English.
- Backend validation and error messages are inline English.
- Privacy and terms pages are giant hardcoded HTML strings.
- There is no Google Translation API integration, translation cache, locale middleware, or string key catalog.

Fix:

- Add an i18n layer with stable message keys.
- Store source English strings by key.
- Translate via backend service using Google Translation API.
- Cache translations by `(message_key, language, version)`.
- Do not send raw PII, KYC images, national IDs, or free-form sensitive financial content to Google Translate.
- Legal and compliance text should be professionally translated and versioned, not auto-translated without review.

### P1-02: Outfit font is not standardized

Current state:

- Member app uses Jost.
- Console app uses Jost.
- Manager app uses Inter.

Fix:

- Switch all three layouts to `Outfit` from `next/font/google`.
- Bind it to one CSS variable, for example `--font-sans`.
- Update global CSS comments and Tailwind font family if configured.

### P1-03: Currency and country values are hardcoded in multiple layers

Examples:

- `frontend/lib/formatters.ts` defaults to KES and `en-GB`.
- dashboard pages and charts use `KES`, `KSh`, or `en-KE`.
- console provider creation defaults to `jenga_ke` and `KES`.
- backend group serializer has an inline country-to-currency map.
- payout service has a country-to-method map.

Fix:

- Add a country configuration table/service:
  - country code
  - legal name
  - currency
  - locale
  - timezone
  - partner bank
  - supported providers
  - enabled account streams
  - payment method defaults
- Frontend should consume this configuration instead of hardcoding.

### P1-04: Docker browser API URLs are wrong

File:

- `infrastructure/docker/docker-compose.yml`

The frontend containers set `NEXT_PUBLIC_API_URL=http://backend:8000/api/v1`. Because this value is bundled into browser JavaScript, the user's browser will try to resolve `backend`, which only exists inside Docker networking.

Fix:

- Use public browser-accessible URLs for `NEXT_PUBLIC_*`, such as `http://localhost:8000/api/v1` locally.
- Keep internal service URLs separate from public frontend variables.

### P1-05: Client-side auth token handling needs production hardening

Files:

- `frontend/lib/api.ts`
- `frontend/store/auth.ts`
- `frontend/hooks/useWebSocket.ts`

Current issues:

- Access token is readable from JavaScript cookies.
- WebSocket token is placed in the query string.
- API and WebSocket debug logs remain in client code.
- The API client sends `X-Country` from client state.

Fix:

- Prefer HttpOnly Secure SameSite cookies for browser sessions.
- Avoid tokens in URLs; use short-lived WS tickets or authenticated upgrade headers where possible.
- Strip production client logs.
- Do not trust client-supplied country after login; derive jurisdiction from authenticated user/session.

### P1-06: Admin and country DB access is inconsistent

Files:

- `backend/config/routers.py`
- `backend/apps/admin_portal/group_views.py`
- `backend/apps/admin_portal/extended_views.py`

Some admin group views explicitly search country aliases; other extended admin views query `Group.objects` without `.using(alias)`. Since groups are written to country DBs, admin dashboards may miss or misread data depending on router thread-local country state.

Fix:

- Create a country-scoped repository/service for admin data reads.
- Make every country admin query explicit about DB alias.
- Do not rely on request headers or thread-local country in privileged admin views.

### P1-07: Didit KYC is not integrated

Current state:

- Local KYC document upload and admin review exist.
- Didit provider service, webhook signature verification, risk score persistence, and document retention automation are not visible.

Fix:

- Add Didit provider module.
- Store provider reference, status, risk score, mismatch reasons, and reviewed-by fields.
- Implement green/orange/red indicators for country admin.
- Enforce 7-year retention with immutable audit events and storage lifecycle rules.

### P1-08: Reconciliation has foundations, not a full workflow

Current state:

- `ReconciliationRun` and `ReconciliationItem` exist.
- Suspense isolation exists.
- Amount mismatch freeze exists for contribution webhook exceptions.

Missing:

- Daily bank statement ingestion by SFTP/API.
- MT940/CAMT.053 parser.
- Composite matching engine.
- Admin resolution UI.
- Webhook/provider/bank three-way matching.
- Country-local daily close schedule.

Fix:

- Build ingestion adapters per bank.
- Normalize bank lines into a statement table.
- Match by transaction reference, exact amount, and timestamp window.
- Never auto-correct balances; post all unresolved items to suspense.

## P2 Findings - Quality And Maintainability

### P2-01: Mojibake/encoding artifacts are present

Several Python files display corrupted comment characters such as `â€”` and box drawing artifacts. This does not usually break runtime, but it hurts maintainability and documentation polish.

Fix:

- Normalize source files to UTF-8.
- Replace decorative comment separators with ASCII or clean UTF-8.

### P2-02: Analytics still contains placeholder calculations

File:

- `backend/apps/analytics/views.py`

Comments indicate mock calculations. Dashboard data can be mocked during development, but the production analytics contract should clearly distinguish mocked, estimated, and ledger-backed values.

### P2-03: Legal pages are not maintainable

Files:

- `frontend/app/privacy/page.tsx`
- `frontend/app/terms/page.tsx`

The legal pages are generated as inline HTML. This is difficult to translate, version, diff, and sanitize.

Fix:

- Store legal content as structured sections or markdown loaded from versioned files.
- Render through a safe renderer.
- Add per-country legal variants.

### P2-04: NPM vulnerabilities remain

All frontend package trees reported high or critical vulnerabilities. Some fixes may require Next upgrades.

Fix:

- Upgrade Next patch versions across apps.
- Re-run `npm audit`.
- Avoid force upgrades until builds and E2E tests exist for all apps.

## Feature Coverage Against Requirements

### Member can create a new chama while member elsewhere

Status: Partial.

Evidence:

- My Group page includes a create chama dialog.
- Backend group create writes a pending group and pending chairperson membership.
- Fresh-login unlock exists after admin verification.

Gap:

- Backend group creation does not require KYC if the intended rule is "KYC before creating the group record."
- Admin group verification does not require chairperson KYC verified.

### Admin account onboarding

Status: Mostly present.

Evidence:

- Admin registration enforces `@averissystems.com`.
- Super admin self-registration is owner-email restricted.
- Email verification code is required before activation.

Gap:

- Owner-invite flow for additional super admins is not implemented as a formal invitation workflow.
- Rate limiting and alerting around verification code attempts should be added.

### Multi-country admin model

Status: Partial.

Evidence:

- Roles exist.
- Super admin overview endpoints exist.
- Country DB aliases exist.

Gap:

- Country admin data reads are not consistently routed to country DB aliases.
- Country/payment/bank config should be table-driven, not scattered maps.

### Three group accounts plus company revenue account

Status: Data model foundation only.

Evidence:

- Ledger streams include rotation, savings, loaning, company revenue, suspense, provider settlement.

Gap:

- Contribution, payout, fee, and loan flows do not consistently post to the correct streams.
- Bank account registry for trust/savings/loaning/company revenue is not modeled as first-class operational data.

### Loan approvals and fraud control

Status: Partial.

Evidence:

- Chairperson and treasurer PIN approval stages exist.
- Admin approval/disbursement separation exists.

Gap:

- Email/dashboard notification to admin for loan approval is not fully verified.
- Vote-based activation of internal loaning account is not implemented.
- Loan disbursement ledger stream needs correction.

### Rotational payout timing

Status: Partial.

Evidence:

- Readiness evaluator checks all active member contributions and one-day grace period.
- Idempotent payout execution exists.

Gap:

- Scheduling should be country-local and frequency-aware.
- Automatic Celery execution for due rotation payouts is not wired into beat schedule.
- Fee/revenue ledger entries need correction.

### Transaction PIN

Status: Good foundation.

Evidence:

- PIN attempts lock after 3 failures.
- Reset path exists.

Gap:

- Need E2E tests across PIN set, fail 3 times, reset email, and successful re-use.

## Recommended Execution Order

1. Fix admin builds: `date-fns` or native date formatting.
2. Fix backend full test suite blockers.
3. Enforce KYC in admin group verification.
4. Mount and normalize payment webhook routes.
5. Correct ledger stream posting and running balances.
6. Encrypt/mask provider and system config secrets.
7. Standardize Outfit across all apps.
8. Add translation architecture: message keys, Google Translation API service, cache, locale middleware.
9. Replace hardcoded country/currency/payment config with a country config service.
10. Add Didit provider integration and KYC risk indicators.
11. Build reconciliation ingestion and admin resolution UI.
12. Add Playwright E2E for member onboarding, KYC, group creation, contribution, loan approval, admin approval, and payout.

## Warning Fix Completed

Files changed:

- `backend/apps/contributions/serializers.py`
- `backend/apps/loans/serializers.py`
- `backend/apps/contributions/tests/test_serializer_decimal_config.py`
- `backend/apps/loans/tests/test_serializer_decimal_config.py`

What changed:

- DRF `DecimalField(min_value='1.00')` was changed to `Decimal('1.00')`.
- Regression tests were added to prevent the warning from coming back.

Verification:

- Serializer warning tests passed.
- `manage.py check` passed without the warning.
- `makemigrations --check --dry-run` found no model changes.

