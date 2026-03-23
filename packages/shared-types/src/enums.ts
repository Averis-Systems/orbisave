// ─── User Roles ──────────────────────────────────────────────────────────────
export const USER_ROLES = [
  'member',
  'chairperson',
  'treasurer',
  'platform_admin',
  'super_admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// ─── Countries & Currencies ───────────────────────────────────────────────────
export const COUNTRIES = ['kenya', 'rwanda', 'ghana'] as const;
export type Country = (typeof COUNTRIES)[number];

export const CURRENCIES: Record<Country, string> = {
  kenya: 'KES',
  rwanda: 'RWF',
  ghana: 'GHS',
};

export const CURRENCY_SYMBOLS: Record<Country, string> = {
  kenya: 'KSh',
  rwanda: 'RF',
  ghana: 'GH₵',
};

export const COUNTRY_CODES: Record<Country, string> = {
  kenya: '+254',
  rwanda: '+250',
  ghana: '+233',
};

// ─── Contribution ────────────────────────────────────────────────────────────
export const CONTRIBUTION_STATUSES = [
  'scheduled',
  'initiated',
  'pending',
  'confirmed',
  'failed',
] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

export const CONTRIBUTION_FREQUENCIES = [
  'weekly',
  'biweekly',
  'monthly',
  'harvest',
] as const;
export type ContributionFrequency = (typeof CONTRIBUTION_FREQUENCIES)[number];

// ─── Payment Methods ─────────────────────────────────────────────────────────
export const PAYMENT_METHODS = ['mpesa', 'airtel', 'mtn_momo', 'bank'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ─── Loans ───────────────────────────────────────────────────────────────────
export const LOAN_STATUSES = [
  'pending_chair',
  'pending_treasurer',
  'pending_admin',
  'approved',
  'disbursed',
  'active',
  'repaid',
  'defaulted',
  'rejected',
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const LOAN_REPAYMENT_STATUSES = ['upcoming', 'paid', 'overdue', 'waived'] as const;
export type LoanRepaymentStatus = (typeof LOAN_REPAYMENT_STATUSES)[number];

// ─── Payouts ─────────────────────────────────────────────────────────────────
export const PAYOUT_STATUSES = [
  'upcoming',
  'processing',
  'completed',
  'failed',
  'skipped',
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

// ─── Group ───────────────────────────────────────────────────────────────────
export const GROUP_STATUSES = ['active', 'paused', 'closed'] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const ROTATION_METHODS = ['sequential', 'random', 'manual'] as const;
export type RotationMethod = (typeof ROTATION_METHODS)[number];

// ─── KYC ─────────────────────────────────────────────────────────────────────
export const KYC_STATUSES = ['pending', 'submitted', 'verified', 'rejected'] as const;
export type KYCStatus = (typeof KYC_STATUSES)[number];

// ─── Ledger ──────────────────────────────────────────────────────────────────
export const LEDGER_ENTRY_TYPES = [
  'contribution',
  'payout',
  'loan_disbursement',
  'loan_repayment',
  'service_fee',
  'interest',
  'refund',
  'reconciliation_adjustment',
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const LEDGER_DIRECTIONS = ['credit', 'debit'] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];
