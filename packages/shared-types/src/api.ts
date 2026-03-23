import type {
  UserRole,
  Country,
  KYCStatus,
  ContributionStatus,
  LoanStatus,
  PayoutStatus,
  GroupStatus,
  LedgerEntryType,
  LedgerDirection,
  PaymentMethod,
} from './enums';

// ─── Standard API Envelope ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: Record<string, string[]> | null;
  meta: PaginationMeta | null;
}

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  total_pages: number;
}

// ─── User / Auth ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  date_of_birth: string | null;
  national_id: string | null;
  role: UserRole;
  country: Country | null;
  avatar: string | null;
  kyc_status: KYCStatus;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

// ─── Group ───────────────────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  description: string;
  country: Country;
  chairperson: Pick<User, 'id' | 'full_name' | 'avatar'>;
  treasurer: Pick<User, 'id' | 'full_name' | 'avatar'> | null;
  max_members: number;
  contribution_amount: number;
  contribution_frequency: string;
  contribution_day: number;
  rotation_savings_pct: number;
  loan_pool_pct: number;
  max_loan_multiplier: number;
  loan_term_weeks: number;
  loan_interest_rate_monthly: number;
  rotation_method: string;
  status: GroupStatus;
  invite_code: string;
  invite_expires_at: string;
  currency: string;
  created_at: string;
}

export interface GroupWallet {
  total: number;
  rotation_pool: number;
  loan_pool: number;
  currency: string;
}

export interface GroupMember {
  id: string;
  user: Pick<User, 'id' | 'full_name' | 'avatar' | 'phone' | 'kyc_status'>;
  rotation_position: number;
  status: 'active' | 'suspended' | 'left';
  joined_at: string;
}

// ─── Contribution ────────────────────────────────────────────────────────────
export interface Contribution {
  id: string;
  group: string;
  member: Pick<User, 'id' | 'full_name' | 'avatar'>;
  amount: number;
  currency: string;
  method: PaymentMethod;
  mobile_number: string;
  provider_reference: string | null;
  platform_reference: string;
  status: ContributionStatus;
  scheduled_date: string;
  initiated_at: string | null;
  confirmed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
}

// ─── Loan ─────────────────────────────────────────────────────────────────────
export interface Loan {
  id: string;
  group: string;
  borrower: Pick<User, 'id' | 'full_name' | 'avatar'>;
  amount: number;
  currency: string;
  interest_rate_monthly: number;
  term_weeks: number;
  purpose: string;
  purpose_detail: string;
  status: LoanStatus;
  chair_approved_at: string | null;
  treasurer_approved_at: string | null;
  admin_approved_at: string | null;
  disbursed_at: string | null;
  disbursement_reference: string | null;
  fully_repaid_at: string | null;
  created_at: string;
}

export interface LoanRepayment {
  id: string;
  loan: string;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_due: number;
  amount_paid: number;
  status: 'upcoming' | 'paid' | 'overdue' | 'waived';
  paid_at: string | null;
  payment_reference: string | null;
}

// ─── Payout ──────────────────────────────────────────────────────────────────
export interface Payout {
  id: string;
  group: string;
  recipient: Pick<User, 'id' | 'full_name' | 'avatar'>;
  rotation_position: number;
  cycle_number: number;
  gross_amount: number;
  service_fee: number;
  net_amount: number;
  currency: string;
  method: PaymentMethod;
  mobile_number: string;
  provider_reference: string | null;
  status: PayoutStatus;
  processed_at: string | null;
  scheduled_date: string;
}

// ─── Ledger ──────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  group: string;
  member: Pick<User, 'id' | 'full_name'> | null;
  entry_type: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;
  currency: string;
  running_balance: number;
  description: string;
  reference: string;
  hash: string;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: string;
  channel: 'in_app' | 'sms' | 'email' | 'push';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

// ─── Meeting ─────────────────────────────────────────────────────────────────
export interface Meeting {
  id: string;
  group: string;
  title: string;
  agenda: string;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_by: Pick<User, 'id' | 'full_name'>;
  minutes: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────
export type WebSocketEventType =
  | 'CONTRIBUTION_CONFIRMED'
  | 'CONTRIBUTION_FAILED'
  | 'LOAN_STATUS_CHANGED'
  | 'PAYOUT_PROCESSED'
  | 'LOAN_APPROVAL_REQUIRED'
  | 'NEW_MEMBER_JOINED'
  | 'MEETING_STARTING';

export interface WebSocketEvent<T = Record<string, unknown>> {
  type: WebSocketEventType;
  payload: T;
}
