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
import { useActiveGroup } from "@/hooks/useGroups"
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
import {
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
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

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

export default function RotationControlPage() {
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
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
    if (!confirmation || !activeGroup) return
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("Enter a valid 4 to 6 digit transaction PIN.")
      return
    }

    try {
      // The payout engine pays the next scheduled unpaid recipient. The
      // confirmation panel shows who that is; the server enforces it.
      await triggerPayout.mutateAsync({ groupId: activeGroup.id, pin })
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

  const columns: Column<RotationSchedule>[] = [
    {
      key: "order",
      header: "Order",
      className: "pl-5",
      render: (schedule) => {
        const index = schedules?.indexOf(schedule) ?? 0
        return (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium tabular-nums ${
              schedule.is_paid_out
                ? "bg-gray-100 text-gray-400 dark:bg-gray-800"
                : index === 0
                  ? "bg-[#00ab00] text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {index + 1}
          </span>
        )
      },
    },
    {
      key: "member",
      header: "Member",
      render: (schedule) => (
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-medium text-white ${avatarTone(schedule.member_name)}`}>
            {initials(schedule.member_name || "?")}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{schedule.member_name}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Payout date",
      render: (schedule) => (
        <span className="text-sm text-gray-500 tabular-nums dark:text-gray-400">
          {formatDate(schedule.scheduled_payout_date)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: () => (
        <span className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
          {formatCurrency(payoutAmount, activeGroup.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (schedule) => {
        if (schedule.is_paid_out) {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#039855]">
              <CheckCircle2 size={14} />
              Settled
            </span>
          )
        }
        if (schedule.id === nextRecipient?.id) {
          return (
            <button
              type="button"
              onClick={() => {
                setConfirmation(schedule)
                setPin("")
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#00ab00] px-3 text-sm font-medium text-white transition-colors hover:bg-[#009200]"
            >
              Authorize
            </button>
          )
        }
        return <StatusBadge status="Queued" tone="gray" />
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rotation control"
        title="Payout Control"
        description={`Authorize rotation payouts and advance the rotation cycle for ${activeGroup.name}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {!currentCycle && (
              <button
                type="button"
                onClick={handleInitialize}
                disabled={initialize.isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0a2540] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1c3a5f] disabled:opacity-50"
              >
                <Play size={16} />
                {initialize.isPending ? "Initializing..." : "Initialize rotation"}
              </button>
            )}
            <button
              type="button"
              onClick={handleNextCycle}
              disabled={!currentCycle || nextCycle.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw size={16} />
              {nextCycle.isPending ? "Advancing..." : "Advance cycle"}
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Current cycle"
          value={currentCycle ? `#${currentCycle.cycle_number}` : "Not initialized"}
          sub={currentCycle ? `Cycle status: ${currentCycle.status}` : "Initialize the rotation to create a schedule"}
          icon={RefreshCw}
        />
        <StatCard
          label="Next recipient"
          value={nextRecipient?.member_name || "Not scheduled"}
          sub={nextRecipient ? `Scheduled for ${formatDate(nextRecipient.scheduled_payout_date)}` : "No unpaid schedule rows remain"}
          icon={UserCheck}
        />
        <StatCard
          label="Estimated payout"
          value={formatCurrency(payoutAmount, activeGroup.currency)}
          sub="Total confirmed contributions in this cycle"
          icon={WalletCards}
          tone="green"
        />
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
        <SectionCard
          title="Payout schedule"
          description="Payout order for the current rotation cycle. Only the next unpaid member can be authorized."
          actions={<StatusBadge status={`${upcomingSchedules.length} pending`} tone="gray" />}
          bodyClassName="px-5 pb-5 sm:px-6"
        >
          {schedules?.length ? (
            <DataTable
              columns={columns}
              rows={schedules}
              rowKey={(schedule) => schedule.id}
              minWidth={720}
            />
          ) : (
            <div className="pt-5">
              <EmptyState
                icon={CalendarDays}
                title="No rotation schedule yet"
                description="Initialize the rotation once the group has active members and a contribution amount set."
              />
            </div>
          )}
        </SectionCard>

        <aside className="space-y-5">
          <SectionCard
            title="Payout confirmation"
            description="Confirm the recipient and enter your transaction PIN to release a payout."
            actions={
              confirmation ? (
                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  aria-label="Clear payout selection"
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00] dark:bg-emerald-500/10">
                  <ShieldCheck size={18} />
                </span>
              )
            }
          >
            {confirmation ? (
              <form onSubmit={handleTriggerPayout} className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Selected member</p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{confirmation.member_name}</p>
                  <p className="mt-1 text-sm text-gray-500 tabular-nums dark:text-gray-400">
                    {formatCurrency(payoutAmount, activeGroup.currency)} scheduled payout
                  </p>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Transaction PIN</span>
                  <input
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    type="password"
                    autoComplete="off"
                    className="group-input text-center text-xl tracking-[0.4em] tabular-nums"
                    placeholder="0000"
                  />
                </label>
                <button
                  type="submit"
                  disabled={triggerPayout.isPending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-medium text-white transition-colors hover:bg-[#009200] disabled:opacity-50"
                >
                  <ShieldCheck size={16} />
                  {triggerPayout.isPending ? "Authorizing..." : "Confirm payout"}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center dark:border-gray-800">
                <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Choose Authorize on the next unpaid row in the payout schedule to review and release that payout.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Before you authorize">
            <div className="space-y-4">
              <CheckRow
                icon={<Clock3 size={16} />}
                title="Contribution review"
                description="Check that this cycle's contributions are confirmed before releasing the payout."
              />
              {/*
                TODO(copy): confirm with product whether KYC verification is a
                hard block on payout release or an advisory check. The copy
                below states the intent without claiming enforcement.
              */}
              <CheckRow
                icon={<AlertTriangle size={16} />}
                title="Member verification"
                description="Payouts are intended for verified members only."
                tone="amber"
              />
            </div>
          </SectionCard>
        </aside>
      </section>
    </div>
  )
}

function CheckRow({ icon, title, description, tone = "green" }: { icon: ReactNode; title: string; description: string; tone?: "green" | "amber" }) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
      : "bg-[#e9f3ed] text-[#00ab00] dark:bg-emerald-500/10"
  return (
    <div className="flex gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function RotationControlSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  )
}
