# Absa Bank Kenya — API onboarding checklist

**Status:** adapter built and registered (`absa_ke` → `apps/payments/providers/absa.py`),
**fail-closed in live** until the values below are entered in the Console. No Absa
endpoint or payload is hard-coded — the adapter is config-driven precisely because
Absa's transactional spec is partnership-gated (not public like Equity's Jenga).

## Why this is different from the Jenga (Equity) integration

Jenga is Equity Group's **open** developer platform (`finserve.africa`) — its
collection/disbursement contracts, auth, and webhook signing are published, so the
`JengaProvider` was built directly against them. Absa exposes its APIs through the
**Absa API Marketplace** (`api.absa.africa`) / **Absa Access**, where the concrete
spec is issued in an onboarding pack under NDA after a partnership is signed. We
therefore cannot (and must not) hard-code guessed Absa endpoints/payloads — that
could misroute real money. Instead the adapter takes them as configuration.

## What to obtain from Absa (the onboarding pack)

1. **Access + credentials**
   - Consumer/client **key** and **secret** (→ provider record `api_key` / `api_secret`).
   - Sandbox (UAT) and live **base URLs** (defaults assumed:
     `https://api-uat.absa.africa` / `https://api.absa.africa` — confirm).
   - The **OAuth2 token endpoint path** and grant style (adapter assumes
     `client_credentials` with HTTP Basic auth — confirm).

2. **Product endpoints** (paths, relative to the base URL)
   - Collections (customer → OrbiSave custody) endpoint path.
   - Disbursements / B2C (custody → member) endpoint path.
   - (Optional) internal transfer endpoint — needed to complete the revenue
     sweep `_effect_transfer` (custody → company account, M18).

3. **Request/response schema**
   - Exact field names for amount, currency, reference, mobile number / account,
     narration on the collection & disbursement requests.
   - The field carrying the **provider transaction reference** in the response.

4. **Webhooks**
   - Callback payload schema (status field + values, reference field, amount field).
   - The **signature scheme** — header name + HMAC algorithm + the shared secret.
     (Adapter assumes HMAC-SHA256 over the raw body in an `X-Absa-Signature`
     header — confirm and adjust.)

5. **Accounts** — the four OrbiSave accounts at Absa (`trust`, `savings`, `loan`,
   `fee`), added under the provider in Console → Payment Providers.

## Console configuration (provider record `extra_config`)

```jsonc
{
  "token_path": "/oauth/token",              // from the pack
  "collection_path": "/payments/collect",    // from the pack
  "disbursement_path": "/payments/disburse",  // from the pack
  "currency": "KES",
  "webhook_secret": "…",                     // from the pack
  "webhook_signature_header": "X-Absa-Signature",
  "reference_field": "transactionReference",  // confirm
  "field_map": {                              // only override fields that differ
    "amount": "amount", "currency": "currency", "reference": "reference",
    "msisdn": "mobileNumber", "narration": "narration", "account": "accountNumber"
  },
  "callback_status_field": "status",
  "callback_reference_field": "transactionReference",
  "callback_amount_field": "amount",
  "callback_status_map": { "success": "success", "failed": "failed" }
}
```

## Go-live steps

1. Enter credentials + `extra_config` above (from the pack) in Console → Payment
   Providers; add the 4 accounts; set environment to `live`.
2. Use the provider **Test connection** button — it performs a real OAuth token
   fetch and reports success/latency.
3. Run a sandbox collection + disbursement end-to-end; confirm the webhook
   signature verifies and the callback parses.
4. Only then flip live. In `live`, the adapter refuses to transact until
   `token_path`, `collection_path`, `disbursement_path`, and `webhook_secret`
   are all set (fail-closed).

Once the pack's values are in, no code change is needed. If Absa's request shape
diverges from the standard field map, override just those keys in `field_map`.
