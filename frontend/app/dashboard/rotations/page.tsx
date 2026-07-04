"use client"

import { type ReactNode } from "react"
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
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Rotation Savings</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Rotation Schedule</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Track payout order, scheduled recipients, and completed rotation savings payouts for {activeGroup.name}.
          </p>
        </div>
        <StatusPill label={currentCycle ? `Cycle ${currentCycle.cycle_number}` : "No active cycle"} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rotation Savings Pool" value={formatCurrency(Number(activeGroup.wallet?.rotation_pool || 0), activeGroup.currency)} helper="Funds reserved for rotation payouts" icon={<WalletCards size={18} />} />
        <MetricCard label="Cycle Progress" value={`${progress}%`} helper={`${completedSchedules.length} of ${schedules?.length || 0} payouts completed`} icon={<TrendingUp size={18} />} />
        <MetricCard label="Pending Payouts" value={`${upcomingSchedules.length}`} helper="Recipients still waiting in this cycle" icon={<Clock3 size={18} />} />
        <MetricCard label="Completed Payouts" value={`${completedSchedules.length}`} helper="Settled rotation records" icon={<CheckCircle2 size={18} />} />
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

      <section className="rounded-lg border border-[#0a2540]/10 bg-[#0a2540] p-6 text-white shadow-sm">
        {nextRecipient ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Next Scheduled Payout</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">{nextRecipient.member_name}</h2>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-white/60">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatDate(nextRecipient.scheduled_payout_date)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <RefreshCw size={16} />
                  Cycle {nextRecipient.cycle_number}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Estimated Rotation Payout</p>
              <p className="mt-2 text-3xl font-black text-white">{formatCurrency(payoutAmount, activeGroup.currency)}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/50">
                Final payout is calculated by the payout engine from confirmed cycle contributions.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-white/55">No upcoming payout is scheduled for this rotation cycle.</p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SchedulePanel
          title="Payout Queue"
          badge={`${upcomingSchedules.length} pending`}
          emptyTitle="No pending payouts"
          emptyDescription="All scheduled payouts for this cycle are complete."
          schedules={upcomingSchedules}
          group={activeGroup}
          payoutAmount={payoutAmount}
          activeFirst
        />
        <SchedulePanel
          title="Payout History"
          badge="Settled records"
          emptyTitle="No payout history yet"
          emptyDescription="Completed rotation savings payouts will appear here."
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
  badge,
  emptyTitle,
  emptyDescription,
  schedules,
  group,
  payoutAmount,
  activeFirst = false,
}: {
  title: string
  badge: string
  emptyTitle: string
  emptyDescription: string
  schedules: RotationSchedule[]
  group: Group
  payoutAmount: number
  activeFirst?: boolean
}) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5 dark:border-white/10">
        <h2 className="text-lg font-black text-[#0a2540] dark:text-white">{title}</h2>
        <StatusPill label={badge} />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/10">
        {schedules.length ? (
          schedules.map((schedule, index) => (
            <div key={schedule.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black ${activeFirst && index === 0 ? "bg-primary text-white" : "bg-gray-50 text-gray-500 dark:bg-white/10 dark:text-gray-300"}`}>
                  {index + 1}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-black text-white ${avatarTone(schedule.member_name)}`}>
                  {initials(schedule.member_name || "?")}
                </div>
                <div>
                  <p className="text-sm font-black text-[#0a2540] dark:text-white">{schedule.member_name}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">{formatDate(schedule.scheduled_payout_date)}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-black text-[#0a2540] dark:text-white">{formatCurrency(payoutAmount, group.currency)}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {schedule.is_paid_out ? "Settled" : activeFirst && index === 0 ? "Next payout" : "Scheduled"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState compact icon={<RefreshCw size={22} />} title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </section>
  )
}

function MetricCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return (
    <article className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-black text-[#0a2540] dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{helper}</p>
    </article>
  )
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-lg border border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      {label}
    </span>
  )
}

function EmptyState({ icon, title, description, compact = false }: { icon: ReactNode; title: string; description: string; compact?: boolean }) {
  return (
    <section className={`rounded-lg border border-dashed border-gray-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03] ${compact ? "m-5 p-8" : "p-12"}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</div>
      <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    </section>
  )
}

function RotationsSkeleton() {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  )
}
