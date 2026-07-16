"use client"

import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  ShieldCheck,
  Users,
  Video,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import {
  useCreateMeeting,
  useEndMeeting,
  useJoinMeeting,
  useMeetings,
  useStartMeeting,
  type Meeting,
} from "@/hooks/useMeetings"
import { useAuthStore } from "@/store/auth"

type MeetingTab = "upcoming" | "minutes"

function formatDateTime(value?: string) {
  if (!value) return "Not scheduled"
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

export default function MeetingsPage() {
  const [tab, setTab] = useState<MeetingTab>("upcoming")
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: members } = useMembers(activeGroup?.id || null)
  const { data: meetings, isLoading: meetingsLoading } = useMeetings(activeGroup?.id || null)
  const startMeeting = useStartMeeting()
  const endMeeting = useEndMeeting()
  const joinMeeting = useJoinMeeting()

  const currentMembership = members?.find((member) => member.member === user?.id || member.member_email === user?.email)
  const isChairperson = currentMembership?.role === "chairperson" || user?.role === "chairperson"
  const upcoming = meetings?.filter((meeting) => meeting.status === "scheduled" || meeting.status === "live") || []
  const minutes = meetings?.filter((meeting) => meeting.status === "ended") || []
  const visibleMeetings = tab === "upcoming" ? upcoming : minutes
  const featuredMeeting = upcoming[0] || null
  const loading = groupsLoading || meetingsLoading

  const stats = useMemo(
    () => [
      { label: "Upcoming Meetings", value: upcoming.length.toString(), helper: "Scheduled or live", icon: <CalendarDays size={18} /> },
      { label: "Meeting Minutes", value: minutes.length.toString(), helper: "Archived records", icon: <FileText size={18} /> },
      { label: "Attendance Records", value: String(meetings?.reduce((sum, meeting) => sum + Number(meeting.attendees_count || meeting.attendance_count || 0), 0) || 0), helper: "Total join records", icon: <Users size={18} /> },
    ],
    [meetings, minutes.length, upcoming.length],
  )

  const handleStart = async (meeting: Meeting) => {
    if (!activeGroup) return
    try {
      await startMeeting.mutateAsync({ meetingId: meeting.id, groupId: activeGroup.id })
      toast.success("Meeting started. Members can now join.")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Meeting could not be started."))
    }
  }

  const handleEnd = async (meeting: Meeting) => {
    if (!activeGroup) return
    try {
      await endMeeting.mutateAsync({ meetingId: meeting.id, groupId: activeGroup.id })
      toast.success("Meeting ended. Minutes can now be completed.")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Meeting could not be ended."))
    }
  }

  const handleJoin = async (meeting: Meeting) => {
    if (!activeGroup) return
    try {
      const result = await joinMeeting.mutateAsync({ meetingId: meeting.id, groupId: activeGroup.id })
      if (result.data.video_room_url) {
        window.open(result.data.video_room_url, "_blank", "noopener,noreferrer")
        toast.success("Attendance recorded. Opening Daily.co room.")
      } else {
        toast.success("Attendance recorded. Daily.co room link is not available yet.")
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Meeting could not be joined."))
    }
  }

  if (loading) return <MeetingsSkeleton />

  if (!activeGroup) {
    return (
      <EmptyState
        icon={<Users size={26} />}
        title="No active group found"
        description="Join or create a group before scheduling meetings and recording minutes."
      />
    )
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Group Governance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Meetings</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Schedule meetings, track attendance, and keep minutes for {activeGroup.name}.
          </p>
        </div>
        {isChairperson && (
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover"
          >
            <Plus size={15} />
            Schedule Meeting
          </button>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <FeaturedMeeting
            meeting={featuredMeeting}
            isChairperson={isChairperson}
            onStart={handleStart}
            onEnd={handleEnd}
            onJoin={handleJoin}
            busy={startMeeting.isPending || endMeeting.isPending || joinMeeting.isPending}
          />

          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10">
            {[
              { id: "upcoming" as const, label: "Upcoming" },
              { id: "minutes" as const, label: "Minutes" },
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
          </div>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleMeetings.length ? (
              visibleMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  isChairperson={isChairperson}
                  onStart={handleStart}
                  onEnd={handleEnd}
                  onJoin={handleJoin}
                  busy={startMeeting.isPending || endMeeting.isPending || joinMeeting.isPending}
                />
              ))
            ) : (
              <div className="lg:col-span-2">
                <NoMeetingsState tab={tab} isChairperson={isChairperson} onSchedule={() => setScheduleOpen(true)} />
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
              <Video size={20} />
            </div>
            <h2 className="mt-5 text-lg font-black text-[#0a2540] dark:text-white">Video Provider</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
              Daily.co powers OrbiSave meeting rooms because it supports embedded rooms, server-created links, member-only access, and provider webhooks.
            </p>
            <div className="mt-5 space-y-3">
              <InfoRow label="Provider source" value="Super admin settings" />
              <InfoRow label="Chairperson control" value="Meeting cadence and agenda" />
              <InfoRow label="Member access" value="Join only after meeting starts" />
            </div>
          </section>

          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-[#0a2540] dark:bg-white/10 dark:text-white">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Chairperson Settings</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                  Meeting creation, start, end, and governance settings are chairperson privileges. Members can attend, review minutes, and vote on resolutions.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>

      {scheduleOpen && <ScheduleMeetingDialog groupId={activeGroup.id} groupName={activeGroup.name} onClose={() => setScheduleOpen(false)} />}
    </div>
  )
}

function FeaturedMeeting({
  meeting,
  isChairperson,
  onStart,
  onEnd,
  onJoin,
  busy,
}: {
  meeting: Meeting | null
  isChairperson: boolean
  onStart: (meeting: Meeting) => void
  onEnd: (meeting: Meeting) => void
  onJoin: (meeting: Meeting) => void
  busy: boolean
}) {
  if (!meeting) {
    return (
      <section className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
          <CalendarDays size={24} />
        </div>
        <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">No scheduled meeting</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
          {isChairperson
            ? "Schedule the next group meeting so members can see the agenda, join time, and attendance expectations."
            : "The chairperson has not scheduled a meeting yet. Upcoming meeting details will appear here once published."}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-[#0a2540]/10 bg-[#0a2540] p-6 text-white shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${meeting.status === "live" ? "text-red-300" : "text-primary"}`}>
            {meeting.status === "live" ? "Live Meeting" : "Next Meeting"}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">{meeting.title}</h2>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-white/60">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={16} />
              {formatDateTime(meeting.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users size={16} />
              {meeting.attendees_count || meeting.attendance_count || 0} attendance records
            </span>
          </div>
          {meeting.agenda && <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/65">{meeting.agenda}</p>}
        </div>
        <MeetingActions meeting={meeting} isChairperson={isChairperson} onStart={onStart} onEnd={onEnd} onJoin={onJoin} busy={busy} featured />
      </div>
    </section>
  )
}

function MeetingCard({
  meeting,
  isChairperson,
  onStart,
  onEnd,
  onJoin,
  busy,
}: {
  meeting: Meeting
  isChairperson: boolean
  onStart: (meeting: Meeting) => void
  onEnd: (meeting: Meeting) => void
  onJoin: (meeting: Meeting) => void
  busy: boolean
}) {
  return (
    <article className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition hover:border-emerald-100 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <StatusPill status={meeting.status} />
        <span className="inline-flex items-center gap-1 text-xs font-black text-primary">
          <Users size={13} />
          {meeting.attendees_count || meeting.attendance_count || 0}
        </span>
      </div>
      <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">{meeting.title}</h2>
      <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{formatDateTime(meeting.scheduled_at)}</p>
      {meeting.agenda && <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{meeting.agenda}</p>}
      <div className="mt-5">
        <MeetingActions meeting={meeting} isChairperson={isChairperson} onStart={onStart} onEnd={onEnd} onJoin={onJoin} busy={busy} />
      </div>
    </article>
  )
}

function MeetingActions({
  meeting,
  isChairperson,
  onStart,
  onEnd,
  onJoin,
  busy,
  featured = false,
}: {
  meeting: Meeting
  isChairperson: boolean
  onStart: (meeting: Meeting) => void
  onEnd: (meeting: Meeting) => void
  onJoin: (meeting: Meeting) => void
  busy: boolean
  featured?: boolean
}) {
  const base = featured
    ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-xs font-black uppercase tracking-widest transition"
    : "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-[10px] font-black uppercase tracking-widest transition"

  if (meeting.status === "live") {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => onJoin(meeting)} disabled={busy} className={`${base} bg-primary text-white hover:bg-green-hover disabled:opacity-50`}>
          <Video size={15} />
          Join Meeting
        </button>
        {isChairperson && (
          <button type="button" onClick={() => onEnd(meeting)} disabled={busy} className={`${base} border border-white/10 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50`}>
            End Meeting
          </button>
        )}
      </div>
    )
  }

  if (meeting.status === "scheduled" && isChairperson) {
    return (
      <button type="button" onClick={() => onStart(meeting)} disabled={busy} className={`${base} bg-primary text-white hover:bg-green-hover disabled:opacity-50`}>
        <Video size={15} />
        Start Meeting
      </button>
    )
  }

  if (meeting.status === "ended") {
    return (
      <span className={`${base} border border-gray-100 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300`}>
        <FileText size={15} />
        View Minutes
      </span>
    )
  }

  return (
    <span className={`${base} border border-gray-100 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300`}>
      <Clock3 size={15} />
      Awaiting Start
    </span>
  )
}

function ScheduleMeetingDialog({ groupId, groupName, onClose }: { groupId: string; groupName: string; onClose: () => void }) {
  const createMeeting = useCreateMeeting()
  const [title, setTitle] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [agenda, setAgenda] = useState("")
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (title.trim().length < 3) {
      setError("Enter a meeting title.")
      return
    }
    if (!scheduledAt) {
      setError("Choose the meeting date and time.")
      return
    }

    try {
      await createMeeting.mutateAsync({
        group: groupId,
        title: title.trim(),
        agenda: agenda.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
      })
      toast.success("Meeting scheduled.")
      onClose()
    } catch (err: unknown) {
      setError(errorMessage(err, "Meeting could not be scheduled."))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close meeting dialog" className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-xl rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Schedule Meeting</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{groupName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0a2540] dark:hover:bg-white/10 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <Field label="Meeting title">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="group-input" placeholder="Monthly contribution review" />
          </Field>
          <Field label="Date and time">
            <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="group-input" />
          </Field>
          <Field label="Agenda">
            <textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} rows={4} className="group-input h-28 resize-none py-3" placeholder="Contribution status, fines proposal, loan pool review..." />
          </Field>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-[#016828] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            This meeting will only be visible to active members of {groupName}. Video credentials are managed by the platform; chairpersons schedule and run meetings.
          </div>

          {error && <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-5 dark:border-white/10">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-gray-100 px-5 text-xs font-black uppercase tracking-widest text-gray-500 transition hover:text-[#0a2540] dark:border-white/10 dark:hover:text-white">
            Cancel
          </button>
          <button type="submit" disabled={createMeeting.isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:opacity-50">
            <Plus size={14} />
            {createMeeting.isPending ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </form>
    </div>
  )
}

function NoMeetingsState({ tab, isChairperson, onSchedule }: { tab: MeetingTab; isChairperson: boolean; onSchedule: () => void }) {
  const title = tab === "upcoming" ? "No scheduled meetings" : "No meeting minutes yet"
  const description =
    tab === "upcoming"
      ? isChairperson
        ? "Schedule the next meeting so members can see when to attend and what will be discussed."
        : "The chairperson has not scheduled a meeting yet. Members will see the agenda and join controls once a meeting is published."
      : "Minutes will appear after a live meeting is ended and notes are recorded."

  return (
    <EmptyState icon={<CalendarDays size={26} />} title={title} description={description}>
      {tab === "upcoming" && isChairperson && (
        <button type="button" onClick={onSchedule} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover">
          <Plus size={14} />
          Schedule Meeting
        </button>
      )}
    </EmptyState>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-right text-xs font-black text-[#0a2540] dark:text-white">{value}</span>
    </div>
  )
}

function StatusPill({ status }: { status: Meeting["status"] }) {
  const className =
    status === "live"
      ? "border-red-100 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
      : "border-gray-100 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
  return <span className={`inline-flex rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${className}`}>{status}</span>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function EmptyState({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) {
  return (
    <section className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</div>
      <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{description}</p>
      {children}
    </section>
  )
}

function MeetingsSkeleton() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-44 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-56 rounded-lg" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  )
}
