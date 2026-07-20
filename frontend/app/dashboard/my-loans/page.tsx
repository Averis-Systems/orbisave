"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import {
  EmptyState,
  LockedState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  Tabs,
} from "@/components/dashboard/ui"
import { useActiveGroup } from "@/hooks/useGroups"
import { Loan, useApproveLoan, useLoans, useRejectLoan, useRequestLoan } from "@/hooks/useLoans"
import { formatCurrency } from "@/lib/formatters"
import { getAppState, getFinancialOutcome } from "@/lib/app-states"
import { useAuthStore } from "@/store/auth"

const LOAN_PURPOSES = [
  { value: "business", label: "Business" },
  { value: "education", label: "Education" },
  { value: "medical", label: "Medical" },
  { value: "agriculture", label: "Agriculture" },
  { value: "home_improvement", label: "Home Improvement" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
]

const TERM_OPTIONS = ["4", "8", "12"]

type LoanTab = "mine" | "borrow" | "review"

export default function MyLoansPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<LoanTab>("mine")
  const [loanAmount, setLoanAmount] = useState("")
  const [purpose, setPurpose] = useState("personal")
  const [term, setTerm] = useState("4")
  const [pin, setPin] = useState("")
  const [rejectLoanId, setRejectLoanId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: loans, isLoading: loansLoading } = useLoans(activeGroup?.id || null)
  const requestLoan = useRequestLoan()
  const approveLoan = useApproveLoan()
  const rejectLoan = useRejectLoan()

  const isGroupLeader = user?.role === "chairperson" || user?.role === "treasurer"
  const currency = activeGroup?.currency || "KES"
  const availableLoanPool = Number(activeGroup?.wallet?.loan_pool || 0)
  const groupActive = activeGroup?.status === "active"
  // The loan pool is "live" once the group is active AND funds have built up
  // from contributions. An empty pool cannot back any loan, so we gate the
  // borrow flow behind it rather than letting a request fail server-side.
  const poolActive = groupActive && availableLoanPool > 0

  const requestedAmount = Number(loanAmount) || 0
  const interestRate = Number(activeGroup?.loan_interest_rate_monthly || 0) / 100
  const interest = Math.round(requestedAmount * interestRate * (Number(term) / 4))
  const totalRepay = requestedAmount + interest
  const weeklyPayment = Number(term) > 0 ? Math.round(totalRepay / Number(term)) : 0

  const myLoans = useMemo(
    () => loans?.filter((loan) => loan.borrower_name === user?.full_name) || [],
    [loans, user?.full_name],
  )
  const receivedLoan = myLoans.find((loan) => loan.status === "active" || loan.status === "disbursed")
  const pendingReview = loans?.filter((loan) => loan.status.startsWith("pending")) || []
  const activePortfolio = loans?.filter((loan) => loan.status === "active" || loan.status === "disbursed") || []

  const tabs = [
    { id: "mine", label: "My Loans", count: myLoans.length },
    { id: "borrow", label: "Borrow", count: null },
    ...(isGroupLeader ? [{ id: "review", label: "Group Review", count: pendingReview.length }] : []),
  ]

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeGroup || requestedAmount <= 0) return
    if (requestedAmount > availableLoanPool) {
      toast.error("Requested amount exceeds the current loan pool balance.")
      return
    }
    try {
      await requestLoan.mutateAsync({
        group: activeGroup.id,
        amount: requestedAmount,
        purpose,
        term_weeks: Number(term),
      })
      toast.success(getFinancialOutcome("loanRequested").title)
      setTab("mine")
      setLoanAmount("")
      requestLoan.reset()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Loan request could not be submitted.")
    }
  }

  const handleApprove = async (loanId: string) => {
    if (!pin.trim()) {
      toast.error("Enter your transaction PIN to approve this loan.")
      return
    }
    try {
      await approveLoan.mutateAsync({ id: loanId, pin })
      toast.success(getFinancialOutcome("loanApproved").title)
      setPin("")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Loan approval failed.")
    }
  }

  const handleReject = async () => {
    if (!rejectLoanId) return
    try {
      await rejectLoan.mutateAsync({ id: rejectLoanId, reason: rejectReason })
      toast.success(getFinancialOutcome("loanDeclined").title)
      setRejectLoanId(null)
      setRejectReason("")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Loan rejection failed.")
    }
  }

  if (groupsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <LoanSkeleton />
          <LoanSkeleton />
          <LoanSkeleton />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    )
  }

  if (!activeGroup) {
    return <AppStatePanel stateKey="groups.empty" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financing"
        title="Loans"
        description="Request financing from the group loan pool, track your loans, and review member requests when you lead the group."
        actions={
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-right dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-400">Available loan pool</p>
            <p className={`text-lg font-semibold tabular-nums ${poolActive ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
              {formatCurrency(availableLoanPool, currency)}
            </p>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="My loan requests" value={myLoans.length} icon={CreditCard} />
        <StatCard label="Pending group review" value={pendingReview.length} icon={ShieldCheck} tone={pendingReview.length ? "amber" : "neutral"} />
        <StatCard label="Active group loans" value={activePortfolio.length} icon={FileText} />
      </section>

      {receivedLoan && (
        <AppStateNotice
          outcomeKey="loanReceived"
          state={{
            ...getFinancialOutcome("loanReceived"),
            description: `${formatCurrency(receivedLoan.amount, currency)} has been disbursed from the group loan pool. Keep your ${receivedLoan.term_weeks}-week repayment schedule on track.`,
          }}
        />
      )}

      <Tabs items={tabs} active={tab} onChange={(id) => setTab(id as LoanTab)} />

      {/* My Loans */}
      {tab === "mine" && (
        <section className="space-y-4">
          {loansLoading ? (
            <>
              <LoanSkeleton />
              <LoanSkeleton />
            </>
          ) : myLoans.length ? (
            myLoans.map((loan) => <LoanSummaryCard key={loan.id} loan={loan} currency={currency} />)
          ) : (
            <AppStatePanel
              state={{ ...getAppState("loans.empty"), primaryAction: { label: poolActive ? "Borrow loan" : "See how it works" } }}
              onPrimaryAction={() => setTab("borrow")}
            />
          )}
        </section>
      )}

      {/* Borrow */}
      {tab === "borrow" &&
        (poolActive ? (
          <form onSubmit={handleRequest} className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
            <SectionCard title="Borrow loan" description="Submit a request for group leader review.">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={`Amount (${activeGroup.currency})`}>
                  <input
                    type="number"
                    min="1"
                    max={availableLoanPool || undefined}
                    value={loanAmount}
                    onChange={(event) => setLoanAmount(event.target.value)}
                    className="loan-input"
                    placeholder="Enter amount"
                  />
                </Field>
                <Field label="Purpose">
                  <select value={purpose} onChange={(event) => setPurpose(event.target.value)} className="loan-input">
                    {LOAN_PURPOSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Repayment period</p>
                <div className="grid grid-cols-3 gap-3">
                  {TERM_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTerm(option)}
                      className={`h-11 rounded-lg border text-sm font-medium transition ${
                        term === option
                          ? "border-[#00ab00] bg-[#ecfdf3] text-[#00ab00]"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {option} weeks
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!loanAmount || requestedAmount <= 0 || requestLoan.isPending}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition hover:bg-[#009200] disabled:opacity-50"
              >
                {requestLoan.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit loan request
              </button>
            </SectionCard>

            <SectionCard title="Repayment preview">
              <div className="space-y-1">
                <InfoRow label="Principal" value={formatCurrency(requestedAmount, currency)} />
                <InfoRow label="Estimated interest" value={formatCurrency(interest, currency)} />
                <InfoRow label="Total repayment" value={formatCurrency(totalRepay, currency)} strong />
                <InfoRow label="Weekly installment" value={formatCurrency(weeklyPayment, currency)} />
              </div>
              <div className="mt-5 rounded-lg border border-[#bfe8c4] bg-[#ecfdf3] p-4 text-xs leading-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Loan requests are approved according to group rules and the available loan pool balance.
              </div>
            </SectionCard>
          </form>
        ) : (
          <LockedState
            icon={Lock}
            title="The loan pool isn't active yet"
            description="Loans are backed by the group loan pool, which builds from a share of every contribution. Borrowing opens once the group is active and the pool has funds."
            steps={[
              { label: "Group activated by admins", done: groupActive },
              { label: "Members contributing to the wallet", done: Number(activeGroup?.wallet?.total || 0) > 0 },
              { label: "Loan pool funded and available to borrow", done: availableLoanPool > 0 },
            ]}
          />
        ))}

      {/* Group Review */}
      {tab === "review" && isGroupLeader && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-[#0a2540]/10 bg-[#0a2540] p-5 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold">Leader authorization</h2>
                <p className="mt-1 text-sm text-white/60">Enter your transaction PIN to approve sensitive loan actions.</p>
              </div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="h-12 w-full rounded-lg border border-white/10 bg-white/10 px-4 text-center text-lg font-semibold tracking-[0.35em] text-white outline-none placeholder:text-white/30 focus:border-[#00ab00] md:w-48"
                placeholder="PIN"
              />
            </div>
          </div>

          {loansLoading ? (
            <>
              <LoanSkeleton />
              <LoanSkeleton />
            </>
          ) : pendingReview.length ? (
            pendingReview.map((loan) => (
              <SectionCard key={loan.id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <StatusBadge status={loan.status} />
                    <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{loan.borrower_name}</h3>
                    <p className="mt-1 text-sm capitalize text-gray-500 dark:text-gray-400">
                      {loan.purpose.replace(/_/g, " ")} · {loan.term_weeks} weeks
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">{formatCurrency(loan.amount, currency)}</p>
                    <p className="text-xs font-medium text-[#00ab00]">{loan.interest_rate_monthly}% monthly interest</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row dark:border-gray-800">
                  <button
                    onClick={() => handleApprove(loan.id)}
                    disabled={approveLoan.isPending}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition hover:bg-[#009200] disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectLoanId(loan.id)}
                    disabled={rejectLoan.isPending}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/20 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    <XCircle size={16} />
                    Decline
                  </button>
                </div>
              </SectionCard>
            ))
          ) : (
            <AppStatePanel stateKey="loans.noReview" />
          )}
        </section>
      )}

      {rejectLoanId && (
        <RejectDialog
          reason={rejectReason}
          saving={rejectLoan.isPending}
          onReasonChange={setRejectReason}
          onClose={() => {
            setRejectLoanId(null)
            setRejectReason("")
          }}
          onSubmit={handleReject}
        />
      )}
    </div>
  )
}

function LoanSummaryCard({ loan, currency }: { loan: Loan; currency: string }) {
  return (
    <SectionCard>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <StatusBadge status={loan.status} />
          <h3 className="mt-3 text-lg font-semibold capitalize text-gray-900 dark:text-white">
            {loan.purpose.replace(/_/g, " ")} loan
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {loan.disbursed_at ? `Disbursed ${new Date(loan.disbursed_at).toLocaleDateString()}` : "Awaiting approval or disbursement"}
          </p>
        </div>
        <div className="lg:text-right">
          <p className="text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">{formatCurrency(loan.amount, currency)}</p>
          <p className="text-xs font-medium text-[#00ab00]">{loan.term_weeks} weeks</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 md:grid-cols-3 dark:border-gray-800">
        <InfoTile label="Interest" value={`${loan.interest_rate_monthly}% monthly`} />
        <InfoTile label="Status" value={loan.status.replace(/_/g, " ")} />
        <InfoTile label="Reference" value={loan.id.slice(0, 8)} />
      </div>
    </SectionCard>
  )
}

function RejectDialog({
  reason,
  saving,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  reason: string
  saving: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Decline loan request</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add a clear governance reason for the audit trail.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            className="group-input min-h-28 resize-none py-3"
            placeholder="Reason for declining this loan request"
          />
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Declining a request records a group governance decision. Use concise, respectful wording members can understand later.
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <button onClick={onClose} className="h-10 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:border-gray-800 dark:hover:text-white">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Decline request
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm tabular-nums ${strong ? "font-semibold text-[#00ab00]" : "font-medium text-gray-900 dark:text-white"}`}>
        {value}
      </span>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function LoanSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-7 w-48" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </div>
  )
}
