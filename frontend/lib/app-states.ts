export type AppStateTone = "success" | "warning" | "danger" | "info" | "empty" | "neutral"

export type AppStateIcon =
  | "alert"
  | "bell"
  | "check"
  | "clock"
  | "credit-card"
  | "file"
  | "gavel"
  | "home"
  | "landmark"
  | "mail-check"
  | "refresh"
  | "shield"
  | "users"
  | "wallet"

export type AppStateAction = {
  label: string
  href?: string
}

export type AppStateContent = {
  title: string
  description: string
  tone: AppStateTone
  icon: AppStateIcon
  eyebrow?: string
  code?: string
  primaryAction?: AppStateAction
  secondaryAction?: AppStateAction
}

export const PAGE_STATES = {
  "global.notFound": {
    eyebrow: "Error 404",
    title: "Page not found",
    description: "This page is unavailable or may have moved. Return to a trusted OrbiSave route to continue safely.",
    tone: "empty",
    icon: "home",
    code: "404",
    primaryAction: { label: "Go to dashboard", href: "/dashboard" },
    secondaryAction: { label: "Go home", href: "/" },
  },
  "global.serverError": {
    eyebrow: "Error 500",
    title: "Something went wrong",
    description: "We could not complete this request. Try again, or return to the dashboard while the issue is checked.",
    tone: "danger",
    icon: "refresh",
    code: "500",
    primaryAction: { label: "Try again" },
    secondaryAction: { label: "Go home", href: "/" },
  },
  "dashboard.notFound": {
    eyebrow: "Dashboard route",
    title: "Dashboard page not found",
    description: "This dashboard area is not available for your account or has not been mapped yet.",
    tone: "empty",
    icon: "home",
    code: "404",
    primaryAction: { label: "Back to overview", href: "/dashboard" },
  },
  "groups.empty": {
    title: "No active group yet",
    description: "Create or join a group before using contributions, loans, payouts, fines, and reports.",
    tone: "empty",
    icon: "users",
    primaryAction: { label: "Create or manage group", href: "/dashboard/my-group" },
  },
  "notifications.empty": {
    title: "No notifications yet",
    description: "Group alerts, contribution reminders, loan decisions, payout updates, and fines will appear here.",
    tone: "empty",
    icon: "bell",
  },
  "contributions.empty": {
    title: "No contribution activity",
    description: "Scheduled, initiated, confirmed, and failed contribution records will appear here.",
    tone: "empty",
    icon: "wallet",
  },
  "contributions.noMembers": {
    title: "No active members",
    description: "Accepted members will appear here before collection tracking can begin.",
    tone: "empty",
    icon: "users",
  },
  "contributions.failed": {
    title: "Contribution failed",
    description: "The payment was not confirmed. Settle it before the grace period ends to avoid group penalties.",
    tone: "warning",
    icon: "alert",
    primaryAction: { label: "Retry contribution" },
  },
  "loans.empty": {
    title: "No loans yet",
    description: "You have not requested financing from this group. Use the borrow flow when you are ready.",
    tone: "empty",
    icon: "credit-card",
  },
  "loans.noReview": {
    title: "No loan requests to review",
    description: "New member loan requests will appear here for leader authorization.",
    tone: "empty",
    icon: "shield",
  },
  "fines.empty": {
    title: "No penalties recorded",
    description: "Penalty records will appear after adopted rules are applied to actual group activity.",
    tone: "empty",
    icon: "gavel",
  },
  "fines.pending": {
    title: "Pending fine",
    description: "A penalty is awaiting settlement. Settle it promptly to keep your group standing clear.",
    tone: "warning",
    icon: "gavel",
  },
  "kyc.pending": {
    title: "Identity verification required",
    description: "Complete KYC to unlock all group services, including contribution actions, loans, and payouts.",
    tone: "warning",
    icon: "shield",
    primaryAction: { label: "Verify now" },
  },
  "kyc.submitted": {
    title: "KYC in review",
    description: "Your account is being verified by regional compliance staff. We will notify you when it is complete.",
    tone: "info",
    icon: "clock",
  },
  "kyc.verified": {
    title: "Account verified",
    description: "Your OrbiSave account is verified. You can now access eligible group services.",
    tone: "success",
    icon: "mail-check",
    primaryAction: { label: "Continue to dashboard", href: "/dashboard" },
  },
} as const satisfies Record<string, AppStateContent>

export const FINANCIAL_OUTCOMES = {
  accountVerified: PAGE_STATES["kyc.verified"],
  loanRequested: {
    title: "Loan request submitted",
    description: "Your request has been sent for group review. You will be notified after a decision is recorded.",
    tone: "success",
    icon: "credit-card",
  },
  loanReceived: {
    title: "Loan received",
    description: "Funds have been disbursed from the group Loan Pool. Keep your repayment schedule on track.",
    tone: "success",
    icon: "landmark",
    primaryAction: { label: "View repayment plan", href: "/dashboard/my-loans" },
  },
  loanApproved: {
    title: "Loan approved",
    description: "The approval has been recorded and the loan is ready for disbursement processing.",
    tone: "success",
    icon: "check",
  },
  loanDeclined: {
    title: "Loan request declined",
    description: "The decision has been recorded for the group audit trail.",
    tone: "warning",
    icon: "file",
  },
  payoutQueued: {
    title: "Payout queued",
    description: "The rotation payout has been authorized and queued for processing.",
    tone: "success",
    icon: "wallet",
  },
  payoutReceived: {
    title: "Payout received",
    description: "The rotation payout has been settled. The member and group ledger are now updated.",
    tone: "success",
    icon: "wallet",
    primaryAction: { label: "View payout history", href: "/dashboard/rotations" },
  },
  contributionConfirmed: {
    title: "Contribution confirmed",
    description: "Your contribution has been recorded and added to the group ledger.",
    tone: "success",
    icon: "check",
  },
  contributionMissed: {
    title: "Contribution missed",
    description: "A scheduled contribution was not settled. Settle it before penalties are applied by group rules.",
    tone: "warning",
    icon: "alert",
  },
  fineIssued: {
    title: "Fine issued",
    description: "A group penalty has been added to the ledger. Settle it promptly to stay in good standing.",
    tone: "warning",
    icon: "gavel",
  },
  fineSettled: {
    title: "Fine settled",
    description: "The penalty payment has been recorded and your fine balance has been updated.",
    tone: "success",
    icon: "check",
  },
} as const satisfies Record<string, AppStateContent>

export type PageStateKey = keyof typeof PAGE_STATES
export type FinancialOutcomeKey = keyof typeof FINANCIAL_OUTCOMES

export const PAGE_STATE_KEYS = Object.keys(PAGE_STATES) as PageStateKey[]
export const FINANCIAL_OUTCOME_KEYS = Object.keys(FINANCIAL_OUTCOMES) as FinancialOutcomeKey[]

export function getAppState(key: PageStateKey): AppStateContent {
  return PAGE_STATES[key]
}

export function getFinancialOutcome(key: FinancialOutcomeKey): AppStateContent {
  return FINANCIAL_OUTCOMES[key]
}
