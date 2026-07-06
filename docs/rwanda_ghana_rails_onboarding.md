# Rwanda & Ghana Payment Rails — Onboarding Runbook

**Date:** 2026-07-04 · **Status after this doc:** MTN MoMo rail **implemented & sandbox-testable** for both countries; bank trust-account rails (BK Open API, Ecobank) researched with portals identified — production access requires OrbiSave to register (founder action items below).

This mirrors how Kenya reached sandbox maturity: mobile-money rail first (members contribute/receive on their phones), bank trust-account rail second (statements + reconciliation). Kenya's rail is Jenga (verified against the official docs — our STK signature `merchant.accountNumber+ref+mobileNumber+telco+amount+currency`, RSA-SHA256/Base64, and `/v3-apis/payment-api/v3.0/stkussdpush/initiate` all match the [published spec](https://developer.jengahq.io/)).

---

## 1. The architecture per country (same shape everywhere)

| Rail | Kenya | Rwanda | Ghana |
|---|---|---|---|
| Member mobile money (contribute / payout) | Jenga → M-Pesa/Equitel (**sandbox ✅**) | **MTN MoMo Open API (implemented ✅)** | **MTN MoMo Open API (implemented ✅)** |
| Trust account (statements, reconciliation) | Jenga account APIs (**sandbox ✅**) | **BK Open API** — portal live, needs registration | **Ecobank Developer** — portal live, needs registration |
| Currency | KES | RWF (EUR in sandbox) | GHS (EUR in sandbox) |

The daily reconciliation loop (statement import → auto-match → red items to the Manager queue) is provider-agnostic — once a bank provider class exposes `get_full_statement` / `get_opening_closing_balance`, RW/GH inherit the whole machine.

## 2. MTN MoMo — implemented, test it today

**Code:** `backend/apps/payments/providers/momo.py` (`provider_code='mtn_momo'`, selector-wired, 9 tests). Serves BOTH Rwanda and Ghana — one integration, two markets.

**Sandbox setup (~15 minutes, free):**
1. Create an account at the [MoMo Developer Portal](https://momodeveloper.mtn.com/) and subscribe to **Collections** and **Disbursements** (each issues an `Ocp-Apim-Subscription-Key`).
2. Provision the API user (one-time, per key):
   - `POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser` with headers `X-Reference-Id: <new UUIDv4>` + `Ocp-Apim-Subscription-Key`, body `{"providerCallbackHost": "https://api.orbisave.com"}`
   - `POST .../v1_0/apiuser/{uuid}/apikey` → returns the `apiKey`
3. In **Console → Settings → APIs → Payment Providers**, add a provider per country:
   - `provider_code=mtn_momo`, environment=sandbox, country=rwanda (and a second row for ghana)
   - `api_key` = Collections subscription key · `merchant_code` = the API-user UUID · `api_secret` = the apiKey
   - `extra_config` = `{"disbursement_subscription_key": "<if separate>", "callback_host": "https://api.orbisave.com"}`
   - `supported_mobile_methods` = `["mtn_momo"]`
4. Press **Test** — a green result means a live token was issued from the sandbox.

**Sandbox rules baked into the provider:** currency forced to **EUR** in sandbox (RWF/GHS live), MSISDN without `+`, every transaction keyed by a client-generated **UUIDv4** (`X-Reference-Id`), `X-Target-Environment: sandbox`.

**Two things to know for live (documented, deliberate):**
- **Async transfers:** MoMo disbursements settle asynchronously. The provider polls status once; if still `PENDING` it reports *failed* so a payout is never marked completed on unsettled money (the payout stays retryable, and the 15-minute stuck-transaction poller advances the provider-side record). Before RW/GH go-live, extend `PayoutService` with a `pending_settlement` payout state to avoid retry friction. Kenya is unaffected.
- **Callback security:** MoMo callbacks carry no HMAC. `verify_webhook_signature` **fails closed** unless a Basic-auth pair is set in `webhook_secret` (`username:password`). Until callbacks are hardened at the gateway, the status poller is the source of truth — which is the sandbox-recommended pattern anyway.

**Live cutover (per country):** MTN requires a KYC'd business account per market (MTN Rwanda / MTN Ghana), a subscription-key swap, `base_url` → the live proxy, `X-Target-Environment` → the market gateway (e.g. `mtnrwanda`), and currency RWF/GHS. Then repeat the golden-path rehearsal from `docs/jenga_production_cutover_runbook.md` §3 with small real amounts.

## 3. Bank of Kigali (Rwanda trust account) — portal live, registration needed

Research (July 2026): BK launched **BK Open API** in March 2026 — Rwanda's first open-banking platform, with a **developer portal + sandbox at [developer.bk.rw](https://developer.bk.rw/)** covering payments, collections, real-time transaction tracking, payroll/vendor payments ([launch coverage](https://www.newtimes.co.rw/article/33998/news/featured/bank-of-kigali-launches-bk-open-api-at-iff-opening-doors-to-fintech-collaboration/amp), [KT Press](https://www.ktpress.rw/2026/03/how-bank-of-kigalis-open-api-is-powering-rwandas-fintech-collaboration/)). Production access is gated on **partner due diligence** (data protection + governance review).

**Founder action items:**
1. Register OrbiSave on developer.bk.rw; request sandbox credentials for **collections + account/statement APIs**.
2. Open the Rwanda trust account with BK (the equivalent of the Equity collection/payout accounts).
3. Start the partner due-diligence track early — it's the long pole, not the code.

**Engineering (once sandbox credentials exist):** implement `BankOfKigaliProvider` (`provider_code='bk_rw'`, stubbed in the selector) exposing `get_full_statement` / `get_opening_closing_balance` (+ collections if we route bank-side) — the reconciliation machine picks it up unchanged. Estimated at roughly the Jenga statement-API effort (~2–3 days) since the plumbing already exists.

## 4. Ecobank (Ghana trust account) — portal live, registration needed

Research: Ecobank runs a pan-African **developer portal at [developer.ecobank.com](https://developer.ecobank.com/app/index.xhtml)** with a **sandbox**, offering exactly what the trust-account rail needs: **Collection Service, Payment Service, Direct Debit, Remittance** ([docs](https://developer.ecobank.com/app/apis.xhtml), [getting started](https://apimuat-developer.ecobank.com/documentation/getting-started)). Production access follows sandbox testing + approval.

**Founder action items:**
1. Register OrbiSave on developer.ecobank.com; subscribe to Collection + Payment services; request sandbox keys.
2. Open the Ghana trust account with Ecobank.

**Engineering (once sandbox credentials exist):** implement `EcobankProvider` (`provider_code='ecobank_gh'`, stubbed in the selector) with the same statement/balance surface.

## 5. Go-live checklist per country (the Kenya pattern, reusable)

1. MoMo sandbox golden-path rehearsal: contribute → webhook/poll settle → ledger split → payout → loan disburse/repay → `verify_ledger` green.
2. Bank sandbox: statement import runs daily; orphan detection verified against seeded mismatches; Manager reconciliation queue exercised.
3. Country row in Console: providers active, kill-switch drill performed.
4. `CountryPolicy` row (interest caps, currency) confirmed for the market.
5. Live credentials swap + small-value real-money rehearsal + rollback drill (mirror `jenga_production_cutover_runbook.md`).

**Sources:** [Jenga API docs](https://developer.jengahq.io/) · [MoMo Developer Portal](https://momodeveloper.mtn.com/) · [MoMo sandbox flow](https://gist.github.com/chaiwa-berian/5294fdf1360247cf4561c95c8fa740d4) · [BK OpenAPI](https://developer.bk.rw/) · [BK Open API launch](https://www.newtimes.co.rw/article/33998/news/featured/bank-of-kigali-launches-bk-open-api-at-iff-opening-doors-to-fintech-collaboration/amp) · [Ecobank Developer](https://developer.ecobank.com/app/index.xhtml)
