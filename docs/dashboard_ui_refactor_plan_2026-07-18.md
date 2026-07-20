# OrbiSave Member Dashboard — UI Refactor Plan

**Date:** 2026-07-18 · **Owner:** Emanuel · **Scope:** `frontend/app/dashboard/*` (member app, port 3000)
**Guardrail:** Presentation/IA work only. The ledger/money core is untouched (see `FEATURES.md`, `project-orbisave-production-readiness`). No backend scope creep.

## Problem

The dashboard is well-wired to real data, but the **presentation layer has drifted**:

1. **Two visual languages.** `overview`/`savings` use the calm flat-5px, `font-semibold`, `text-gray-800/500` system. `reports`/`my-loans`/`members`/`fines` were stuck in an aggressive treatment — `font-black`, `uppercase tracking-widest`, `text-[8/9/10px]` micro-caps. Reads as two different apps.
2. **Dead affordances.** Overview `StatisticsChart` is a permanent empty placeholder; `⋯` menus, "Filter", "See all", period toggles do nothing. Reports "Export" was a fake `toast`.
3. **Thin/stub pages.** `savings` (74 lines) is two static cards. Missing conditional states — e.g. loan pool "not yet active".

## Design system (locked)

- **Brand:** green `#00ab00` (hover `#009200`, tint `#e9f3ed`), navy `#0a2540`. Font: Montserrat (unchanged).
- **Radius:** 5px cap (flat banking) — already enforced in `tailwind.config.ts`.
- **Type discipline:** headings `font-semibold text-gray-900`; body `text-sm text-gray-500`; eyebrows `text-xs font-medium uppercase tracking-wide`; **min 12px** — no micro-caps. Tabular figures for money/counts.
- Grounded via the `ui-ux-pro-max` skill (fintech/banking, data-dense, low variance). Its "Exaggerated Minimalism" style rec was rejected as wrong for banking; typography discipline + "avoid unclear fees / playful" guidance kept.

## Shared primitives — `components/dashboard/ui/index.tsx` ✅ DONE

Single source of truth every page imports: `PageHeader`, `SectionCard`, `StatCard`, `TrendBadge`, `Tabs`, `StatusBadge` (one semantic status→tone map), `DataTable`, `EmptyState`, `LockedState`, `CardMenuLink`, `IconButton`. No dead icon buttons — affordances link or act.

## Progress

| Page | Status | Notes |
|---|---|---|
| Primitives layer | ✅ Done | `components/dashboard/ui/` |
| `reports` | ✅ Done | On primitives; **real CSV export** (per-tab) replaces fake toast |
| `my-loans` | ✅ Done | On primitives; **loan-pool-inactive `LockedState`** with honest unlock steps (no fake vote button); tabs/empty states kept |
| `fines` | ✅ Done | On primitives; governance/voting copy kept as UI-ready-pending-backend |
| `members` | ✅ Done | On primitives; search/filter/table/inspector/invite logic preserved |
| `overview` `StatisticsChart` | ⏳ Next | Wire to real contribution-vs-payout history, or remove; kill dead buttons |
| `savings` | ⏳ Next | Build into a real page: balance, cycle history, trend |
| `contributions`, `rotations`, `meetings`, `profile`, `settings`, `my-group` | ⏳ Backlog | Verify against primitives; most already calm |

Verification: `tsc --noEmit` clean across the frontend after every page. Full logged-in visual verification is **blocked** — DB wiped (no seeded member account), so screenshots of the rendered dashboard need a bootstrap account first.

## Backend follow-ups this surfaced (need founder greenlight — not built)

- **Member-vote loan-pool activation.** There is *no* voting mechanism in the backend today (`apps/loans`, `apps/groups` have none). The pool currently derives from `loan_pool_pct` of the wallet + group `status`. The my-loans `LockedState` reflects that real condition. A true member-vote governance gate = new models + endpoints + quorum/majority rules + tests. Same gap underlies the `fines` "Rule Proposals" tab (drafts a proposal but posts nowhere).
- **Movement stats** for real trend badges (needs wallet history series).
- **Wallet-history endpoint** for the overview statistics chart.

## Next session

1. Overview truthfulness (StatisticsChart + dead buttons).
2. `savings` buildout.
3. Decide on the loan-pool voting backend (governance app) — or keep the honest locked state.
