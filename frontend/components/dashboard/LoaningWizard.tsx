"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { X, ChevronLeft, Loader2, Landmark, Check } from "lucide-react"
import { useCreateProposal } from "@/hooks/useProposals"

/**
 * Guided, minimal-text wizard for a member to propose turning on internal
 * loaning. It collects the four core terms, then puts them to a group vote
 * (creates an `activate_loan_pool` proposal). On pass the backend applies them.
 */

interface Group {
  id: string
  currency?: string
}

type Step = {
  key: "loan_pool_pct" | "loan_interest_rate_monthly" | "max_loan_multiplier" | "loan_term_weeks"
  title: string
  hint: string
  options: { value: number; label: string }[]
  suffix?: string
}

const STEPS: Step[] = [
  {
    key: "loan_pool_pct",
    title: "How much funds the loan pool?",
    hint: "Share of each contribution (after savings) set aside to lend.",
    options: [20, 30, 40, 50].map((v) => ({ value: v, label: `${v}%` })),
  },
  {
    key: "loan_interest_rate_monthly",
    title: "Monthly interest on loans",
    hint: "What borrowers pay each month.",
    options: [3, 5, 8, 10].map((v) => ({ value: v, label: `${v}%` })),
  },
  {
    key: "max_loan_multiplier",
    title: "How much can a member borrow?",
    hint: "Up to this many times their own savings.",
    options: [1, 2, 3].map((v) => ({ value: v, label: `${v}×` })),
  },
  {
    key: "loan_term_weeks",
    title: "Repayment window",
    hint: "How long members have to repay.",
    options: [4, 8, 12, 24].map((v) => ({ value: v, label: `${v} wks` })),
  },
]

const DEFAULTS = { loan_pool_pct: 30, loan_interest_rate_monthly: 5, max_loan_multiplier: 2, loan_term_weeks: 12 }

export function LoaningWizard({
  group,
  onClose,
  onCreated,
}: {
  group: Group
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState(0)
  const [terms, setTerms] = useState<Record<string, number>>({ ...DEFAULTS })
  const [error, setError] = useState<string | null>(null)
  const createProposal = useCreateProposal(group.id)

  const onReview = step >= STEPS.length
  const progress = onReview ? STEPS.length : step

  function pick(key: string, value: number) {
    setTerms((t) => ({ ...t, [key]: value }))
    setStep((s) => s + 1)
  }

  async function submit() {
    setError(null)
    try {
      await createProposal.mutateAsync({
        proposal_type: "activate_loan_pool",
        title: "Start internal loaning",
        description: "Turn on the group loan pool with the terms below.",
        payload: {
          loan_pool_pct: String(terms.loan_pool_pct),
          loan_interest_rate_monthly: String(terms.loan_interest_rate_monthly),
          max_loan_multiplier: String(terms.max_loan_multiplier),
          loan_term_weeks: terms.loan_term_weeks,
        },
        quorum_pct: "50",
        pass_pct: "50",
        duration_hours: 72,
      })
      onCreated()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      const firstFieldError = detail?.errors ? Object.values(detail.errors)[0]?.[0] : undefined
      setError(firstFieldError || detail?.message || "Could not put this to the group. Please try again.")
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="lw-title">
      <div className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-[#0f1b2d] max-h-[92vh]">
        {/* Header + progress */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex flex-1 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00ab00]/10 text-[#00ab00]">
              <Landmark className="h-5 w-5" />
            </span>
            <h2 id="lw-title" className="text-base font-semibold text-[#0a2540] dark:text-white">Start internal loaning</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 px-5 pt-4">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= progress ? "bg-[#00ab00]" : "bg-slate-200 dark:bg-white/10"}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {!onReview ? (
            <div>
              <h3 className="text-lg font-semibold text-[#0a2540] dark:text-white">{STEPS[step].title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{STEPS[step].hint}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {STEPS[step].options.map((opt) => {
                  const active = terms[STEPS[step].key] === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => pick(STEPS[step].key, opt.value)}
                      className={`flex h-16 items-center justify-center rounded-xl border text-lg font-semibold transition-colors ${
                        active
                          ? "border-[#00ab00] bg-[#00ab00]/10 text-[#0a2540] dark:text-white"
                          : "border-slate-200 text-slate-600 hover:border-[#00ab00]/50 dark:border-white/15 dark:text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-[#0a2540] dark:text-white">Put it to the group</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Members vote. It goes live if the quorum agrees.</p>
              <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
                {[
                  ["Loan pool share", `${terms.loan_pool_pct}% of contributions`],
                  ["Monthly interest", `${terms.loan_interest_rate_monthly}%`],
                  ["Borrow limit", `${terms.max_loan_multiplier}× savings`],
                  ["Repayment window", `${terms.loan_term_weeks} weeks`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
                    <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                    <dd className="font-semibold text-[#0a2540] dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {onReview && (
          <div className="border-t border-slate-100 p-5 dark:border-white/10">
            <button
              type="button"
              onClick={submit}
              disabled={createProposal.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition-colors hover:bg-[#009100] disabled:opacity-60"
            >
              {createProposal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Put to the group vote
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
