# OrbiSave — Feature Status & Roadmap

**Last updated:** 2026-07-04 · **Launch target:** Kenya production beta
**Legend:** ✅ live & tested · 🟡 partial · ⏸ deferred (documented, intentionally not built now) · ❌ not started

This is the single source of truth for *what works, how complete it is, and where to resume*. It reflects the Kenya production-readiness program (Phases 0–6). For the architecture narrative and the original audit, see `docs/orbisave_system_design_and_production_readiness_plan_2026-07-03.md`; for the money-path spec, see `backend/tests/test_golden_path_e2e.py`.

---

## The money engine (the non-negotiable core)

| Feature | Status | % | Where / how to resume |
|---|---|---|---|
| Append-only hash-chained ledger | ✅ | 100 | `apps/ledger/models.py`, `services.py`. Single write path (`append_ledger_entry`) enforced by CI (`scripts/check-ledger-writes.mjs`). |
| Per-stream sequencing + stream locks | ✅ | 100 | `LedgerStreamLock`; drain-to-zero corruption fixed (Phase 4). |
| Balanced event groups (double-entry closure) | ✅ | 100 | `close_ledger_event_group` nets credits/debits to zero per currency. |
| Ledger integrity verification | ✅ | 100 | `verify_ledger_stream`; `manage.py verify_ledger --strict`; 6-hourly beat sweep. |
| Daily Merkle checkpoints | ✅ | 90 | `generate_daily_checkpoints` seals each day. Offline S3 export of signed roots still ⏸. |
| Contributions (STK push → webhook → split) | ✅ | 100 | `apps/contributions/`. Concurrency-locked, idempotent, fail-closed on amount mismatch. |
| Rotation payouts (PIN-gated, schedule-derived) | ✅ | 100 | `apps/payouts/`. Fake `trigger_payout` endpoint deleted (Phase 1). |
| Loan lifecycle: request → 3-stage approve → disburse | ✅ | 100 | `apps/loans/services/loan_engine.py`. Disbursement routes through the ledger + provider B2C (Phase 1). |
| **Loan repayment collection → 'repaid'** | ✅ | 100 | `apps/loans/repayment_views.py` (Phase 4). Was entirely unwired before. |
| Fail-closed suspense + reconciliation items | ✅ | 100 | `record_reconciliation_exception`; mismatches never forced into pools. |
| Provider transaction lifecycle + stuck-tx polling | ✅ | 95 | `apps/payments/tasks.py`. Real Jenga callbacks verified only in sandbox so far. |
| Daily bank-statement import + auto-match | ✅ | 90 | `import_daily_statements`; orphan movements open red items. Match heuristics will need tuning on real Equity data. |
| Provider secrets encrypted at rest | ✅ | 100 | `common/fields.py` (Fernet). Set `FIELD_ENCRYPTION_KEY` in prod. |

## Membership & groups

| Feature | Status | % | Notes |
|---|---|---|---|
| One active group per user | ✅ | 100 | DB partial-unique constraint + `membership_policy` service (Phase 2). |
| Group create / invite / join / exit | ✅ | 100 | Exit/remove blocked while a member has outstanding loans. |
| Chama onboarding (chairperson wizard) | ✅ | 100 | Two-stage with SMS verification before group creation. |
| Rotation schedule + cycles | ✅ | 95 | Scheduling is position-based; frequency-aware date logic is basic. |
| **Multiple groups per user + group switcher** | ⏸ | backend ~85 / UI ~20 | Deliberate scope cut. `GroupMember` join table is intact; re-enable = drop the `one_active_group_per_member` constraint + rebuild the switcher UI (removed from `my-group`, meetings, settings). |

## Identity, auth & security

| Feature | Status | % | Notes |
|---|---|---|---|
| Registration + RS256 JWT auth | ✅ | 100 | |
| **SMS OTP phone verification** | ✅ | 100 | `apps/accounts/otp_views.py` (Phase 3). Hashed, purpose-scoped, throttled. |
| **Password reset (phone OTP, enumeration-safe)** | ✅ | 100 | Replaced the fake `setTimeout` page. |
| Transaction PIN (Argon2, lockout) | ✅ | 100 | Separate from login; gates loan approvals + payouts. |
| **JWTs in httpOnly cookies (member app)** | ✅ | 100 | Same-origin proxy `app/api/backend/[...path]` (Phase 3b). XSS can't read the token. |
| Server-side route protection | ✅ | 100 | `frontend/middleware.ts` on `/dashboard/*`. |
| Manual KYC review (Manager) | ✅ | 90 | Country admins review ID + selfie; group verification is KYC-gated. |
| Automated KYC provider (Didit) | ⏸ | config slot only | Console has the encrypted config slot; no live integration. |
| Console/Manager httpOnly hardening | 🟡 | 40 | Still use the js-cookie pattern; inherit the proxy when the shared package lands. |

## Admin surfaces

| Feature | Status | % | Notes |
|---|---|---|---|
| Console: payment provider hub | ✅ | 100 | Full CRUD + test-connection + kill-switch. |
| Console: **SMS provider hub** | ✅ | 100 | Phase 5. |
| Console: KYC / meeting / translation config slots | ✅ | 90 | Encrypted, testable; translation is a config slot pending the i18n build. |
| Console: encrypted platform settings | ✅ | 100 | `SystemConfiguration.get_value()` decrypts for service code. |
| Manager: group verification + KYC queue | ✅ | 100 | |
| Manager: **reconciliation queue** | ✅ | 100 | Phase 5. Country-scoped; resolve/escalate with mandatory note. |
| Console/Manager stub pages (analytics, some lists) | 🟡 | ~35 | Operational pages built; pure-analytics stubs remain (`OperationsPlaceholder`). |
| Shared package for console/manager shell | ⏸ | 0 | Shell is still copy-pasted; caused the Manager Tailwind bug. Extract to stop drift. |

## Notifications & real-time

| Feature | Status | % | Notes |
|---|---|---|---|
| In-app notifications | ✅ | 90 | `notify_user` kwargs-mismatch fixed in Phase 4 (no notification was ever created before). |
| SMS delivery rail | ✅ | 100 | Console-managed Africa's Talking; dev fallback logs the code. |
| WebSocket live updates | ⏸ | ~70 built, unwired | `useWebSocket.ts` works but needs a server-issued WS ticket now that tokens are httpOnly. Polling covers it. |
| Email (SMTP) | ❌ | 0 | Optional post-launch. |

## Governance / meetings

| Feature | Status | % | Notes |
|---|---|---|---|
| Meetings + attendance + quorum | 🟡 | ~50 | Models + Daily.co provisioning exist; UI partial. |
| Secretary role | 🟡 | ~10 | Role exists; minimal capabilities. |

## Languages & translation (updated 2026-07-04)

| Feature | Status | % | Notes |
|---|---|---|---|
| Language capture at signup (min 2) | ✅ | 100 | Both registration flows have pickers (en/sw/rw/fr/tw); backend validates min-2/max-3; per-country defaults for API clients. |
| Translation service (Google Cloud Translation) | ✅ | 100 | `common/translation.py` — chosen for African coverage (only major API with sw+rw+tw; DeepL/Azure lack them). Cached 30 days; **failure never blocks delivery**. Key: Console → Settings → Platform APIs → `google_translate_api_key` (encrypted). |
| SMS + in-app notifications in user's language | ✅ | 100 | OTP/reset SMS and `notify_user` serve the first supported selected language. |
| UI chrome i18n (dashboard strings) | ⏸ | ~10 | The remaining slice: adopt `next-intl` with dictionaries for en/sw/rw/fr/tw, resolve locale from `user.languages`. The capture + service layers it needs are done. |

## Expansion (post-Kenya)

| Feature | Status | % | Notes |
|---|---|---|---|
| **MTN MoMo rail (Rwanda + Ghana)** | ✅ sandbox-ready | ~85 | `providers/momo.py`, selector-wired, 9 tests against the verified sandbox contract. Needs: portal subscription keys (15-min setup, see `docs/rwanda_ghana_rails_onboarding.md`), and a `pending_settlement` payout state before live (MoMo transfers are async). |
| Bank of Kigali trust-account rail | 🟡 | ~15 | **BK Open API portal + sandbox are live** (developer.bk.rw, launched 2026-03). Founder action: register + due-diligence track. Provider class stubbed in selector (`bk_rw`). |
| Ecobank Ghana trust-account rail | 🟡 | ~15 | Developer portal + sandbox live (developer.ecobank.com; Collection/Payment services). Founder action: register. Provider class stubbed (`ecobank_gh`). |
| Mobile app (Flutter) | ❌ | 0 | Out of scope; web-first. |
| Advanced analytics | 🟡 | ~15 | Endpoints exist; dashboards stubbed. Analytics + audit apps have no tests yet. |

---

## How to resume a deferred (⏸) feature

1. **Multi-group** — drop `one_active_group_per_member` (a migration), re-introduce a `useActiveGroup` selector UI, restore the group switcher removed from `my-group`/meetings/settings pages. Backend membership logic already supports N groups.
2. **A new country rail** — create the provider class under `apps/payments/providers/`, register it in `selector.py`'s map, add the `BankProvider` row via Console, follow the cutover runbook.
3. **WebSocket** — add a short-lived WS-ticket endpoint on the backend; exchange it in `useWebSocket.ts` (the `?token=` query auth no longer works with httpOnly cookies).
4. **Console/Manager shared package** — extract the duplicated shell (auth store, api client, sidebar, layout, terminology) into a workspace package; migrate both apps to the httpOnly proxy pattern at the same time.

## Test coverage snapshot (backend)

141 tests passing. Strong: ledger integrity, contribution/payout/repayment money paths, single-group enforcement, OTP flows, encryption, reconciliation, and the end-to-end golden path. Gaps: `analytics` and `audit` apps have no tests; meetings coverage is thin.
