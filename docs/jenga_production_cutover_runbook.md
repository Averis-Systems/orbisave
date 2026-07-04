# Jenga (Equity Bank Kenya) — Production Cutover Runbook

**Scope:** moving OrbiSave's Kenya payment rail from Jenga **sandbox** to **live**.
Rwanda/Ghana will follow this same runbook once their bank APIs are onboarded.

**Owner:** Emanuel (super admin). **Prerequisite reading:** `FEATURES.md`, the
golden-path E2E (`backend/tests/test_golden_path_e2e.py`) — the executable
definition of a working money path.

---

## 0. Invariants that must hold before, during, and after cutover

1. `python manage.py verify_ledger --strict` exits 0 (hash chains, sequences, balances).
2. CI fully green, including the golden-path E2E.
3. `node scripts/check-ledger-writes.mjs` passes (single ledger write path).
4. No open (unbalanced) `LedgerEventGroup` rows.
5. `FIELD_ENCRYPTION_KEY` is set in production and is NOT derived from `SECRET_KEY`.

## 1. Credentials & configuration (all via Console → Provider Hub; nothing in env files)

- [ ] Obtain LIVE Jenga API credentials from Equity JengaHQ: consumer key,
      consumer secret, merchant code, and the RSA keypair registered with Jenga.
- [ ] Create a NEW BankProvider row: `provider_code=jenga_ke`, `environment=live`,
      `status=testing` (NOT active yet). Enter api_key/api_secret/private key
      (extra_config) — all Fernet-encrypted at rest; reads only expose has_* flags.
- [ ] Add the live accounts: collection account, payout/B2C account, and the
      reconciliation account (set `is_default_for_reconciliation=true`).
      These are the TRUST accounts — confirm account numbers against the bank
      mandate letter, not memory.
- [ ] Run "Test Connection" from the Console; expect a signed balance query to
      succeed against the live base URL.

## 2. Webhooks / IPN registration with Equity

- [ ] Generate a fresh webhook secret (Console) for the live provider row.
- [ ] Register with Jenga the callback URLs:
      - Collections: `https://<api-host>/api/v1/contributions/webhook/kenya/mpesa/`
      - Loan repayments: `https://<api-host>/api/v1/loans/webhook/kenya/mpesa/`
- [ ] Confirm signature mode with Equity (HMAC `X-Jenga-Signature` or IPN Basic
      Auth) and store the matching secret. Replay protection is automatic
      (`ProviderCallback` dedupes on payload checksum).
- [ ] Fire Jenga's test IPN; verify a `ProviderCallback` row lands, is linked to
      a `ProviderTransaction`, and advances its status.

## 3. Rehearsal (sandbox row still active; live row in `testing`)

- [ ] Shilling test with REAL money, tiny amounts, on the live row flipped to
      `active` for a single pilot group only (create a dedicated internal pilot
      chama with staff phones):
      1. Contribution STK push of KES 10 → approve on phone → webhook confirms
         → ledger splits (verify in Manager → group ledger).
      2. `poll_stuck_provider_transactions` — kill the webhook (temporarily
         wrong secret), repeat a KES 10 push, confirm the poller settles it
         within 15 minutes, restore the secret.
      3. Rotation payout of the pooled KES → money arrives on a staff phone.
      4. Micro-loan: request → approvals → disburse (B2C arrives) → repay both
         installments → loan `repaid`.
      5. Next morning: `import_daily_statements` ran; every movement matched;
         zero orphan reconciliation items; closing balance recorded.
- [ ] `python manage.py verify_ledger --strict` — still exit 0.

## 4. Kill-switch drill (MANDATORY before go-live)

- [ ] In Console, toggle the live provider row `active → inactive`.
- [ ] Attempt a contribution: expect a clean 502 "provider rejected" — NOT a
      crash, NOT a silent success.
- [ ] Toggle back to `active`; contribution succeeds.
- [ ] Time the drill: from decision to money-stopped must be under 2 minutes.

## 5. Go-live

- [ ] Announce a change window. Set sandbox row `inactive`, live row `active`.
- [ ] Watch structured logs for: `webhook_signature_forged` (mis-registered
      secret), `stuck_tx_poll_complete` escalations, `sms_send_failed`.
- [ ] First 48h: run `verify_ledger --strict` twice daily (it also runs on the
      6-hour beat as `verify_all_ledger_streams` — check its logs).
- [ ] Confirm `generate_daily_checkpoints` sealed day 1 (Merkle checkpoint rows).

## 6. Rollback

Rollback = flip the live BankProvider row to `inactive` (kill switch). There is
no schema rollback: money already moved stays on the ledger (append-only), and
in-flight `initiated` contributions/repayments either settle via late webhooks/
poller or age into `manual_review` for the reconciliation queue. Never delete
rows to "undo" — post compensating entries via the reconciliation flow.

## 7. Known deferred items (do NOT block cutover, DO track)

- Manager/Console clients must send `X-Country` (Phase 5 shared client) —
  admin financial lookups currently use explicit multi-alias resolution.
- WebSocket live updates disabled (needs ticket auth) — polling covers it.
- Rwanda/Ghana rails: repeat this runbook with their provider rows.
