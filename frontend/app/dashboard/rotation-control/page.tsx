"use client"

import { type FormEvent, type ReactNode, useState } from "react"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Play,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  WalletCards,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { AppStateNotice, AppStatePanel } from "@/components/states/AppState"
import { Skeleton } from "@/components/ui/skeleton"
import { useGroups } from "@/hooks/useGroups"
import {
  useInitializeRotation,
  useRotationSchedules,
  useRotations,
  useStartNextCycle,
  useTriggerPayout,
  type RotationSchedule,
} from "@/hooks/useRotations"
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

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

export default function RotationControlPage() {
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  const { data: cycles, isLoading: cyclesLoading } = useRotations(activeGroup?.id || null)
  const currentCycle = cycles?.find((cycle) => cycle.is_current) || cycles?.[0]
  const { data: schedules, isLoading: schedulesLoading } = useRotationSchedules(currentCycle?.id || null)

  const initialize = useInitializeRotation()
  const nextCycle = useStartNextCycle()
  const triggerPayout = useTriggerPayout()

  const [confirmation, setConfirmation] = useState<RotationSchedule | null>(null)
  const [pin, setPin] = useState("")

  const loading = groupsLoading || cyclesLoading || schedulesLoading
  const upcomingSchedules = schedules?.filter((schedule) => !schedule.is_paid_out) || []
  const paidSchedules = schedules?.filter((schedule) => schedule.is_paid_out) || []
  const latestPaidSchedule = paidSchedules[0]
  const nextRecipient = upcomingSchedules[0] || null
  const payoutAmount = currentCycle?.total_contributions || Number(activeGroup?.contribution_amount || 0) * Number(activeGroup?.member_count || 0)

  const handleTriggerPayout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!confirmation || !currentCycle) return
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("Enter a valid 4 to 6 digit transaction PIN.")
      return
    }

    try {
      await triggerPayout.mutateAsync({ cycleId: currentCycle.id, memberId: confirmation.member, pin })
      toast.success(`${getFinancialOutcome("payoutQueued").title} for ${confirmation.member_name}.`)
      setConfirmation(null)
      setPin("")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Rotation payout could not be triggered."))
    }
  }

  const handleNextCycle = async () => {
    if (!activeGroup) return
    try {
      await nextCycle.mutateAsync(activeGroup.id)
      toast.success("Rotation cycle advanced.")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Rotation cycle could not be advanced."))
    }
  }

  const handleInitialize = async () => {
    if (!activeGroup) return
    try {
      await initialize.mutateAsync(activeGroup.id)
      toast.success("Rotation schedule initialized.")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Rotation schedule could not be initialized."))
    }
  }

  if (loading) return <RotationControlSkeleton />

  if (!activeGroup) {
    return <AppStatePanel stateKey="groups.empty" />
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Rotation Control</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Payout Control</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Manage rotation savings schedules, payout authorization, and cycle transitions for {activeGroup.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!currentCycle && (
            <button
              type="button"
              onClick={handleInitialize}
              disabled={initialize.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0a2540] px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#1c3a5f] disabled:opacity-50"
            >
              <Play size={14} />
              {initialize.isPending ? "Initializing..." : "Initialize Rotation"}
            </button>
          )}
          <button
            type="button"
            onClick={handleNextCycle}
            disabled={!currentCycle || nextCycle.isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-100 bg-white px-5 text-xs font-black uppercase tracking-widest text-[#0a2540] transition hover:border-emerald-100 hover:text-primary disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
          >
            <RefreshCw size={14} />
            {nextCycle.isPending ? "Advancing..." : "Advance Cycle"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Current Cycle" value={currentCycle ? `#${currentCycle.cycle_number}` : "Not initialized"} helper={currentCycle?.status || "Schedule setup required"} icon={<RefreshCw size={18} />} />
        <MetricCard label="Next Recipient" value={nextRecipient?.member_name || "Not scheduled"} helper={nextRecipient ? formatDate(nextRecipient.scheduled_payout_date) : "No pending payout"} icon={<UserCheck size={18} />} />
        <MetricCard label="Estimated Payout" value={formatCurrency(payoutAmount, activeGroup.currency)} helper="Calculated from confirmed cycle contributions" icon={<WalletCards size={18} />} />
      </section>

      {latestPaidSchedule && (
        <AppStateNotice
          outcomeKey="payoutReceived"
          state={{
            ...getFinancialOutcome("payoutReceived"),
            description: `${formatCurrency(payoutAmount, activeGroup.currency)} has been settled for ${latestPaidSchedule.member_name}. The group ledger is updated.`,
          }}
        />
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Payout Schedule</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Member order and authorization state for the current rotation cycle.</p>
            </div>
            <StatusPill label={`${upcomingSchedules.length} pending`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100 text-left dark:border-white/10">
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Member</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Payout Date</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {schedules?.length ? (
                  schedules.map((schedule, index) => (
                    <tr key={schedule.id} className={!schedule.is_paid_out && index === 0 ? "bg-emerald-50/60 dark:bg-emerald-500/10" : ""}>
                      <td className="px-5 py-5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black ${schedule.is_paid_out ? "bg-gray-50 text-gray-400 dark:bg-white/10" : index === 0 ? "bg-primary text-white" : "bg-gray-50 text-[#0a2540] dark:bg-white/10 dark:text-white"}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-white ${avatarTone(schedule.member_name)}`}>
                            {initials(schedule.member_name || "?")}
                          </span>
                          <span className="text-sm font-black text-[#0a2540] dark:text-white">{schedule.member_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-xs font-semibold text-gray-500 dark:text-gray-400">{formatDate(schedule.scheduled_payout_date)}</td>
                      <td className="px-5 py-5 text-sm font-black text-[#0a2540] dark:text-white">{formatCurrency(payoutAmount, activeGroup.currency)}</td>
                      <td className="px-5 py-5">
                        {schedule.is_paid_out ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                            <CheckCircle2 size={14} />
                            Settled
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmation(schedule)
                              setPin("")
                            }}
                            className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-[10px] font-black uppercase tracking-widest transition ${index === 0 ? "bg-primary text-white hover:bg-green-hover" : "bg-gray-50 text-gray-400 hover:text-[#0a2540] dark:bg-white/10 dark:hover:text-white"}`}
                          >
                            Authorize
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-5">
                      <EmptyState compact icon={<CalendarDays size={22} />} title="No rotation schedule" description="Initialize rotation after the group has active members and contribution rules." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Payout Confirmation</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                    Confirm the selected member and enter your transaction PIN before authorizing a payout.
                  </p>
                </div>
              </div>
              {confirmation && (
                <button type="button" onClick={() => setConfirmation(null)} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0a2540] dark:hover:bg-white/10 dark:hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>

            {confirmation ? (
              <form onSubmit={handleTriggerPayout} className="mt-6 space-y-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Member</p>
                  <p className="mt-2 text-sm font-black text-[#0a2540] dark:text-white">{confirmation.member_name}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{formatCurrency(payoutAmount, activeGroup.currency)} scheduled payout</p>
                </div>
                <label className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transaction PIN</span>
                  <input
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    type="password"
                    className="group-input text-center text-xl tracking-[0.4em]"
                    placeholder="0000"
                  />
                </label>
                <button
                  type="submit"
                  disabled={triggerPayout.isPending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:opacity-50"
                >
                  <ShieldCheck size={15} />
                  {triggerPayout.isPending ? "Authorizing..." : "Confirm Payout"}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-gray-200 p-5 text-center dark:border-white/10">
                <p className="text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">Select an unpaid schedule row to review and authorize the next payout.</p>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0a2540] dark:text-white">Control Checks</h2>
            <div className="mt-5 space-y-4">
              <CheckRow icon={<Clock3 size={16} />} title="Contribution Review" description="Confirm contribution compliance before authorizing payout release." />
              <CheckRow icon={<AlertTriangle size={16} />} title="KYC Enforcement" description="Payouts should only proceed for verified group members." tone="amber" />
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}

function MetricCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return (
    <article className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</span>
      </div>
      <p className="mt-4 truncate text-xl font-black text-[#0a2540] dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{helper}</p>
    </article>
  )
}

function CheckRow({ icon, title, description, tone = "green" }: { icon: ReactNode; title: string; description: string; tone?: "green" | "amber" }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-200" : "bg-emerald-50 text-primary dark:bg-emerald-500/10"
  return (
    <div className="flex gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>{icon}</span>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-[#0a2540] dark:text-white">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
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
    <section className={`rounded-lg border border-dashed border-gray-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03] ${compact ? "p-8" : "p-12"}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</div>
      <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    </section>
  )
}

function RotationControlSkeleton() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  )
}
