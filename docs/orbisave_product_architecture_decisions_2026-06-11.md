# Orbisave Product and Architecture Decisions

Date: 2026-06-11  
Status: Draft decision record for implementation planning  
Related review: `docs/orbisave_codebase_quality_security_review_2026-06-11.md`

## Purpose

This document captures product and architecture decisions clarified after the codebase quality and security review. It should guide the next implementation phase, especially around group creation, KYC, admin onboarding, country isolation, bank integrations, account structure, loans, payouts, reconciliation, and immutable ledger design.

## Core Product Model

Orbisave supports users who may belong to multiple chamas and may also create their own chama while remaining members elsewhere.

The user's platform identity is global within a country/jurisdiction, but their group roles are per chama. A user can be:

- a regular member in one chama,
- a chairperson in another chama,
- a treasurer in another chama,
- pending KYC/admin approval for a newly created chama.

The dashboard must be role-aware per group, not role-aware only per user. A user should see member-level surfaces for groups where they are a member and chairperson/treasurer surfaces only for groups where they hold those roles and the required approvals are complete.

## Group Creation and KYC Gate

### User Flow

On the My Groups page, any authenticated user should be able to see a create chama action, even if they are already a member of another chama.

The create chama flow should open as a dialog wizard rather than sending the user to a completely separate page. The wizard should collect all required group setup data, including:

- group name,
- group country,
- contribution schedule,
- payout rotation rules,
- mandatory annual savings settings,
- internal loaning preference,
- group officials where applicable,
- bank/payment country context.

When a normal user creates a chama, the new group enters a pending state and chairperson-level dashboard features remain locked until:

1. The creator completes KYC.
2. The country admin reviews the KYC and group data.
3. The country admin approves the user/group setup.
4. The user logs in again to refresh role/session claims.

### Important Rule

Creating a chama does not immediately grant active chairperson capabilities. It grants a pending chairperson path that becomes active only after KYC and country-admin approval.

### Suggested States

For group creation:

- `draft`
- `submitted`
- `kyc_required`
- `kyc_submitted`
- `admin_review`
- `approved`
- `rejected`
- `changes_requested`

For the creator's group role:

- `pending_chairperson`
- `active_chairperson`
- `rejected_chairperson`
- `suspended_chairperson`

## Country and Regional Data Isolation

Each supported country must have a separate database or isolated database instance. Country separation is a hard security and compliance boundary, not a UI filter.

Personally Identifiable Information must stay within the relevant country database, including:

- full names,
- phone numbers,
- national IDs,
- Didit KYC images and verification data,
- group membership records,
- payment records,
- ledger entries,
- admin decisions for that country.

The country for a group is selected during the group creation wizard, but it must be validated server-side. The backend must not trust client headers for country routing.

### Cross-Country Group Creation

A user may attempt to create a chama for a country different from where they are physically located or where they have existing memberships. This should not be automatically accepted.

The platform should validate:

- user's declared country,
- phone/country code,
- national ID or KYC country,
- Didit verification country,
- selected group country,
- admin review indicators.

The admin review UI should show discrepancy indicators:

- green: data is consistent,
- orange: discrepancy needs review,
- red: high-risk mismatch or policy violation.

Examples:

- Kenya phone, Kenya ID, Kenya Didit result, Kenya group: green.
- Kenya user creating Rwanda group with Rwanda-compatible documentation: admin review required.
- Kenya user creating Rwanda group with only Kenya identity evidence: orange or red depending policy.
- Mismatched KYC country and group country: red unless a documented exception is approved.

## Admin Account Lifecycle

Platform admins are country-scoped. They manage users, groups, KYC, support, and operational workflows only for their assigned country.

Super admins can see the global overview across all countries. Super admins can view aggregate growth, country performance, transaction volume, risk indicators, and operational health across jurisdictions.

Initial super admin:

- `emanuel@averissystems.com`

Only the initial owner can invite additional super admins. Other super admins should not automatically have the same owner-level powers unless explicitly granted.

### Admin Registration and Verification

Admin accounts require:

1. An `@averissystems.com` email address.
2. Email verification by one-time digit code.
3. No dashboard access until the code is confirmed.
4. A role assignment from an authorized inviter or bootstrap process.

Public admin registration without email verification and invitation must be prohibited.

### Recommended Admin Roles

- `owner_super_admin`: overall owner authority.
- `super_admin`: global platform visibility, limited by explicit permissions.
- `country_admin`: country-scoped operations and support.
- `compliance_officer`: full KYC/risk document access for assigned country.
- `aml_analyst`: KYC/risk review and suspicious-activity review.
- `finance_ops`: future finance operations role.
- `auditor`: read-only audit and compliance review.
- `external_auditor`: temporary, time-bound, read-only regulatory access.
- `support_lead`: masked KYC/status access only.
- `developer`: infrastructure/config access only; no production raw KYC/PII.

## Payment Providers and Country Banking

Provider integration is country-specific.

Current intended provider direction:

- Kenya: Equity Bank via Jenga APIs.
- Rwanda: Bank of Kigali APIs.
- Ghana: Ecobank APIs.

Super admin should manage provider setup and account configuration, including:

- enabled countries,
- provider credentials or secret references,
- webhook endpoints,
- callback secrets,
- trust account numbers,
- savings account numbers,
- loaning account numbers,
- company revenue account details,
- provider environment mode,
- provider health status.

Provider secrets must not be stored as plaintext database values in production. The super admin UI can manage references or encrypted values, but raw secret exposure must be tightly controlled.

## Group Account Structure

Each country integration must support four financial account categories.

### 1. Main Trust Account

Purpose:

- rotational contributions,
- rotational payout custody,
- normal chama collection and payout cycles.

This account backs the main rotation pool.

### 2. Group Savings Account

Purpose:

- mandatory group savings,
- annual savings accumulation,
- future loan qualification evidence,
- end-year or approved group savings disbursement.

During contributions, a configured amount or percentage is deducted and allocated into savings.

The UI message should explain:

`Our partner bank will use this data to assess your loan qualification limit.`

### 3. Group Loaning Account

Purpose:

- internal group loaning pool,
- loan disbursement funding,
- loan repayments,
- loan interest/fees where configured.

The loaning account is separate from the rotational trust account and the mandatory savings account.

Internal loaning should be activated only after a majority vote by group members. The system must calculate:

- total eligible voting members,
- total votes cast,
- votes for,
- votes against,
- whether the majority threshold is satisfied.

The treasurer activates the loaning account after the majority vote passes, subject to required controls and admin visibility.

### 4. Company Revenue Account

Purpose:

- Orbisave deductions from successful disbursements,
- service fees from rotational payouts,
- service fees from loan disbursements,
- service fees from approved savings disbursements.

Company revenue movements should be ledgered separately from group-owned funds.

## Mandatory Savings

Mandatory savings must be added to the group creation wizard.

Required configuration:

- savings amount or savings percentage,
- annual savings access date based on group join date or group setup date,
- whether savings are calculated per contribution or per period,
- destination savings account,
- rules for end-year disbursement,
- required approvals for withdrawal.

When a contribution is received, the system should split the received amount into:

- rotation pool allocation,
- mandatory savings allocation,
- fees if applicable.

The split must be visible in the ledger and member contribution history.

## Savings Disbursement Workflow

Savings disbursement is stricter than rotational payout because it requires written group authorization.

Suggested workflow:

1. Group heads initiate savings withdrawal request.
2. System generates a downloadable Orbisave-watermarked template.
3. Chairperson and treasurer append physical signatures.
4. Signed document is uploaded back into Orbisave.
5. Country admin reviews the uploaded document.
6. Members receive a notification to vote.
7. Vote results are attached to the request.
8. Country admin approves or rejects.
9. Bank disbursement is initiated.
10. Provider confirmation updates the final state.
11. Ledger entries are finalized.

Required request evidence:

- signed document,
- chairperson approval,
- treasurer approval,
- member vote result,
- country admin approval,
- provider reference,
- immutable ledger references.

## Internal Loans

### Activation

Internal group loaning should not be active by default unless configured and approved by group voting.

Activation requires:

- member vote,
- majority threshold calculation,
- treasurer activation,
- chairperson confirmation if policy requires,
- country admin visibility.

### Approval and Disbursement

Loan approval requires:

1. Loan request from member.
2. Chairperson PIN approval.
3. Treasurer PIN approval.
4. Country admin notification by email and dashboard.
5. Admin review/approval where required.
6. Disbursement button triggers provider API movement.

The system must separate approval from actual disbursement.

Recommended states:

- `submitted`
- `chairperson_approved`
- `treasurer_approved`
- `admin_review`
- `approved`
- `disbursement_pending`
- `provider_processing`
- `disbursed`
- `repayment_active`
- `repaid`
- `rejected`
- `disputed`
- `failed`

UI status example:

- `Approved` should be green with a check only when business approval is complete.
- `Disbursed` should be green with a check only when the provider confirms money movement.

## Rotational Payouts

Rotational payouts are schedule-derived. The recipient should come from the rotation order, not arbitrary request input.

The schedule is configured during group creation. Supported periods should include flexible intervals such as:

- every 3 days,
- every 5 days,
- weekly,
- every 2 weeks,
- monthly,
- custom allowed period.

### Grace Period

At the scheduled payout time:

- If all members have contributed, payout can happen immediately.
- If some members have not contributed, the system applies a 1-day grace period.
- After the grace period, policy must define whether payout proceeds, pauses, marks missing members as owing penalties, or escalates for admin/group action.

The system should automatically check contribution completeness before disbursement.

### Suggested Payout States

- `scheduled`
- `awaiting_contributions`
- `grace_period`
- `ready_for_disbursement`
- `provider_processing`
- `paid`
- `failed`
- `disputed`
- `cancelled`

### Implementation Status: 2026-06-12

The backend now has a rotational payout readiness gate:

- the next payout recipient is derived from the unpaid rotation schedule,
- active group members are compared against confirmed contributions for the current cycle,
- payouts become `ready_for_disbursement` immediately when all active members have contributed,
- missing contributions place the payout into a one-day `grace_period`,
- after grace expires, the payout remains `awaiting_contributions` instead of silently moving money,
- `process_due_rotation_payout(...)` only calls the provider-facing payout execution path when readiness is green.

Remaining work: run this from a scheduled Celery beat task, expose readiness states in dashboards, and migrate provider callbacks from immediate `completed` semantics to `provider_processing` then `paid` after provider settlement evidence.

## Transaction PIN

Transaction PIN remains a short PIN.

Rules:

- PIN required for high-risk group actions, approvals, disbursement requests, and loan approvals.
- Maximum failed attempts: 3.
- After 3 failed attempts, PIN is locked.
- User must request PIN reset.
- Reset code is sent to email.
- User sets a new PIN after successful reset verification.

PIN events must be audited.

## KYC Provider and Retention

Didit is the preferred KYC provider candidate.

Before implementation, collect and review Didit documentation for:

- hosted flow or API flow,
- webhook signature verification,
- identity document fields returned,
- face match/risk score fields,
- country verification fields,
- data retention obligations,
- data deletion/export behavior,
- sandbox behavior,
- production review process.

KYC documents and verification records must be retained for 7 years from submission date unless a stricter country requirement applies.

## KYC Access Model

Raw KYC data access must be tightly restricted.

### Full Access

Compliance officers and AML analysts can view documents, face matches, and Didit risk scores for manual review and suspicious-account investigation.

### Partial Access

Customer support Tier 2 or support leads can view:

- verification status,
- rejection reason,
- masked data strings,
- non-sensitive support hints.

They must not download raw identity images.

### No Raw Access

System administrators and developers must not view raw KYC data or clear-text PII in production. They manage infrastructure, deployments, environment configuration, and database connectivity only.

### Temporary Read-Only Access

External auditors and regulators may receive secure, time-bound, read-only access during official audits.

All KYC access must be audited.

## Provider Mismatch and Disputes

If provider callback data conflicts with internal expected data, the system must fail closed.

Mismatch examples:

- amount mismatch,
- phone/account mismatch,
- country mismatch,
- unknown transaction reference,
- duplicate provider reference,
- invalid signature,
- callback for an already finalized transaction,
- unexpected debit from a trust account.

Required behavior:

1. Freeze the affected transaction state.
2. Mark it `disputed` or `manual_review_required`.
3. Do not mutate member balances as if successful.
4. Create a security ledger/audit entry with mismatch details.
5. Alert country admin, finance/compliance, and configured engineering emails.
6. Expose the dispute in the super admin operational dashboard.
7. Require manual resolution with two-person approval for high-risk money movement.

### Implementation Status: 2026-06-12

The backend now supports the first fail-closed provider callback path for contributions:

- successful contribution callbacks with an amount mismatch are marked `disputed`,
- the observed amount is not posted into the rotation ledger,
- a suspense ledger entry is written for review,
- a reconciliation exception item is created with severity `red`,
- the provider still receives an acknowledgement so retry storms do not create duplicate state transitions.

Remaining work: apply the same pattern to payout callbacks, loan disbursement callbacks, savings withdrawals, invalid signatures, unknown references, duplicate references, and country/account mismatches.

## Reconciliation System

Orbisave should use a three-way reconciliation model:

1. Internal immutable ledger.
2. Provider callbacks/API transaction status.
3. Bank statements or account activity files.

The system should never force balances to match by guessing. Unmatched values go to suspense/manual review.

### Daily Reconciliation Workflow

Run per country, per provider, per account type.

1. At end of local day, freeze the day's internal ledger balance snapshots.
2. Fetch bank statement or transaction activity for:
   - trust account,
   - savings account,
   - loaning account,
   - company revenue account.
3. Fetch or confirm provider transaction statuses.
4. Match records using a composite key:
   - Orbisave transaction reference,
   - provider reference,
   - account identifier,
   - exact amount,
   - currency,
   - transaction type,
   - timestamp window.
5. Categorize each record:
   - matched,
   - missing bank record,
   - missing provider callback,
   - amount mismatch,
   - duplicate reference,
   - orphan bank credit,
   - orphan bank debit,
   - delayed settlement,
   - disputed.
6. Move unmatched or suspicious records into a suspense workflow.
7. Generate country-admin and finance-ops review tasks.
8. Produce daily reconciliation reports.
9. Store reconciliation evidence immutably.

### Suspense Account Concept

Suspense is a workflow state and accounting bucket for unresolved transactions. It prevents the system from pretending funds are correctly allocated before evidence is complete.

Suspense records should include:

- bank statement line,
- provider event,
- internal transaction if any,
- detected mismatch reason,
- assigned reviewer,
- resolution notes,
- final correction entries.

Corrections must be append-only ledger entries. Do not edit historical ledger rows to make reconciliation pass.

### Implementation Status: 2026-06-12

The backend now has a reconciliation skeleton:

- `ReconciliationRun` records the country, provider, account stream, account number, business date, and expected/observed balances.
- `ReconciliationItem` records individual exceptions such as amount mismatch, missing provider callback, missing bank record, duplicate reference, orphan bank transaction, and signature mismatch.
- `record_reconciliation_exception(...)` is the shared service for creating review items and, where appropriate, isolating observed money into the suspense stream.

Remaining work: daily bank/provider ingestion, MT940/CAMT/CSV parsers, automated matching windows, reviewer assignment, finance-ops/admin dashboards, resolution approvals, and append-only correction entries.

## Immutable Ledger Design Direction

The immutable ledger should support multiple ledger streams:

- group rotation ledger,
- group savings ledger,
- group loaning ledger,
- company revenue ledger,
- suspense ledger,
- provider settlement ledger.

Each ledger entry should include:

- country,
- group where applicable,
- member where applicable,
- account type,
- transaction type,
- debit account,
- credit account,
- amount,
- currency,
- provider reference,
- Orbisave reference,
- idempotency key,
- related business object,
- previous hash,
- entry hash,
- created timestamp,
- actor,
- source system.

Ledger corrections must be posted as compensating entries, not updates.

## Testing and Launch Gates

Launch readiness requires:

- unit tests for math, currency rounding, schedules, vote thresholds, fees, and splits,
- integration tests for databases, queue, APIs, provider adapters, and regional routing,
- E2E tests for onboarding, Didit KYC, group creation, contribution, payout, loan, and admin review,
- idempotency tests for payment taps, duplicate callbacks, provider retries, and payout triggers,
- performance/load tests for regional VPS, Nginx, API, Celery workers, Redis, and webhook bursts,
- chaos/resiliency tests for database failure, regional server crash, queue failure, provider timeout, and retry recovery,
- reconciliation tests for matched, delayed, duplicate, missing, and mismatched provider/bank/internal records.

Dashboard data can be mocked during development, but production dashboard states must come from backend-owned data and reconciliation status.

## Scale Target

Known near-term Kenya demand:

- at least 78 groups,
- each group roughly 20 to 35 members,
- estimated initial members: 1,560 to 2,730 in Kenya alone.

The architecture should comfortably exceed this starting point and support growth across countries. Initial Docker VPS deployment is acceptable, but the system should be designed so country databases, workers, Redis, Nginx, and provider webhooks can be scaled separately.

## Deployment Direction

Initial target:

- Docker VPS.

Recommended deployment shape:

- Nginx gateway,
- backend API containers,
- Celery worker containers,
- Celery beat or scheduler,
- Redis,
- separate country databases,
- isolated backups per country,
- separate frontend deployments or containers,
- provider webhook endpoints per country/provider,
- monitoring and alerting.

## Frontend App Strategy

Because the development team is currently small, avoid unnecessary fragmentation.

Recommended direction:

- Keep the member app as the main user-facing application.
- Keep admin/console capabilities logically separate, but consider whether console and manager can share one codebase with route-level role gating.
- Avoid maintaining three unrelated frontend codebases unless the team has enough capacity.
- Move shared UI, API clients, auth handling, and types into shared packages if keeping separate apps.

The most important immediate target is API contract stability and green builds, not visual redesign.

## Future USSD and Mobile Support

USSD/mobile support is in scope for future documentation and implementation, but not the immediate build blocker.

Prepare future design notes for:

- USSD member lookup,
- PIN entry,
- contribution status,
- voting,
- contribution reminders,
- loan balance checks,
- language support,
- low-connectivity flows,
- reconciliation between USSD actions and app/API actions.

## Provider Documentation Needed

For each bank/provider, collect:

- authentication method,
- sandbox credentials process,
- production onboarding process,
- money-in APIs,
- money-out/disbursement APIs,
- account balance APIs,
- transaction status APIs,
- webhook/callback format,
- webhook signature verification,
- retry behavior,
- idempotency support,
- statement download or transaction listing APIs,
- supported statement formats such as MT940, CAMT.053, CSV, or JSON,
- rate limits,
- maintenance windows,
- reversal/refund rules,
- dispute process,
- production certification checklist.

## Immediate Implementation Implications

The codebase should next be changed to support:

1. Per-group roles instead of global role assumptions.
2. Create chama dialog wizard on My Groups.
3. KYC/admin approval gate before chairperson surfaces appear.
4. Country admin review with discrepancy indicators.
5. Safe admin invitation and email-code verification.
6. Country-scoped platform admins and owner-level super admin.
7. Four-account configuration model per country/provider.
8. Mandatory savings in group setup and contribution splitting.
9. Loaning activation by member vote.
10. Formal state machines for loans, payouts, savings withdrawals, and provider movements.
11. Immutable multi-stream ledger and append-only correction entries.
12. Three-way reconciliation engine with suspense handling.
13. Provider mismatch fail-closed behavior.
14. KYC access-control and 7-year retention policy.
15. CI tests for unit, integration, E2E, idempotency, load, resiliency, and reconciliation behavior.

## Open Decisions

These items still need final decisions or external documentation:

1. Exact Didit integration mode and webhook signature format.
2. Exact Jenga, Bank of Kigali, and Ecobank endpoints and webhook behavior.
3. Whether group country can differ from creator KYC country and under which documented exceptions.
4. Exact majority threshold for loaning activation and savings withdrawal voting.
5. Fee model for company revenue deductions.
6. Grace-period outcome when not all members contribute.
7. Whether admin approval is required for every loan or only threshold-based loans.
8. Whether savings access date is based on group creation date, member join date, or first contribution date.
9. Whether console and manager remain separate apps or merge into one admin app.
10. Backup, restore, and disaster recovery objectives per country database.
