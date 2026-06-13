# Orbisave Codebase Quality, Security, and System Design Review

Date: 2026-06-11  
Repository: `orbisave`  
Scope: Django backend, Next.js member app, Next.js console app, Next.js manager app, Docker/deployment files, tests, dependency posture, and architecture documents.

Follow-up architecture decisions captured after this review: `docs/orbisave_product_architecture_decisions_2026-06-11.md`

## Review Caveat

This is a senior engineering, QA, and security review performed from the local codebase. It is thorough enough to guide development priorities, but it should not be treated as a final certified penetration test or compliance audit. I did not inspect every generated static asset line by line, and I did not review local SQLite data contents beyond identifying that database files exist in the repository.

## Executive Summary

Orbisave has a strong domain direction: a Django/DRF backend for groups, members, contributions, penalties, loans, payouts, ledger, payments, KYC, audit, notifications, and admin operations, plus three frontend applications for members, managers, and platform operators. The codebase already shows good instincts around modular apps, regional data separation, transaction PINs, immutable ledger intent, audit logs, payment provider abstraction, Celery tasks, and role-based access control.

The main concern is that several trust-boundary mechanisms are currently incomplete or incorrectly wired. The system is handling money movement, identity, KYC, jurisdiction routing, and admin privileges, so authorization, data isolation, provider callbacks, idempotency, and ledger integrity must be hardened before more feature work piles on top.

The highest-risk issues found are:

1. Authenticated users can likely modify sensitive account fields such as `role`, `kyc_status`, and `country` through the profile update serializer.
2. Public admin registration can create privileged admin accounts for any request claiming an `@averissystems.com` email address.
3. Several permission classes only implement object-level checks, but are used on routes where object permission checks do not run.
4. Client-controlled `X-Country` can influence database routing.
5. Ledger immutability is only partially implemented and is vulnerable to race conditions and bypasses.
6. Payout, loan, penalty, invite, and member-list endpoints have authorization and state-machine gaps.
7. Payment provider routing and webhook handling are incomplete or broken in key paths.
8. Frontend builds currently fail, backend tests fail, and dependency audits report high/critical findings.

Development should pause major dashboard redesign work until the core trust boundary, money movement, and CI foundations are corrected. Visual redesign will be much safer after the domain flows and API contracts are stable.

## System Understanding

### Backend

The backend is a Django 5 and Django REST Framework application with multiple domain apps:

- `accounts`: user model, JWT authentication, registration/login, profile, KYC, transaction PIN, device verification.
- `groups`: group creation, memberships, invitations, member actions, group settings.
- `contributions`: contributions, penalties, webhooks, reminders.
- `loans`: loan applications, approvals, disbursement intent, repayment schedule logic.
- `ledger`: ledger entries, running balances, chain-hash intent.
- `payouts`: rotation payout execution and payout history.
- `payments`: provider abstraction, provider credentials, webhooks, provider API logs.
- `admin_portal`: console/manager authentication and elevated operational APIs.
- `audit`, `analytics`, `notifications`, `meetings`: supporting operational modules.

The backend also has regional database routing:

- `default`
- `kenya`
- `rwanda`
- `ghana`

The architecture goal appears to be jurisdiction-aware financial coordination for chamas or ROSCAs, where groups collect contributions, issue penalties, rotate payouts, and potentially issue loans.

### Frontend Applications

There are three user-facing Next.js apps:

- `frontend`: primary member application.
- `apps/console`: platform or super-admin console.
- `apps/manager`: manager/operator portal.

All three consume the backend REST API. The main frontend also uses WebSockets for live notifications.

### Infrastructure

The repository includes Docker Compose for backend, worker/beat, Redis, Postgres, pgAdmin, and the three frontend apps. The intended local stack is containerized, but there are browser-facing environment variable issues that will affect local usability.

## What Is Working Well

- Domain boundaries are mostly separated by Django app.
- The system is already thinking about audit logs, regional databases, provider abstraction, transaction PINs, KYC, and ledger integrity.
- The frontend is split by audience, which can be a good long-term boundary if contracts stay consistent.
- Celery and Redis are present for asynchronous work.
- The payment layer has the start of a provider model and provider API logging.
- The codebase has existing tests for some important flows, including group creation, contribution webhooks, penalties, loans, and payouts.
- The README and architecture documents describe a serious product vision rather than a toy app.

## Primary Development Focus Areas

Before expanding features or redesigning dashboards, focus on:

1. Authorization and role safety.
2. Admin onboarding and privileged account creation.
3. Tenant, country, and regional database routing.
4. Money movement state machines for contributions, loans, payouts, and ledger.
5. Payment provider callback verification and idempotency.
6. CI health: backend tests, frontend builds, linting, dependency audit.
7. Secrets management, credential storage, and provider API log redaction.
8. KYC file security and privacy controls.
9. API contract stability between backend and the three frontends.

## Critical Findings

### 1. User Profile Update Allows Sensitive Field Changes

Severity: Critical  
Area: Authentication, authorization, account integrity  
Evidence:

- `backend/apps/accounts/serializers.py`
- `backend/apps/accounts/views.py`

`UserSerializer` exposes sensitive fields including `role`, `country`, and `kyc_status`. `ProfileUpdateView` uses this serializer with `partial=True` and then saves the user instance.

Risk:

An authenticated user may be able to update their own role, country, KYC status, or other sensitive profile values. In a financial system, this is a direct privilege-escalation and compliance risk.

Recommended fix:

- Create a dedicated `ProfileUpdateSerializer`.
- Make `role`, `kyc_status`, `country`, verification fields, admin flags, and financial trust fields server-controlled.
- Keep `UserSerializer` for read-only profile output or admin-only contexts.
- Add tests proving a member cannot update `role`, `kyc_status`, `country`, `is_staff`, or any elevated access field.

### 2. Public Admin Registration Can Create Privileged Accounts

Severity: Critical  
Area: Admin security  
Evidence:

- `backend/apps/admin_portal/auth_views.py`

`AdminRegisterView` is `AllowAny`, CSRF-exempt, and can create privileged users based on an email domain suffix. The route maps console registration to `super_admin` and manager registration to `platform_admin`.

Risk:

Anyone able to submit a matching email address can attempt to create a privileged account. There is no evidence of email verification, identity-provider assertion, invite token, existing-admin approval, or bootstrap-only restriction.

Recommended fix:

- Disable public admin registration in production immediately.
- Use one of:
  - SSO with verified domain claims.
  - Admin invitations generated by existing super admins.
  - A one-time bootstrap management command for the first super admin.
- Log and alert on all privileged-account creation attempts.
- Require MFA for all admin roles.

### 3. Permission Classes Are Misapplied Across APIViews and Actions

Severity: Critical  
Area: Authorization, data isolation  
Evidence:

- `backend/common/permissions.py`
- `backend/apps/payouts/views.py`
- `backend/apps/loans/views.py`
- `backend/apps/contributions/views.py`
- `backend/apps/groups/invite_views.py`
- `backend/apps/groups/views.py`

Several permission classes only implement `has_object_permission`, but are used on APIViews or collection-level actions where DRF does not automatically call object permission checks. Some endpoints also omit `IsAuthenticated`.

Risk:

Unauthorized users may be able to:

- Execute or attempt payouts.
- Approve/reject loans.
- Issue penalties.
- Create invites for groups they do not chair.
- List group members for groups they do not belong to.

Recommended fix:

- Add `IsAuthenticated` everywhere sensitive.
- Replace object-only permissions on APIViews with permissions that validate `group_id`, `loan_id`, `member_id`, or route kwargs inside `has_permission`.
- Scope all queryset methods by the authenticated user's memberships and role.
- Add negative authorization tests for anonymous, non-member, member, treasurer, chairperson, manager, and super-admin access.

### 4. Client-Controlled `X-Country` Influences Database Routing

Severity: Critical  
Area: Tenant isolation, data residency, financial data integrity  
Evidence:

- `backend/common/middleware.py`
- `backend/apps/groups/views.py`
- `backend/config/settings/base.py`

The middleware accepts `X-Country` from the request and sets the current country before falling back to the authenticated user's country. CORS allows `x-country`.

Risk:

A client can influence which regional database a write uses. This can misroute financial data, break data residency expectations, and create hard-to-repair consistency issues.

Recommended fix:

- Do not trust client-supplied country headers for authenticated writes.
- Derive country from server-owned records:
  - user profile for user-scoped actions,
  - group record for group-scoped actions,
  - verified admin scope for admin actions.
- Validate that a user is allowed to operate in a country before selecting a database.
- Add tests that malicious `X-Country` values cannot move records into another regional database.

### 5. Ledger Immutability Is Not Strong Enough

Severity: Critical  
Area: Financial ledger, auditability  
Evidence:

- `backend/apps/ledger/models.py`

The ledger model computes a hash during `save()`, but:

- `previous_hash` is not assigned from the previous entry.
- The hash omits important immutable fields such as direction, currency, member, running balance, related contribution, related loan, related payout, and timestamp.
- Previous-entry lookup is not locked.
- Concurrent inserts can read the same previous record.
- Bulk updates, admin actions, migrations, or raw SQL can bypass model `save()`.

Risk:

The ledger can fork, be reordered, or be modified without reliable detection. For a financial product, ledger integrity is one of the core controls.

Recommended fix:

- Implement ledger writes through a single service function.
- Use transactions and a per-group lock or ledger sequence row.
- Store and hash a canonical payload that includes all immutable financial fields.
- Set `previous_hash` explicitly.
- Add database constraints and, where possible, database triggers to prevent updates/deletes.
- Add a ledger verification command and scheduled integrity checks.
- Consider external checkpointing of ledger roots for tamper evidence.

## High Findings

### 6. Payout Execution Is Not Safe Enough for Production

Severity: High  
Area: Money movement  
Evidence:

- `backend/apps/payouts/views.py`
- `backend/apps/payouts/services.py`

The payout execution route uses weak permissions. The service only prevents duplicates when a `cycle` value is supplied, but the view does not pass one. The target member is selected from request input rather than being strictly derived from the rotation schedule.

Risk:

Repeated or unauthorized payout execution may be possible. The system could pay the wrong member or initiate duplicate payouts.

Recommended fix:

- Close payout execution behind fixed authorization first.
- Require schedule-derived recipient selection.
- Require transaction PIN and/or maker-checker approval for payout execution.
- Require idempotency keys for every provider call.
- Distinguish `requested`, `approved`, `processing`, `provider_confirmed`, `paid`, and `failed`.
- Create final ledger entries only after provider confirmation.

### 7. Loan Approval and Disbursement State Machine Is Ambiguous

Severity: High  
Area: Loans, money movement, accounting  
Evidence:

- `backend/apps/loans/services/loan_engine.py`
- `backend/apps/loans/views.py`
- `backend/apps/admin_portal/extended_views.py`

Treasurer approval can move a loan directly to `approved`. The loan engine creates disbursement ledger entries and repayment schedules when a loan becomes approved. Admin approval paths say disbursement was initiated but do not consistently call a provider or use the same ledger/repayment path.

Risk:

Approval, disbursement, provider settlement, ledger entry creation, and repayment schedule generation can drift. A loan may appear financially active before money has actually moved.

Recommended fix:

- Separate states clearly:
  - `submitted`
  - `group_approved`
  - `admin_approved`
  - `disbursement_pending`
  - `disbursed`
  - `repaying`
  - `repaid`
  - `defaulted`
  - `rejected`
- Create disbursement ledger entries only after provider success or confirmed manual disbursement.
- Generate repayment schedules at the correct business event.
- Add approval thresholds and maker-checker requirements.
- Add tests for every state transition.

### 8. Payment Provider Selector and Webhook Paths Are Incomplete

Severity: High  
Area: Payments, integration reliability  
Evidence:

- `backend/apps/payments/selector.py`
- `backend/apps/payments/views.py`
- `backend/apps/payments/urls.py`
- `backend/config/urls.py`

The provider selector uses JSONField containment in a way that fails on SQLite tests. The provider registry maps only Jenga Kenya and Rwanda. Several provider names used elsewhere are not implemented. The payment webhook view queries `is_active` as if it were a database field, but it is a property. Payment URLs exist but are not mounted in the main URL config.

Risk:

Payment selection, local testing, and webhook processing can fail unexpectedly. The code may give the impression that more providers are supported than actually are.

Recommended fix:

- Decide the first production provider set.
- Implement only providers that are truly supported.
- Make provider selection portable across supported databases or run tests against Postgres.
- Mount payment URLs intentionally or remove unused routes.
- Replace ORM filtering on computed properties with real fields or Python-side checks after safe querying.

### 9. Provider Secrets Are Stored in Plaintext Fields

Severity: High  
Area: Secrets management  
Evidence:

- `backend/apps/payments/models.py`

`BankProvider` includes fields for `api_key`, `api_secret`, `webhook_secret`, and `extra_config`. A code comment acknowledges credentials are plaintext and must be encrypted for production.

Risk:

Database compromise exposes payment provider credentials. Backups, logs, local dumps, and admin tools can become credential leakage paths.

Recommended fix:

- Store secrets in a vault or cloud secret manager.
- Store only secret references in the database.
- Encrypt any unavoidable database secrets with KMS-managed envelope encryption.
- Add rotation metadata and credential versioning.
- Redact provider credentials from admin serializers and logs.

### 10. Provider API Logs Can Capture Sensitive Data

Severity: High  
Area: Privacy, security logging  
Evidence:

- `backend/apps/payments/models.py`
- `backend/apps/payments/jenga.py`

Provider API logs store request and response payloads. Some redaction exists, but it is not comprehensive enough for financial and KYC-adjacent data.

Risk:

Logs can expose PII, phone numbers, account references, transaction metadata, provider tokens, signatures, or error payloads.

Recommended fix:

- Create a central redaction function.
- Redact by key and pattern.
- Avoid storing complete provider payloads unless required.
- Set retention windows for provider logs.
- Restrict log access by role.

### 11. KYC Upload Flow Needs File Security and Consistency

Severity: High  
Area: KYC, privacy, compliance  
Evidence:

- `backend/apps/accounts/views.py`
- `backend/apps/accounts/kyc_views.py`
- `backend/apps/accounts/kyc_urls.py`

There are duplicate KYC submission flows with different behavior. File upload controls are not clearly enforced for size, MIME type, virus scanning, private storage, retention, or signed access.

Risk:

Sensitive identity documents can be mishandled. Duplicate code paths can lead to inconsistent KYC state and compliance problems.

Recommended fix:

- Consolidate KYC into one service and one API flow.
- Validate file size, type, extension, and content signature.
- Store KYC files in private object storage.
- Use signed URLs for controlled viewing.
- Add malware scanning.
- Define document retention and deletion policy.

### 12. JWT, Token Storage, and WebSocket Authentication Need Hardening

Severity: High  
Area: Authentication, frontend security  
Evidence:

- `backend/config/settings/base.py`
- `backend/apps/accounts/authentication.py`
- `frontend/store/auth.ts`
- `frontend/lib/api.ts`
- `frontend/hooks/useWebSocket.ts`

The backend can start with missing JWT key files because the key loader returns an empty string. Frontend access and refresh tokens are stored in JavaScript-readable cookies. The WebSocket token is passed in the query string. The frontend retries on HTTP 403 as if the token expired.

Risk:

Tokens are exposed to XSS and logs. Authorization failures can be masked as token refresh issues. Missing JWT keys can fail at runtime instead of startup.

Recommended fix:

- Fail startup if JWT keys are missing in non-test environments.
- Prefer httpOnly secure refresh cookies and short-lived in-memory access tokens, or a BFF pattern.
- Avoid passing tokens in WebSocket query strings.
- Treat 401 and 403 differently.
- Require consistent issuer, audience, expiry, and token type validation.

## Medium Findings

### 13. Frontend Builds Currently Fail

Severity: Medium  
Area: CI, release readiness  
Evidence:

- `frontend/app/dashboard/profile/page.tsx`
- `apps/console/app/dashboard/payments/page.tsx`
- `apps/manager/app/dashboard/audit/page.tsx`

Observed build failures:

- Main frontend: `ShieldCheck` is used but not imported.
- Console app: `date-fns` is imported but missing from dependencies.
- Manager app: `date-fns` is imported but missing from dependencies.

Recommended fix:

- Fix imports/dependencies.
- Add CI that runs build for all three apps on every PR.

### 14. Frontend Lint Scripts Are Not Aligned With Current Tooling

Severity: Medium  
Area: Developer experience, CI  
Evidence:

- `frontend/package.json`
- `apps/console/package.json`
- `apps/manager/package.json`

The frontend lint script uses `next lint`. The main frontend with Next 16 failed with an invalid project directory error.

Recommended fix:

- Move to the ESLint CLI expected by the installed Next.js version.
- Ensure all apps have consistent lint scripts.

### 15. Dependency Audits Report High and Critical Findings

Severity: Medium to High  
Area: Supply chain  
Evidence:

- `frontend/package-lock.json`
- `apps/console/package-lock.json`
- `apps/manager/package-lock.json`

Observed audit posture:

- Main frontend: 16 vulnerabilities, including 1 critical and 8 high.
- Console app: 9 vulnerabilities, including 8 high.
- Manager app: 9 vulnerabilities, including 8 high.

Packages implicated by audit output include `axios`, `js-cookie`, `next`, `postcss`, `d3-color`, `react-simple-maps`, `esbuild`, `vite`, `vitest`, `follow-redirects`, and transitive lint dependencies.

Recommended fix:

- Upgrade dependencies deliberately.
- Replace or patch vulnerable packages where no fixed version exists.
- Add `npm audit --audit-level=high` to CI once the current backlog is addressed.

### 16. Docker Browser-Facing API URLs Use Container Hostnames

Severity: Medium  
Area: Local development, deployment configuration  
Evidence:

- `infrastructure/docker/docker-compose.yml`

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are set to `backend:8000` for browser-executed frontend code. Browser clients generally cannot resolve the Docker service hostname `backend`.

Recommended fix:

- Use browser-reachable URLs for public Next variables, such as `http://localhost:8000` in local development.
- Alternatively, route browser requests through Next.js API routes or rewrites.

### 17. Committed SQLite Database Files Should Not Live in Source Control

Severity: Medium  
Area: Data hygiene, repository safety  
Evidence:

- `backend/db.sqlite3`
- `backend/db_ke.sqlite3`
- `backend/db_rw.sqlite3`
- `backend/db_gh.sqlite3`

These files are tracked by Git.

Risk:

Local data, test data, or accidental sensitive records can be committed and redistributed. Database files also make diffs noisy and can hide state drift.

Recommended fix:

- Remove database files from Git history if they contain real or sensitive data.
- Keep only schema migrations and seed fixtures.
- Add explicit ignore rules for local database artifacts.

### 18. API Contract Drift Is Likely

Severity: Medium  
Area: Maintainability  
Evidence:

- Separate frontend apps manually call backend endpoints.
- API schema generation reports many warnings for APIViews and serializers.

Risk:

The three frontends can drift from backend behavior. This will be especially risky during dashboard redesign.

Recommended fix:

- Clean up OpenAPI schema warnings.
- Generate typed clients or shared API contracts.
- Add contract tests for high-value flows.

## Backend Test Results

Commands run:

- `backend\.venv\Scripts\python.exe manage.py check`
- `backend\.venv\Scripts\python.exe -m pytest`
- `backend\.venv\Scripts\python.exe -m pip check`
- `backend\.venv\Scripts\python.exe manage.py check --deploy --settings=config.settings.production`

Observed:

- `manage.py check` passed with a warning that `min_value` should be a `Decimal` instance.
- `pip check` reported no broken requirements.
- Pytest needed `SECRET_KEY` set because test settings import base settings.
- Backend pytest collected 18 tests. Result: 4 passed, 8 failed, 6 errors.
- Several penalty tests error because fixtures pass `phone` to `Contribution`, while the model uses `mobile_number`.
- Webhook concurrency tests fail because SQLite does not support the JSONField `contains` lookup used in provider selection.
- Production deploy check produced many OpenAPI/schema warnings and a security warning tied to the dummy test secret.

Recommended testing priorities:

- Fix fixture/model mismatch.
- Decide whether backend tests run on SQLite or Postgres. If production behavior relies on Postgres JSON operations, run CI tests on Postgres.
- Add auth negative tests for every sensitive endpoint.
- Add money-flow state-machine tests.
- Add ledger concurrency tests.
- Add provider webhook idempotency and signature verification tests.

## Frontend Build and Audit Results

Commands run:

- `npm run build` in `frontend`
- `npm run lint` in `frontend`
- `npm audit --audit-level=moderate` in `frontend`
- `npm run build` in `apps/console`
- `npm audit --json` in `apps/console`
- `npm run build` in `apps/manager`
- `npm audit --json` in `apps/manager`

Observed:

- Main frontend build fails because `ShieldCheck` is not imported.
- Main frontend lint script fails.
- Console build fails due missing `date-fns`.
- Manager build fails due missing `date-fns`.
- Dependency audits show multiple moderate, high, and critical findings.

Recommended frontend priorities:

- Restore green builds before redesign.
- Standardize API client behavior across apps.
- Rework token storage strategy.
- Add smoke tests for login, dashboard load, group creation, contribution flow, loan flow, and admin console access.

## Security Recommendations

### Authentication and Authorization

- Use explicit permissions on every sensitive route.
- Prefer querysets scoped by the authenticated principal.
- Add object checks where object access is required.
- Separate platform roles, group roles, and operational permissions.
- Require MFA for platform/admin roles.
- Add admin role assignment audit trails.

### Admin Account Lifecycle

- Remove open admin registration.
- Introduce invitation or SSO.
- Require approval and audit for role changes.
- Add break-glass process for super-admin recovery.

### Multi-Tenant and Regional Isolation

- Treat country and tenant as server-owned context.
- Never let client headers decide database writes.
- Add database-level uniqueness and FK constraints that reflect tenant boundaries.
- Add cross-country access tests.

### Money Movement

- Implement formal state machines for contributions, penalties, loans, payouts, and provider transfers.
- Require idempotency keys for all provider-facing operations.
- Record provider references and callback signatures.
- Treat provider callback success as the source of settlement truth.
- Do not create final ledger entries before settlement unless the entry type clearly indicates pending funds.

### Ledger

- Make the ledger append-only at the application and database levels.
- Use canonical hashing with previous hash.
- Lock per group or ledger stream during insert.
- Add verification tooling.
- Add scheduled integrity checks and alerts.

### Secrets and Logs

- Move provider credentials out of database plaintext.
- Redact all sensitive request/response data.
- Add log retention policy.
- Avoid logging tokens in query strings.

### KYC and Privacy

- Store documents privately.
- Add file validation and scanning.
- Define retention and deletion policy.
- Restrict viewing and downloading by role.
- Audit all access to KYC documents.

### Supply Chain

- Upgrade vulnerable packages.
- Add dependency scanning to CI.
- Pin compatible package ranges.
- Keep lockfiles reviewed and reproducible.

## QA Strategy

The most important QA work is not visual polish yet. It is proving that unauthorized, duplicate, out-of-order, and cross-tenant actions cannot happen.

### High-Value QA Scenarios

1. A member cannot change their own role, KYC status, country, or admin flags.
2. A member from one group cannot list or modify another group's members.
3. A non-chairperson cannot invite members.
4. A non-leader cannot issue penalties.
5. Anonymous users cannot trigger loan, payout, penalty, invite, or contribution endpoints.
6. A malicious `X-Country` header cannot write data into the wrong regional database.
7. A contribution webhook is idempotent under concurrent duplicate callbacks.
8. A payout cannot be executed twice for the same cycle.
9. A payout recipient is derived from the rotation schedule, not arbitrary request input.
10. A loan approval does not create a disbursement ledger entry until disbursement is confirmed.
11. Ledger entries cannot be updated or deleted.
12. Provider callbacks with invalid signatures are rejected.
13. KYC files over size limit, wrong MIME type, or executable content are rejected.
14. Frontend 403 responses do not trigger token refresh loops.
15. Admin registration is impossible without the approved admin onboarding path.

## System Design Principles to Enforce

### Backend Owns Trust

The frontend should never be trusted for role, country, group ownership, payment state, ledger amounts, schedule recipient, or KYC status. The frontend can request actions. The backend must derive authority and financial consequences from server-side records.

### Permission by Queryset

For most DRF viewsets, start by scoping `get_queryset()` to what the user is allowed to see. Then add object permissions for action-specific rules. This reduces the risk of accidentally exposing records through list endpoints.

### Money Flows Need State Machines

Contributions, loans, payouts, and provider transfers should have explicit states and allowed transitions. Each transition should have:

- actor,
- permission,
- preconditions,
- idempotency key,
- audit event,
- ledger consequence,
- notification consequence.

### Ledger Is a Separate Control Plane

The ledger should not be a passive side effect scattered across views. Treat it as a protected service. Only a small number of domain services should be allowed to create ledger entries.

### Regional Routing Must Be Deterministic

Every write should have exactly one trusted country/region source. If region selection is ambiguous, the request should fail.

### API Contracts Should Be Generated

With three frontends, manually maintained API shapes will drift. Use OpenAPI as a contract, fix schema generation warnings, and generate typed clients or shared types.

### CI Must Block Regressions

At minimum, CI should run:

- backend format/lint,
- backend tests on Postgres,
- backend migrations check,
- frontend typecheck/build for all apps,
- frontend lint for all apps,
- dependency audit threshold,
- OpenAPI schema generation,
- basic smoke tests.

## Clarifying Questions

These questions need product or architecture decisions before the system can be hardened cleanly.

1. Should normal users be able to self-register as chairpersons, or should chairperson status require approval?
2. Who is allowed to create admin accounts: existing super admins, SSO, company IT, or a one-time bootstrap command?
3. Are platform admins country-scoped, or can one platform admin operate across all countries?
4. Should a group's country come from the chairperson's country, a manager approval process, or an explicit group setting?
5. What is the legal custody model for funds: group-owned wallet, trust account, provider wallet, or bank account per country/group?
6. Which payment providers are truly in scope for first production launch?
7. For each provider, what are the exact webhook signature, idempotency, reversal, and reconciliation rules?
8. Is admin approval always required for loans, or only above configured thresholds?
9. When should a loan be considered disbursed: internal approval, provider request sent, provider success callback, or manual confirmation?
10. Are payouts always schedule-derived, or can chairpersons manually override payout recipients?
11. Should transaction PIN remain a short PIN, or should high-risk actions require MFA or step-up authentication?
12. What are the retry and lockout rules for transaction PIN attempts?
13. Which KYC provider or verification process will be used?
14. What are the KYC document retention and deletion requirements?
15. What are the Kenya, Rwanda, and Ghana data residency requirements for user, KYC, payment, and ledger data?
16. Is USSD or mobile app support part of the near-term architecture?
17. What scale should we design for in the next 12 months: users, groups, contributions per day, webhooks per minute?
18. What deployment target is intended: Docker VPS, AWS, GCP, Vercel, Render, Fly.io, or another platform?
19. Should all three frontend apps be deployed separately, or should console and manager be routes in one app?
20. What are the production launch gates: tests passing, security review, provider certification, legal approval, audit logging, backup/restore drill?
21. Is dashboard data allowed to be mocked during development, or must dashboards only show backend-derived real data?
22. What operational roles are needed beyond current roles: support agent, compliance officer, finance ops, auditor, read-only admin?
23. Who can view KYC documents and under what audit requirements?
24. What should happen when provider callback data conflicts with internal expected amount, phone, country, or reference?
25. What is the reconciliation process for provider statements versus Orbisave ledger?

## Recommended Development Roadmap

### P0: Fix Before More Feature Expansion

- Lock down profile update fields.
- Disable public admin registration.
- Rework sensitive endpoint permissions.
- Remove client-controlled country routing for writes.
- Fix payout execution authorization and idempotency.
- Fix loan approval/disbursement semantics.
- Restore backend tests.
- Restore all frontend builds.
- Remove committed SQLite databases if they contain any non-essential data.
- Add CI gates for backend tests and frontend builds.

### P1: Stabilize Financial Core

- Rebuild ledger write path as an append-only service.
- Add provider-specific webhook signature verification.
- Implement provider state machines.
- Add reconciliation model and workflows.
- Harden KYC upload/storage.
- Move provider secrets to a vault or encrypted secret manager.
- Generate API clients from a cleaned OpenAPI schema.

### P2: Product and Operations Maturity

- Add observability, alerts, and admin audit dashboards.
- Add role-specific dashboards after API contracts are stable.
- Add performance/load tests for webhook bursts.
- Add backup/restore and disaster recovery runbooks.
- Add compliance exports and audit reports.

## Final Recommendation

The project is worth continuing, but the next development phase should be a stabilization phase, not a dashboard redesign phase. The UI can become much better later, but the core system must first prove that it cannot escalate roles, cross regional boundaries, duplicate money movement, lose ledger integrity, or accept unverified provider events.

Once the P0 items are fixed and CI is green, the dashboard redesign will be easier because the frontend will be consuming stable, trusted, well-tested API contracts.
