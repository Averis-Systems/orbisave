# OrbiSave — System Design Map, Code Quality Report & Production-Readiness Plan

**Date:** 2026-07-03 (plan) · **Program executed:** 2026-07-04
**Author:** Claude (full-repo pass: docs, backend, frontend, console, manager)
**Purpose:** One reference document that (a) explains how the whole system actually works today, (b) gives an honest green/amber/red quality read, and (c) hands Fable 5 an ordered, file-referenced execution plan to reach a real-world-usable production beta — with the ledger/banking core treated as non-negotiable and multi-group membership cut down to one active group at a time.

This supersedes `backend/docs/orbisave_codebase_assessment.md` (dated March 2026, confirmed stale — see §5) as the entry point for understanding current system state. The prior QA docs in `docs/` (2026-06-11, 06-12, 06-20) remain valuable history of what was found and fixed; this doc reflects the state as of today's full pass and should be treated as current.

> ## ⭐ EXECUTION STATUS (2026-07-04) — the plan in §5 has been carried out
> The Kenya production-readiness program (Phases 0–6) is **complete**. Live feature state now lives in **`FEATURES.md`** at the repo root — read that first. Summary of what shipped:
> - **Phase 0** (`9358bfd`): repo hygiene, GitHub Actions CI, the INV1 ledger-write guard, hermetic tests.
> - **Phase 1** (`918445a`): the P0 money bugs — loan disbursement rewritten through the ledger + provider B2C, fake payout endpoint deleted, KYC-gated group verification, encrypted provider secrets, ledger integrity jobs.
> - **Phase 2** (`c7f474b`): one active group per user (DB constraint + service layer + `useActiveGroup` across 14 pages); the `exit` route was unreachable and is now wired.
> - **Phase 3** (`f8b37a5`, `264b7ab`): real SMS OTP verify + password reset, phone-verified gates, admin-app URL/Tailwind fixes, dependency security pass, and JWTs moved into httpOnly cookies behind a same-origin proxy.
> - **Phase 4** (`7807a99`): loan repayment collection (the loan lifecycle now closes at `repaid`), provider transaction lifecycle + stuck-tx polling + daily statement import, the **golden-path E2E test**, and the Jenga cutover runbook. The E2E exposed and fixed seven real bugs — including a **drain-to-zero ledger corruption** and a multi-DB router that saved to the wrong database.
> - **Phase 5** (`5916a15`): Console SMS provider hub + encrypted platform settings, the Manager **reconciliation queue**, X-Country routing on admin clients, and `AuditLog` choices synced with reality.
> - **Phase 6**: this doc + `FEATURES.md`.
>
> **Backend: 141 tests passing. All three Next.js apps build green. Ledger write-guard green.**
> Before processing real money, work through `docs/jenga_production_cutover_runbook.md` — the remaining gate is live-credential rehearsal against Equity/Jenga, not code.

---

## 1. What OrbiSave is

A digital operating system for African community savings groups — chamas, ROSCAs, VSLAs — launching in **Kenya (KES), Rwanda (RWF), Ghana (GHS)**. OrbiSave deliberately **never holds member funds itself**: contributions settle into country-specific **trust accounts at licensed partner banks** (Equity Bank Kenya via Jenga; Bank of Kigali; Ecobank Ghana), while OrbiSave runs the ledger, governance rules, and payment orchestration on top. This keeps it out of deposit-taking-institution regulatory territory. Per group: a rotating "merry-go-round" contribution/payout pool, an optional internal loan pool, a mandatory savings account, and a company revenue account.

Near-term real target (per the product architecture doc): ~78 groups / ~1,500–2,700 members in Kenya. Mobile app and Rwanda/Ghana payment rails are explicitly future work in the existing docs, not this pass.

---

## 2. System architecture (see the diagram above)

### 2.1 The four surfaces — what each one actually is

| Surface | Port | Real audience | Confirmed role |
|---|---|---|---|
| `frontend/` | 3000/3001 | Members, chairpersons, treasurers | The only member/group-leader-facing app. Registration, KYC, chama onboarding, contributions, loans, meetings, rotations. |
| `apps/console/` | 3002 | Super admins | Cross-country oversight: payment-provider hub, platform admin management, global settings. `docker-compose.yml` labels it "super_admin portal — console.orbisave.com". |
| `apps/manager/` | 3003 | Country/platform admins (internal ops staff) | Single-country operations: group verification, KYC review, audit log. **Not** a chairperson tool — labeled "platform_admin portal — manager.orbisave.com". |
| `backend/apps/admin_portal/` | — | (not a UI) | The one Django app that serves **both** console and manager: `admin_portal/urls.py` splits plain `admin-*` routes (→ Manager) from `superadmin/*` routes (→ Console). |

All three frontends call **one Django REST + WebSocket backend** (`backend/`). There is **no root workspace tooling** — no root `package.json`, no `turbo.json` — despite the README calling this a Turborepo monorepo. In practice it's three independently-run Next.js apps with fully copy-pasted shells (auth store, sidebar, layout, terminology helper duplicated byte-for-byte between console and manager).

**Redundant/dead surfaces found and confirmed by two independent passes:**
- `frontend/app/staff-portal/*` and `frontend/app/super-admin/*` — a *third and fourth* admin implementation embedded inside the member app, hitting the same `/admin-portal/...` endpoints as console/manager. Both are abandoned: several nav items point at routes with no page file (404), neither is linked from `/login`, neither is mentioned in the root README. **Recommend deletion**, not migration.
- `apps/apps/console/`, `apps/apps/manager/` — empty directory scaffolding (0 files, not git-tracked). Stray artifact from a scaffold command run one level too deep. **Recommend deletion.**
- `apps/web/` — contains only a `.next` build cache, no source. Orphaned from before the pivot to `frontend/` + `apps/console`/`apps/manager`. **Recommend deletion.**
- `frontend/dashboardreference/` — the TailAdmin free template, kept as design reference (excluded from `tsconfig.json`, not imported anywhere). Ported into real OrbiSave UI already; the copy itself should move out of the deployable tree.

### 2.2 The backend: multi-country sharding

`config/routers.py` (`OrbiSaveRouter`) splits installed apps into `PLATFORM_APPS` (accounts, audit, notifications → always the `default` DB) and `FINANCIAL_APPS` (groups, contributions, loans, ledger, payouts, payments, analytics, meetings → routed per-country). Country is resolved from thread-local state set by `CountryMiddleware` (`common/middleware.py`) — trusted from the authenticated user's own `country` field, with the `X-Country` header trusted **only** for anonymous requests (a documented fix for a prior privilege-escalation finding). The middleware comment is explicit that this is a *convenience default*, not enforcement — **service methods must still pass `.using(country)` themselves**, which is a real, standing fragility: a missed `.using()` call anywhere in a financial service silently falls back to `default` rather than raising, which for a fintech app is exactly the kind of bug that causes cross-country data corruption. Because Django can't enforce FKs across databases, every `User` reference from a country-routed model uses `db_constraint=False` — referential integrity between users and their financial records is an application-level convention, not a database guarantee.

Dev databases are SQLite files (`db.sqlite3`, `db_ke.sqlite3`, `db_rw.sqlite3`, `db_gh.sqlite3`); production swaps in per-country Postgres via `DATABASE_URL_*` env vars (see `infrastructure/docker/docker-compose.yml`).

### 2.3 The finance engine — how money actually moves

**Contribution → Ledger:** Member initiates a contribution (`contributions/views.py: InitiateContributionView`) → wrapped in `transaction.atomic` + a Postgres advisory lock keyed on `(user, group)` (SQLite falls back to a `threading.Lock`) + a duplicate-pending check → returns `409` on double-submit, proven with real concurrent-thread tests. Provider (Jenga) sends an STK push → user pays via mobile money → provider webhook hits `ContributionWebhookView`, which uses `select_for_update()` + a status guard so retry-storms are idempotent (also proven with concurrent-thread tests). If the provider-reported amount doesn't match what was expected, the code **fails closed**: money goes to a `suspense` ledger stream and a red-severity `ReconciliationItem` is opened — it never silently trusts the provider. Confirmed money then splits across `rotation`/`savings`/`loaning` streams via `append_ledger_entry`, all under one `LedgerEventGroup`.

**The ledger itself** (`ledger/models.py`) is genuinely well-built: append-only (`.save()` on an existing row and `.delete()` both raise `PermissionError`), SHA-256 hash-chained per `(group, account_stream, currency)` (`previous_hash`/`hash`/`sequence_number`), with a `verify_ledger_stream` command that walks the chain and detects gaps/tampering (backed by an actual tamper-detection test), a Merkle-root `DailyLedgerCheckpoint` model, and `ReconciliationRun`/`ReconciliationItem` models for matching internal ledger state against bank/provider statements with a green/orange/red severity scale. There is exactly **one sanctioned write path**, `append_ledger_entry` (`ledger/services.py`), which locks a `LedgerStreamLock` row, checks overdraft on protected streams (`rotation`, `savings`, `loaning`), dedupes on `idempotency_key`, and invalidates the cached wallet balance on commit.

**Payouts:** `PayoutService.execute_rotation_payout` (`payouts/services.py`) reads the cached wallet, applies a dynamic fee from `SystemConfiguration`, calls the provider, and guards against duplicate `Payout` rows for the same `(group, recipient, cycle)` inside one transaction — proven idempotent by test. `PayoutExecutionView` requires a separate Argon2-hashed transaction PIN (3-attempt lockout) and hard-derives the recipient from `RotationSchedule` rather than trusting a client-supplied target (a regression test locks this in — it was previously exploitable).

**Loans:** 3-stage approval (chair → treasurer if assigned → platform admin), each PIN-gated and role-checked (`loans/services/loan_engine.py: approve_loan`). Interest is flat/simple (not declining-balance), capped against a per-country policy or a 30%/month platform fallback.

**Payments:** `payments/selector.py` resolves country → active `BankProvider` config row → provider class, entirely DB-driven (no hardcoded credentials). Only Kenya (`JengaProvider`, RSA-signed requests, dual webhook-signature verification, full `ProviderApiLog`/`ProviderTransaction`/`ProviderCallback` audit trail) is real; Ghana's Ecobank integration is commented out (`selector.py:78`) and Rwanda/Ghana have no live rail at all yet.

### 2.4 End-to-end user journeys traced

- **Chairperson onboarding:** landing → `/onboarding` (role picker) → `/chama-onboarding` (6-step wizard: role → account → group config → location → review/PIN) → register → auto-login → create group → set transaction PIN → `pending_chairperson` state → group sits in `pending_review` until a Manager-portal country admin approves it.
- **Member onboarding:** `/register?invite=<token>` → preview group → register → login → explicitly accept invite → dashboard.
- **KYC:** `KYCModal.tsx` uploads ID + selfie → `POST /auth/kyc/submit/`; a persistent banner blocks full access until `kyc_status === 'verified'`. **Known gap:** group verification in the Manager portal does not currently check that the chairperson's own KYC is verified before approving the group — a governance/compliance hole.
- **Contribution → Loan → Meeting → Rotation → Payout:** all real, wired to real hooks (`useContributions`, `useLoans`, `useMeetings`, `useRotations`) calling real endpoints, described in §2.3 above.
- **Email verification (`/verify`) and password reset (`/forgot-password`):** **both are fully faked on the frontend today** — the real API calls are commented out and replaced with a `setTimeout` that always reports success. Users cannot actually verify an email or recover a forgotten password in the current build.

---

## 3. Code quality & best-practices assessment

Rated the way the user asked: 🟢 solid / 🟡 partial or inconsistent / 🔴 must fix before real money or real users touch it.

### 🟢 Genuinely solid — keep as-is, don't "refactor for cleanliness"
- **Ledger core design** (§2.3): hash-chained, append-only, immutable at the ORM layer, per-stream sequencing, Merkle checkpoints, fail-closed suspense handling. Backed by real threaded-concurrency tests, not just unit tests with mocks.
- **Contribution concurrency control**: Postgres advisory locks + `select_for_update`, proven with real multi-threaded pytest scenarios (`contributions/tests/test_concurrency_locks.py`, `test_webhook_financial_exceptions.py`).
- **Payout idempotency** in the real service path (`payouts/services.py`), proven by test (`test_payout_idempotency.py`).
- **Loan approval chain**: 3-stage, PIN-gated, with a regression test explicitly locking in a previously-fixed vulnerability (payout redirection to an attacker-supplied recipient).
- **Auth fundamentals**: Argon2 password hashing, RS256 JWT, a separate Argon2-hashed transaction PIN (distinct from login credentials) with lockout — good separation of "logged in" from "authorized to move money."
- **Test substance**: where tests exist, they assert exact DB row counts, exact ledger stream/direction pairs, and exact concurrent-request outcome distributions — not just HTTP status codes. 89 backend tests passing as of the last QA pass.
- **P0 security remediation track record**: self-role-escalation, public admin registration abuse, and client-controlled country routing were all found (2026-06-11 review) and are now fixed in the current code — a real, verifiable history of taking security findings seriously.

### 🟡 Partially there — inconsistent, half-migrated, or needs hardening
- **Group membership model** (the headline item — see §4): schema and API fully support multiple simultaneous groups per user (`GroupMember.unique_together = ('group','member')` only, no exclusivity constraint), but **the frontend has already informally converged on "one active group"** — 16 of 17 dashboard pages hardcode `groups?.[0] || null`. This is a half-finished migration, not a deliberate single-group design; formalizing it is *less* work than it sounds.
- **console / manager feature completeness**: only ~1/3 of each app's nav surface is wired to real data; the rest render a shared `OperationsPlaceholder` stub.
- **Real-time layer**: Django Channels is installed, `frontend/hooks/useWebSocket.ts` correctly opens a socket and invalidates the right caches on `contribution.confirmed`/`payout.completed`/etc. — but its only call site is commented out. No page in production actually gets live updates today; it's fully dormant capability.
- **Provider secrets at rest**: `BankProvider`/`KYCProviderConfiguration`/`MeetingProviderConfiguration` store API keys/secrets as plain `TextField`. Code comments claim encryption via `django-encrypted-model-fields`, but that package isn't in any `requirements/*.txt` — it's aspirational, not implemented.
- **Role model duplication**: `User.role` (account-level) and `GroupMember.role` (per-group) are two separate fields that can disagree. The permission classes that matter (`IsGroupChairperson`, `IsGroupTreasurer`, `IsGroupLeader` in `common/permissions.py`) correctly check the per-group role — good — but some frontend nav-gating logic reads the account-level role instead, which is exactly the kind of drift that the single-group restriction will make much easier to reason about (§4).
- **Repo/monorepo hygiene**: `db.sqlite3`, `db_ke.sqlite3`, `db_rw.sqlite3`, `db_gh.sqlite3`, `backend/.env.orig`, and `backend/.env.sqlite` are all **committed to git** (confirmed via `git ls-files`). The secret values in the committed env files are Django's default `django-insecure-...` dev placeholders, not live secrets — but committing binary DB files and env-shaped files at all is a bad precedent and isn't caught by any tooling today.
- **Dependency health**: last audited 2026-06-20 at 9 high/2 moderate (frontend) and 3 high/1 moderate each (console/manager) — needs a fresh `npm audit` and patch pass.

### 🔴 Must fix before real money moves — concrete, file-referenced
1. **Loan disbursement bypasses the ledger's safety net.** `backend/apps/loans/services/loan_engine.py:121` calls `LedgerEntry.objects.create(...)` directly instead of going through `append_ledger_entry`. It skips the `LedgerStreamLock` update, the overdraft check on the protected `loaning` stream, the idempotency key, and cache invalidation. Because `LedgerEntry.save()` still auto-assigns a `sequence_number` independent of the stream lock, **the next legitimate contribution's ledger write for that group's `loaning` stream will collide on the `unique_together(group, account_stream, currency, sequence_number)` constraint and raise `IntegrityError` inside the webhook transaction.** Any group that has ever disbursed a loan is at risk of its next contribution failing. This is the single most important fix in this report given the "ledger must function fully" requirement.
2. **A dead parallel payout path can fake a completed payout.** `backend/apps/groups/views.py:54-112` (`RotationViewSet.trigger_payout`) independently creates a `Payout(status='completed')` using a different amount formula, **with no provider call and no ledger entry at all**. If this route is ever hit in production, it permanently desyncs the books from reality — money marked "paid" that was never sent and never debited. Delete this method or hard-disable the route; the real path is `payouts/services.py`.
3. **Group verification doesn't check chairperson KYC first.** A country admin can approve/activate a group in the Manager portal without the system checking `chairperson.kyc_status == 'verified'` — violates the platform's own documented approval rule.
4. **Console settings pages call the wrong URL.** `apps/console/app/dashboard/settings/page.tsx` (lines 39, 51) and `settings/apis/page.tsx` (lines ~190-195, 281-367) call `/superadmin/...` directly, but the backend only mounts `admin_portal` at `/api/v1/admin-portal/...` — there is no top-level `/api/v1/superadmin/`. These calls 404 in any real deployment, breaking provider/settings management in the one app whose entire job is managing providers.
5. **Manager portal's real pages are probably rendering broken.** `apps/manager/tailwind.config.ts` overrides `colors.slate` with a flat string instead of a shade scale — Tailwind can't generate `slate-50`…`slate-950` from that, and 183 `slate-###` class usages across exactly the 9 *functional* (non-stub) manager pages (login, register, dashboard, KYC, groups, audit) depend on that scale. `apps/console/tailwind.config.ts` already had this same override removed in the working tree — port that fix to manager.
6. **`/verify` and `/forgot-password` don't work.** Both are hardcoded `setTimeout` "success" stubs on the frontend (`frontend/app/verify/page.tsx:61`, `frontend/app/forgot-password/page.tsx:20`). No real user can currently verify an email or recover a password.
7. **JWT stored where any script on the page can read it.** `frontend/store/auth.ts` / `frontend/lib/api.ts` keep the access token in a non-httpOnly cookie via `js-cookie`. The project's own `frontend/docs/integration_advisory.md` already says this should be httpOnly — it isn't, and client-side JS fundamentally cannot set that flag, so this needs a small architecture change (route-handler-mediated auth), not a bigger token.
8. **No CI at all.** `.github/workflows/` is empty. The only local gate, Husky's `pre-commit` → `npx lint-staged`, has no config it can find outside `frontend/.lintstagedrc.json` (there's no root `package.json`, and lint-staged resolves config by walking up from the invocation directory) — so backend, console, and manager changes currently ship with zero automated check. For a fintech app, this is a process risk on par with the code bugs above.
9. **Plaintext provider credentials** (see 🟡 above) — re-ranked here because these are literally the API keys that move real bank money; "planned encryption" isn't good enough once Jenga is live against real accounts.

---

## 4. The headline change: one active group per user

### 4.1 Why this is a scope *cut*, not a bug fix

`docs/orbisave_product_architecture_decisions_2026-06-11.md` explicitly decided the opposite of what's being asked for now: *"Orbisave supports users who may belong to multiple chamas and may also create their own chama while remaining members elsewhere."* This was a deliberate product decision, not an oversight — so this change should be communicated internally as a **conscious scope reduction for the production beta**, with the schema kept flexible enough to turn multi-group back on later (per the user's own framing: "other features to be future update").

Helpfully, the frontend has *already* drifted toward single-group behavior in practice: `frontend/app/dashboard/layout.tsx` and 13 other files all independently do `groups?.[0] || null` — 16 occurrences total. Only one page, `frontend/app/dashboard/my-group/page.tsx`, has a real multi-group switcher, and it's local component state that nothing else in the app reads. **Formalizing single-group is closer to "delete a half-built feature" than "build a new constraint."**

### 4.2 The concrete change set

**Backend:**
1. Add a partial-unique DB constraint in `backend/apps/groups/models.py` on `GroupMember`: one row with `status='active'` per `member`, e.g. `UniqueConstraint(fields=['member'], condition=Q(status='active'), name='one_active_group_per_member')`. This is the enforcement layer that actually matters (`unique_together(group, member)` only stops joining the *same* group twice today — line 109).
2. Add service-layer validation ahead of every path that creates an active membership — group creation (`groups/views.py`), invite acceptance (`groups/invite_views.py`), direct join — rejecting with a clear message ("You're already an active member of `<group name>`. Leave that group before joining or creating another.") if the user already has an active `GroupMember` row anywhere (remember memberships are sharded per-country, so this check has to look across the user's `country` DB correctly, reusing the existing `common/db_utils.get_db_for_group`/`get_db_for_country` helpers).
3. Confirm (or build, if missing) a "leave group" action that sets `status='exited'`, `exited_at=now()` — this is the release valve that lets someone join elsewhere afterward. Chairpersons need a handover step (reassign `Group.chairperson`) before they can exit, since `Group.chairperson` is a required FK.
4. This directly resolves the `User.role` vs `GroupMember.role` ambiguity flagged in §3: with at most one active group, the active membership's role becomes unambiguous, and the frontend nav-gating that currently reads account-level role can be pointed at the single active membership instead.
5. Migration note: this is pre-production data, so the plan is to add the constraint and, if any dev/test fixtures currently violate it, reset those fixtures rather than writing a data-preserving backfill migration — don't over-engineer this part.

**Frontend:**
1. Introduce one hook (e.g. `useActiveGroup()`) as the single source of truth for "the user's current group," backed by whatever the backend now guarantees is at most one active membership. Replace all 16 scattered `groups?.[0] || null` call sites with it.
2. Rework `my-group/page.tsx` from a multi-group switcher into a single-group workspace (details view + "Leave / hand over chairperson" action), and update the create/join copy to state the one-group rule plainly.
3. Surface the new backend validation error clearly in the chama-onboarding and invite-accept flows.
4. Remove onboarding copy that currently invites a user to "create your own chama while remaining a member elsewhere."

**What to explicitly preserve for later:** keep `GroupMember` as a join model (don't collapse it into a `OneToOneField` on `Group`/`User`) — that's what makes this reversible when multi-group membership comes back as a future update. The constraint and the validation layer are the only new things; the underlying shape stays.

---

## 5. Phased plan for Fable 5

Ordered by risk: money-correctness first, then the headline scope cut, then real-world usability, then operational hardening, then explicitly-deferred future work. Each phase is independently shippable — don't wait for a whole phase to land before starting the next one's investigation, but don't ship Phase 2+ ahead of Phase 1's ledger fixes given the "must function fully" requirement on the financial core.

**Phase 0 — Hygiene (do first, same day, near-zero risk)**
- `git rm --cached` on `backend/db*.sqlite3`, `backend/.env.orig`, `backend/.env.sqlite`; tighten `.gitignore` so these patterns can't recur (current rules miss anything not literally named `.env`).
- Delete `apps/apps/`, `apps/web/`, `frontend/dashboardreference/` (all confirmed empty/orphaned/template — zero functional risk).
- Delete `frontend/app/staff-portal/`, `frontend/app/super-admin/` (confirmed abandoned and unreferenced; console+manager are the sanctioned admin surfaces).
- Move or clearly banner `backend/docs/orbisave_codebase_assessment.md` as superseded — it currently lists ~14 "critical" bugs that are already fixed, and risks misleading the next person (or agent) who reads it as current.
- Add CI (GitHub Actions): backend `pytest` + `manage.py check` + `makemigrations --check`; `npm run build` + `npm run lint` for `frontend/`, `apps/console/`, `apps/manager/`. This is cheap and everything below benefits from the safety net.

**Phase 1 — P0 Ledger & banking integrity (the non-negotiable core)**
- Fix the loan-disbursement ledger bypass — route `loan_engine.py`'s `disburse_loan` through `append_ledger_entry` (`ledger/services.py`).
- Delete/disable the dead parallel payout endpoint (`groups/views.py: RotationViewSet.trigger_payout`).
- Fix the group-verification KYC gate (Manager portal must not approve a group whose chairperson isn't KYC-verified).
- Add a lint/CI check (even a simple grep-based one) that fails the build if `LedgerEntry.objects.create(` appears anywhere outside `ledger/services.py` — this exact bug class should not be able to reappear silently.
- Run `verify_ledger_stream` across all current dev/test data to confirm no existing chain breaks.
- Encrypt provider credentials at rest (`BankProvider`, `KYCProviderConfiguration`, `MeetingProviderConfiguration`) — install and wire the encryption package the code already assumes exists.

**Phase 2 — P0 Single active group (the headline scope cut)**
- Everything in §4.2, backend then frontend.
- Manual QA pass: create group → join group → attempt second join/create (should be blocked with a clear message) → leave group → join elsewhere (should succeed).

**Phase 3 — P0 Real-world usability blockers**
- Wire real `/verify` (email/phone OTP — `PhoneOTP` model already exists, confirm it's actually connected end-to-end) and real `/forgot-password`.
- Resolve JWT storage so the access token isn't page-script-readable (route-handler-mediated refresh, or documented accepted-risk sign-off if httpOnly isn't reachable this cycle).
- Fix the console `/superadmin/...` URL-prefix bug (`settings/page.tsx`, `settings/apis/page.tsx`).
- Fix manager's flat `colors.slate` Tailwind override.
- Fresh `npm audit` across all three Next apps; patch high/critical findings.
- Swap the Bandit-flagged MD5 advisory-lock seed for a non-flagged hash (e.g. blake2s) — quick, removes scanner noise.

**Phase 4 — P1 Operational readiness**
- Consolidate console/manager's copy-pasted shell (auth store, sidebar, layout, terminology helper) into one real shared package, and actually wire up a root workspace so `frontend/packages/shared-*` can serve all three apps — stops the drift that already caused the manager Tailwind bug.
- Build out the console/manager stub pages that matter for real day-1 ops first: KYC review, group verification, trust-account/reconciliation view, audit log. Leave pure-analytics stubs for later.
- Decide on the dormant WebSocket capability: wire it up for live balance/contribution updates, or remove the dead hook/env var so it stops looking like a shipped feature.
- Production deployment hardening: remove `DEBUG=True`/bind-mount/migrate-on-boot patterns from any prod path, confirm Sentry wiring, write and rehearse a blue/green rollback runbook.
- Build the reconciliation dashboard + scheduled jobs (stuck-transaction polling, statement import) that the Jenga integration notes already call out as remaining work.

**Phase 5 — Explicitly deferred ("future update," per your framing — do not build now)**
- Multi-group membership re-enablement.
- Rwanda/Ghana live payment rails (MTN MoMo, Bank of Kigali, Ecobank) — Kenya-only for this launch.
- Full meetings/video build-out (Daily.co).
- Deeper analytics; test coverage for `analytics`/`audit` apps (currently zero tests).
- i18n/translation.
- Mobile app (already out of scope in existing docs).

---

## 6. Quick-reference file index

For Fable 5 to start from immediately:

| Issue | File |
|---|---|
| Ledger bypass bug | `backend/apps/loans/services/loan_engine.py:121` |
| Dead parallel payout path | `backend/apps/groups/views.py:54-112` |
| Sanctioned ledger write path | `backend/apps/ledger/services.py` (`append_ledger_entry`, `close_ledger_event_group`) |
| Ledger model / hash chain | `backend/apps/ledger/models.py` |
| Group membership model | `backend/apps/groups/models.py:80-112` (`GroupMember`) |
| Per-group permission checks | `backend/common/permissions.py` |
| Country DB routing | `backend/config/routers.py`, `backend/common/middleware.py`, `backend/common/db_utils.py` |
| Payment provider selection | `backend/apps/payments/selector.py` |
| Console wrong-URL bug | `apps/console/app/dashboard/settings/page.tsx`, `apps/console/app/dashboard/settings/apis/page.tsx` |
| Manager Tailwind bug | `apps/manager/tailwind.config.ts` |
| Frontend hardcoded-first-group sites | `frontend/app/dashboard/layout.tsx` + 13 sibling pages under `frontend/app/dashboard/*` |
| Frontend multi-group picker (rework target) | `frontend/app/dashboard/my-group/page.tsx` |
| Fake verify/reset stubs | `frontend/app/verify/page.tsx:61`, `frontend/app/forgot-password/page.tsx:20` |
| Token storage | `frontend/store/auth.ts`, `frontend/lib/api.ts` |
| Dormant WebSocket | `frontend/hooks/useWebSocket.ts`, `frontend/components/dashboard/ContributionTracker.tsx` |

---

*This document and the accompanying architecture diagram were produced by a full read of `docs/`, `backend/docs/`, `frontend/docs/`, and a direct code pass across `backend/apps/*`, `frontend/`, `apps/console/`, `apps/manager/`, and shared infra config.*
