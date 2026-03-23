# Phase 1 Completion

## Overview

Phase 1 of the OrbiSave Build Phases has been successfully completed.
This phase concentrated on laying down the core relational data architecture. The models crafted in this phase form the foundation for the entire OrbiSave platform, covering users, groups, ledger entries, investments/contributions, loans, and payouts.

## What Has Been Covered

### 1. Accounts

- **User**: Implemented custom `AbstractBaseUser` using `phone_number` as the primary identifier. Encapsulated platform roles (`member`, `chairperson`, `treasurer`, `platform_admin`, `super_admin`) and a unified KYC status.
- **KYCProfile**: One-to-one mapping to `User` to securely track identity documents and verification statuses.

### 2. Groups

- **Group**: Defined financial parameters for collective savings (currency, default contribution amount, billing frequency) and strictly linked chairperson/treasurer roles to the `User` model.
- **GroupMember**: Junction table controlling member states (`active`, `inactive`, `suspended`) and internal group roles.

### 3. Contributions

- **ContributionSchedule**: Tracks precisely when generic payments are due for a group.
- **Contribution**: Unified model tracking all inward payments. Implemented idempotent constraints (`platform_reference`) and payment method enumerations.

### 4. Loans

- **LoanRequest**: Formal structure for intra-group loans, logging requested amount, interest rate, status, and tracking approval workflows.
- **LoanRepayment**: Logs all inward loan installments mapping exactly to outward provider callbacks, enforcing idempotency.

### 5. Ledger

- **LedgerEntry (with previous_state/new_state JSON, PostgreSQL trigger-level immutability, Daily Merkle root checkpointing, and off-chain signed daily S3 exports)**: Implemented core integrity capabilities using SHA-256 hash-chaining (`previous_hash`, `current_hash`) exactly identical to an append-only digital ledger.
- **AccountBalance**: Real-time aggregate view of a group's total, available, and locked funds.

### 6. Payouts

- **Payout**: Governs outward funds movement (withdrawals) from the platform back to users. Tracks amounts, deducted service fees, net distributions, and the respective destination account.

## Next Steps

With the core database schema finalized, the immediate steps going forward (Phase 2) will build the REST APIs wrapping the `accounts` authentication flows, managing login, registration, and OTP verifications over RS256 JWT protocols.
