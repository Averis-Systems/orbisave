# OrbiSave — Areas of Concern (living document)

Running register of known gaps, risks, and things that must be brought to standard
before/while scaling. Add to it any time a concern is found; do not delete items,
mark them `Done` with a date so the history stays auditable.

Severity: **CRITICAL** (blocks a bank/security review) > **HIGH** > **MEDIUM** > **LOW**.
Status: `Open` | `In progress` | `Done (YYYY-MM-DD)` | `Accepted risk`.

Last reviewed: 2026-08-07 (multi-agent audit: fabricated-data sweep, finance-engine
correctness + full test run, security/QA/IDOR). Finance engine verdict: substantially
complete and correct on the happy path (77 unit tests + a full E2E lifecycle test
pass; append-only hash-chained ledger verified), NOT yet bank-ready due to money-out
concurrency (C2/H5). Security fixes F1-F5 (H6-H8, M17) landed with regression tests.

> See also [`security_review.md`](security_review.md) — the full pre-production
> security posture mapped to the fintech vulnerability categories (financial,
> API, auth, crypto, injection, mobile, infra, compliance) + the VPS deployment
> hardening checklist. Worked chunk by chunk as we ready production.

---

## CRITICAL

| # | Area | Concern | Status |
|---|------|---------|--------|
| C1 | Security / Secrets | `backend/.env.orig` and `backend/.env.sqlite` are removed from HEAD but still present in **git history**, so the dev `SECRET_KEY` (HS256 JWT fallback) and a dev SQLite file remain retrievable from the repo. Mitigation: `production.py` refuses HS256/`SECRET_KEY` JWT signing and requires RSA keys. Still required: rotate `SECRET_KEY`, confirm prod uses RS256 keys, and purge history (`git filter-repo`/BFG) or make the repo private. See security_review.md Appendix A for the runbook. | Open |
| C2 | Finance / Concurrency | **Money-out paths can double-disburse.** `payouts/services.py execute_rotation_payout` (and `loans/services/loan_engine.py disburse_loan`) guard duplicates with a check-then-act SELECT and **no advisory lock and no DB unique constraint**, and call `provider.initiate_disbursement()` (real money out) *inside* the atomic block *before* the serializing ledger write. The money-**in** path uses `pg_advisory_xact_lock`; the money-**out** paths do not. Two concurrent PIN-authorized requests can both pass the guard and both send funds. Fix: partial-unique constraint on `Payout(group, recipient, cycle)` for non-failed statuses + advisory lock keyed on group+cycle+recipient (and loan id). Surfaced 2026-08-07 (finance audit). | **Done (2026-08-07).** Added `common.db_utils.advisory_xact_lock` (pg_advisory_xact_lock, SQLite threading fallback). `execute_rotation_payout` now serializes on (group, cycle, recipient) inside the txn before the idempotency check; `disburse_loan` serializes on the loan id and re-reads status with `select_for_update` under the lock. Added a partial-unique constraint `uniq_active_payout_per_group_cycle_recipient` on `Payout` (migration 0004) as the DB backstop. Verified: 82 finance tests + the E2E golden path pass, plus a new test proving the constraint blocks a raced duplicate. **H5 (two-phase provider call) still open.** |

## HIGH

| # | Area | Concern | Status |
|---|------|---------|--------|
| H1 | Ops / Reliability | No unauthenticated liveness/readiness endpoint. `/superadmin/system-health/` is auth-gated so a load balancer/uptime monitor cannot use it. Add `/healthz` (liveness) and `/readyz` (DB reachable). | **Resolved 2026-08-06.** Added plain (DRF-free, unauthenticated, unthrottled) probes in `common/health.py`, wired at root in `config/urls.py`. `/healthz` never touches the DB (liveness); `/readyz` runs `SELECT 1` on every shard and returns 503 if any is down, leaking no exception text. `SECURE_REDIRECT_EXEMPT` keeps them off the prod SSL redirect. Verified: both 200 with all shards up; `/readyz` → 503 `{ghana:error}` with a shard forced down. |
| H2 | Ops / Alerting | No alerting on 5xx spikes or a down dependency. The API-health page is a quick-action log only. Wire alerting (PagerDuty connector available; email/Slack minimum). | Open |
| H3 | QA / Testing | Frontend test coverage is thin (~4 test files vs ~43 backend). Money-critical UI flows (contribution, disbursement approval, KYC) have no automated coverage. Add e2e/integration tests. | Open |
| H5 | Finance / Integrity | Provider disbursement is a **non-idempotent external side effect executed inside the DB transaction before commit**. Any post-provider failure (or the overdraft check) rolls back the row while the cash has already left; on retry a NEW payout/loan reference is used, so provider-side dedup can't catch the re-send. Fix: two-phase — persist a pending intent and commit, call the provider against a STABLE reference, then post the balanced ledger event in a separate idempotent step. Pairs with C2. Surfaced 2026-08-07 (finance audit). | Open |
| H6 | Security / Authz (fixed) | **Unauthenticated arbitrary penalty injection.** `contributions PenaltyViewSet.issue` (detail=False) set `permission_classes=[IsGroupLeader]`, which never runs its object check on a non-detail action and dropped `IsAuthenticated`, so anyone could POST an arbitrary fine against any member. Also `PenaltyViewSet` was a full ModelViewSet (member could DELETE a fine). **Resolved 2026-08-07** (commit ceaacc4): issue requires auth + active-leader-of-target-group + member-in-group; viewset is now read-only; regression tests added (commit 08b345a). | Done (2026-08-07) |
| H7 | Security / Mass-assignment (fixed) | `GroupSerializer` (GroupViewSet update) left `status`, `verification_status`, `country`, `currency` writable, so a verified chair could self-activate, self-verify, or corrupt the shard/currency invariant via PATCH. **Resolved 2026-08-07** (ceaacc4): those four are `read_only_fields`; tests added. Follow-up: mid-cycle edits of `contribution_amount`/`mandatory_savings_amount` should move to a governed action (still writable). | Done (2026-08-07) |
| H8 | Security / File upload (fixed) | KYC `validate_kyc_upload` was applied only to an UNROUTED copy of `KYCSubmitView`; the live view in `accounts/views.py` created the KYCDocument from `request.FILES` with no validation (SVG/HTML polyglot -> stored XSS on admin review). **Resolved 2026-08-07** (ceaacc4): live view now validates front/selfie/back; rejection + accept tests added. Corrects the earlier inaccurate "Done 2026-08-02" claim in security_review.md §5. | Done (2026-08-07) |
| H4 | Security / CORS | `CORS_ALLOWED_ORIGINS` hardcodes localhost dev origins alongside prod domains in `base.py`, so dev origins are allowed in production. Gate localhost entries to dev only. | **Resolved 2026-08-06.** `base.py` now lists only prod origins (`console.`/`manager.orbisave.com`) plus an env-extendable `CORS_ALLOWED_ORIGINS`; the localhost entries live only in `development.py`. Verified: prod settings load with zero localhost origins, dev still allows :3000–:3010. |

## MEDIUM

| # | Area | Concern | Status |
|---|------|---------|--------|
| M1 | Product / Completeness | Seven placeholder pages still ship: Manager (contributions, loans, members, savings, settings, support) and Console (savings). Honest stubs, but a partner touring the portal hits half-built sections. Finish or intentionally gate them. | Open |
| M2 | Product / Revenue | Monetization loop unproven end to end: revenue reads 0 because no disbursement has booked a `service_fee` yet. Validate the full path once (payout → `service_fee` ledger row → revenue card). | Open |
| M3 | Security / Config | `DEBUG=True` in `base.py`; safe only because `production.py` overrides it. Add an assert/guard so a misconfigured deploy can never serve with `DEBUG=True`. | **Resolved 2026-08-06.** `base.py` now defaults `DEBUG=False` (fail-safe); `development.py` opts back in explicitly; `production.py` ends with `assert DEBUG is False`. Both the default and the assert must be defeated for a debug leak to reach prod. Verified via `manage.py check` on both settings modules. |
| M4 | Ops / Telemetry | `ApiMetricsMiddleware` writes to the default DB synchronously on an anomaly; during a DB-degradation incident the anomaly write hits the same DB. Acceptable now; at scale move to a queue or external APM. | Accepted risk |
| M5 | Product / UX | Manager register has no in-page verify-code step (redirects to `/login` with instructions). | Open |
| M6 | Analytics | Nightly `MetricSnapshot` rollup not built, so deeper financial trends (on-time ratio, activation funnel, arrears over time) are deferred (honestly labelled). **2026-08-07:** the `GroupAnalyticsViewSet` `health`/`trends` endpoints were returning **fabricated** hardcoded numbers (health score 88.5, made-up cashflow); replaced with an honest 501 "not yet available" and dead imports removed. Endpoints are unconsumed by any frontend. The real rollup (`GroupHealthSnapshot`) is still to build. | Open |
| M7 | Product / Payouts | `GroupMember.rotation_position` is not assigned sequentially: in live data multiple members in the same group share position `1`, so the payout order (who gets the pooled payout next, by join order + first contribution) is not actually resolved. The Console roster displays the DB value faithfully; the gap is in the rotation-assignment logic. Assign/normalise positions when a member makes their first confirmed contribution. Surfaced 2026-08-01 during the Console groups drill-down. | Open |
| M8 | Product / KYC | KYC **enforcement** (who is prompted to submit) is not implemented in the member app. Policy: group management (chairperson, treasurer, secretary) always verify; ordinary members verify only when applying for their first loan, and only if their group runs a loan pool (`Group.loan_pool_pct > 0`); no loan pool → members never asked. The admin side is done (Console global Members-KYC queue + Manager country queue, both with a management-vs-loan-applicant reason indicator, approve/reject/suspend). Remaining: gate the member-app KYC prompts to the right people at the right moment (group creation / role assignment for management; first loan request for members). Surfaced 2026-08-02. | Open |
| M10 | Finance / Loans | **Loan eligibility not enforced.** `loans/serializers.py` validates only `amount > 0` and `term_weeks <= 104`; no check against `group.max_loan_multiplier`, borrower mandatory-savings collateral, or available `loaning` pool balance. A member can request an arbitrary amount; it only fails at the ledger overdraft check — after the provider call. Fix: validate `amount <= max_loan_multiplier x borrower_savings` and `<= loaning pool` at request/approval. Surfaced 2026-08-07. | Open |
| M11 | Finance / Loans | **Loan disbursement is not PIN-gated.** `admin_portal/extended_views.py` `action='disburse'` moves funds with only role + country checks, unlike payouts and the chair/treasurer approval stages. Fix: require `_verify_transaction_pin` on disburse. Surfaced 2026-08-07. | Open |
| M12 | Finance / Money type | `groups/serializers.py` wallet aggregation returns money as `float(...)`, and the payout gross is derived via `Decimal(str(float(rotation_pool)))` — violates the Decimal-only invariant (safe at typical magnitudes, not guaranteed at scale). Fix: keep Decimal end-to-end or derive gross from the ledger `Sum`/`stream_lock.current_balance`. Surfaced 2026-08-07. | Open |
| M13 | Finance / Loans | Two divergent admin loan-approval paths: the engine's `pending_admin` branch is PIN-gated + requires an active GroupMember admin, while the admin-portal path sets `status='approved'` directly with no PIN and no membership check. Consolidate on one PIN-gated path. Surfaced 2026-08-07. | Open |
| M14 | Product / Honesty | **"Test connection" buttons that don't connect.** `admin_portal/config_views.py` `KYCProviderTestView` and `MeetingProviderTestView` only check that config fields are non-empty, then persist `last_test_status='ready'` and return `success: True` ("ready for API handshake") — shown to the admin as a passing connectivity test (Console → Settings → APIs). The bank and notification providers' `test_connection` make real calls; these two are the outliers. Fix: do a real provider handshake, or relabel so `success:true` is never returned from a completeness-only check. Surfaced 2026-08-07 (hardcoded-data audit). | Open |
| M15 | Finance / Config | **Hardcoded withdrawal fee failsafe on real money.** `ledger/models.py SystemConfiguration.get_withdrawal_fee_pct()` returns a hardcoded `Decimal('4.15')` when no `PAYOUT_SERVICE_FEE_PCT` row exists; this is applied in `payouts/services.py execute_rotation_payout`, deducting 4.15% from every member payout. With the DBs wiped the config row likely does not exist, so live payouts would charge this literal, not a configured value. Fix: seed/validate the config at bootstrap and fail loudly on a missing fee rather than silently applying a hardcoded rate to user funds. Surfaced 2026-08-07. | Open |
| M16 | Finance / Sharding | `admin_portal/extended_views.py AdminAnalyticsView` and `admin_portal/views.py AdminDashboardStatsView` query the sharded financial models with `.objects.filter(country=...)` but **without** `.using(get_db_for_country(...))`, relying on the `get_current_country()` thread-local resolving for admin-portal routes; if it resolves to `default` they return real-looking but wrong/zero totals. `super_views.py` does this correctly and its docstring warns about exactly this. Also `contributions PenaltyViewSet.issue` loads the group without `.using()`. Audit and shard-route all admin/financial reads. Surfaced 2026-08-07. | Open |
| M17 | Security / Logs (fixed) | `ProfileUpdateView` logged `data=request.data`, which includes `bank_account_number` and next-of-kin PII, contradicting security_review.md §4. **Resolved 2026-08-07** (ceaacc4): logs sorted field names only. | Done (2026-08-07) |
| M18 | Finance / Settlement | Platform-revenue **physical transfer** is not yet effected. `apps/payments/settlement.py` computes the accrued `company_revenue` cut, resolves the custody (`trust`) and company (`fee`) accounts, and records an idempotent `RevenueSweep` per country/currency (daily task), but the actual custody -> company bank transfer (`_effect_transfer`) is a hook returning None until the live Equity/Absa internal-transfer API is wired, so sweeps sit `pending` (or `blocked` if no company account is configured) for the treasury to action. Accounting is complete; only the bank leg awaits the integration. Surfaced 2026-08-09 (Step 3 of the governance/money build). | Open |
| M9 | Notifications | `send_invite_notification` (Celery task) writes a `[MOCK SMS]` / `[MOCK EMAIL]` line to stdout in **all** environments and returns "Notification dispatched." without sending anything. Verification emails already go out via Resend, so an invited member would silently never receive their group invite in production. Wire the email branch to the real backend (Resend, as verification does) and pick an SMS provider (or drop the SMS channel until one exists). Surfaced 2026-08-07 during the backend cleanup pass. | **Done (2026-08-07)** — commit 4585f3d: SMS via `notifications.sms.send_sms`, branded email via the configured backend, in-app notification for existing users, retry on transient failure. Also fixed the `group_status` type that silently degraded to `admin_alert`. |

## LOW / NOT YET AUDITED

| # | Area | Concern | Status |
|---|------|---------|--------|
| L1 | Accessibility | No WCAG audit; matters for a regulated financial product. | Open |
| L2 | QA | No cross-browser/device matrix testing evident. | Open |
| L3 | Security / CI | Dependency scanning is report-only (`npm audit`, Bandit); nothing blocks a build on a high vuln. | Open |
| L4 | Security | No third-party penetration test before go-live. | Open |
| L5 | Security / Authz | `loans/views.py` create/list permission returns `[IsGroupMember()]` without `IsAuthenticated()`; anonymous passes `has_permission` but is stopped downstream (empty group queryset / borrower=AnonymousUser). Defense-in-depth only. Fix: prepend `IsAuthenticated()`. Surfaced 2026-08-07. | Open |
| L6 | Security / Webhook | `payments/views.py JengaWebhookView` is not wired into `config/urls.py` (unreachable). If ever enabled it lacks the idempotency guard and callback-amount check the `ContributionWebhookView` has. Retire it or bring it up to that contract. Surfaced 2026-08-07. | Open |
| L7 | Product / Trust | `admin_portal/extended_views.py AdminTrustAccountView` returns `last_reconciled_at: None` (`# TODO: store reconciliation records`) on a bank-facing trust-account endpoint. Honest (null, not fabricated) but a permanent placeholder; populate from real reconciliation runs. Surfaced 2026-08-07. | Open |

---

## Strengths on record (so we do not regress them)

- Per-country DB sharding done correctly; money never summed across currencies.
- Append-only ledger with a CI write-guard (`Ledger write guard`).
- httpOnly-cookie token proxy: browser JS never sees a JWT (XSS-resistant).
- DRF throttling + auth rate-limiting + a pre-DRF admin gate.
- Production security headers: HSTS, SSL redirect, secure cookies, nosniff.
- Honest data everywhere: no fabricated metrics or dead controls.
- Secrets correctly gitignored now; no hardcoded secret key in the current tree.
