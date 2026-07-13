# OrbiSave — Production-Readiness Program Report

**Period:** 2026-07-03 → 2026-07-04 · **Branch:** `main` (Phases 0–7, commits `9358bfd` → `0bcdf12`)
**State at writing:** 162 backend tests passing · all three Next.js apps build green · ledger write-guard green · working tree clean.

This is the narrative record of what was done, why, and what comes next. Live feature status lives in [`FEATURES.md`](../FEATURES.md); this document is the story and the plan.

---

## 1. Where we started

The 2026-07-03 audit found a genuinely strong ledger core (hash-chained, append-only, concurrency-tested) undermined by specific money-path bugs, a half-finished multi-group feature, four overlapping admin surfaces, faked auth pages, no CI, and unwired integrations. Emanuel's directive: **Kenya-first production beta, one active group per user, the ledger/banking core must function fully.**

## 2. What was done, phase by phase

| Phase | Commit | Delivered |
|---|---|---|
| **0 — Hygiene + CI** | `9358bfd` | Dead trees deleted (embedded staff-portal/super-admin, template copies, empty scaffolds); committed DBs/env files untracked; GitHub Actions CI; the **ledger write-guard** (build fails if anything writes the ledger outside the one audited path — it immediately caught a second live bypass); hermetic test settings. |
| **1 — Money correctness** | `918445a` | **Loan disbursement rewritten** (was a raw ledger write that skipped locks/overdraft/idempotency AND never moved real money — the P0); fake payout endpoint deleted and the UI repointed to the real PIN-gated engine; group verification KYC-gated; member exit/remove blocked with outstanding loans; provider secrets Fernet-encrypted; daily Merkle checkpoints + 6-hourly integrity sweeps + `manage.py verify_ledger`. |
| **2 — One active group** | `c7f474b` | DB partial-unique constraint + `membership_policy` service (structured 409s); the voluntary **exit route existed but was unreachable — now wired** with self-or-chair permission; `useActiveGroup()` replaced 16 scattered `groups[0]` call sites; my-group became a single-group workspace with Leave Group; fixed latent 500s in the permission classes (they crashed on non-Group objects). |
| **3 — User-critical flows** | `f8b37a5`, `264b7ab` | Real **SMS OTP** phone verification + password reset (pages were `setTimeout` fakes) — hashed, purpose-scoped, throttled, enumeration-safe; phone-verified gates on group create/join/contribute; both onboarding flows re-sequenced through verification; console URL-prefix and manager Tailwind bugs fixed; dependency security pass; **JWTs moved to httpOnly cookies** behind a same-origin proxy + server-side route protection. |
| **4 — Jenga + E2E** | `7807a99` | **Loan repayment collection** built (loans could never reach `repaid`); provider transaction lifecycle completed + 15-min stuck-transaction poller + daily statement import with orphan detection; the **golden-path E2E test** (register → verify → group → contribute → payout → borrow → disburse → repay → every ledger stream verifies); Jenga production cutover runbook. The E2E exposed **7 more real bugs**, including a drain-to-zero ledger corruption and the multi-DB router saving to the wrong database. |
| **5 — Console hub + Manager** | `5916a15` | Console became the integration control center: SMS provider hub (encrypted, testable, kill-switchable), encrypted platform settings with `SystemConfiguration.get_value()`; Manager got the **reconciliation queue** (country-scoped resolve/escalate with mandatory audited notes); X-Country header on both admin clients (the routing signal auth middleware can't provide); audit action-types synced. |
| **6 — Documentation** | `57e0911` | `FEATURES.md` (single source of truth: status, % complete, resume notes per feature); execution-status header on the canonical design doc. |
| **7 — Expansion + translations** | `0bcdf12` | **Jenga verified correct against the official docs** (signature, signing, endpoints — no drift). **MTN MoMo provider** for Rwanda + Ghana against the verified sandbox contract (one integration, two markets; money-safety rules preserved). BK Open API (developer.bk.rw, live since 2026-03) and Ecobank portals researched with onboarding runbooks. **Translation layer on Google Cloud Translation** (the only major API covering Kiswahili + Kinyarwanda + Twi): users pick ≥2 languages at signup, SMS/notifications served in their language, English fallback never blocks delivery. |

**Numbers:** 89 → 162 backend tests · 12 P0-class money/security bugs fixed · 4 admin surfaces → 2 · 3 provider rails (Jenga live-sandbox, MoMo sandbox-ready, mock) · 5 languages supported.

## 3. Security architecture for credentials (decision record)

**Question raised (2026-07-04):** should real API keys be console-entered or server-only?

**Decision: keep console-managed entry, server-side encrypted storage** — the Console is the *entry form*, never the storage:
- Keys transit HTTPS once at entry; stored **Fernet-encrypted** in the DB; **no read API ever returns them** (write-only serializers, `has_*` flags only).
- The **master key `FIELD_ENCRYPTION_KEY` is env-only on the VPS** — a DB dump alone is unreadable. `SECRET_KEY` likewise env-only. These two are never console-manageable by design.
- This matches Stripe/Paystack/Flutterwave dashboard practice and keeps rotation, test-connection, and kill-switch as plug-and-play operations rather than SSH-and-redeploy.

**Pre-live hardening (tracked in §5):** enforce 2FA for `super_admin`; network-restrict the Console (IP allowlist/VPN at the reverse proxy); document key custody in the ops runbook.

## 4. Founder action items (external accounts — code is waiting on these)

1. **Jenga live cutover** — production credentials + Equity trust account; rehearse `docs/jenga_production_cutover_runbook.md`. *The only gate to real Kenya money.*
2. **MTN MoMo** — momodeveloper.mtn.com account (≈15 min) → sandbox keys → Console provider rows for Rwanda + Ghana (`docs/rwanda_ghana_rails_onboarding.md` §2).
3. **Bank of Kigali** — register at developer.bk.rw; start partner due diligence early (it's the long pole).
4. **Ecobank Ghana** — register at developer.ecobank.com (Collection + Payment services).
5. **Google Translate key** — create in Google Cloud Console → paste into Console → Settings → Platform APIs (`google_translate_api_key`, stored encrypted).
6. **Production env** — set `FIELD_ENCRYPTION_KEY` + `SECRET_KEY` on the VPS; per-country Postgres `DATABASE_URL_*`.

## 5. Next steps — engineering roadmap

**Now (pre-live):**
- [ ] 2FA enforcement for super_admin + Console network restriction (see §3)
- [ ] Jenga sandbox golden-path rehearsal with real sandbox credentials, then live cutover per runbook
- [ ] Production deployment hardening: real Dockerfiles without bind-mounts/DEBUG, Sentry DSN, blue/green + rollback drill

**Next (fast follows):**
- [ ] UI-chrome i18n via `next-intl` (capture + service layers are done; dictionaries for en/sw/rw/fr/tw)
- [ ] `pending_settlement` payout state (MoMo transfers are async — needed before RW/GH go-live, Kenya unaffected)
- [ ] Console/Manager shared package + httpOnly-proxy auth (stops shell drift; the Tailwind bug came from copy-paste divergence)
- [ ] Per-portal UI polish pass (see the UI audit section of this doc once completed)

**Later (documented in FEATURES.md):**
- Multi-group membership re-enablement · BK/Ecobank provider classes once credentials exist · WebSocket live updates via ticket auth · meetings/video completion · analytics dashboards · mobile app.

## 6. Portal-by-portal snapshot (for the UI planning session)

| Portal | Port | Auth | Real pages | Known UI debt |
|---|---|---|---|---|
| Member app | 3000 | httpOnly proxy ✅ | Full journey: landing → register/verify → dashboard (17 pages) → group workspace | Some settings sub-pages save locally only (rotations); dead `NEXT_PUBLIC_LIVEKIT_URL`-era leftovers; font/token audit pending |
| Console | 3002 | js-cookie (shared-pkg migration pending) | Overview, Provider Hub, SMS hub, Settings+APIs, Admins, Logs | 6 of 12 nav items still `OperationsPlaceholder`; masked-credential forms show empty on edit (by design — needs helper copy) |
| Manager | 3003 | js-cookie (same) | Overview, Group verification, KYC review, Reconciliation queue, Audit | 5 of 11 nav items placeholders; Tailwind slate fix applied but visual QA pending |
