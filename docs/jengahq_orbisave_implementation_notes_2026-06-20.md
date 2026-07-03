# JengaHQ Implementation Notes for OrbiSave

Date: 2026-06-20  
Scope: implementation notes for the backend/admin wiring added after the JengaHQ research report.

## 1. What Was Wired

Jenga is now modeled as a configurable provider rail, not as the OrbiSave source-of-truth ledger.

The implementation supports:

- Sandbox and live Jenga/Finserve base URLs.
- Super-admin provider records with merchant code, API key, consumer secret, webhook secret, and RSA private key.
- Multiple typed Jenga/Equity accounts per provider:
  - collection
  - payout
  - trust/custody
  - settlement/clearing
  - wallet
  - reconciliation
  - fee/revenue
- Provider transaction evidence models for future reconciliation.
- Statement-line storage for imported Equity/Jenga statements.
- Provider transaction records on collection/payout submission.
- Idempotent provider callback records keyed by payload checksum.
- Endpoint-specific Jenga signature payload construction.
- Account-based STK collection endpoint.
- Mobile-wallet disbursement endpoint.
- Account balance, opening/closing balance, full statement, and transaction-details helper methods.
- IPN Basic Auth verification and legacy HMAC verification.
- Banking-grade ledger stream locks, sequence numbers, event groups, hash verification, non-negative protected streams, and wallet cache invalidation.
- Balanced payout accounting event groups.
- Balanced contribution webhook event groups.

## 2. Files Changed

Backend provider/admin:

- `backend/apps/payments/models.py`
- `backend/apps/payments/providers/jenga.py`
- `backend/apps/payments/migrations/0002_jenga_accounts_provider_evidence.py`
- `backend/apps/payments/tests/test_jenga_provider_contract.py`
- `backend/apps/admin_portal/provider_views.py`
- `backend/apps/admin_portal/tests/test_payment_provider_config.py`

Ledger:

- `backend/apps/ledger/models.py`
- `backend/apps/ledger/services.py`
- `backend/apps/ledger/migrations/0006_banking_standard_ledger_controls.py`
- `backend/apps/ledger/tests/test_ledger_append_service.py`

Financial flows:

- `backend/apps/contributions/views.py`
- `backend/apps/payouts/services.py`
- `backend/apps/payouts/tests/test_payout_idempotency.py`

Console:

- `apps/console/lib/api.ts`
- `apps/console/app/dashboard/payments/new/page.tsx`

## 3. Admin Configuration Model

Configure Jenga through the super-admin provider hub.

Provider fields:

- `provider_code`: `jenga_ke`
- `country`: `kenya`
- `environment`: `sandbox` or `live`
- `api_key`: Jenga API key
- `api_secret`: Jenga consumer secret
- `merchant_code`: Jenga merchant code
- `base_url`:
  - sandbox: `https://uat.finserve.africa`
  - live: `https://api.finserve.africa`
- `webhook_url`: OrbiSave callback/IPN URL registered in Jenga
- `webhook_secret`: IPN password or HMAC secret, depending on callback mode
- `extra_config.rsa_private_key_pem`: RSA private key PEM used to sign request payload strings
- `extra_config.ipn_username`: Basic Auth username configured in JengaHQ IPN settings

Account rows:

- At least one default collection account.
- At least one default payout account.
- One reconciliation account. If omitted, the default collection account is used.
- Optional settlement, wallet, trust, and fee accounts.

## 4. Jenga Endpoint Contract

The provider adapter uses public Jenga/Finserve paths:

- Auth: `/authentication/api/v3/authenticate/merchant`
- M-Pesa/Equitel account-based STK: `/v3-apis/payment-api/v3.0/stkussdpush/initiate`
- Mobile-wallet payout: `/v3-apis/transaction-api/v3.0/remittance/sendmobile`
- Account balance: `/v3-apis/account-api/v3.0/accounts/balances/{countryCode}/{accountId}`
- Opening/closing balance: `/v3-apis/account-api/v3.0/accounts/accountBalance/query`
- Full statement: `/v3-apis/account-api/v3.0/accounts/fullStatement`
- Transaction details: `/v3-apis/transaction-api/v3.0/transactions/details/{ref}`

Each endpoint signs the exact concatenated payload required by Jenga docs. Tests cover the signature strings for the important Kenya flows.

## 5. Provider Finality Rules

Collections:

- Initial STK acknowledgement returns `pending_async`.
- Do not credit final member/group balances on initiation.
- Credit only when callback/IPN/query confirms final success.

Payouts:

- Mobile-wallet send acknowledgement returns `provider_processing`.
- Do not treat Jenga acknowledgement as final settlement.
- Existing mock providers can still return `success` for local tests.

## 6. Ledger Standard

The ledger now has:

- `LedgerStreamLock`: one lock row per `(group, account_stream, currency)`.
- `LedgerEventGroup`: groups entries for one financial business event.
- `LedgerEntry.sequence_number`: monotonic stream sequence.
- `LedgerEntry.previous_hash` and `LedgerEntry.hash`: canonical SHA-256 chain.
- `verify_ledger_stream(...)`: recomputes hashes, previous hashes, balances, and sequence continuity.
- `close_ledger_event_group(...)`: refuses to close unbalanced event groups.

Protected streams cannot go negative unless explicitly allowed:

- rotation
- savings
- loaning

Provider/clearing streams may be used to represent external settlement timing.

## 7. Payout Accounting

A completed rotation payout now writes a balanced event group:

- Debit `rotation` for gross payout.
- Credit `company_revenue` for platform service fee.
- Credit `provider_settlement` for net disbursement payable to provider/member.

This replaces the old one-entry payout ledger behavior.

## 8. Contribution Accounting

A successful contribution webhook now writes one balanced event group:

- Debit `provider_settlement` for actual settled amount.
- Credit `savings` for mandatory savings allocation.
- Credit `loaning` for loan pool allocation.
- Credit `rotation` for rotation allocation.

Amount mismatch still freezes to suspense through the existing exception path.

## 9. Sandbox Checklist

When sandbox credentials are ready:

1. Add a `jenga_ke` sandbox provider in the console.
2. Paste Jenga API key, consumer secret, merchant code, RSA private key, IPN username/password.
3. Add collection and payout account numbers from the Jenga testing resources.
4. Click provider test to validate authentication.
5. Trigger one STK collection in sandbox.
6. Confirm initiation returns `pending_async`.
7. Deliver or simulate callback/IPN.
8. Verify contribution ledger event group closes balanced.
9. Query account balance and full statement.
10. Match statement line to provider transaction and ledger event group.
11. Trigger one payout in sandbox.
12. Keep payout as processing until final Jenga status confirms settlement.

## 10. Remaining Production Work

The current implementation is a strong foundation, but these still need follow-up before live money:

- Update `ProviderTransaction` final statuses from callback and polling paths.
- Add scheduled transaction-details polling for stuck provider transactions.
- Add statement import job using `ProviderStatementLine`.
- Add reconciliation matching dashboard.
- Add final payout-settlement callback handler that releases or reverses provider-settlement balances.
- Move provider secrets to encrypted fields or a secrets manager before production.
- Add role-based approval for ledger adjustments and reversals.
- Add blue/green migration runbooks for the new finance tables.

## 11. Verification Run

The following backend verification passed after implementation:

```powershell
$env:SECRET_KEY='django-insecure-dev-key'
.\venv\Scripts\python.exe -m pytest -q
```

Result:

```text
89 passed
```

Additional checks:

```powershell
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py makemigrations --check --dry-run
npm run build
```

Results:

- Django system check: no issues.
- Migration dry-run: no changes detected.
- Console production build: passed.
