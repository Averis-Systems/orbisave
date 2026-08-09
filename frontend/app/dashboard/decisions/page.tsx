"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import {
  Vote,
  Landmark,
  Plus,
  X,
  Loader2,
  Check,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Users,
} from "lucide-react"
import { useActiveGroup } from "@/hooks/useGroups"
import { useProposals, useVote, useCreateProposal, type Proposal, type VoteChoice } from "@/hooks/useProposals"
import { LoaningWizard } from "@/components/dashboard/LoaningWizard"

const TYPE_LABEL: Record<string, string> = {
  activate_loan_pool: "Start loaning",
  deactivate_loan_pool: "Stop loaning",
  change_loan_terms: "Change loan terms",
  change_contribution: "Change contribution",
  change_savings: "Change savings",
  remove_member: "Remove member",
  dissolve_group: "Dissolve group",
  custom: "Group decision",
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  passed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  expired: "bg-slate-100 text-slate-500",
  cancelled: "bg-slate-100 text-slate-500",
}

export default function DecisionsPage() {
  const { activeGroup, isLoading } = useActiveGroup()
  const groupId = activeGroup?.id
  const { data: proposals, isLoading: loadingProposals } = useProposals(groupId)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
  }

  if (!activeGroup) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <Vote className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-3 text-lg font-semibold text-navy dark:text-white">No group yet</h1>
        <p className="mt-1 text-sm text-slate-500">Join or create a group to take part in its decisions.</p>
      </div>
    )
  }

  const loaningOff = activeGroup.loan_pool_enabled === false
  const open = (proposals ?? []).filter((p) => p.status === "open")
  const resolved = (proposals ?? []).filter((p) => p.status !== "open")

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy dark:text-white">Decisions</h1>
          <p className="mt-0.5 text-sm text-slate-500">Propose and vote on how your group runs.</p>
        </div>
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-[#00ab00] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#009100]"
        >
          <Plus className="h-4 w-4" /> Propose
        </button>
      </div>

      {/* Loaning is off → invite the group to turn it on */}
      {loaningOff && !open.some((p) => p.proposal_type === "activate_loan_pool") && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#00ab00]/25 bg-[#00ab00]/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00ab00]/10 text-[#00ab00]">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-navy dark:text-white">Turn on internal loaning</h2>
              <p className="mt-0.5 text-sm text-slate-500">Let members borrow from the group. A quick setup, then the group votes.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="h-10 shrink-0 rounded-lg border border-[#00ab00] px-4 text-sm font-semibold text-[#00ab00] transition-colors hover:bg-[#00ab00]/10"
          >
            Set it up
          </button>
        </div>
      )}

      {loadingProposals ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
      ) : (
        <>
          {open.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Open votes</h3>
              {open.map((p) => (
                <ProposalCard key={p.id} proposal={p} groupId={groupId} />
              ))}
            </section>
          )}

          {resolved.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Past decisions</h3>
              {resolved.map((p) => (
                <ProposalCard key={p.id} proposal={p} groupId={groupId} />
              ))}
            </section>
          )}

          {open.length === 0 && resolved.length === 0 && !loaningOff && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-white/10">
              <Vote className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No decisions yet. Propose one to get started.</p>
            </div>
          )}
        </>
      )}

      {wizardOpen && (
        <LoaningWizard
          group={{ id: activeGroup.id, currency: activeGroup.currency }}
          onClose={() => setWizardOpen(false)}
          onCreated={() => setWizardOpen(false)}
        />
      )}
      {customOpen && (
        <CustomProposalModal groupId={groupId} onClose={() => setCustomOpen(false)} />
      )}
    </div>
  )
}

function ProposalCard({ proposal: p, groupId }: { proposal: Proposal; groupId?: string }) {
  const vote = useVote(groupId)
  const t = p.tally
  const isOpen = p.status === "open" && !t.closed
  const quorumPct = t.quorum_needed > 0 ? Math.min(100, Math.round((t.cast / t.quorum_needed) * 100)) : 0

  const cast = (choice: VoteChoice) => {
    if (!isOpen) return
    vote.mutate({ proposalId: p.id, choice })
  }

  const VOTES: { choice: VoteChoice; label: string; icon: typeof ThumbsUp; on: string }[] = [
    { choice: "yes", label: "Yes", icon: ThumbsUp, on: "border-[#00ab00] bg-[#00ab00]/10 text-[#00ab00]" },
    { choice: "no", label: "No", icon: ThumbsDown, on: "border-red-400 bg-red-50 text-red-600" },
    { choice: "abstain", label: "Abstain", icon: MinusCircle, on: "border-slate-400 bg-slate-100 text-slate-600" },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f1b2d]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-white/5">
              {TYPE_LABEL[p.proposal_type] || p.proposal_type}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</span>
          </div>
          <h4 className="mt-2 font-semibold text-navy dark:text-white">{p.title}</h4>
          {p.description && <p className="mt-1 text-sm text-slate-500">{p.description}</p>}
        </div>
      </div>

      {/* Terms preview for loaning proposals */}
      {(p.proposal_type === "activate_loan_pool" || p.proposal_type === "change_loan_terms") && p.payload && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {p.payload.loan_pool_pct != null && <Chip>Pool {p.payload.loan_pool_pct}%</Chip>}
          {p.payload.loan_interest_rate_monthly != null && <Chip>{p.payload.loan_interest_rate_monthly}%/mo</Chip>}
          {p.payload.max_loan_multiplier != null && <Chip>{p.payload.max_loan_multiplier}× savings</Chip>}
          {p.payload.loan_term_weeks != null && <Chip>{p.payload.loan_term_weeks} wks</Chip>}
        </div>
      )}

      {/* Quorum + tally */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.cast} of {t.active_members} voted · quorum {t.quorum_needed}</span>
          <span>{t.yes} yes · {t.no} no{t.abstain ? ` · ${t.abstain} abstain` : ""}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div className={`h-full rounded-full ${t.quorum_met ? "bg-[#00ab00]" : "bg-slate-300"}`} style={{ width: `${quorumPct}%` }} />
        </div>
      </div>

      {isOpen ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {VOTES.map(({ choice, label, icon: Icon, on }) => {
            const selected = p.my_vote === choice
            return (
              <button
                key={choice}
                type="button"
                onClick={() => cast(choice)}
                disabled={vote.isPending}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 ${
                  selected ? on : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/15"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            )
          })}
        </div>
      ) : (
        p.outcome_note && <p className="mt-3 text-xs text-slate-400">{p.outcome_note}</p>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-50 px-2 py-0.5 dark:bg-white/5">{children}</span>
}

function CustomProposalModal({ groupId, onClose }: { groupId?: string; onClose: () => void }) {
  const create = useCreateProposal(groupId)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!title.trim()) {
      setError("Add a short title.")
      return
    }
    try {
      await create.mutateAsync({
        proposal_type: "custom",
        title: title.trim(),
        description: description.trim(),
        quorum_pct: "50",
        pass_pct: "50",
        duration_hours: 72,
      })
      onClose()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { message?: string } } })?.response?.data
      setError(detail?.message || "Could not create this. Try again.")
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <div className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl dark:bg-[#0f1b2d]">
        <div className="flex items-center justify-between">
          <h2 id="cp-title" className="text-lg font-semibold text-navy dark:text-white">Propose a decision</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="What should the group decide?"
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-navy focus:border-[#00ab00] focus:outline-none focus:ring-2 focus:ring-[#00ab00]/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add any detail members should know before voting."
            className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-navy focus:border-[#00ab00] focus:outline-none focus:ring-2 focus:ring-[#00ab00]/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
          <p className="text-xs text-slate-400">Members have 3 days to vote. It passes if the quorum agrees.</p>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] text-sm font-semibold text-white hover:bg-[#009100] disabled:opacity-60"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Put to the group
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
