"use client"

import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import {
  CalendarDays,
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
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  Tabs,
} from "@/components/dashboard/ui"

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
      {
        label: "Scheduled or live",
        value: upcoming.length.toString(),
        sub: "Meetings members can still join",
        icon: CalendarDays,
      },
      {
        label: "Ended meetings",
        value: minutes.length.toString(),
        sub: "Meetings whose minutes are available",
        icon: FileText,
      },
      {
        label: "Attendance records",
        value: String(meetings?.reduce((sum, meeting) => sum + Number(meeting.attendees_count || meeting.attendance_count || 0), 0) || 0),
        sub: "Total member joins across all meetings",
        icon: Users,
      },
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
        icon={Users}
        title="No active group found"
        description="Join or create a group before scheduling meetings and recording minutes."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group governance"
        title="Meetings"
        description={`Schedule meetings, record attendance, and keep minutes for ${activeGroup.name}.`}
        actions={
          isChairperson ? (
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-medium text-white transition-colors hover:bg-[#009200]"
            >
              <Plus size={16} />
              Schedule meeting
            </button>
          ) : undefined
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} icon={stat.icon} />
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

          <Tabs
            items={[
              { id: "upcoming", label: "Upcoming", count: upcoming.length },
              { id: "minutes", label: "Minutes", count: minutes.length },
            ]}
            active={tab}
            onChange={(id) => setTab(id as MeetingTab)}
          />

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
          <SectionCard
            title="Video provider"
            description="OrbiSave meeting rooms run on Daily.co."
            actions={
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00] dark:bg-emerald-500/10">
                <Video size={18} />
              </span>
            }
          >
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Daily.co supports embedded rooms, server-created links, member-only access, and provider webhooks, which is
              what group meetings need.
            </p>
            <div className="mt-5 space-y-3">
              <InfoRow label="Provider credentials" value="Managed in super admin settings" />
              <InfoRow label="Cadence and agenda" value="Set by the chairperson" />
              <InfoRow label="Member access" value="Join opens once the meeting starts" />
            </div>
          </SectionCard>

          <SectionCard
            title="Who can do what"
            actions={
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <ShieldCheck size={18} />
              </span>
            }
          >
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Creating, starting, and ending a meeting are chairperson-only actions. Members can join a live meeting,
              read minutes, and vote on resolutions.
            </p>
          </SectionCard>
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
      <EmptyState
        icon={CalendarDays}
        title="No scheduled meeting"
        description={
          isChairperson
            ? "Schedule the next group meeting so members can see the agenda, the start time, and when to join."
            : "The chairperson has not scheduled a meeting yet. The agenda and join controls appear here once one is published."
        }
      />
    )
  }

  return (
    <SectionCard
      title={meeting.status === "live" ? "Live now" : "Next meeting"}
      description={meeting.status === "live" ? "This meeting has started and members can join." : "The soonest meeting on the calendar."}
      actions={<StatusBadge status={meeting.status} tone={meeting.status === "live" ? "red" : "amber"} />}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_240px] lg:items-start">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{meeting.title}</h3>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-2 tabular-nums">
              <CalendarDays size={16} />
              {formatDateTime(meeting.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-2 tabular-nums">
              <Users size={16} />
              {meeting.attendees_count || meeting.attendance_count || 0} attendance records
            </span>
          </div>
          {meeting.agenda && (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">{meeting.agenda}</p>
          )}
        </div>
        <MeetingActions meeting={meeting} isChairperson={isChairperson} onStart={onStart} onEnd={onEnd} onJoin={onJoin} busy={busy} />
      </div>
    </SectionCard>
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
  const recordedMinutes = meeting.minutes?.trim()

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={meeting.status} tone={meeting.status === "live" ? "red" : undefined} />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 tabular-nums dark:text-gray-400">
          <Users size={13} />
          {meeting.attendees_count || meeting.attendance_count || 0}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
      <p className="mt-2 text-xs text-gray-500 tabular-nums dark:text-gray-400">{formatDateTime(meeting.scheduled_at)}</p>
      {meeting.agenda && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500 dark:text-gray-400">{meeting.agenda}</p>
      )}

      {meeting.status === "ended" ? (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Minutes</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300">
            {recordedMinutes || "No minutes were recorded for this meeting."}
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <MeetingActions meeting={meeting} isChairperson={isChairperson} onStart={onStart} onEnd={onEnd} onJoin={onJoin} busy={busy} />
        </div>
      )}
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
}: {
  meeting: Meeting
  isChairperson: boolean
  onStart: (meeting: Meeting) => void
  onEnd: (meeting: Meeting) => void
  onJoin: (meeting: Meeting) => void
  busy: boolean
}) {
  const base = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors"

  if (meeting.status === "live") {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => onJoin(meeting)} disabled={busy} className={`${base} bg-[#00ab00] text-white hover:bg-[#009200] disabled:opacity-50`}>
          <Video size={16} />
          Join meeting
        </button>
        {isChairperson && (
          <button
            type="button"
            onClick={() => onEnd(meeting)}
            disabled={busy}
            className={`${base} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`}
          >
            End meeting
          </button>
        )}
      </div>
    )
  }

  if (meeting.status === "scheduled" && isChairperson) {
    return (
      <button type="button" onClick={() => onStart(meeting)} disabled={busy} className={`${base} bg-[#00ab00] text-white hover:bg-[#009200] disabled:opacity-50`}>
        <Video size={16} />
        Start meeting
      </button>
    )
  }

  /* Members cannot start a meeting, so this is a status line, not a control. */
  return (
    <p className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <Clock3 size={16} />
      Join opens when the chairperson starts this meeting.
    </p>
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
      <form onSubmit={submit} className="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Schedule meeting</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{groupName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
          >
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
            <textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} rows={4} className="group-input h-28 resize-none py-3" placeholder="Contribution status, fines proposal, loan pool review" />
          </Field>

          <div className="rounded-2xl border border-[#bfe8c4] bg-[#ecfdf3] p-4 text-sm leading-6 text-[#016828] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            This meeting is visible only to active members of {groupName}. Video credentials are managed by the platform,
            and the chairperson starts and ends the meeting.
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-5 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMeeting.isPending}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-medium text-white transition-colors hover:bg-[#009200] disabled:opacity-50"
          >
            <Plus size={16} />
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
        : "The chairperson has not scheduled a meeting yet. The agenda and join controls appear here once one is published."
      : "Minutes appear here after a live meeting is ended and notes are recorded against it."

  return (
    <EmptyState
      icon={tab === "upcoming" ? CalendarDays : FileText}
      title={title}
      description={description}
      action={
        tab === "upcoming" && isChairperson ? (
          <button
            type="button"
            onClick={onSchedule}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-medium text-white transition-colors hover:bg-[#009200]"
          >
            <Plus size={16} />
            Schedule meeting
          </button>
        ) : undefined
      }
    />
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      {children}
    </label>
  )
}

function MeetingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-44 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}
