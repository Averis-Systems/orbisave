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

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import { Contribution, useContributions } from "@/hooks/useContributions"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { formatCurrency } from "@/lib/formatters"
import { PageHeader, SectionCard, StatCard, StatusBadge, Tabs } from "@/components/dashboard/ui"

type ContributionTab = "collections" | "rules" | "activity"

/* Contribution states the API returns, mapped onto the shared badge tones. */
const STATUS_TONE: Record<Contribution["status"], "green" | "amber" | "red" | "gray" | "blue"> = {
  scheduled: "gray",
  initiated: "amber",
  pending: "amber",
  confirmed: "green",
  failed: "red",
  disputed: "blue",
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
    { id: "collections", label: "Collections", count: pendingContributions.length },
    { id: "rules", label: "Rules", count: null },
    { id: "activity", label: "Activity", count: contributions?.length || 0 },
  ]

  if (loading) {
    return <ContributionsSkeleton />
  }

  if (!activeGroup) {
    return <AppStatePanel stateKey="groups.empty" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group contributions"
        title="Contributions"
        description={`Member collection status, contribution rules, and payment records for ${activeGroup.name}.`}
        actions={
          /*
            Sending a group-wide collection prompt needs a reminder endpoint
            that the backend does not expose yet, so the control is disabled
            rather than shown as live.
            TODO(api): wire to the group contribution reminder endpoint once
            it exists, then drop `disabled` and the title text.
          */
          <button
            type="button"
            disabled
            title="Collection prompts need a backend reminder endpoint, which is not available yet."
            className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-5 text-sm font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500"
          >
            <Send size={16} />
            Send collection prompts
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total collected"
          value={formatCurrency(totalCollected, currency)}
          sub={`${paidCount} of ${activeCount} active members have paid`}
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding, currency)}
          sub={`${Math.max(activeCount - paidCount, 0)} members have not paid yet`}
          icon={AlertCircle}
          tone="red"
        />
        <StatCard
          label="Cycle target"
          value={formatCurrency(cycleTarget, currency)}
          sub={`${activeCount} members x ${formatCurrency(contributionAmount, currency)}`}
          icon={Activity}
        />
        <StatCard
          label="Collection rate"
          value={`${collectionRate}%`}
          sub="Members paid out of active members this cycle"
          icon={CheckCircle2}
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

      <Tabs items={tabs} active={tab} onChange={(id) => setTab(id as ContributionTab)} />

      {tab === "collections" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <SectionCard
            title="Member collection status"
            description="One row per active group member in the current cycle."
            actions={
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-medium text-[#039855] tabular-nums dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={14} />
                {paidCount}/{activeCount} paid
              </span>
            }
          >
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-3 flex items-end justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Cycle progress</span>
                <span className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">{collectionRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div className="h-full rounded-full bg-[#00ab00] transition-all duration-500" style={{ width: `${collectionRate}%` }} />
              </div>
            </div>

            <div className="mt-6 divide-y divide-gray-100 dark:divide-gray-800">
              {activeMembers.length ? (
                activeMembers.map((member) => {
                  const hasPaid = paidMemberNames.has(member.member_name)
                  return (
                    <div key={member.id} className="flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${hasPaid ? "bg-[#00ab00]" : "bg-gray-300 dark:bg-gray-700"}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{member.member_name}</p>
                          <p className="text-xs capitalize text-gray-500">{member.role.replace("_", " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                          {hasPaid ? formatCurrency(contributionAmount, currency) : formatCurrency(0, currency)}
                        </span>
                        <StatusBadge
                          status={hasPaid ? "Confirmed" : "Not paid"}
                          tone={hasPaid ? "green" : "amber"}
                        />
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
          </SectionCard>

          <aside className="space-y-5">
            <RulesCard activeGroup={activeGroup} currency={currency} />
            <ActivityCard contributions={contributions || []} currency={currency} />
          </aside>
        </div>
      )}

      {tab === "rules" && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <RulesCard activeGroup={activeGroup} currency={currency} expanded />
          <SectionCard
            title="Collection readiness"
            description="Each item below must be true before automated collection prompts can run."
            actions={
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00] dark:bg-emerald-500/10">
                <Settings2 size={18} />
              </span>
            }
          >
            <div className="space-y-3">
              <ReadinessRow label="Group status is active" done={activeGroup.status === "active"} />
              <ReadinessRow label="Contribution amount is set above zero" done={contributionAmount > 0} />
              <ReadinessRow label="At least one active member" done={activeCount > 0} />
              <ReadinessRow label="Contribution history loaded" done={Boolean(contributions)} />
            </div>
          </SectionCard>
        </section>
      )}

      {tab === "activity" && (
        <SectionCard
          title="Contribution activity"
          description="Every scheduled, initiated, confirmed, and failed contribution record for this group."
        >
          <ContributionList contributions={contributions || []} currency={currency} />
        </SectionCard>
      )}
    </div>
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
    <SectionCard
      title="Contribution rules"
      description="The settings this group collects against each cycle."
      actions={
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <CalendarDays size={18} />
        </span>
      }
    >
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
            <span className="text-right text-sm font-medium capitalize text-gray-900 tabular-nums dark:text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function ActivityCard({ contributions, currency }: { contributions: Contribution[]; currency: string }) {
  return (
    <SectionCard
      title="Recent activity"
      description="The five most recent contribution records."
      actions={
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00] dark:bg-emerald-500/10">
          <Clock3 size={18} />
        </span>
      }
    >
      <ContributionList contributions={contributions.slice(0, 5)} currency={currency} compact />
    </SectionCard>
  )
}

function ContributionList({ contributions, currency, compact = false }: { contributions: Contribution[]; currency: string; compact?: boolean }) {
  if (!contributions.length) {
    return <AppStatePanel compact stateKey="contributions.empty" />
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {contributions.map((contribution) => {
        const date = contribution.confirmed_at || contribution.initiated_at || contribution.scheduled_date
        return (
          <div key={contribution.id} className={`flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between ${compact ? "md:flex-col md:items-stretch" : ""}`}>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{contribution.member_name || "Group member"}</p>
              <p className="mt-1 text-xs text-gray-500 tabular-nums">{date ? new Date(date).toLocaleString() : "No date recorded"}</p>
            </div>
            <div className={`flex items-center gap-3 ${compact ? "justify-between" : "md:justify-end"}`}>
              <span className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                {formatCurrency(Number(contribution.amount || 0), contribution.currency || currency)}
              </span>
              <StatusBadge status={contribution.status} tone={STATUS_TONE[contribution.status]} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReadinessRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
      <span className="text-sm font-medium text-gray-800 dark:text-white">{label}</span>
      <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${done ? "text-[#039855]" : "text-amber-600 dark:text-amber-300"}`}>
        {done ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
        {done ? "Ready" : "Not ready"}
      </span>
    </div>
  )
}

function ContributionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-52 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
    </div>
  )
}
