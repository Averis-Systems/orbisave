"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Send,
  Settings2,
} from "lucide-react"
import { toast } from "sonner"

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import { Contribution, useContributions } from "@/hooks/useContributions"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { formatCurrency } from "@/lib/formatters"

type ContributionTab = "collections" | "rules" | "activity"

const STATUS_STYLES: Record<Contribution["status"], string> = {
  scheduled: "bg-gray-50 text-gray-500 border-gray-100 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
  initiated: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
  pending: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
  confirmed: "bg-emerald-50 text-primary border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/20",
  failed: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/20",
  disputed: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-200 dark:border-purple-500/20",
}

export default function ContributionsPage() {
  const [tab, setTab] = useState<ContributionTab>("collections")
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: members, isLoading: membersLoading } = useMembers(activeGroup?.id || null)
  const { data: contributions, isLoading: contributionsLoading } = useContributions(activeGroup?.id || null)

  const activeMembers = useMemo(() => members?.filter((member) => member.status === "active") || [], [members])
  const confirmedContributions = useMemo(
    () => contributions?.filter((contribution) => contribution.status === "confirmed") || [],
    [contributions],
  )
  const pendingContributions = useMemo(
    () => contributions?.filter((contribution) => ["scheduled", "initiated", "pending"].includes(contribution.status)) || [],
    [contributions],
  )
  const failedContributions = useMemo(
    () => contributions?.filter((contribution) => contribution.status === "failed") || [],
    [contributions],
  )
  const paidMemberNames = useMemo(
    () => new Set(confirmedContributions.map((contribution) => contribution.member_name)),
    [confirmedContributions],
  )

  const currency = activeGroup?.currency || activeGroup?.wallet?.currency || "KES"
  const paidCount = activeMembers.filter((member) => paidMemberNames.has(member.member_name)).length
  const activeCount = activeMembers.length
  const contributionAmount = Number(activeGroup?.contribution_amount || 0)
  const totalCollected = confirmedContributions.reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0)
  const cycleTarget = activeCount * contributionAmount
  const outstanding = Math.max(cycleTarget - totalCollected, 0)
  const collectionRate = activeCount > 0 ? Math.round((paidCount / activeCount) * 100) : 0
  const loading = groupsLoading || (!!activeGroup && (membersLoading || contributionsLoading))

  const tabs = [
    { id: "collections" as const, label: "Collections", count: pendingContributions.length },
    { id: "rules" as const, label: "Rules", count: null },
    { id: "activity" as const, label: "Activity", count: contributions?.length || 0 },
  ]

  if (loading) {
    return <ContributionsSkeleton />
  }

  if (!activeGroup) {
    return <AppStatePanel stateKey="groups.empty" />
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Group Contributions</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Contributions</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Track member collections, contribution rules, and payment activity for {activeGroup.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.info("Group-wide collection prompts are waiting on the backend reminder endpoint.")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-sm transition hover:bg-green-hover"
        >
          <Send size={16} />
          Collection Prompts
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Collected"
          value={formatCurrency(totalCollected, currency)}
          helper={`${paidCount} of ${activeCount} active members paid`}
          icon={<CircleDollarSign size={18} />}
          tone="green"
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(outstanding, currency)}
          helper={`${Math.max(activeCount - paidCount, 0)} members pending`}
          icon={<AlertCircle size={18} />}
          tone="red"
        />
        <MetricCard
          label="Cycle Target"
          value={formatCurrency(cycleTarget, currency)}
          helper={`${activeCount} members x ${formatCurrency(contributionAmount, currency)}`}
          icon={<Activity size={18} />}
          tone="navy"
        />
        <MetricCard
          label="Collection Rate"
          value={`${collectionRate}%`}
          helper="Current contribution cycle"
          icon={<CheckCircle2 size={18} />}
          tone="green"
        />
      </section>

      {failedContributions.length > 0 && (
        <AppStateNotice
          stateKey="contributions.failed"
          action={{ label: "Review failed payments" }}
          onAction={() => setTab("activity")}
        />
      )}

      {outstanding > 0 && failedContributions.length === 0 && (
        <AppStateNotice
          outcomeKey="contributionMissed"
          action={{ label: "Open collection status" }}
          onAction={() => setTab("collections")}
        />
      )}

      <section className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
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

      {tab === "collections" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Member Collection Status</h2>
                <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">One row per active group member in this cycle.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-primary dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 size={14} />
                {paidCount}/{activeCount} paid
              </span>
            </div>

            <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 flex items-end justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cycle progress</span>
                <span className="text-sm font-black text-[#0a2540] dark:text-white">{collectionRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${collectionRate}%` }} />
              </div>
            </div>

            <div className="mt-6 divide-y divide-gray-100 dark:divide-white/10">
              {activeMembers.length ? (
                activeMembers.map((member) => {
                  const hasPaid = paidMemberNames.has(member.member_name)
                  return (
                    <div key={member.id} className="flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${hasPaid ? "bg-primary" : "bg-gray-300 dark:bg-white/20"}`} />
                        <div>
                          <p className="text-sm font-black text-[#0a2540] dark:text-white">{member.member_name}</p>
                          <p className="text-xs font-semibold capitalize text-gray-400">{member.role.replace("_", " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[#0a2540] dark:text-white">
                          {hasPaid ? formatCurrency(contributionAmount, currency) : formatCurrency(0, currency)}
                        </span>
                        <StatusPill status={hasPaid ? "confirmed" : "pending"} />
                      </div>
                    </div>
                  )
                })
              ) : (
                <AppStatePanel
                  compact
                  stateKey="contributions.noMembers"
                />
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <RulesCard activeGroup={activeGroup} currency={currency} />
            <ActivityCard contributions={contributions || []} currency={currency} />
          </aside>
        </div>
      )}

      {tab === "rules" && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <RulesCard activeGroup={activeGroup} currency={currency} expanded />
          <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
                <Settings2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Collection Readiness</h2>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">What must be available before automated prompts run.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <ReadinessRow label="Active group" done={activeGroup.status === "active"} />
              <ReadinessRow label="Contribution amount configured" done={contributionAmount > 0} />
              <ReadinessRow label="Active members available" done={activeCount > 0} />
              <ReadinessRow label="Contribution history endpoint available" done={Boolean(contributions)} />
            </div>
          </div>
        </section>
      )}

      {tab === "activity" && (
        <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Contribution Activity</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Recent scheduled, initiated, confirmed, and failed contribution records.</p>
            </div>
          </div>
          <ContributionList contributions={contributions || []} currency={currency} />
        </section>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  icon: React.ReactNode
  tone: "green" | "red" | "navy"
}) {
  const toneClass = tone === "red" ? "text-red-500 bg-red-50 dark:bg-red-500/10" : tone === "green" ? "text-primary bg-emerald-50 dark:bg-emerald-500/10" : "text-[#0a2540] bg-gray-50 dark:text-white dark:bg-white/10"
  return (
    <article className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-5 text-2xl font-black text-[#0a2540] dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">{helper}</p>
    </article>
  )
}

function RulesCard({ activeGroup, currency, expanded = false }: { activeGroup: any; currency: string; expanded?: boolean }) {
  const rows = [
    { label: "Frequency", value: activeGroup.contribution_frequency || "Not set" },
    { label: "Amount", value: formatCurrency(Number(activeGroup.contribution_amount || 0), currency) },
    { label: "Contribution day", value: activeGroup.contribution_day ? `Day ${activeGroup.contribution_day}` : "Not set" },
    { label: "Mandatory savings", value: formatCurrency(Number(activeGroup.mandatory_savings_amount || 0), currency) },
    ...(expanded ? [{ label: "Group status", value: activeGroup.status || "Not set" }] : []),
  ]

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-[#0a2540] dark:bg-white/10 dark:text-white">
          <CalendarDays size={18} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Contribution Rules</h2>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Settings used for this group cycle.</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/10">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{row.label}</span>
            <span className="text-right text-sm font-black capitalize text-[#0a2540] dark:text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ActivityCard({ contributions, currency }: { contributions: Contribution[]; currency: string }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
          <Clock3 size={18} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Recent Activity</h2>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Latest contribution records.</p>
        </div>
      </div>
      <ContributionList contributions={contributions.slice(0, 5)} currency={currency} compact />
    </section>
  )
}

function ContributionList({ contributions, currency, compact = false }: { contributions: Contribution[]; currency: string; compact?: boolean }) {
  if (!contributions.length) {
    return <AppStatePanel compact stateKey="contributions.empty" />
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-white/10">
      {contributions.map((contribution) => {
        const date = contribution.confirmed_at || contribution.initiated_at || contribution.scheduled_date
        return (
          <div key={contribution.id} className={`flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between ${compact ? "md:flex-col md:items-stretch" : ""}`}>
            <div>
              <p className="text-sm font-black text-[#0a2540] dark:text-white">{contribution.member_name || "Group member"}</p>
              <p className="mt-1 text-xs font-semibold text-gray-400">{date ? new Date(date).toLocaleString() : "Date unavailable"}</p>
            </div>
            <div className={`flex items-center gap-3 ${compact ? "justify-between" : "md:justify-end"}`}>
              <span className="text-sm font-black text-[#0a2540] dark:text-white">{formatCurrency(Number(contribution.amount || 0), contribution.currency || currency)}</span>
              <StatusPill status={contribution.status} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusPill({ status }: { status: Contribution["status"] }) {
  return (
    <span className={`inline-flex rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

function ReadinessRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-sm font-bold text-[#0a2540] dark:text-white">{label}</span>
      <span className={`inline-flex items-center gap-2 text-xs font-black ${done ? "text-primary" : "text-amber-600 dark:text-amber-200"}`}>
        {done ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
        {done ? "Ready" : "Pending"}
      </span>
    </div>
  )
}

function ContributionsSkeleton() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-44 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-[420px] w-full rounded-lg" />
    </div>
  )
}
