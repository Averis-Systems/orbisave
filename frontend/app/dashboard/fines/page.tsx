"use client"

import { type ReactNode, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock3, FileText, Gavel, Plus, ShieldCheck, Vote } from "lucide-react"

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge, Tabs } from "@/components/dashboard/ui"
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group governance"
        title="Penalties & Fines"
        description="Review penalty records and propose rule changes that only take effect after quorum and a majority vote."
        actions={<StatusBadge status={isChairperson ? "Chairperson controls" : "Member view"} tone={isChairperson ? "green" : "gray"} />}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Pending penalties" value={formatCurrency(pendingTotal, currency)} sub="Unsettled penalty balance" icon={Clock3} tone={pendingTotal > 0 ? "amber" : "neutral"} />
        <StatCard label="Settled penalties" value={formatCurrency(paidTotal, currency)} sub="Paid penalty records" icon={CheckCircle2} tone="green" />
        <StatCard label="Penalty records" value={fines?.length || 0} sub="Current group ledger entries" icon={FileText} />
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

      <Tabs
        items={[
          { id: "ledger", label: "Ledger" },
          { id: "rules", label: "Rule Proposals" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as FineTab)}
      />

      {tab === "ledger" ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <PenaltyLedger fines={fines || []} currency={currency} />
          <aside className="space-y-5">
            <SectionCard>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00]">
                <ShieldCheck size={20} />
              </div>
              <h2 className="mt-5 text-base font-semibold text-gray-900 dark:text-white">Penalty governance</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Penalty rates are adopted by group vote. Once adopted, the system applies them automatically and any change requires another valid vote.
              </p>
              <div className="mt-5 space-y-2">
                <InfoRow label="Quorum" value="Group setting" />
                <InfoRow label="Decision" value="Majority after quorum" />
                <InfoRow label="Change control" value="Vote required" />
              </div>
            </SectionCard>

            <SectionCard title="Observed rule activity">
              <div className="space-y-2">
                {ruleSummary.length ? (
                  ruleSummary.map((item) => <InfoRow key={item.rule} label={titleCase(item.rule)} value={`${item.count} records`} />)
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400 dark:border-gray-800">
                    No penalty activity yet.
                  </p>
                )}
              </div>
            </SectionCard>
          </aside>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <RuleProposalPanel isChairperson={isChairperson} currency={currency} />
          <SectionCard>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00]">
              <Vote size={20} />
            </div>
            <h2 className="mt-5 text-base font-semibold text-gray-900 dark:text-white">Adoption flow</h2>
            <div className="mt-5 space-y-4">
              <StepItem index={1} title="Chairperson drafts" description="A rate, grace period, and eligible rule type are proposed." />
              <StepItem index={2} title="Quorum is checked" description="Voting proceeds only when the configured participation threshold is met." />
              <StepItem index={3} title="Majority decides" description="If the option passes, the rule becomes active automatically." />
              <StepItem index={4} title="Rule locks" description="A new vote is required before the adopted rate can change again." />
            </div>
          </SectionCard>
        </section>
      )}
    </div>
  )
}

function PenaltyLedger({ fines, currency }: { fines: Fine[]; currency: string }) {
  return (
    <SectionCard
      title="Penalty ledger"
      description="Actual penalties recorded for this group."
      actions={<StatusBadge status={`${fines.length} records`} tone="gray" />}
      bodyClassName=""
    >
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {fines.length ? (
          fines.map((fine) => (
            <div key={fine.id} className="flex flex-col gap-4 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    fine.status === "paid" ? "bg-[#ecfdf3] text-[#00ab00]" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                  }`}
                >
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{fine.member_name || "Group member"}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {titleCase(fine.rule_type)} · {titleCase(fine.penalty_type)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:flex-col md:items-end">
                <p className="text-sm font-semibold text-gray-900 tabular-nums dark:text-white">{formatCurrency(Number(fine.amount || 0), currency)}</p>
                <StatusBadge status={fine.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon={FileText} title="No penalties recorded" description="When penalties are applied under adopted rules, they appear here." />
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function RuleProposalPanel({ isChairperson, currency }: { isChairperson: boolean; currency: string }) {
  const [ruleType, setRuleType] = useState("late_contribution")
  const [penaltyType, setPenaltyType] = useState("fixed")
  const [value, setValue] = useState("")
  const [graceDays, setGraceDays] = useState("3")
  const [quorum, setQuorum] = useState("60")
  const [majority, setMajority] = useState("51")

  /*
   * This panel is a PREVIEW, not a working form.
   *
   * It previously accepted six fields, validated them, then showed a success
   * toast and discarded everything: no request was ever made, and a
   * chairperson could reasonably believe they had set the group's penalty
   * rules. There is no governance API to submit to, so every control is
   * disabled and the panel says so plainly.
   *
   * TODO(api): no endpoint exists for proposing or adopting a penalty rule.
   * A working flow needs: create proposal, list open proposals, cast vote,
   * adopt on quorum plus majority, and server-side rejection of rates above
   * the CountryPolicy cap. Re-enable these inputs only once that exists.
   */

  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00]">
          <Gavel size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Draft penalty rule</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Chairpersons draft rule changes, but adoption requires quorum and a passing vote.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
        Proposing rule changes is not available yet. The fields below show what a proposal will capture once
        group voting is connected. Penalties currently in force are listed on the Ledger tab.
      </div>

      <div className="mt-6 space-y-5">
        <Field label="Rule type">
          <select value={ruleType} onChange={(event) => setRuleType(event.target.value)} disabled className="group-input">
            {RULE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Penalty type">
            <select value={penaltyType} onChange={(event) => setPenaltyType(event.target.value)} disabled className="group-input">
              {PENALTY_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={penaltyType === "fixed" ? `Value (${currency})` : "Value (%)"}>
            <input value={value} onChange={(event) => setValue(event.target.value)} disabled inputMode="decimal" className="group-input" placeholder={penaltyType === "fixed" ? "0.00" : "0"} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Grace days">
            <input value={graceDays} onChange={(event) => setGraceDays(event.target.value)} disabled inputMode="numeric" className="group-input" />
          </Field>
          <Field label="Quorum (%)">
            <input value={quorum} onChange={(event) => setQuorum(event.target.value)} disabled inputMode="numeric" className="group-input" />
          </Field>
          <Field label="Majority (%)">
            <input value={majority} onChange={(event) => setMajority(event.target.value)} disabled inputMode="numeric" className="group-input" />
          </Field>
        </div>

        <button
          type="button"
          disabled
          title="Rule proposals need a group voting endpoint, which is not available yet."
          className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-100 px-5 text-sm font-semibold text-gray-400"
        >
          <Plus size={16} />
          Propose rule change
        </button>
      </div>
    </SectionCard>
  )
}

function StepItem({ index, title, description }: { index: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9f3ed] text-xs font-semibold text-[#00ab00]">
        {index}
      </span>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function FinesSkeleton() {
  return (
    <div className="space-y-6">
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
