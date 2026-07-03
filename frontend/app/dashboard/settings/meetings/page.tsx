"use client"

import { type FormEvent, type ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, ChevronLeft, Save, ShieldCheck, Video, Vote } from "lucide-react"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { useGroups } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { useMeetingSettings, useUpdateMeetingSettings, type MeetingFrequency, type MeetingProviderMode } from "@/hooks/useMeetings"
import { useAuthStore } from "@/store/auth"

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

function frequencyLabel(value: MeetingFrequency) {
  const labels: Record<MeetingFrequency, string> = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    as_needed: "As needed",
  }
  return labels[value]
}

export default function MeetingsSettingsPage() {
  const user = useAuthStore((state) => state.user)
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const activeGroup = groups?.find((group) => group.id === selectedGroupId) || groups?.[0] || null
  const { data: members } = useMembers(activeGroup?.id || null)
  const { data: settings, isLoading: settingsLoading } = useMeetingSettings(activeGroup?.id || null)
  const updateMeetingSettings = useUpdateMeetingSettings(activeGroup?.id || null)
  const currentMembership = members?.find((member) => member.member === user?.id || member.member_email === user?.email)
  const isChairperson = currentMembership?.role === "chairperson" || user?.role === "chairperson"

  const [frequency, setFrequency] = useState<MeetingFrequency>("monthly")
  const [noticeDays, setNoticeDays] = useState("7")
  const [quorum, setQuorum] = useState("60")
  const [majority, setMajority] = useState("51")
  const [providerMode, setProviderMode] = useState<MeetingProviderMode>("daily")
  const [attendanceTracking, setAttendanceTracking] = useState(true)
  const [minutesRequired, setMinutesRequired] = useState(true)

  useEffect(() => {
    if (!selectedGroupId && groups?.length) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, selectedGroupId])

  useEffect(() => {
    if (!settings) return
    setFrequency(settings.frequency)
    setNoticeDays(String(settings.notice_days))
    setQuorum(String(settings.quorum_percent))
    setMajority(String(settings.majority_percent))
    setProviderMode(settings.provider_mode)
    setAttendanceTracking(settings.attendance_tracking)
    setMinutesRequired(settings.minutes_required)
  }, [settings])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isChairperson) {
      toast.error("Only the chairperson can update meeting governance settings.")
      return
    }
    try {
      await updateMeetingSettings.mutateAsync({
        frequency,
        notice_days: Number(noticeDays),
        quorum_percent: Number(quorum),
        majority_percent: Number(majority),
        provider_mode: providerMode,
        attendance_tracking: attendanceTracking,
        minutes_required: minutesRequired,
      })
      toast.success("Meeting governance settings saved.")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Meeting governance settings could not be saved."))
    }
  }

  if (groupsLoading || settingsLoading) return <MeetingsSettingsSkeleton />

  if (!activeGroup) {
    return (
      <EmptyState
        icon={<CalendarDays size={26} />}
        title="No active group found"
        description="Join or create a group before meeting governance settings can be reviewed."
      />
    )
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href="/dashboard/settings" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10">
              <ChevronLeft size={16} />
            </Link>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Meeting Governance</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Meeting Settings</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Configure meeting cadence, quorum rules, voting thresholds, and video preferences for {activeGroup.name}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {groups && groups.length > 1 && (
            <select
              value={activeGroup.id}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className="group-input min-w-56"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
          <StatusPill label={isChairperson ? "Chairperson controls" : "Member view"} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Cadence" value={frequencyLabel(frequency)} helper="Default group meeting cycle" icon={<CalendarDays size={18} />} />
        <MetricCard label="Quorum" value={`${quorum}%`} helper="Minimum participation for valid resolutions" icon={<Vote size={18} />} />
        <MetricCard label="Provider" value="Daily.co" helper="Credentials managed by super admin" icon={<Video size={18} />} />
      </section>

      <form onSubmit={submit} className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Cadence & Voting</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                Chairperson settings guide when members meet and when votes are valid.
              </p>
            </div>
          </div>

          {!isChairperson && (
            <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Members can review meeting settings. Updates are reserved for the chairperson.
            </div>
          )}

          <div className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Meeting frequency">
                <select value={frequency} onChange={(event) => setFrequency(event.target.value as MeetingFrequency)} disabled={!isChairperson} className="group-input">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="as_needed">As needed</option>
                </select>
              </Field>
              <Field label="Notice window (days)">
                <input value={noticeDays} onChange={(event) => setNoticeDays(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Quorum (%)">
                <input value={quorum} onChange={(event) => setQuorum(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
              </Field>
              <Field label="Majority (%)">
                <input value={majority} onChange={(event) => setMajority(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
              </Field>
            </div>
            <Toggle label="Attendance tracking" checked={attendanceTracking} onChange={setAttendanceTracking} disabled={!isChairperson} hint="Record attendance when members join a live meeting." />
            <Toggle label="Minutes required" checked={minutesRequired} onChange={setMinutesRequired} disabled={!isChairperson} hint="Require meeting minutes before governance votes are archived." />
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
              <Video size={20} />
            </div>
            <h2 className="mt-5 text-lg font-black text-[#0a2540] dark:text-white">Video Provider</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
              Daily.co is the platform meeting provider for embedded group rooms, member-only access, attendance tracking, and future meeting webhooks.
            </p>
            <div className="mt-5 space-y-3">
              <InfoRow label="Provider" value="Daily.co" />
              <InfoRow label="Credentials" value="Super admin only" />
              <InfoRow label="Room access" value="Group members only" />
              <InfoRow label="Group boundary" value={activeGroup.name} />
            </div>
          </section>

          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={18} />
              <div>
                <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Control Boundary</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                  Chairpersons manage meeting rules for their own group only. Super admins manage provider credentials, webhooks, and API secrets.
                </p>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={!isChairperson || updateMeetingSettings.isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            {isChairperson ? <Save size={15} /> : <CheckCircle2 size={15} />}
            {isChairperson ? (updateMeetingSettings.isPending ? "Saving..." : "Save Settings") : "Settings Locked"}
          </button>
        </aside>
      </form>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <section className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</div>
      <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    </section>
  )
}

function MeetingsSettingsSkeleton() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <Skeleton className="h-96 rounded-lg" />
        <div className="space-y-5">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
      <div>
        <p className="text-sm font-black text-[#0a2540] dark:text-white">{label}</p>
        {hint && <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative h-6 w-11 rounded-lg transition ${checked ? "bg-primary" : "bg-gray-200 dark:bg-white/10"} disabled:cursor-not-allowed disabled:opacity-50`}
        aria-pressed={checked}
      >
        <span className={`absolute top-1 h-4 w-4 rounded bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
      </button>
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
      <p className="mt-4 text-2xl font-black text-[#0a2540] dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{helper}</p>
    </article>
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
    <span className="inline-flex rounded-lg border border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      {label}
    </span>
  )
}
