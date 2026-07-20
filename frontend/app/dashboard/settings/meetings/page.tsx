"use client"

import { type FormEvent, type ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ShieldCheck, Video, Vote } from "lucide-react"
import { toast } from "sonner"

import { RequireGroupLeader } from "@/components/dashboard/RequireGroupLeader"
import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/dashboard/ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import {
  useMeetingSettings,
  useUpdateMeetingSettings,
  type MeetingFrequency,
  type MeetingProviderMode,
} from "@/hooks/useMeetings"
import { useAuthStore } from "@/store/auth"

/**
 * Meeting governance. This is the one settings screen with a real backing
 * mutation (PATCH /meetings/settings/), so the form here genuinely saves.
 *
 * The video provider is shown as a read-only value: it is a platform level
 * choice held by the super admin, so there is no control for it. Its current
 * value is still round-tripped on save so a group never loses it.
 */

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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

function InfoRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-gray-800">
      <div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {note && <p className="mt-0.5 text-xs text-gray-400">{note}</p>}
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#00ab00]" : "bg-gray-200 dark:bg-gray-700"
        } disabled:cursor-not-allowed disabled:opacity-50`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  )
}

export default function MeetingsSettingsPage() {
  return (
    <RequireGroupLeader>
      <MeetingsSettings />
    </RequireGroupLeader>
  )
}

function MeetingsSettings() {
  const user = useAuthStore((state) => state.user)
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: members } = useMembers(activeGroup?.id || null)
  const { data: settings, isLoading: settingsLoading } = useMeetingSettings(activeGroup?.id || null)
  const updateMeetingSettings = useUpdateMeetingSettings(activeGroup?.id || null)
  const currentMembership = members?.find(
    (member) => member.member === user?.id || member.member_email === user?.email,
  )
  const isChairperson = currentMembership?.role === "chairperson" || user?.role === "chairperson"

  const [frequency, setFrequency] = useState<MeetingFrequency>("monthly")
  const [noticeDays, setNoticeDays] = useState("7")
  const [quorum, setQuorum] = useState("60")
  const [majority, setMajority] = useState("51")
  // No control renders for provider mode: it is a platform choice. It is held
  // here only so a save preserves whatever the backend already has.
  const [providerMode, setProviderMode] = useState<MeetingProviderMode>("daily")
  const [attendanceTracking, setAttendanceTracking] = useState(true)
  const [minutesRequired, setMinutesRequired] = useState(true)

  // Seed the form from the server once per group, adjusting during render
  // rather than in an effect.
  //
  // This previously ran on every change of the `settings` object identity,
  // which react-query produces on every background refetch. A refetch while
  // someone was part-way through editing silently threw their input away and
  // put the saved values back, with no indication anything had happened. Keying
  // on the group id means the form is seeded when it loads and when the user
  // switches group, and never underneath them.
  const [seededGroupId, setSeededGroupId] = useState<string | null>(null)
  if (settings && activeGroup && seededGroupId !== activeGroup.id) {
    setSeededGroupId(activeGroup.id)
    setFrequency(settings.frequency)
    setNoticeDays(String(settings.notice_days))
    setQuorum(String(settings.quorum_percent))
    setMajority(String(settings.majority_percent))
    setProviderMode(settings.provider_mode)
    setAttendanceTracking(settings.attendance_tracking)
    setMinutesRequired(settings.minutes_required)
  }

  const backLink = (
    <Link
      href="/dashboard/settings"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
    >
      <ChevronLeft size={16} />
      Group settings
    </Link>
  )

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
      toast.success("Meeting settings saved.")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Meeting settings could not be saved."))
    }
  }

  if (groupsLoading || settingsLoading) return <MeetingsSettingsSkeleton />

  if (!activeGroup) {
    return (
      <div className="space-y-6">
        {backLink}
        <EmptyState
          icon={CalendarDays}
          title="No active group yet"
          description="Meeting cadence and quorum belong to a group. Create a group or accept an invite to set them."
        />
      </div>
    )
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-[#00ab00] focus:ring-2 focus:ring-[#00ab00]/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"

  return (
    <div className="space-y-6">
      {backLink}

      <PageHeader
        eyebrow="Meetings"
        title="Meetings and quorum"
        description={`Set how often ${activeGroup.name} meets, how much notice members get, and what counts as a valid vote.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cadence" value={frequencyLabel(frequency)} sub="Default meeting cycle" icon={CalendarDays} />
        <StatCard label="Quorum" value={`${quorum}%`} sub="Attendance needed for a valid vote" icon={Vote} />
        <StatCard label="Majority" value={`${majority}%`} sub="Share of votes needed to pass" icon={ShieldCheck} />
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard
          title="Cadence and voting"
          description="Saved to your group. Only the chairperson can change these values."
        >
          {!isChairperson && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              You can review these settings. Saving is reserved for the chairperson.
            </div>
          )}

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Meeting frequency">
                <select
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as MeetingFrequency)}
                  disabled={!isChairperson}
                  className={inputClass}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="as_needed">As needed</option>
                </select>
              </Field>
              <Field label="Notice window (days)" hint="How far ahead members are told about a meeting.">
                <input
                  value={noticeDays}
                  onChange={(event) => setNoticeDays(event.target.value)}
                  disabled={!isChairperson}
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Quorum (%)" hint="Minimum attendance before a vote can be held.">
                <input
                  value={quorum}
                  onChange={(event) => setQuorum(event.target.value)}
                  disabled={!isChairperson}
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
              <Field label="Majority (%)" hint="Share of votes cast needed to pass a resolution.">
                <input
                  value={majority}
                  onChange={(event) => setMajority(event.target.value)}
                  disabled={!isChairperson}
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
            </div>
            <Toggle
              label="Attendance tracking"
              checked={attendanceTracking}
              onChange={setAttendanceTracking}
              disabled={!isChairperson}
              hint="Record who joined when a member enters a live meeting room."
            />
            <Toggle
              label="Minutes required"
              checked={minutesRequired}
              onChange={setMinutesRequired}
              disabled={!isChairperson}
              hint="Require written minutes before a governance vote is archived."
            />
          </div>
        </SectionCard>

        <aside className="space-y-6">
          <SectionCard title="Video provider" description="Managed by OrbiSave, not by your group.">
            <div className="-mt-2">
              <InfoRow label="Provider" value="Daily.co" />
              <InfoRow label="Credentials" value="OrbiSave super admin" note="API keys are never held by a group." />
              <InfoRow label="Room access" value="Group members only" />
              <InfoRow label="Group" value={activeGroup.name} />
            </div>
          </SectionCard>

          <SectionCard title="Who controls what">
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Chairpersons set meeting rules for their own group. OrbiSave manages the video provider, its credentials
              and its webhooks across every group.
            </p>
          </SectionCard>

          <button
            type="submit"
            disabled={!isChairperson || updateMeetingSettings.isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          >
            {updateMeetingSettings.isPending ? "Saving..." : isChairperson ? "Save meeting settings" : "Chairperson only"}
          </button>
        </aside>
      </form>
    </div>
  )
}

function MeetingsSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-36" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 rounded-2xl" />
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
