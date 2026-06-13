# Orbisave P0 Implementation Checklist

Date started: 2026-06-11  
Branch: `codex/p0-security-foundation`

This checklist tracks the step-by-step execution of the P0 stabilization plan. Items are checked only after code is implemented and targeted verification has run.

## Section 1: Account Self-Update Safety

- [x] Add regression tests proving users cannot self-edit sensitive account fields.
- [x] Add a dedicated profile update serializer that only permits safe profile fields.
- [x] Wire the profile update endpoint to the dedicated serializer.
- [x] Verify targeted account security tests pass.

## Section 2: Admin Account Onboarding Safety

- [x] Replace immediate-token public admin registration with pending email-code verification.
- [x] Enforce `@averissystems.com` admin email domain.
- [x] Preserve owner bootstrap for `emanuel@averissystems.com`.
- [x] Block non-owner self-service super-admin creation pending owner invitation flow.
- [x] Verify admin onboarding tests pass.

## Section 3: Country Routing and Regional Isolation

- [x] Remove trust in client-controlled `X-Country` for authenticated writes.
- [x] Derive authenticated request country from server-owned user scope.
- [x] Add tests proving malicious country headers cannot reroute authenticated requests.

## Section 4: Group Creation and KYC Gate

- [x] Allow existing members to start create-chama flow at the backend API level.
- [x] Add pending chairperson membership state until KYC and country-admin approval.
- [x] Add frontend My Groups create-chama dialog wizard.
- [x] Require fresh login/session refresh before chairperson actions unlock.
- [x] Add mandatory savings fields to group setup.
- [ ] Verify create-chama dialog in browser with a responsive backend/login session.

## Section 5: Money Movement State Machines

- [x] Make payout execution derive recipients from the rotation schedule.
- [x] Enforce active verified group leadership on payout execution.
- [x] Formalize full rotational payout states and grace-period automation.
- [x] Formalize loan approval/disbursement states.
- [x] Add transaction PIN checks and 3-attempt lockout where missing.
- [x] Ensure loan disbursement is distinct from internal approval.

## Section 6: Ledger, Suspense, and Reconciliation

- [x] Introduce protected append-only ledger write service.
- [x] Model account streams: rotation, savings, loaning, company revenue, suspense, provider settlement.
- [x] Add mismatch fail-closed behavior.
- [x] Add reconciliation skeleton for ledger/provider/bank matching.

## Section 7: Build and Test Health

- [x] Restore backend targeted tests for changed areas.
- [ ] Restore all backend tests or document pre-existing blockers.
- [x] Restore member frontend production build.
- [ ] Restore console frontend production build.
- [ ] Restore manager frontend production build.
- [ ] Add or document CI gates.
