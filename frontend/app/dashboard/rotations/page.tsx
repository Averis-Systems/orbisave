"use client"

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react"

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveGroup, type Group } from "@/hooks/useGroups"
import { useRotationSchedules, useRotations, type RotationSchedule } from "@/hooks/useRotations"
import { formatCurrency } from "@/lib/formatters"
import { getFinancialOutcome } from "@/lib/app-states"
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui"

const AVATAR_TONES = ["bg-[#0a2540]", "bg-[#016828]", "bg-[#1c3a5f]", "bg-[#018a35]", "bg-[#00ab00]"]

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function avatarTone(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % AVATAR_TONES.length
  return AVATAR_TONES[Math.abs(hash)]
}

function formatDate(value?: string) {
  if (!value) return "Not scheduled"
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

export default function RotationsPage() {
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: cycles, isLoading: cyclesLoading } = useRotations(activeGroup?.id || null)
  const currentCycle = cycles?.find((cycle) => cycle.is_current) || cycles?.[0]
  const { data: schedules, isLoading: schedulesLoading } = useRotationSchedules(currentCycle?.id || null)

  const loading = groupsLoading || cyclesLoading || schedulesLoading
  const upcomingSchedules = schedules?.filter((schedule) => !schedule.is_paid_out) || []
  const completedSchedules = schedules?.filter((schedule) => schedule.is_paid_out) || []
  const latestCompletedSchedule = completedSchedules[0]
  const nextRecipient = upcomingSchedules[0] || null
  const progress = schedules?.length ? Math.round((completedSchedules.length / schedules.length) * 100) : 0
  const payoutAmount = currentCycle?.total_contributions || Number(activeGroup?.contribution_amount || 0) * Number(activeGroup?.member_count || 0)

  if (loading) return <RotationsSkeleton />

  if (!activeGroup) {
    return <AppStatePanel stateKey="groups.empty" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rotation savings"
        title="Rotation Schedule"
        description={`Payout order, scheduled recipients, and settled rotation payouts for ${activeGroup.name}.`}
        actions={
          <StatusBadge
            status={currentCycle ? `Cycle ${currentCycle.cycle_number}` : "No active cycle"}
            tone={currentCycle ? "green" : "gray"}
          />
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rotation savings pool"
          value={formatCurrency(Number(activeGroup.wallet?.rotation_pool || 0), activeGroup.currency)}
          sub="Group funds reserved for rotation payouts"
          icon={WalletCards}
          tone="green"
        />
        <StatCard
          label="Cycle progress"
          value={`${progress}%`}
          sub={`${completedSchedules.length} of ${schedules?.length || 0} payouts settled`}
          icon={TrendingUp}
        />
        <StatCard
          label="Pending payouts"
          value={upcomingSchedules.length}
          sub="Recipients still waiting in this cycle"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Settled payouts"
          value={completedSchedules.length}
          sub="Payouts already paid out this cycle"
          icon={CheckCircle2}
          tone="green"
        />
      </section>

      {latestCompletedSchedule && (
        <AppStateNotice
          outcomeKey="payoutReceived"
          state={{
            ...getFinancialOutcome("payoutReceived"),
            description: `${formatCurrency(payoutAmount, activeGroup.currency)} has been settled for ${latestCompletedSchedule.member_name}. Payout history is up to date.`,
          }}
        />
      )}

      <SectionCard
        title="Next scheduled payout"
        description="The member first in line for the current rotation cycle."
      >
        {nextRecipient ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white ${avatarTone(nextRecipient.member_name)}`}>
                {initials(nextRecipient.member_name || "?")}
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {nextRecipient.member_name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-2 tabular-nums">
                    <CalendarDays size={16} />
                    {formatDate(nextRecipient.scheduled_payout_date)}
                  </span>
                  <span className="inline-flex items-center gap-2 tabular-nums">
                    <RefreshCw size={16} />
                    Cycle {nextRecipient.cycle_number}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Estimated payout</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">
                {formatCurrency(payoutAmount, activeGroup.currency)}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                The final amount is set by the payout engine from confirmed contributions in this cycle.
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming payout scheduled"
            description="Every payout in this rotation cycle has been settled, or the cycle has not been initialized yet."
          />
        )}
      </SectionCard>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SchedulePanel
          title="Payout queue"
          description="Members still waiting for a payout in this cycle, in payout order."
          badge={`${upcomingSchedules.length} pending`}
          emptyTitle="No pending payouts"
          emptyDescription="Every scheduled payout for this cycle has been settled."
          schedules={upcomingSchedules}
          group={activeGroup}
          payoutAmount={payoutAmount}
          activeFirst
        />
        <SchedulePanel
          title="Payout history"
          description="Rotation payouts this group has already settled."
          badge={`${completedSchedules.length} settled`}
          emptyTitle="No payout history yet"
          emptyDescription="Settled rotation payouts will be listed here once the first payout is authorized."
          schedules={completedSchedules}
          group={activeGroup}
          payoutAmount={payoutAmount}
        />
      </section>
    </div>
  )
}

function SchedulePanel({
  title,
  description,
  badge,
  emptyTitle,
  emptyDescription,
  schedules,
  group,
  payoutAmount,
  activeFirst = false,
}: {
  title: string
  description: string
  badge: string
  emptyTitle: string
  emptyDescription: string
  schedules: RotationSchedule[]
  group: Group
  payoutAmount: number
  activeFirst?: boolean
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      actions={<StatusBadge status={badge} tone="gray" />}
      bodyClassName="p-0"
    >
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {schedules.length ? (
          schedules.map((schedule, index) => (
            <div key={schedule.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-medium tabular-nums ${
                    activeFirst && index === 0
                      ? "bg-[#00ab00] text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {index + 1}
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-medium text-white ${avatarTone(schedule.member_name)}`}>
                  {initials(schedule.member_name || "?")}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{schedule.member_name}</p>
                  <p className="mt-1 text-xs text-gray-500 tabular-nums">{formatDate(schedule.scheduled_payout_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-1">
                <p className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                  {formatCurrency(payoutAmount, group.currency)}
                </p>
                <StatusBadge
                  status={schedule.is_paid_out ? "Settled" : activeFirst && index === 0 ? "Next payout" : "Scheduled"}
                  tone={schedule.is_paid_out ? "gray" : activeFirst && index === 0 ? "green" : "amber"}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="p-5">
            <EmptyState icon={RefreshCw} title={emptyTitle} description={emptyDescription} />
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function RotationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}
