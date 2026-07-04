"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveGroup } from "@/hooks/useGroups"
import { Loan, useApproveLoan, useLoans, useRejectLoan, useRequestLoan } from "@/hooks/useLoans"
import { fmt } from "@/lib/formatters"
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
  const availableLoanPool = Number(activeGroup?.wallet?.loan_pool || 0)
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
  const paidLoans = loans?.filter((loan) => loan.status === "repaid") || []

  const tabs = [
    { id: "mine" as const, label: "My Loans", count: myLoans.length },
    { id: "borrow" as const, label: "Borrow Loan", count: null },
    ...(isGroupLeader ? [{ id: "review" as const, label: "Group Review", count: pendingReview.length }] : []),
  ]

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeGroup || requestedAmount <= 0) return
    if (requestedAmount > availableLoanPool) {
      toast.error("Requested amount exceeds the current Loan Pool balance.")
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
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Loan Pool</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Loans</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Request financing from the group Loan Pool, track your own loans, and review member requests when you hold a leadership role.
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Available Loan Pool</p>
          <p className="mt-1 text-2xl font-black text-[#0a2540] dark:text-white">{fmt(availableLoanPool)}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="My Loan Requests" value={myLoans.length} icon={<CreditCard size={18} />} />
        <StatCard label="Pending Group Review" value={pendingReview.length} icon={<ShieldCheck size={18} />} />
        <StatCard label="Active Group Loans" value={activePortfolio.length} icon={<FileText size={18} />} />
      </section>

      {receivedLoan && (
        <AppStateNotice
          outcomeKey="loanReceived"
          state={{
            ...getFinancialOutcome("loanReceived"),
            description: `${fmt(receivedLoan.amount)} has been disbursed from the group Loan Pool. Keep your ${receivedLoan.term_weeks}-week repayment schedule on track.`,
          }}
        />
      )}

      <section className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`relative flex h-12 items-center gap-2 px-2 text-xs font-black uppercase tracking-widest transition ${
              tab === item.id ? "text-[#0a2540] dark:text-white" : "text-gray-400 hover:text-[#0a2540] dark:hover:text-white"
            }`}
          >
            {item.label}
            {item.count !== null && <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-white/10 dark:text-gray-300">{item.count}</span>}
            {tab === item.id && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />}
          </button>
        ))}
      </section>

      {tab === "mine" && (
        <section className="space-y-4">
          {loansLoading ? (
            <>
              <LoanSkeleton />
              <LoanSkeleton />
            </>
          ) : myLoans.length ? (
            myLoans.map((loan) => <LoanSummaryCard key={loan.id} loan={loan} />)
          ) : (
            <AppStatePanel
              state={{ ...getAppState("loans.empty"), primaryAction: { label: "Borrow loan" } }}
              onPrimaryAction={() => setTab("borrow")}
            />
          )}
        </section>
      )}

      {tab === "borrow" && (
        <form onSubmit={handleRequest} className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Borrow Loan</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Submit a request for group leader review.</p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
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
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Repayment period</p>
              <div className="grid grid-cols-3 gap-3">
                {TERM_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTerm(option)}
                    className={`h-11 rounded-lg border text-xs font-black uppercase tracking-widest transition ${
                      term === option
                        ? "border-primary bg-emerald-50 text-primary"
                        : "border-gray-100 bg-gray-50 text-gray-400 hover:text-[#0a2540] dark:border-white/10 dark:bg-white/5 dark:hover:text-white"
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
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-black text-white shadow-sm transition hover:bg-green-hover disabled:opacity-50"
            >
              {requestLoan.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Loan Request
            </button>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#0a2540] dark:text-white">Repayment Preview</h3>
            <div className="mt-5 space-y-3">
              <InfoRow label="Principal" value={fmt(requestedAmount)} />
              <InfoRow label="Estimated interest" value={fmt(interest)} />
              <InfoRow label="Total repayment" value={fmt(totalRepay)} strong />
              <InfoRow label="Weekly installment" value={fmt(weeklyPayment)} />
            </div>
            <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold leading-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              Loan requests are approved according to group rules and available Loan Pool balance.
            </div>
          </div>
        </form>
      )}

      {tab === "review" && isGroupLeader && (
        <section className="space-y-5">
          <div className="rounded-lg border border-[#0a2540]/10 bg-[#0a2540] p-5 text-white shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">Leader Authorization</h2>
                <p className="mt-1 text-sm font-semibold text-white/60">Use your transaction PIN for sensitive loan approval actions.</p>
              </div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="h-12 w-full rounded-lg border border-white/10 bg-white/10 px-4 text-center text-lg font-black tracking-[0.35em] text-white outline-none placeholder:text-white/30 focus:border-primary md:w-48"
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
              <div key={loan.id} className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <StatusBadge status={loan.status} />
                    <h3 className="mt-3 text-xl font-black text-[#0a2540] dark:text-white">{loan.borrower_name}</h3>
                    <p className="mt-1 text-sm font-semibold capitalize text-gray-500 dark:text-gray-400">
                      {loan.purpose.replace(/_/g, " ")} / {loan.term_weeks} weeks
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-2xl font-black text-[#0a2540] dark:text-white">{fmt(loan.amount)}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-primary">{loan.interest_rate_monthly}% monthly interest</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row dark:border-white/10">
                  <button
                    onClick={() => handleApprove(loan.id)}
                    disabled={approveLoan.isPending}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:opacity-50"
                  >
                    <CheckCircle size={15} />
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectLoanId(loan.id)}
                    disabled={rejectLoan.isPending}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white text-xs font-black uppercase tracking-widest text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/20 dark:bg-white/[0.03] dark:text-red-200 dark:hover:bg-red-500/10"
                  >
                    <XCircle size={15} />
                    Decline
                  </button>
                </div>
              </div>
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

function LoanSummaryCard({ loan }: { loan: Loan }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <StatusBadge status={loan.status} />
          <h3 className="mt-3 text-xl font-black capitalize text-[#0a2540] dark:text-white">{loan.purpose.replace(/_/g, " ")} Loan</h3>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
            {loan.disbursed_at ? `Disbursed ${new Date(loan.disbursed_at).toLocaleDateString()}` : "Awaiting approval or disbursement"}
          </p>
        </div>
        <div className="lg:text-right">
          <p className="text-2xl font-black text-[#0a2540] dark:text-white">{fmt(loan.amount)}</p>
          <p className="text-xs font-black uppercase tracking-widest text-primary">{loan.term_weeks} weeks</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 md:grid-cols-3 dark:border-white/10">
        <InfoTile label="Interest" value={`${loan.interest_rate_monthly}% monthly`} />
        <InfoTile label="Status" value={loan.status.replace(/_/g, " ")} />
        <InfoTile label="Reference" value={loan.id.slice(0, 8)} />
      </div>
    </div>
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
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-200">
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Decline Loan Request</h2>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Add a clear governance reason for the audit trail.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0a2540] dark:hover:bg-white/10 dark:hover:text-white">
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
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            Declining a request records a group governance decision. Use concise, respectful wording members can understand later.
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <button onClick={onClose} className="h-10 rounded-lg border border-gray-100 px-5 text-xs font-black uppercase tracking-widest text-gray-500 transition hover:text-[#0a2540] dark:border-white/10 dark:hover:text-white">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Decline Request
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-[#0a2540] dark:text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0 dark:border-white/10">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm ${strong ? "font-black text-primary" : "font-bold text-[#0a2540] dark:text-white"}`}>{value}</span>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black capitalize text-[#0a2540] dark:text-white">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusClass = status.startsWith("pending")
    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
    : status === "rejected" || status === "defaulted"
      ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-200"
      : status === "repaid"
        ? "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300"
        : "bg-emerald-50 text-primary dark:bg-emerald-500/10"

  return (
    <span className={`inline-flex rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

function LoanSkeleton() {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
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
