"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { useActiveGroup } from "@/hooks/useGroups"
import {
  Member,
  useCreateGroupInvite,
  useMembers,
  useReinstateMember,
  useSuspendMember,
} from "@/hooks/useMembers"

type MemberFilter = "all" | "active" | "pending" | "suspended"

const STATUS_STYLES: Record<Member["status"], string> = {
  active: "bg-emerald-50 text-primary border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/20",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
  pending_session_refresh: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
  suspended: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/20",
  exited: "bg-gray-50 text-gray-500 border-gray-100 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
  deceased: "bg-gray-50 text-gray-500 border-gray-100 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
}

const ROLE_STYLES: Record<Member["role"], string> = {
  chairperson: "bg-[#0a2540] text-white dark:bg-white dark:text-[#0a2540]",
  treasurer: "bg-emerald-50 text-primary dark:bg-emerald-500/10 dark:text-emerald-200",
  secretary: "bg-gray-100 text-[#0a2540] dark:bg-white/10 dark:text-white",
  member: "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-300",
}

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

export default function MembersPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<MemberFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: members, isLoading: membersLoading } = useMembers(activeGroup?.id || null)
  const suspendMember = useSuspendMember()
  const reinstateMember = useReinstateMember()
  const createInvite = useCreateGroupInvite()

  const activeMembers = useMemo(() => members?.filter((member) => member.status === "active") || [], [members])
  const pendingMembers = useMemo(
    () => members?.filter((member) => member.status === "pending_approval" || member.status === "pending_session_refresh") || [],
    [members],
  )
  const leadership = useMemo(() => members?.filter((member) => member.role !== "member") || [], [members])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (members || []).filter((member) => {
      const matchesSearch =
        !query ||
        member.member_name.toLowerCase().includes(query) ||
        member.member_email.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query)
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && member.status === "active") ||
        (filter === "pending" && ["pending_approval", "pending_session_refresh"].includes(member.status)) ||
        (filter === "suspended" && member.status === "suspended")
      return matchesSearch && matchesFilter
    })
  }, [filter, members, search])

  const selectedMember = selectedId ? members?.find((member) => member.id === selectedId) || null : null
  const loading = groupsLoading || (!!activeGroup && membersLoading)
  const canInvite = activeGroup?.status === "active" && activeGroup?.verification_status === "verified"

  const handleStatusToggle = async () => {
    if (!selectedMember || !activeGroup) return
    try {
      if (selectedMember.status === "active") {
        await suspendMember.mutateAsync({ groupId: activeGroup.id, memberId: selectedMember.id })
        toast.success(`${selectedMember.member_name} has been suspended.`)
      } else if (selectedMember.status === "suspended") {
        await reinstateMember.mutateAsync({ groupId: activeGroup.id, memberId: selectedMember.id })
        toast.success(`${selectedMember.member_name} has been reinstated.`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Membership action failed.")
    }
  }

  if (loading) return <MembersSkeleton />

  if (!activeGroup) {
    return (
      <EmptyPanel
        icon={<Users size={28} />}
        title="No active group yet"
        description="Group members appear after you create or join an active group."
      />
    )
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Group Governance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Members</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Manage membership status, group roles, and rotation positions for {activeGroup.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (canInvite ? setInviteOpen(true) : toast.info("Invites open after the group is verified and active."))}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-sm transition hover:bg-green-hover disabled:opacity-60"
        >
          <Plus size={16} />
          Invite Member
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Members" value={members?.length || 0} helper={`${activeGroup.member_count || members?.length || 0} on group record`} icon={<Users size={18} />} tone="navy" />
        <MetricCard label="Active Members" value={activeMembers.length} helper="Eligible for collections and rotations" icon={<UserCheck size={18} />} tone="green" />
        <MetricCard label="Pending Activation" value={pendingMembers.length} helper="Waiting on approval or fresh login" icon={<Clock3 size={18} />} tone="amber" />
        <MetricCard label="Group Leaders" value={leadership.length} helper="Chairperson, treasurer, secretary" icon={<ShieldCheck size={18} />} tone="navy" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members, email, or role"
                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-bold text-[#0a2540] outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-white/10 sm:flex">
              {[
                { id: "all" as const, label: "All" },
                { id: "active" as const, label: "Active" },
                { id: "pending" as const, label: "Pending" },
                { id: "suspended" as const, label: "Suspended" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`h-9 rounded-lg px-4 text-[10px] font-black uppercase tracking-widest transition ${
                    filter === item.id ? "bg-white text-[#0a2540] shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-400 hover:text-[#0a2540] dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-gray-50/70 dark:bg-white/5">
                <tr>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Group Role</TableHead>
                  <TableHead>Rotation Position</TableHead>
                  <TableHead>Joined</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => setSelectedId((current) => (current === member.id ? null : member.id))}
                    className={`cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/5 ${selectedMember?.id === member.id ? "bg-emerald-50/70 dark:bg-emerald-500/10" : ""}`}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.member_name} />
                        <div>
                          <p className="text-sm font-black text-[#0a2540] dark:text-white">{member.member_name}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-400">{member.member_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <StatusPill status={member.status} />
                    </td>
                    <td className="p-5">
                      <RolePill role={member.role} />
                    </td>
                    <td className="p-5 text-sm font-black text-[#0a2540] dark:text-white">
                      {member.rotation_position ? `#${member.rotation_position}` : "Not set"}
                    </td>
                    <td className="p-5 text-sm font-semibold text-gray-500 dark:text-gray-400">{formatDate(member.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <EmptyPanel
                compact
                icon={<Search size={24} />}
                title="No matching members"
                description="Try another search term or filter."
              />
            )}
          </div>
        </div>

        <MemberInspector
          member={selectedMember}
          onMessage={() => toast.info("Direct member messaging will be wired after the notifications workflow is finalized.")}
          onToggleStatus={handleStatusToggle}
          busy={suspendMember.isPending || reinstateMember.isPending}
        />
      </section>

      {inviteOpen && (
        <InviteDialog
          groupName={activeGroup.name}
          saving={createInvite.isPending}
          onClose={() => setInviteOpen(false)}
          onSubmit={async (payload) => {
            try {
              await createInvite.mutateAsync({ groupId: activeGroup.id, ...payload })
              toast.success("Invite created and queued for dispatch.")
              setInviteOpen(false)
            } catch (err: any) {
              toast.error(err.response?.data?.error || "Invite could not be created.")
            }
          }}
        />
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${avatarTone(name)}`}>
      {initials(name || "?")}
    </div>
  )
}

function MetricCard({ label, value, helper, icon, tone }: { label: string; value: number; helper: string; icon: React.ReactNode; tone: "green" | "amber" | "navy" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-primary dark:bg-emerald-500/10 dark:text-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
        : "bg-gray-50 text-[#0a2540] dark:bg-white/10 dark:text-white"
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

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{children}</th>
}

function StatusPill({ status }: { status: Member["status"] }) {
  return (
    <span className={`inline-flex rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

function RolePill({ role }: { role: Member["role"] }) {
  return (
    <span className={`inline-flex rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest ${ROLE_STYLES[role]}`}>
      {role}
    </span>
  )
}

function MemberInspector({
  member,
  onMessage,
  onToggleStatus,
  busy,
}: {
  member: Member | null | undefined
  onMessage: () => void
  onToggleStatus: () => void
  busy: boolean
}) {
  if (!member) {
    return (
      <aside className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
          <Users size={24} />
        </div>
        <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">Select a member</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
          Open a member record to review role, rotation position, and lifecycle actions.
        </p>
      </aside>
    )
  }

  return (
    <aside className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] xl:sticky xl:top-24">
      <div className="flex items-start gap-4">
        <Avatar name={member.member_name} />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-[#0a2540] dark:text-white">{member.member_name}</h2>
          <p className="mt-1 truncate text-sm font-semibold text-gray-500 dark:text-gray-400">{member.member_email}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <InfoRow label="Status" value={member.status.replace(/_/g, " ")} />
        <InfoRow label="Group role" value={member.role} />
        <InfoRow label="Rotation position" value={member.rotation_position ? `#${member.rotation_position}` : "Not set"} />
        <InfoRow label="Joined" value={formatDate(member.joined_at)} />
        <InfoRow label="Member ID" value={member.id.slice(0, 8)} />
      </div>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={onMessage}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0a2540] text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#1c3a5f]"
        >
          <MessageSquare size={15} />
          Message
        </button>
        {member.role === "member" && (member.status === "active" || member.status === "suspended") && (
          <button
            type="button"
            onClick={onToggleStatus}
            disabled={busy}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-black uppercase tracking-widest transition disabled:opacity-50 ${
              member.status === "active"
                ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                : "border-emerald-100 text-primary hover:bg-emerald-50 dark:border-emerald-500/20 dark:hover:bg-emerald-500/10"
            }`}
          >
            {member.status === "active" ? <UserMinus size={15} /> : <UserCheck size={15} />}
            {member.status === "active" ? "Suspend" : "Reinstate"}
          </button>
        )}
      </div>
    </aside>
  )
}

function InviteDialog({
  groupName,
  saving,
  onClose,
  onSubmit,
}: {
  groupName: string
  saving: boolean
  onClose: () => void
  onSubmit: (payload: { email?: string; phone?: string }) => Promise<void>
}) {
  const [mode, setMode] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const payload = mode === "email" ? { email: email.trim() } : { phone: phone.trim() }
    if (!payload.email && !payload.phone) {
      toast.error(mode === "email" ? "Enter an email address." : "Enter a phone number.")
      return
    }
    await onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Invite Member</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Send a secure invitation to join {groupName}.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0a2540] dark:hover:bg-white/10 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-white/10">
            <button
              type="button"
              onClick={() => setMode("email")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black uppercase tracking-widest ${mode === "email" ? "bg-white text-[#0a2540] shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-400"}`}
            >
              <Mail size={14} />
              Email
            </button>
            <button
              type="button"
              onClick={() => setMode("phone")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black uppercase tracking-widest ${mode === "phone" ? "bg-white text-[#0a2540] shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-400"}`}
            >
              <Phone size={14} />
              Phone
            </button>
          </div>

          {mode === "email" ? (
            <Field label="Email address">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="member-input"
                placeholder="member@example.com"
              />
            </Field>
          ) : (
            <Field label="Phone number">
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="member-input"
                placeholder="+254712345678"
              />
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-5 text-xs font-black uppercase tracking-widest text-gray-500 transition hover:text-[#0a2540] dark:hover:text-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:opacity-50"
          >
            {saving ? <Clock3 size={14} /> : <Plus size={14} />}
            Create Invite
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0 dark:border-white/10">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <span className="max-w-[160px] truncate text-right text-sm font-black capitalize text-[#0a2540] dark:text-white">{value}</span>
    </div>
  )
}

function EmptyPanel({ icon, title, description, compact = false }: { icon: React.ReactNode; title: string; description: string; compact?: boolean }) {
  return (
    <section className={`rounded-lg border border-dashed border-gray-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03] ${compact ? "m-5 p-8" : "p-12"}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</div>
      <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    </section>
  )
}

function MembersSkeleton() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
      <Skeleton className="h-[460px] w-full rounded-lg" />
    </div>
  )
}

function formatDate(value: string) {
  if (!value) return "Not available"
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}
