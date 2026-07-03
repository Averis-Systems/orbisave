# JengaHQ / Equity Bank Kenya API Integration and Ledger Strategy Report

Date: 2026-06-20  
Workspace: `C:\Users\ADMIN\Desktop\Orbisave App\orbisave`  
Primary source: Jenga Developer Hub at `https://developer.jengahq.io/`  
Scope: Kenya-focused Equity Bank/Jenga integration research for OrbiSave, with emphasis on collections, payouts, account services, reconciliation, security, and whether Jenga's "ledger-like" surfaces should replace or complement OrbiSave's internal ledger.

## 1. Executive Decision

Do not replace OrbiSave's internal ledger with Jenga.

Use Jenga as:

1. A bank/payment rail for Kenya collections and payouts.
2. A settlement account and provider-of-record for external money movement.
3. A reconciliation source through account balances, full statements, opening/closing balances, transaction details, callbacks, and Jenga Wallet settlement information.

Keep and harden OrbiSave's own ledger as:

1. The product ledger for member balances, group pools, loan balances, rotation allocations, fees, adjustments, reversals, and internal accounting.
2. The immutable audit trail for business events.
3. The source of truth for what OrbiSave believes each member/group is owed.
4. The bridge between user intent and external settlement confirmation.

The public Jenga docs do not expose a full subledger API where OrbiSave can create internal ledger accounts for each member/group, enforce double-entry postings, lock balances, and maintain OrbiSave-specific obligations. What they do expose is account-level banking data and transaction history. That is valuable, but it is not enough to run OrbiSave's product accounting.

## 2. Key Findings

### 2.1 Jenga Is a Strong Kenya Rail Candidate

Jenga provides the exact classes of services OrbiSave needs for Kenya:

- Receive money from M-Pesa and Equitel.
- Send money to mobile wallets.
- Send money within Equity Bank.
- Send money to Kenyan banks through PesaLink.
- Send RTGS payments.
- Query account balances.
- Query mini and full account statements.
- Query transaction status/details.
- Receive IPN/callback notifications.
- Validate Equity accounts.
- Use sandbox/test credentials and test accounts.

Primary docs:

- [Jenga Developer Hub](https://developer.jengahq.io/)
- [Developer Quickstart](https://developer.jengahq.io/guides/get-started/developer-quickstart)
- [Generate Signature](https://developer.jengahq.io/guides/get-started/generate-signature)
- [Testing Resources](https://developer.jengahq.io/guides/testing/testing-resources)

### 2.2 The "Ledger" Is Really Account Services + Wallet/Statement Surfaces

I searched the public Jenga docs for a dedicated ledger API and did not find a customer-subledger product in the public documentation. The relevant ledger-like features are:

- Account Balance API.
- Mini Statement API.
- Full Statement API.
- Opening and Closing Account Balance API.
- Transaction Details API.
- Jenga Wallet settlement for wallet-based M-Pesa STK.
- IPN and callback records.

These can help OrbiSave reconcile money movement, but they should not be treated as a replacement for OrbiSave's product ledger.

### 2.3 OrbiSave Must Tighten Its Ledger Before Integration

The earlier OrbiSave QA found serious ledger risks:

- Ledger append concurrency can fork hash chains.
- Wallet cache can become stale.
- Payout fee/provider accounting is incomplete.
- Future adjustment workflow is incomplete.

Jenga will not remove these risks. In fact, integrating with a real bank rail makes them more urgent. Jenga will confirm external transactions, but it will not know OrbiSave's internal allocation rules for savings, loaning pool, rotation pool, penalties, member balances, and service fees.

## 3. Jenga Architecture Overview

### 3.1 Environments

Jenga uses separate UAT and live endpoints:

- UAT base: `https://uat.finserve.africa`
- Live base: `https://api.finserve.africa`

Examples from docs:

- Authentication UAT: `https://uat.finserve.africa/authentication/api/v3/authenticate/merchant`
- Authentication live: `https://api.finserve.africa/authentication/api/v3/authenticate/merchant`
- Account balance UAT: `https://uat.finserve.africa/v3-apis/account-api/v3.0/accounts/balances/{countryCode}/{accountId}`
- Account balance live: `https://api.finserve.africa/v3-apis/account-api/v3.0/accounts/balances/{countryCode}/{accountId}`

Source: [Developer Quickstart](https://developer.jengahq.io/guides/get-started/developer-quickstart), [Account Balance](https://developer.jengahq.io/api-explorer/account-services/account-balance)

### 3.2 Credentials

Jenga exposes three important credentials:

- Merchant Code.
- Consumer Secret.
- API Key.

Authentication requires:

- Header: `Content-Type: application/json`
- Header: `Api-Key: <api key>`
- Body: `merchantCode`
- Body: `consumerSecret`

Response includes:

- `accessToken`
- `refreshToken`
- `expiresIn`
- `issuedAt`
- `tokenType`

Source: [Developer Quickstart](https://developer.jengahq.io/guides/get-started/developer-quickstart)

### 3.3 Signatures

Most Jenga API calls require a `Signature` header.

The mechanism is:

1. Generate RSA private/public key pair.
2. Upload public key in JengaHQ.
3. Concatenate endpoint-specific request fields in the exact documented order.
4. Sign the concatenated string with the private key using SHA-256 / RSA PKCS#1 v1.5 style signing.
5. Base64 encode the signature.
6. Send it in the `Signature` or `signature` header.

Important: each endpoint has a different signature formula. Do not create one generic serializer without endpoint-specific test fixtures.

Source: [Generate Signature](https://developer.jengahq.io/guides/get-started/generate-signature)

### 3.4 Supported Countries

Jenga documents services across:

- Kenya: `KE`
- Uganda: `UG`
- Tanzania: `TZ`
- Rwanda: `RW`
- DRC: `DRC`
- South Sudan: `SS`
- Ethiopia: `ET` in supported entities overview

For OrbiSave's current Kenya priority, the main currency is `KES`.

Source: [Supported Entities](https://developer.jengahq.io/guides/jenga-api/introduction/supported-entities)

## 4. Kenya Integration Surface Map

### 4.1 Receive Money: M-Pesa STK / USSD Push, Account-Based Settlement

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/payment-api/v3.0/stkussdpush/initiate`
- Live: `POST https://api.finserve.africa/v3-apis/payment-api/v3.0/stkussdpush/initiate`

Purpose:

- Initiate M-Pesa STK/USSD push to a customer.
- Settlement is directly to the merchant account supplied in the request.

Important fields:

- `merchant.countryCode`
- `merchant.accountNumber`
- `merchant.name`
- `payment.ref`
- `payment.mobileNumber`
- `payment.telco`
- `payment.amount`
- `payment.currency`
- `payment.date`
- `payment.callBackUrl`
- `payment.pushType`

Signature formula:

```text
merchant.accountNumber + payment.ref + payment.mobileNumber + payment.telco + payment.amount + payment.currency
```

Initial response pattern:

- `status: true`
- `code: -1`
- `message: Transaction has been successfully acknowledged, await final transaction status on callback`
- `reference`
- `transactionId`

Callback codes:

- `0`: pending.
- `1`: failed.
- `2`: successful but awaiting third-party/manual settlement.
- `3`: completed/credited.
- `4`: successful but failed to credit merchant account.
- `5`: cancelled.
- `6`: cancelled.
- `7`: rejected.

OrbiSave use:

- Member contribution collection.
- Group joining payment if needed.
- Penalty/fine collection if collected through STK.

Recommended OrbiSave handling:

- Create `ProviderTransaction` on initiation with state `initiated`.
- Do not credit member ledger on initial `code: -1`.
- Credit member ledger only when callback or IPN confirms a final successful credited state.
- Treat callback code `2` and `4` as suspense/settlement exception, not as final contribution credit.
- Use `payment.ref` as provider idempotency key, but generate a longer internal idempotency key because docs say some account-based references currently support only short alphanumeric references.

Source: [M-Pesa STK Push Account-Based Settlement](https://developer.jengahq.io/guides/jenga-api/receive-money/mpesa-stk-push/account-based-settlement)

### 4.2 Receive Money: M-Pesa STK, Wallet-Based Settlement

Endpoint:

- UAT: `POST https://uat.finserve.africa/api-checkout/mpesa-stk-push/v3.0/init`
- Live: `POST https://api.finserve.africa/api-checkout/mpesa-stk-push/v3.0/init`

Purpose:

- Initiate M-Pesa STK/USSD push.
- Funds are credited to Jenga Wallet, from which the merchant can settle to bank accounts onboarded on Jenga.
- Docs say funds are available for settlement in real time.

Important fields:

- `order.orderReference`
- `order.orderAmount`
- `order.orderCurrency`
- `order.source`
- `order.countryCode`
- `order.description`
- `customer.name`
- `customer.email`
- `customer.phoneNumber`
- `customer.identityNumber`
- `payment.paymentReference`
- `payment.paymentCurrency`
- `payment.channel`
- `payment.service`
- `payment.provider`
- `payment.callbackUrl`
- `payment.details.msisdn`
- `payment.details.paymentAmount`

Signature formula:

```text
order.orderReference + payment.paymentCurrency + payment.details.msisdn + payment.details.paymentAmount
```

Important callback guidance:

- The docs explicitly warn not to make the final decision solely from the first M-Pesa confirmation callback.
- The docs recommend registering a callback URL under JengaHQ Settings > IPNs for the complete confirmation that payment was processed successfully by both M-Pesa and Jenga.

OrbiSave use:

- This mode is attractive if OrbiSave wants collections to land in a Jenga-controlled wallet first, then sweep/settle to an Equity account.
- It may simplify settlement routing but introduces another balance surface: Jenga Wallet.

Recommendation:

- Prefer account-based settlement first if direct settlement to the configured Equity collection account is available and operationally acceptable.
- Consider wallet-based settlement only if Jenga Wallet gives useful operational controls, reporting, or settlement flexibility not available through direct account settlement.
- If wallet-based settlement is used, OrbiSave needs a `jenga_wallet` clearing stream in its own ledger.

Source: [M-Pesa STK Push Wallet-Based Settlement](https://developer.jengahq.io/api-explorer/receive-money/mpesa-stk-push/wallet-based-settlement/mpesa-stk-push-init)

### 4.3 Query M-Pesa Wallet-Based Order Status

Endpoint:

- UAT: `GET https://uat.finserve.africa/api-checkout/mpesa-stk-push/v3.0/status/order/{orderReference}`
- Live: `GET https://api.finserve.africa/api-checkout/mpesa-stk-push/v3.0/status/order/{orderReference}`

Purpose:

- Query real-time order status for wallet-based M-Pesa STK orders.

Response includes:

- `data.order.orderAmount`
- `data.order.amountPaid`
- `data.order.orderReference`
- `data.order.orderStatus`

Known status examples:

- `Paid`
- `Pending`

OrbiSave use:

- Polling fallback if callback/IPN is delayed.
- Reconciliation job for stuck provider transactions.

Source: [Query Order Status](https://developer.jengahq.io/guides/jenga-api/receive-money/mpesa-stk-push/query-order-status)

### 4.4 Receive Money: Equitel STK / USSD Push

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/payment-api/v3.0/stkussdpush/initiate`
- Live: `POST https://api.finserve.africa/v3-apis/payment-api/v3.0/stkussdpush/initiate`

Purpose:

- Initiate STK or USSD push for Equitel payment.

Signature formula:

```text
merchant.accountNumber + payment.ref + payment.mobileNumber + payment.telco + payment.amount + payment.currency
```

Response and callback behavior is similar to M-Pesa account-based STK/USSD.

OrbiSave use:

- Alternative collection channel for Equity/Equitel users.

Source: [Equitel STK/USSD Push](https://developer.jengahq.io/api-explorer/receive-money/equitel-stk-ussd-push/Equitel-stk-ussd-push)

### 4.5 Send Money: To Mobile Wallets

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/transaction-api/v3.0/remittance/sendmobile`
- Live: `POST https://api.finserve.africa/v3-apis/transaction-api/v3.0/remittance/sendmobile`

Purpose:

- Send money to mobile wallets across Kenya, Uganda, Tanzania, and Rwanda.
- Docs note that to get a response, testing this may need production.

Important fields:

- `source.countryCode`
- `source.name`
- `source.accountNumber`
- `destination.type`
- `destination.countryCode`
- `destination.name`
- `destination.mobileNumber`
- `destination.walletName`
- `transfer.type`
- `transfer.amount`
- `transfer.currencyCode`
- `transfer.reference`
- `transfer.date`
- `transfer.description`
- `transfer.callbackUrl`

Signature formula:

```text
transfer.amount + transfer.currencyCode + transfer.reference + source.accountNumber
```

Initial response pattern:

- `status: true`
- `code: -1`
- await final callback

OrbiSave use:

- Rotation payouts to members.
- Loan disbursements to mobile money.
- Refunds.

Recommendation:

- Treat send-mobile as asynchronous.
- Move OrbiSave business object to `provider_processing`, not `completed`, on `code: -1`.
- Complete payout/loan disbursement ledger only when final callback or transaction-details query confirms success.
- If funds leave bank account before final receiver confirmation, use a provider clearing stream.

Source: [Send Money to Mobile Wallets](https://developer.jengahq.io/api-explorer/send-money/mobile-wallets)

### 4.6 Send Money: Within Equity Bank

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/transaction-api/v3.0/remittance/internalBankTransfer`
- Live: `POST https://api.finserve.africa/v3-apis/transaction-api/v3.0/remittance/internalBankTransfer`

Purpose:

- Move funds within Equity Bank across Kenya, Uganda, Tanzania, Rwanda, DRC, and South Sudan.

Signature formula:

```text
source.accountNumber + transfer.amount + transfer.currencyCode + transfer.reference
```

Example successful response:

- `status: true`
- `code: 0`
- `reference`
- `data.transactionId`
- `data.status: SUCCESS`

OrbiSave use:

- Payouts to members with Equity accounts.
- Potentially settlement movements between OrbiSave-controlled Equity accounts.

Recommendation:

- This may be the cleanest payout path when members have Equity accounts.
- Still record the provider response as external settlement evidence and reconcile against account statements.

Source: [Within Equity Bank](https://developer.jengahq.io/api-explorer/send-money/within-equity)

### 4.7 Send Money: PesaLink Bank Account

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/transaction-api/v3.0/remittance/pesalinkacc`
- Live: `POST https://api.finserve.africa/v3-apis/transaction-api/v3.0/remittance/pesalinkacc`

Purpose:

- Send money to PesaLink participating banks.
- Docs say this is restricted to Kenya.

Signature formula:

```text
transfer.amount + transfer.currencyCode + transfer.reference + destination.name + source.accountNumber
```

OrbiSave use:

- Payouts or refunds to Kenyan bank accounts outside Equity.

Recommendation:

- Require bank account validation before first payout.
- Store destination bank code and account holder name.
- Reconcile by `transfer.reference`, `transactionId`, amount, and statement line.

Source: [PesaLink Bank Account](https://developer.jengahq.io/guides/jenga-api/send-money/pesalink-bankaccount)

### 4.8 Send Money: RTGS

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/transaction-api/v3.0/remittance/rtgs`
- Live: `POST https://api.finserve.africa/v3-apis/transaction-api/v3.0/remittance/rtgs`

Purpose:

- Intra-country bank transfers through RTGS.

Important constraints:

- Docs state RTGS is available weekdays between 9am and 3pm.
- Requests outside those hours may be queued to the next window.
- Transactions may be subject to CDD, KYC, and CFT checks.

Signature formula:

```text
transfer.reference + transfer.date + source.accountNumber + destination.accountNumber + transfer.amount
```

OrbiSave use:

- Larger business/treasury movements.
- Not ideal for instant member payouts due timing windows.

Recommendation:

- Add a channel capability matrix in OrbiSave: supports instant? supports callback? supports queued settlement? max amount? operating hours?
- RTGS business object states must support `queued`.

Source: [RTGS](https://developer.jengahq.io/api-explorer/send-money/rtgs)

## 5. Account Services and Reconciliation APIs

### 5.1 Account Balance

Endpoint:

- UAT: `GET https://uat.finserve.africa/v3-apis/account-api/v3.0/accounts/balances/{countryCode}/{accountId}`
- Live: `GET https://api.finserve.africa/v3-apis/account-api/v3.0/accounts/balances/{countryCode}/{accountId}`

Purpose:

- Retrieve current and available balance for an account.

Signature formula:

```text
countryCode + accountId
```

Response includes:

- `data.currency`
- `data.balances[]`
- balance `amount`
- balance `type`, such as `Available` and `Current`

OrbiSave use:

- Treasury dashboard.
- Pre-flight payout checks.
- Daily reconciliation.

Important limitation:

- Account balance is not a product ledger. It only says what the bank account currently has. It does not say how funds should be allocated among groups/members.

Source: [Account Balance](https://developer.jengahq.io/api-explorer/account-services/account-balance)

### 5.2 Mini Statement

Endpoint:

- UAT: `GET https://uat.finserve.africa/v3-apis/account-api/v3.0/accounts/miniStatement/{countryCode}/{accountNumber}`
- Live: `GET https://api.finserve.africa/v3-apis/account-api/v3.0/accounts/miniStatement/{countryCode}/{accountNumber}`

Purpose:

- Retrieve last 10 transactions for an account.

Signature formula:

```text
countryCode + accountNumber
```

Response includes:

- `accountNumber`
- `currency`
- `balance`
- `transactions[]`
- transaction `date`
- transaction `description`
- transaction `amount`
- transaction `type`, such as `Debit` or `Credit`

OrbiSave use:

- Fast recent reconciliation.
- Customer support checks.
- Incident triage.

Limitation:

- Last 10 transactions are not enough for daily settlement proof. Use full statement for formal reconciliation.

Source: [Account Mini Statement](https://developer.jengahq.io/api-explorer/account-services/account-ministatement)

### 5.3 Full Statement

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/account-api/v3.0/accounts/fullStatement`
- Live: `POST https://api.finserve.africa/v3-apis/account-api/v3.0/accounts/fullStatement`

Purpose:

- Retrieve full transaction set for an account over a date range.

Important request fields:

- `countryCode`
- `accountNumber`
- `fromDate`
- `toDate`
- `limit`
- `reference`
- `serial`
- `postedDateTime`
- `date`
- `runningBalance`

Signature formula:

```text
accountNumber + countryCode + toDate
```

Response transaction fields include:

- `reference`
- `date`
- `amount`
- `serial`
- `description`
- `postedDateTime`
- `type`
- `runningBalance`
- `transactionId`

This is the most important Jenga "ledger-like" endpoint for OrbiSave.

OrbiSave use:

- Daily settlement reconciliation.
- Provider statement import.
- External bank-account proof.
- Matching credits/debits against OrbiSave ledger event groups.

Recommendation:

- Build a `ProviderStatementLine` ingestion model.
- Use `(provider, account_number, transactionId, serial, postedDateTime, amount, type)` as a dedupe key, with fallback matching on reference/date/amount when transaction ID quality is inconsistent.
- Never mutate OrbiSave ledger entries from statement import. Use statement import to mark matched/unmatched/reversed/exception.

Source: [Account Full Statement](https://developer.jengahq.io/api-explorer/account-services/account-fullstatement)

### 5.4 Opening and Closing Account Balance

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/account-api/v3.0/accounts/accountBalance/query`
- Live: `POST https://api.finserve.africa/v3-apis/account-api/v3.0/accounts/accountBalance/query`

Purpose:

- Retrieve opening and closing balance for an account on a given date.

Signature formula:

```text
accountId + countryCode + date
```

OrbiSave use:

- Daily reconciliation control totals.
- Verify that imported statement lines explain movement from opening to closing balance.

Recommended reconciliation equation:

```text
bank_opening_balance
+ sum(bank_statement_credits)
- sum(bank_statement_debits)
= bank_closing_balance
```

Then compare bank movement to OrbiSave provider clearing / cash ledger movement.

Source: [Opening and Closing Account Balance](https://developer.jengahq.io/api-explorer/account-services/opening-closing-balance)

### 5.5 Account Inquiry

Endpoint:

- UAT: `GET https://uat.finserve.africa/v3-apis/account-api/v3.0/search/{countryCode}/{accountNumber}`

Purpose:

- Retrieve Equity account details.

Signature formula:

```text
countryCode + accountNumber
```

Response includes:

- account branch code
- account number
- currency
- account status
- customer name
- customer ID
- customer type

OrbiSave use:

- Validate member Equity account before payout.
- Validate OrbiSave collection/settlement account health.

Source: [Account Inquiry](https://developer.jengahq.io/api-explorer/account-services/account-inquiry)

### 5.6 Account Validate / Inquiry All Accounts

Endpoint:

- UAT: `POST https://uat.finserve.africa/v3-apis/account-api/v3.0/account/validate`
- Live: `POST https://api.finserve.africa/v3-apis/account-api/v3.0/account/validate`

Purpose:

- Validate Equity bank accounts.

Signature formula:

```text
countryCode + accountNumber + accountFullName
```

Response codes include:

- `0`: request processed successfully.
- `104101`: request successful but account validation failed.
- `900100`: invalid signature.
- `401`, `401101`: unauthorized/access restricted.

OrbiSave use:

- Validate payout destination bank account and full name.
- Reduce failed payouts and wrong-recipient risk.

Source: [Account Inquiry All Accounts](https://developer.jengahq.io/api-explorer/account-services/account-inquiry-all-accounts)

### 5.7 Query Transaction Details

Endpoint:

- UAT: `GET https://uat.finserve.africa/v3-apis/transaction-api/v3.0/transactions/details/{ref}`
- Live: `GET https://api.finserve.africa/v3-apis/transaction-api/v3.0/transactions/details/{ref}`

Purpose:

- Query transaction details and status.

Signature formula:

```text
ref
```

Response state codes:

- `2`: successful transaction.
- `1`: failed transaction.
- `-1`: awaiting callback response.

Important nuance:

- The API call itself can return `status: true` and `message: success` while the underlying transaction is failed. OrbiSave must inspect `data.state` and `data.stateCode`, not only HTTP status or top-level `status`.

OrbiSave use:

- Fallback polling when callbacks are delayed.
- Reconciliation of stuck payout/collection records.
- Support tooling.

Source: [Query Transaction Details](https://developer.jengahq.io/api-explorer/receive-money-queries/query-transaction-details)

## 6. Instant Payment Notifications

Jenga IPNs are configured in JengaHQ:

1. Sign in to JengaHQ.
2. Go to Settings.
3. Choose IPN.
4. Add callback URL, username, and password.

Security model:

- Jenga expects the callback URL to use Basic Auth with the configured username/password.

IPN payload includes:

- `callbackType`
- customer name/mobile/reference
- transaction date/reference/payment mode/amount/currency/bill number/order amount/service charge/order currency/status/remarks
- bank reference/transaction type/account

Payment modes include:

- `CARD`
- `MPESA`
- `PWE`
- `EQUITEL`
- `PAYPAL`

Status includes:

- `SUCCESS`
- `FAILED`

OrbiSave recommendation:

- Do not rely on Basic Auth alone. Also implement:
  - HTTPS-only callback endpoint.
  - IP allowlist if Jenga provides stable IP ranges.
  - replay protection using provider reference + timestamp.
  - raw body storage with checksum.
  - strict schema validation.
  - idempotent processing.
  - asynchronous processing after immediate 200 response.

Source: [Instant Payment Notifications](https://developer.jengahq.io/guides/jenga-pgw/instant-payment-notifications)

## 7. Testing Resources

Jenga docs provide Kenya test accounts and payment test data.

Kenya Equity test accounts include:

- `1100194977404`, bank code `68`, currency `KES`
- `0020100014605`, bank code `68`, currency `KES`
- `1450160649886`, bank code `68`, currency `KES`
- `0810178838044`, bank code `68`, currency `USD`

Other Kenya bank/PesaLink examples include:

- `1100194977404`, bank code `61`, currency `KES`
- `99901288715910`, bank code `57`, currency `KES`
- `0090207635001`, bank code `63`, currency `KES`

Mobile money testing:

- M-Pesa: docs say use any valid Safaricom line for successful payment testing.
- Equitel test numbers are listed in the docs.

Pay With Equity test accounts include:

- `0020100014605`, National ID `0000000000`, YOB `1990`
- `0800194952140`, National ID `1111111111`, YOB `2000`

Source: [Testing Resources](https://developer.jengahq.io/guides/testing/testing-resources)

## 8. Go-Live Requirements

Jenga production onboarding requires a production registration and document/KYC process.

Docs mention:

- Jenga API contract acceptance.
- Contact information.
- KYC documents depending on business type.
- API configured bank account used to stage financial transactions.

For companies, docs mention documents such as:

- Directors' identification documents.
- Company registration document.
- CR12.

OrbiSave implication:

- Production integration is not just technical. Legal/entity setup, authorized signatories, bank account setup, settlement account setup, and API contract acceptance must be ready before live traffic.

Source: [Go Live Documentation](https://developer.jengahq.io/guides/go-live/go-live-docs)

## 9. Ledger Strategy: Adopt Theirs or Keep Ours?

### 9.1 What Jenga Can Be Trusted For

Jenga can be trusted as an external provider record for:

- Whether an external payment was initiated.
- Whether Jenga accepted a request.
- Whether a callback/IPN says transaction succeeded or failed.
- Bank account current/available balances.
- Bank statement lines.
- Opening/closing balance control totals.
- External transaction references and settlement evidence.

### 9.2 What Jenga Cannot Replace

Jenga does not appear, in public docs, to provide:

- Member-level OrbiSave subaccounts.
- Group-level product balances.
- Savings/loaning/rotation stream rules.
- Double-entry postings for OrbiSave-specific obligations.
- Immutable OrbiSave business-event ledger.
- Transaction PIN approval accounting.
- Loan amortization schedules.
- Rotation entitlement tracking.
- Fine/penalty allocation rules.
- OrbiSave fee recognition policy.
- Future adjustment/reversal workflow with OrbiSave approvals.

Therefore, Jenga cannot replace OrbiSave's internal ledger.

### 9.3 Recommended Model: Dual-Ledger / Provider Reconciliation

Use two layers:

1. OrbiSave Product Ledger
   - Internal source of truth.
   - Double-entry or balanced event groups.
   - Member/group/account-stream balances.
   - Immutable append-only accounting.
   - Owns business meaning.

2. Jenga / Equity External Ledger Evidence
   - Provider transaction records.
   - Jenga Wallet records if used.
   - Bank account statement lines.
   - Opening/closing bank balances.
   - IPNs/callbacks.
   - Owns external settlement evidence.

The reconciliation question should be:

```text
Does every OrbiSave provider-facing ledger event have matching Jenga/bank evidence?
Does every Jenga/bank statement line have a matching OrbiSave event or approved exception?
```

## 10. How To Tighten OrbiSave's Ledger For Jenga

### 10.1 Introduce Provider Transaction State Machine

Add or harden a provider transaction model with states:

- `created`
- `request_signed`
- `submitted`
- `acknowledged`
- `pending_customer_action`
- `provider_processing`
- `awaiting_third_party_settlement`
- `settled`
- `failed`
- `cancelled`
- `rejected`
- `settlement_exception`
- `reversed`
- `manual_review`

Map Jenga statuses:

| Jenga signal | OrbiSave provider state |
| --- | --- |
| Initial `code: -1` | `acknowledged` or `provider_processing` |
| Callback code `0` | `provider_processing` |
| Callback code `1` | `failed` |
| Callback code `2` | `awaiting_third_party_settlement` |
| Callback code `3` | `settled` |
| Callback code `4` | `settlement_exception` |
| Callback code `5` or `6` | `cancelled` |
| Callback code `7` | `rejected` |
| Query `stateCode: 2` | `settled` |
| Query `stateCode: 1` | `failed` |
| Query `stateCode: -1` | keep pending / schedule retry |

### 10.2 Separate Business Ledger From Provider Clearing

Recommended account streams:

- `member_savings`
- `group_loan_pool`
- `group_rotation_pool`
- `loan_receivable`
- `interest_income`
- `penalty_income`
- `platform_fee_revenue`
- `jenga_clearing`
- `equity_bank_cash`
- `jenga_wallet_cash` if wallet-based settlement is used
- `provider_fees`
- `suspense`
- `reversal_pending`

Example: M-Pesa account-based contribution success

```text
When STK callback/IPN confirms completed/credited:

Dr equity_bank_cash / provider clearing
Cr member contribution liability or group pool allocation

Then split by group rules:
Dr member contribution liability
Cr member_savings
Cr group_loan_pool
Cr group_rotation_pool
Cr platform_fee_revenue, if fee is collected
```

If current OrbiSave ledger remains single-entry by stream, still enforce an accounting event group that proves the total credits and debits for the business event balance to zero.

### 10.3 Do Not Finalize Product Credit On Initiation

For Jenga receive-money:

- Initial accepted response is not money.
- M-Pesa callback alone may not be final for wallet-based settlement.
- Complete IPN is preferred for finality where available.

Rule:

```text
No member/group ledger credit until Jenga confirms success/credited through final callback/IPN or verified transaction query.
```

For Jenga send-money:

```text
No payout/loan disbursement should become business-completed until provider final success is confirmed.
```

If OrbiSave wants to show "processing" immediately, show a pending state without changing final balances.

### 10.4 Add Reconciliation Tables

Recommended new models:

- `ProviderTransaction`
- `ProviderCallback`
- `ProviderStatementImport`
- `ProviderStatementLine`
- `ProviderReconciliationMatch`
- `ProviderReconciliationException`

Minimum fields for `ProviderTransaction`:

- provider: `jenga`
- country: `KE`
- direction: `inbound` / `outbound`
- channel: `mpesa_stk`, `equitel_stk`, `mobile_wallet`, `within_equity`, `pesalink`, `rtgs`
- internal_reference
- provider_reference
- provider_transaction_id
- amount
- currency
- charge
- source account/wallet
- destination account/wallet
- state
- raw_request_checksum
- raw_response_checksum
- submitted_at
- final_at
- linked business object

Minimum fields for `ProviderStatementLine`:

- provider
- account_number
- transaction_id
- reference
- serial
- posted_date_time
- date
- description
- amount
- direction
- running_balance
- raw_payload
- import_batch
- matched_status

### 10.5 Daily Reconciliation Procedure

For each configured Kenya account:

1. Pull opening/closing balance for date.
2. Pull full statement for date.
3. Dedupe and store statement lines.
4. Verify opening + credits - debits = closing.
5. Match statement lines to OrbiSave provider transactions.
6. Match provider transactions to OrbiSave ledger event groups.
7. Flag exceptions:
   - bank credit with no OrbiSave transaction.
   - OrbiSave settled transaction missing bank line.
   - amount mismatch.
   - charge mismatch.
   - duplicate reference.
   - reversal.
   - pending too long.
8. Create suspense entries only through formal adjustment workflow.
9. Produce immutable daily reconciliation report.

### 10.6 Concurrency Requirements

Before Jenga sandbox integration, OrbiSave should fix:

- Serialized ledger append per `(country, group, account_stream, currency)`.
- No direct `LedgerEntry.objects.create()` outside append service.
- Mandatory idempotency keys for all provider-facing ledger entries.
- Ledger event groups for all provider transactions.
- Wallet/cache invalidation on ledger append.

Jenga's unique references help with provider idempotency, but they do not protect OrbiSave's internal ledger from concurrent writes.

### 10.7 Future Adjustments

Jenga will produce real-world exceptions:

- Customer paid wrong amount.
- Callback delayed.
- Provider says success but bank statement missing.
- Bank line appears without callback.
- Payout acknowledged then fails.
- Settlement succeeded but credit to merchant failed.
- Charge differs from expectation.
- Manual Finserve support resolution changes status.

OrbiSave must implement adjustment cases:

- linked original provider transaction
- linked original ledger event group
- reason code
- evidence
- preparer
- approver
- generated reversal/adjustment entries
- reconciliation status

Never edit old ledger entries.

## 11. API Client Design For OrbiSave

### 11.1 Suggested Django Module Layout

```text
backend/apps/payments/providers/jenga/
  __init__.py
  client.py
  signatures.py
  schemas.py
  states.py
  services.py
  webhooks.py
  reconciliation.py
  tests/
    test_signatures.py
    test_state_mapping.py
    test_webhook_idempotency.py
    test_reconciliation_matching.py
```

### 11.2 Configuration

Per country/environment:

- `JENGA_ENV=uat|live`
- `JENGA_UAT_BASE_URL=https://uat.finserve.africa`
- `JENGA_LIVE_BASE_URL=https://api.finserve.africa`
- `JENGA_MERCHANT_CODE`
- `JENGA_CONSUMER_SECRET`
- `JENGA_API_KEY`
- `JENGA_PRIVATE_KEY_SECRET_REF`
- `JENGA_PUBLIC_KEY_FINGERPRINT`
- `JENGA_IPN_USERNAME`
- `JENGA_IPN_PASSWORD`
- `JENGA_COLLECTION_ACCOUNT_KE`
- `JENGA_PAYOUT_ACCOUNT_KE`

Secrets should live in a secrets manager, not `.env` in production.

### 11.3 Signature Test Fixtures

Create fixtures for every endpoint:

| Endpoint | Signature formula |
| --- | --- |
| Account balance | `countryCode+accountId` |
| Mini statement | `countryCode+accountNumber` |
| Full statement | `accountNumber+countryCode+toDate` |
| Opening/closing balance | `accountId+countryCode+date` |
| Account inquiry | `countryCode+accountNumber` |
| Account validate | `countryCode+accountNumber+accountFullName` |
| Query transaction details | `ref` |
| M-Pesa account-based STK | `merchant.accountNumber+payment.ref+payment.mobileNumber+payment.telco+payment.amount+payment.currency` |
| M-Pesa wallet-based STK | `order.orderReference+payment.paymentCurrency+payment.details.msisdn+payment.details.paymentAmount` |
| Send mobile wallet | `transfer.amount+transfer.currencyCode+transfer.reference+source.accountNumber` |
| Within Equity | `source.accountNumber+transfer.amount+transfer.currencyCode+transfer.reference` |
| PesaLink bank | `transfer.amount+transfer.currencyCode+transfer.reference+destination.name+source.accountNumber` |
| RTGS | `transfer.reference+transfer.date+source.accountNumber+destination.accountNumber+transfer.amount` |

### 11.4 Amount Formatting

Jenga docs repeatedly advise exact amount matching and decimal formatting. OrbiSave should:

- Store money as `Decimal`.
- Format signature values deterministically per endpoint.
- Keep the exact signed string in a secure audit log or checksum.
- Avoid floats.
- Validate currency per channel.

### 11.5 Reference Generation

Jenga recommends unique references and never reusing references, even for failed transactions.

OrbiSave should use two references:

1. Internal immutable reference:
   - Long UUID/ULID: `orb_...`
   - Never sent if endpoint length is constrained.
2. Provider reference:
   - Endpoint-compatible short code where necessary.
   - Unique per provider/channel/environment.
   - Mapped back to internal reference.

Do not overload member/group IDs as provider references.

## 12. Recommended Integration Sequence

### Phase 0: Ledger Hardening Before Sandbox

1. Fix serialized ledger append.
2. Fix wallet cache invalidation/materialized balances.
3. Add ledger event groups.
4. Make loan disbursement use append service.
5. Add payout fee/provider settlement entries.
6. Add adjustment/reversal workflow shell.

### Phase 1: Jenga Client Foundation

1. Implement authentication token client.
2. Implement RSA signature helper.
3. Add endpoint-specific signature fixtures.
4. Add environment/config isolation.
5. Add sanitized request/response logging.
6. Add provider transaction model.

### Phase 2: Receive Money Sandbox

1. Implement M-Pesa account-based STK initiation.
2. Implement callback/IPN endpoint.
3. Implement idempotent callback processing.
4. Map callbacks to provider states.
5. Credit OrbiSave ledger only on final success.
6. Add sandbox E2E tests when credentials are ready.

### Phase 3: Account Services Reconciliation

1. Implement account balance.
2. Implement opening/closing balance.
3. Implement full statement import.
4. Implement transaction details query.
5. Add matching engine.
6. Add reconciliation dashboard/admin report.

### Phase 4: Payouts

1. Implement mobile wallet payout.
2. Implement within-Equity payout.
3. Implement PesaLink payout.
4. Add payout channel selection policy.
5. Add final-state callback/query handling.
6. Ledger clearing entries until final settlement.

### Phase 5: Operational Readiness

1. Add retry schedules.
2. Add stuck transaction monitor.
3. Add provider outage mode.
4. Add reconciliation exception queue.
5. Add go-live checklist.
6. Run full sandbox simulation.

## 13. Sandbox Test Plan Once APIs Are Ready

### 13.1 Authentication

- Generate token with UAT credentials.
- Verify token expiry parsing.
- Verify token refresh or re-auth behavior.
- Verify bad API key/secret errors are handled safely.

### 13.2 Signature

- Use known sample strings from docs.
- Confirm UAT accepts generated signatures.
- Confirm altered amount/reference produces 403 invalid signature.
- Confirm private key never appears in logs.

### 13.3 Collections

Test M-Pesa account-based:

- Successful payment.
- User cancellation.
- Duplicate reference.
- Callback duplicate delivery.
- Delayed callback.
- Invalid phone.
- Amount mismatch if sandbox can simulate.

Test wallet-based if chosen:

- Initiate order.
- Query order status.
- Receive IPN.
- Verify Jenga Wallet settlement behavior.

### 13.4 Payouts

Test:

- Mobile wallet payout.
- Within Equity payout.
- PesaLink payout.
- Duplicate transfer reference.
- Invalid destination.
- Pending then success.
- Pending then failed.
- Callback missing then query status.

### 13.5 Reconciliation

For each test day:

- Pull opening balance.
- Pull full statement.
- Pull closing balance.
- Match every transaction to provider transaction.
- Verify statement control totals.
- Verify OrbiSave ledger control totals.
- Generate exception for an intentionally unmatched line.

## 14. Risks and Controls

| Risk | Jenga behavior | OrbiSave control |
| --- | --- | --- |
| Accepted request is mistaken for completed payment | Several endpoints return accepted/pending responses | Use provider state machine; ledger only on final success |
| Callback duplicated | Payment providers often retry callbacks | Idempotency by provider reference + callback checksum |
| Callback missing | Network or provider issues | Scheduled transaction-details polling |
| Bank line missing after success | Settlement delay or failure | Clearing account + reconciliation exception |
| Reference collision | Some endpoint refs are short | Internal long reference + provider ref mapping + DB uniqueness |
| Signature mismatch | Endpoint-specific formulas | Fixture tests per endpoint |
| Wrong payout recipient | Bad destination account/mobile | Account validation, name match, transaction PIN, approval |
| Fees not accounted | Jenga returns charges in callbacks/queries | Separate fee/revenue/provider-fee ledger entries |
| Statement import duplicates | Re-running imports | Dedupe keys and immutable import batches |
| Sandbox differs from production | Docs mention some responses need production for mobile wallet | Feature flags, production pilot with low limits |

## 15. Direct Answer: Should We Adopt Jenga's Ledger?

No, not as OrbiSave's primary ledger.

Adopt Jenga's account services as the external bank ledger evidence layer. That means:

- Pull and store Jenga/Equity statement lines.
- Reconcile OrbiSave ledger entries to those statement lines.
- Use opening/closing balances as daily control totals.
- Use transaction-details queries to resolve pending items.
- Use IPNs/callbacks as event evidence, not as the only truth.

Tighten OrbiSave's current ledger instead:

- Make it serialized.
- Make it event-group based.
- Make it idempotent.
- Make it double-entry or balance-checked.
- Make it reconcile against Jenga.
- Add formal adjustments.

The clean mental model:

```text
OrbiSave ledger = who owns what and why.
Jenga / Equity statement = what actually moved through the bank/payment rail.
Reconciliation = proof that those two views agree, or a controlled exception when they do not.
```

## 16. Implementation Notes For Claude

Give Claude this task framing:

```text
Read docs/jengahq_equity_kenya_api_ledger_strategy_report_2026-06-20.md and docs/orbisave_full_qa_continuation_report_2026-06-20.md.

Do not replace OrbiSave's ledger with Jenga. Build Jenga as a provider rail and reconciliation source. First harden OrbiSave's ledger append path, wallet/cache invalidation, event groups, and payout accounting. Then implement a Jenga provider module with authentication, endpoint-specific RSA signatures, provider transaction state machine, idempotent callbacks/IPNs, account statement import, and daily reconciliation.

Sandbox credentials are not ready yet, so create code with configuration placeholders and mock/fixture tests first. Do not call live APIs.
```

## 17. Source List

Primary Jenga docs used:

- [Jenga Developer Hub](https://developer.jengahq.io/)
- [Developer Quickstart](https://developer.jengahq.io/guides/get-started/developer-quickstart)
- [Generate Signature](https://developer.jengahq.io/guides/get-started/generate-signature)
- [Security](https://developer.jengahq.io/guides/security)
- [Supported Entities](https://developer.jengahq.io/guides/jenga-api/introduction/supported-entities)
- [Testing Resources](https://developer.jengahq.io/guides/testing/testing-resources)
- [Go Live Documentation](https://developer.jengahq.io/guides/go-live/go-live-docs)
- [Instant Payment Notifications](https://developer.jengahq.io/guides/jenga-pgw/instant-payment-notifications)
- [M-Pesa STK Account-Based Settlement](https://developer.jengahq.io/guides/jenga-api/receive-money/mpesa-stk-push/account-based-settlement)
- [M-Pesa STK Wallet-Based Settlement](https://developer.jengahq.io/api-explorer/receive-money/mpesa-stk-push/wallet-based-settlement/mpesa-stk-push-init)
- [M-Pesa Query Order Status](https://developer.jengahq.io/guides/jenga-api/receive-money/mpesa-stk-push/query-order-status)
- [Equitel STK/USSD Push](https://developer.jengahq.io/api-explorer/receive-money/equitel-stk-ussd-push/Equitel-stk-ussd-push)
- [Send Money to Mobile Wallets](https://developer.jengahq.io/api-explorer/send-money/mobile-wallets)
- [Within Equity Bank](https://developer.jengahq.io/api-explorer/send-money/within-equity)
- [PesaLink Bank Account](https://developer.jengahq.io/guides/jenga-api/send-money/pesalink-bankaccount)
- [RTGS](https://developer.jengahq.io/api-explorer/send-money/rtgs)
- [Account Balance](https://developer.jengahq.io/api-explorer/account-services/account-balance)
- [Account Mini Statement](https://developer.jengahq.io/api-explorer/account-services/account-ministatement)
- [Account Full Statement](https://developer.jengahq.io/api-explorer/account-services/account-fullstatement)
- [Opening and Closing Account Balance](https://developer.jengahq.io/api-explorer/account-services/opening-closing-balance)
- [Account Inquiry](https://developer.jengahq.io/api-explorer/account-services/account-inquiry)
- [Account Validate / Inquiry All Accounts](https://developer.jengahq.io/api-explorer/account-services/account-inquiry-all-accounts)
- [Query Transaction Details](https://developer.jengahq.io/api-explorer/receive-money-queries/query-transaction-details)

## 18. Final Recommendation

Jenga should become OrbiSave Kenya's bank/payment integration layer, not OrbiSave's core accounting brain.

The correct target architecture is:

1. OrbiSave immutable product ledger as source of truth.
2. Jenga provider transaction records as external processing state.
3. Jenga/Equity statements and opening/closing balances as reconciliation evidence.
4. A reconciliation engine that proves daily agreement or creates controlled exceptions.

This gives OrbiSave the best of both worlds: bank-grade external settlement evidence from Equity/Jenga and a product-specific ledger that can correctly represent chamas, member shares, rotations, loans, fees, penalties, suspense, and future adjustments.
