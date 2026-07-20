"use client"

import { FormEvent, useMemo, useState } from "react"
import {
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
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/dashboard/ui"
import { useActiveGroup } from "@/hooks/useGroups"
import {
  Member,
  useCreateGroupInvite,
  useMembers,
  useReinstateMember,
  useSuspendMember,
} from "@/hooks/useMembers"

type MemberFilter = "all" | "active" | "pending" | "suspended"

const ROLE_STYLES: Record<Member["role"], string> = {
  chairperson: "bg-[#0a2540] text-white dark:bg-white dark:text-[#0a2540]",
  treasurer: "bg-[#ecfdf3] text-[#00ab00] dark:bg-emerald-500/10 dark:text-emerald-300",
  secretary: "bg-gray-100 text-[#0a2540] dark:bg-white/10 dark:text-white",
  member: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-300",
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
      <EmptyState
        icon={Users}
        title="No active group yet"
        description="Group members appear after you create or join an active group."
      />
    )
  }

  const filters: { id: MemberFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "pending", label: "Pending" },
    { id: "suspended", label: "Suspended" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group governance"
        title="Members"
        description={`Manage membership status, group roles, and rotation positions for ${activeGroup.name}.`}
        actions={
          <button
            type="button"
            onClick={() => (canInvite ? setInviteOpen(true) : toast.info("Invites open after the group is verified and active."))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200]"
          >
            <Plus size={16} />
            Invite member
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" value={members?.length || 0} sub={`${activeGroup.member_count || members?.length || 0} on group record`} icon={Users} />
        <StatCard label="Active members" value={activeMembers.length} sub="Eligible for collections and rotations" icon={UserCheck} tone="green" />
        <StatCard label="Pending activation" value={pendingMembers.length} sub="Waiting on approval or fresh login" icon={Clock3} tone={pendingMembers.length ? "amber" : "neutral"} />
        <StatCard label="Group leaders" value={leadership.length} sub="Chairperson, treasurer, secretary" icon={ShieldCheck} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members, email, or role"
                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-800 outline-none transition focus:border-[#00ab00] focus:bg-white focus:ring-2 focus:ring-[#00ab00]/15 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 sm:flex">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`h-9 rounded-lg px-4 text-sm font-medium transition ${
                    filter === item.id
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Group role</TableHead>
                  <TableHead>Rotation</TableHead>
                  <TableHead>Joined</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => setSelectedId((current) => (current === member.id ? null : member.id))}
                    className={`cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                      selectedMember?.id === member.id ? "bg-[#ecfdf3]/70 dark:bg-emerald-500/10" : ""
                    }`}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.member_name} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{member.member_name}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{member.member_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="p-5">
                      <RolePill role={member.role} />
                    </td>
                    <td className="p-5 text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                      {member.rotation_position ? `#${member.rotation_position}` : "Not set"}
                    </td>
                    <td className="p-5 text-sm text-gray-500 dark:text-gray-400">{formatDate(member.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="p-5">
                <EmptyState icon={Search} title="No matching members" description="Try another search term or filter." />
              </div>
            )}
          </div>
        </div>

        <MemberInspector
          member={selectedMember}
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
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${avatarTone(name)}`}>
      {initials(name || "?")}
    </div>
  )
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="p-5 text-xs font-medium text-gray-500 dark:text-gray-400">{children}</th>
}

function RolePill({ role }: { role: Member["role"] }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role]}`}>
      {role}
    </span>
  )
}

function MemberInspector({
  member,
  onToggleStatus,
  busy,
}: {
  member: Member | null | undefined
  onToggleStatus: () => void
  busy: boolean
}) {
  if (!member) {
    return (
      <aside className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00]">
          <Users size={24} />
        </div>
        <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">Select a member</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Open a member record to review role, rotation position, and lifecycle actions.
        </p>
      </aside>
    )
  }

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 xl:sticky xl:top-24">
      <div className="flex items-start gap-4">
        <Avatar name={member.member_name} />
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">{member.member_name}</h2>
          <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{member.member_email}</p>
        </div>
      </div>

      <div className="mt-6 space-y-1">
        <InfoRow label="Status" value={member.status.replace(/_/g, " ")} />
        <InfoRow label="Group role" value={member.role} />
        <InfoRow label="Rotation position" value={member.rotation_position ? `#${member.rotation_position}` : "Not set"} />
        <InfoRow label="Joined" value={formatDate(member.joined_at)} />
        <InfoRow label="Member ID" value={member.id.slice(0, 8)} />
      </div>

      <div className="mt-6 grid gap-3">
        {/* Styled as the primary action but only ever fired a toast, so it read
            as a working messaging feature. Disabled until there is somewhere to
            send a message to.
            TODO(api): no member-to-member messaging endpoint exists. Wire this
            to the notifications workflow when that lands. */}
        <button
          type="button"
          disabled
          title="Direct messaging needs a messaging endpoint, which is not available yet."
          className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-400"
        >
          <MessageSquare size={16} />
          Message
        </button>
        {member.role === "member" && (member.status === "active" || member.status === "suspended") && (
          <button
            type="button"
            onClick={onToggleStatus}
            disabled={busy}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition disabled:opacity-50 ${
              member.status === "active"
                ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                : "border-emerald-100 text-[#00ab00] hover:bg-emerald-50 dark:border-emerald-500/20 dark:hover:bg-emerald-500/10"
            }`}
          >
            {member.status === "active" ? <UserMinus size={16} /> : <UserCheck size={16} />}
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
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Invite member</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Send a secure invitation to join {groupName}.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMode("email")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${mode === "email" ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-500"}`}
            >
              <Mail size={15} />
              Email
            </button>
            <button
              type="button"
              onClick={() => setMode("phone")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${mode === "phone" ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-500"}`}
            >
              <Phone size={15} />
              Phone
            </button>
          </div>

          {mode === "email" ? (
            <Field label="Email address">
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="member-input" placeholder="member@example.com" />
            </Field>
          ) : (
            <Field label="Phone number">
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="member-input" placeholder="+254712345678" />
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-5 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:hover:text-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200] disabled:opacity-50"
          >
            {saving ? <Clock3 size={15} /> : <Plus size={15} />}
            Create invite
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0 dark:border-gray-800">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="max-w-[160px] truncate text-right text-sm font-medium capitalize text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function MembersSkeleton() {
  return (
    <div className="space-y-6">
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
