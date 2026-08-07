# OrbiSave — Areas of Concern (living document)

Running register of known gaps, risks, and things that must be brought to standard
before/while scaling. Add to it any time a concern is found; do not delete items,
mark them `Done` with a date so the history stays auditable.

Severity: **CRITICAL** (blocks a bank/security review) > **HIGH** > **MEDIUM** > **LOW**.
Status: `Open` | `In progress` | `Done (YYYY-MM-DD)` | `Accepted risk`.

Last reviewed: 2026-07-31 (pre-Absa partnership review, from QA / Product / CTO lenses).

> See also [`security_review.md`](security_review.md) — the full pre-production
> security posture mapped to the fintech vulnerability categories (financial,
> API, auth, crypto, injection, mobile, infra, compliance) + the VPS deployment
> hardening checklist. Worked chunk by chunk as we ready production.

---

## CRITICAL

| # | Area | Concern | Status |
|---|------|---------|--------|
| C1 | Security / Secrets | `backend/.env.orig` and `backend/.env.sqlite` are removed from HEAD but still present in **git history**, so the dev `SECRET_KEY` (HS256 JWT fallback) and a dev SQLite file remain retrievable from the repo. Mitigation: `production.py` refuses HS256/`SECRET_KEY` JWT signing and requires RSA keys. Still required: rotate `SECRET_KEY`, confirm prod uses RS256 keys, and purge history (`git filter-repo`/BFG) or make the repo private. | Open |

## HIGH

| # | Area | Concern | Status |
|---|------|---------|--------|
| H1 | Ops / Reliability | No unauthenticated liveness/readiness endpoint. `/superadmin/system-health/` is auth-gated so a load balancer/uptime monitor cannot use it. Add `/healthz` (liveness) and `/readyz` (DB reachable). | **Resolved 2026-08-06.** Added plain (DRF-free, unauthenticated, unthrottled) probes in `common/health.py`, wired at root in `config/urls.py`. `/healthz` never touches the DB (liveness); `/readyz` runs `SELECT 1` on every shard and returns 503 if any is down, leaking no exception text. `SECURE_REDIRECT_EXEMPT` keeps them off the prod SSL redirect. Verified: both 200 with all shards up; `/readyz` → 503 `{ghana:error}` with a shard forced down. |
| H2 | Ops / Alerting | No alerting on 5xx spikes or a down dependency. The API-health page is a quick-action log only. Wire alerting (PagerDuty connector available; email/Slack minimum). | Open |
| H3 | QA / Testing | Frontend test coverage is thin (~4 test files vs ~43 backend). Money-critical UI flows (contribution, disbursement approval, KYC) have no automated coverage. Add e2e/integration tests. | Open |
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
| M9 | Notifications | `send_invite_notification` (Celery task) writes a `[MOCK SMS]` / `[MOCK EMAIL]` line to stdout in **all** environments and returns "Notification dispatched." without sending anything. Verification emails already go out via Resend, so an invited member would silently never receive their group invite in production. Wire the email branch to the real backend (Resend, as verification does) and pick an SMS provider (or drop the SMS channel until one exists). Surfaced 2026-08-07 during the backend cleanup pass. | Open |

## LOW / NOT YET AUDITED

| # | Area | Concern | Status |
|---|------|---------|--------|
| L1 | Accessibility | No WCAG audit; matters for a regulated financial product. | Open |
| L2 | QA | No cross-browser/device matrix testing evident. | Open |
| L3 | Security / CI | Dependency scanning is report-only (`npm audit`, Bandit); nothing blocks a build on a high vuln. | Open |
| L4 | Security | No third-party penetration test before go-live. | Open |

---

## Strengths on record (so we do not regress them)

- Per-country DB sharding done correctly; money never summed across currencies.
- Append-only ledger with a CI write-guard (`Ledger write guard`).
- httpOnly-cookie token proxy: browser JS never sees a JWT (XSS-resistant).
- DRF throttling + auth rate-limiting + a pre-DRF admin gate.
- Production security headers: HSTS, SSL redirect, secure cookies, nosniff.
- Honest data everywhere: no fabricated metrics or dead controls.
- Secrets correctly gitignored now; no hardcoded secret key in the current tree.
