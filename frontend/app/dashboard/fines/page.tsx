"use client"

import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Gavel,
  Plus,
  ShieldCheck,
  Vote,
} from "lucide-react"
import { toast } from "sonner"

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import { useFines, type Fine } from "@/hooks/useFines"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { formatCurrency } from "@/lib/formatters"
import { useAuthStore } from "@/store/auth"

type FineTab = "ledger" | "rules"

const RULE_TYPES = [
  { id: "late_contribution", label: "Late Contribution" },
  { id: "missed_meeting", label: "Missed Meeting" },
  { id: "loan_default", label: "Loan Default" },
]

const PENALTY_TYPES = [
  { id: "fixed", label: "Fixed Amount" },
  { id: "percentage", label: "Percentage" },
]

function titleCase(value?: string) {
  return value?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Penalty"
}

function errorFreeNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export default function FinesPage() {
  const [tab, setTab] = useState<FineTab>("ledger")
  const user = useAuthStore((state) => state.user)
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: members } = useMembers(activeGroup?.id || null)
  const { data: fines, isLoading: finesLoading } = useFines(activeGroup?.id || null)

  const currentMembership = members?.find((member) => member.member === user?.id || member.member_email === user?.email)
  const isChairperson = currentMembership?.role === "chairperson" || user?.role === "chairperson"
  const currency = activeGroup?.currency || "KES"
  const pendingTotal = fines?.filter((fine) => fine.status === "pending").reduce((sum, fine) => sum + Number(fine.amount || 0), 0) || 0
  const paidTotal = fines?.filter((fine) => fine.status === "paid").reduce((sum, fine) => sum + Number(fine.amount || 0), 0) || 0
  const loading = groupsLoading || finesLoading

  const ruleSummary = useMemo(() => {
    const map = new Map<string, number>()
    fines?.forEach((fine) => map.set(fine.rule_type, (map.get(fine.rule_type) || 0) + 1))
    return Array.from(map.entries()).map(([rule, count]) => ({ rule, count }))
  }, [fines])

  if (loading) return <FinesSkeleton />

  if (!activeGroup) {
    return <AppStatePanel stateKey="groups.empty" />
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Group Governance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Penalties & Fines</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Review penalty records and propose rule changes that only become active after quorum and majority approval.
          </p>
        </div>
        <StatusPill label={isChairperson ? "Chairperson controls" : "Member view"} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Pending Penalties" value={formatCurrency(pendingTotal, currency)} helper="Unsettled penalty balance" icon={<Clock3 size={18} />} tone="amber" />
        <MetricCard label="Settled Penalties" value={formatCurrency(paidTotal, currency)} helper="Paid penalty records" icon={<CheckCircle2 size={18} />} />
        <MetricCard label="Penalty Records" value={`${fines?.length || 0}`} helper="Current group ledger entries" icon={<FileText size={18} />} />
      </section>

      {pendingTotal > 0 && (
        <AppStateNotice
          stateKey="fines.pending"
          state={{
            title: "Pending fines require attention",
            description: `${formatCurrency(pendingTotal, currency)} in penalties is awaiting settlement. Settle promptly to keep group standing clear.`,
            tone: "warning",
            icon: "gavel",
            primaryAction: { label: "Review ledger" },
          }}
          onAction={() => setTab("ledger")}
        />
      )}

      <section className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10">
        {[
          { id: "ledger" as const, label: "Ledger" },
          { id: "rules" as const, label: "Rule Proposals" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`relative h-11 px-2 text-xs font-black uppercase tracking-widest transition ${
              tab === item.id ? "text-[#0a2540] dark:text-white" : "text-gray-400 hover:text-[#0a2540] dark:hover:text-white"
            }`}
          >
            {item.label}
            {tab === item.id && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />}
          </button>
        ))}
      </section>

      {tab === "ledger" ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <PenaltyLedger fines={fines || []} currency={currency} />
          <aside className="space-y-5">
            <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
                <ShieldCheck size={20} />
              </div>
              <h2 className="mt-5 text-lg font-black text-[#0a2540] dark:text-white">Penalty Governance</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                Penalty rates should be adopted by group vote. Once adopted, the system applies them automatically and changes require another valid vote.
              </p>
              <div className="mt-5 space-y-3">
                <InfoRow label="Quorum" value="Group setting" />
                <InfoRow label="Decision" value="Majority after quorum" />
                <InfoRow label="Change control" value="Vote required" />
              </div>
            </section>

            <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Observed Rule Activity</h2>
              <div className="mt-5 space-y-3">
                {ruleSummary.length ? (
                  ruleSummary.map((item) => <InfoRow key={item.rule} label={titleCase(item.rule)} value={`${item.count} records`} />)
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm font-semibold text-gray-400 dark:border-white/10">No penalty activity yet.</p>
                )}
              </div>
            </section>
          </aside>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <RuleProposalPanel isChairperson={isChairperson} currency={currency} />
          <aside className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
              <Vote size={20} />
            </div>
            <h2 className="mt-5 text-lg font-black text-[#0a2540] dark:text-white">Adoption Flow</h2>
            <div className="mt-5 space-y-4">
              <StepItem title="1. Chairperson drafts" description="A rate, grace period, and eligible rule type are proposed." />
              <StepItem title="2. Quorum is checked" description="Voting only proceeds when the configured attendance or participation threshold is met." />
              <StepItem title="3. Majority decides" description="If the selected option passes, the rule becomes active automatically." />
              <StepItem title="4. Rule locks" description="A new vote is required before the adopted rate can change again." />
            </div>
          </aside>
        </section>
      )}
    </div>
  )
}

function PenaltyLedger({ fines, currency }: { fines: Fine[]; currency: string }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5 dark:border-white/10">
        <div>
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Penalty Ledger</h2>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Actual penalties recorded for this group.</p>
        </div>
        <StatusPill label={`${fines.length} records`} />
      </div>

      <div className="divide-y divide-gray-100 dark:divide-white/10">
        {fines.length ? (
          fines.map((fine) => (
            <div key={fine.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${fine.status === "paid" ? "bg-emerald-50 text-primary dark:bg-emerald-500/10" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-200"}`}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0a2540] dark:text-white">{fine.member_name || "Group member"}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">{titleCase(fine.rule_type)} / {titleCase(fine.penalty_type)}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-black text-[#0a2540] dark:text-white">{formatCurrency(Number(fine.amount || 0), currency)}</p>
                <StatusPill label={fine.status} />
              </div>
            </div>
          ))
        ) : (
          <AppStatePanel compact stateKey="fines.empty" className="m-5" />
        )}
      </div>
    </section>
  )
}

function RuleProposalPanel({ isChairperson, currency }: { isChairperson: boolean; currency: string }) {
  const [ruleType, setRuleType] = useState("late_contribution")
  const [penaltyType, setPenaltyType] = useState("fixed")
  const [value, setValue] = useState("")
  const [graceDays, setGraceDays] = useState("3")
  const [quorum, setQuorum] = useState("60")
  const [majority, setMajority] = useState("51")

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isChairperson) {
      toast.error("Only the chairperson can draft penalty rule proposals.")
      return
    }
    if (errorFreeNumber(value) <= 0) {
      toast.error("Enter a penalty value above zero.")
      return
    }
    toast.success("Penalty rule proposal prepared for the governance workflow.")
  }

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
          <Gavel size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Draft Penalty Rule</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Chairpersons draft rule changes, but adoption requires quorum and a passing vote.
          </p>
        </div>
      </div>

      {!isChairperson && (
        <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Members can review and vote on proposals once published. Rule drafting is a chairperson privilege.
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field label="Rule type">
          <select value={ruleType} onChange={(event) => setRuleType(event.target.value)} disabled={!isChairperson} className="group-input">
            {RULE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Penalty type">
            <select value={penaltyType} onChange={(event) => setPenaltyType(event.target.value)} disabled={!isChairperson} className="group-input">
              {PENALTY_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
          </Field>
          <Field label={penaltyType === "fixed" ? `Value (${currency})` : "Value (%)"}>
            <input value={value} onChange={(event) => setValue(event.target.value)} disabled={!isChairperson} inputMode="decimal" className="group-input" placeholder={penaltyType === "fixed" ? "0.00" : "0"} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Grace days">
            <input value={graceDays} onChange={(event) => setGraceDays(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
          </Field>
          <Field label="Quorum (%)">
            <input value={quorum} onChange={(event) => setQuorum(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
          </Field>
          <Field label="Majority (%)">
            <input value={majority} onChange={(event) => setMajority(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
          </Field>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm font-semibold leading-6 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
          This proposal UI is ready for the governance API. Once voting endpoints are connected, passing proposals should create or update the backend PenaltyRule automatically.
        </div>

        <button
          type="submit"
          disabled={!isChairperson}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        >
          <Plus size={15} />
          Prepare Proposal
        </button>
      </form>
    </section>
  )
}

function MetricCard({ label, value, helper, icon, tone = "green" }: { label: string; value: string; helper: string; icon: ReactNode; tone?: "green" | "amber" }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-200" : "bg-emerald-50 text-primary dark:bg-emerald-500/10"
  return (
    <article className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-black text-[#0a2540] dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{helper}</p>
    </article>
  )
}

function StepItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
        <Vote size={15} />
      </span>
      <div>
        <p className="text-sm font-black text-[#0a2540] dark:text-white">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-right text-xs font-black text-[#0a2540] dark:text-white">{value}</span>
    </div>
  )
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit rounded-lg border border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      {label}
    </span>
  )
}

function FinesSkeleton() {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-60 rounded-lg" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  )
}
