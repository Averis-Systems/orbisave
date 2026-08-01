# OrbiSave — Areas of Concern (living document)

Running register of known gaps, risks, and things that must be brought to standard
before/while scaling. Add to it any time a concern is found; do not delete items,
mark them `Done` with a date so the history stays auditable.

Severity: **CRITICAL** (blocks a bank/security review) > **HIGH** > **MEDIUM** > **LOW**.
Status: `Open` | `In progress` | `Done (YYYY-MM-DD)` | `Accepted risk`.

Last reviewed: 2026-07-31 (pre-Absa partnership review, from QA / Product / CTO lenses).

---

## CRITICAL

| # | Area | Concern | Status |
|---|------|---------|--------|
| C1 | Security / Secrets | `backend/.env.orig` and `backend/.env.sqlite` are removed from HEAD but still present in **git history**, so the dev `SECRET_KEY` (HS256 JWT fallback) and a dev SQLite file remain retrievable from the repo. Mitigation: `production.py` refuses HS256/`SECRET_KEY` JWT signing and requires RSA keys. Still required: rotate `SECRET_KEY`, confirm prod uses RS256 keys, and purge history (`git filter-repo`/BFG) or make the repo private. | Open |

## HIGH

| # | Area | Concern | Status |
|---|------|---------|--------|
| H1 | Ops / Reliability | No unauthenticated liveness/readiness endpoint. `/superadmin/system-health/` is auth-gated so a load balancer/uptime monitor cannot use it. Add `/healthz` (liveness) and `/readyz` (DB reachable). | Open |
| H2 | Ops / Alerting | No alerting on 5xx spikes or a down dependency. The API-health page is a quick-action log only. Wire alerting (PagerDuty connector available; email/Slack minimum). | Open |
| H3 | QA / Testing | Frontend test coverage is thin (~4 test files vs ~43 backend). Money-critical UI flows (contribution, disbursement approval, KYC) have no automated coverage. Add e2e/integration tests. | Open |
| H4 | Security / CORS | `CORS_ALLOWED_ORIGINS` hardcodes localhost dev origins alongside prod domains in `base.py`, so dev origins are allowed in production. Gate localhost entries to dev only. | Open |

## MEDIUM

| # | Area | Concern | Status |
|---|------|---------|--------|
| M1 | Product / Completeness | Seven placeholder pages still ship: Manager (contributions, loans, members, savings, settings, support) and Console (savings). Honest stubs, but a partner touring the portal hits half-built sections. Finish or intentionally gate them. | Open |
| M2 | Product / Revenue | Monetization loop unproven end to end: revenue reads 0 because no disbursement has booked a `service_fee` yet. Validate the full path once (payout → `service_fee` ledger row → revenue card). | Open |
| M3 | Security / Config | `DEBUG=True` in `base.py`; safe only because `production.py` overrides it. Add an assert/guard so a misconfigured deploy can never serve with `DEBUG=True`. | Open |
| M4 | Ops / Telemetry | `ApiMetricsMiddleware` writes to the default DB synchronously on an anomaly; during a DB-degradation incident the anomaly write hits the same DB. Acceptable now; at scale move to a queue or external APM. | Accepted risk |
| M5 | Product / UX | Manager register has no in-page verify-code step (redirects to `/login` with instructions). | Open |
| M6 | Analytics | Nightly `MetricSnapshot` rollup not built, so deeper financial trends (on-time ratio, activation funnel, arrears over time) are deferred (honestly labelled). | Open |

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
