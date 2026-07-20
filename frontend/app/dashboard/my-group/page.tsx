"use client"

import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
  Video,
  Wallet,
  WalletCards,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { JoinGroupDialog } from "@/components/dashboard/JoinGroupDialog"
import { useKYCStatus, useSetTransactionPin } from "@/hooks/useAuth"
import { useActiveGroup, useActivateGroup, useCreateGroup, type CreateGroupPayload, type Group } from "@/hooks/useGroups"
import { useMeetings, type Meeting } from "@/hooks/useMeetings"
import { useCreateGroupInvite, useExitGroup, useMembers, type Member } from "@/hooks/useMembers"
import { useRotations, type RotationCycle } from "@/hooks/useRotations"
import { formatCurrency } from "@/lib/formatters"
import { CONTRIBUTION_FREQUENCIES, GROUP_TYPES, buildExistingAccountChairpersonPayload, type ContributionFrequency } from "@/lib/chairperson-onboarding"
import { getLevel1, getLevel2, LOCATION_DATA, type CountryCode } from "@/lib/location-data"
import { useAuthStore } from "@/store/auth"
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  Tabs,
  type TabItem,
} from "@/components/dashboard/ui"

type GroupTab = "overview" | "members" | "rotations" | "meetings" | "settings"

type ExistingAccountGroupForm = {
  country: CountryCode
  group_name: string
  group_type: string
  group_type_other: string
  contribution_amount: string
  contribution_frequency: ContributionFrequency
  mandatory_savings_amount: string
  level1: string
  level2: string
  agreePrivacy: boolean
  agreeTerms: boolean
  transaction_pin: string
  current_password: string
}

const TABS: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "rotations", label: "Rotations" },
  { id: "meetings", label: "Meetings" },
  { id: "settings", label: "Settings" },
]

const AVATAR_TONES = ["bg-[#0a2540]", "bg-[#016828]", "bg-[#1c3a5f]", "bg-[#018a35]", "bg-[#00ab00]"]

function initialCreateGroupForm(country: string | undefined): ExistingAccountGroupForm {
  return {
    country: country === "rwanda" || country === "ghana" ? country : "kenya",
    group_name: "",
    group_type: "Corporate",
    group_type_other: "",
    contribution_amount: "5000",
    contribution_frequency: "Monthly",
    mandatory_savings_amount: "500",
    level1: "",
    level2: "",
    agreePrivacy: false,
    agreeTerms: false,
    transaction_pin: "",
    current_password: "",
  }
}

function statusLabel(status?: string) {
  return status?.replace(/_/g, " ") || "pending"
}

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

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

export default function MyGroupsPage() {
  const [tab, setTab] = useState<GroupTab>("overview")
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  // One occupied group slot per user (enforced server-side): the active
  // group is the workspace, so there is no picker and no card grid.
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()

  if (groupsLoading) return <MyGroupSkeleton />

  if (!activeGroup) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="Group registry"
          title="My group"
          description="You can belong to one savings group at a time. Create your group, or join one with the invite your chairperson sent you."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setJoinOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                <UserPlus size={16} />
                Join a group
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200]"
              >
                <Plus size={16} />
                Create group
              </button>
            </div>
          }
        />

        <EmptyState
          icon={Users}
          title="No group membership yet"
          description="Join an existing group with an invite code, or create your own and invite members to it. Contributions, rotation payouts, savings and loans all unlock once you are in a group."
          action={
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200]"
            >
              <UserPlus size={16} />
              Join with an invite code
            </button>
          }
        />

        {createOpen && <CreateGroupDialog onClose={() => setCreateOpen(false)} />}
        {joinOpen && <JoinGroupDialog onClose={() => setJoinOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Group workspace"
        title={activeGroup.name}
        description={`Wallet held in ${activeGroup.currency}. Group status: ${statusLabel(activeGroup.status)}.`}
        actions={
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total group wallet</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
              {formatCurrency(Number(activeGroup.wallet?.total || 0), activeGroup.currency)}
            </p>
          </div>
        }
      />

      <Tabs items={TABS} active={tab} onChange={(id) => setTab(id as GroupTab)} />

      {tab === "overview" && <OverviewTab group={activeGroup} />}
      {tab === "members" && <MembersTab group={activeGroup} />}
      {tab === "rotations" && <RotationsTab group={activeGroup} />}
      {tab === "meetings" && <MeetingsTab group={activeGroup} />}
      {tab === "settings" && <SettingsTab group={activeGroup} />}
    </div>
  )
}

function OverviewTab({ group }: { group: Group }) {
  const user = useAuthStore((state) => state.user)
  const { data: members, isLoading: membersLoading } = useMembers(group.id)
  const { data: meetings } = useMeetings(group.id)
  const { data: kyc } = useKYCStatus()
  const activateGroup = useActivateGroup()
  const isChairperson = user?.role === "chairperson"

  const leaders = members?.filter((member) => member.role !== "member") || []
  const nextMeeting = meetings?.find((meeting) => meeting.status === "scheduled" || meeting.status === "live")
  const isPending = group.status === "pending_activation" || group.verification_status === "pending_review"
  const isKycVerified = kyc?.kyc_status === "verified"
  const hasFirstDeposit = Number(group.wallet?.total || 0) > 0
  const canActivate = isKycVerified && hasFirstDeposit

  const handleActivate = async () => {
    try {
      await activateGroup.mutateAsync(group.id)
      toast.success("Group activation request completed.")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Group could not be activated."))
    }
  }

  return (
    <div className="space-y-5">
      {isPending && (
        <SectionCard
          title="Group activation"
          description="Both requirements below must be met before the group can go live."
          actions={
            <button
              type="button"
              onClick={handleActivate}
              disabled={!canActivate || activateGroup.isPending}
              title={
                canActivate
                  ? "Submit this group for activation"
                  : "Available once chairperson KYC is verified and the wallet has its first confirmed contribution"
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
              {activateGroup.isPending ? <Clock3 size={16} /> : <Activity size={16} />}
              Activate group
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RequirementCard label="Chairperson KYC" ready={isKycVerified} description="Identity verification must be approved by OrbiSave compliance." />
            <RequirementCard label="First contribution" ready={hasFirstDeposit} description="The group wallet needs at least one confirmed contribution." />
          </div>
        </SectionCard>
      )}

      {group.status === "active" && isChairperson && <InviteMembersCard group={group} />}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {/* TODO(copy): confirm whether wallet.total is exactly rotation + loan + mandatory savings, or includes fines and other credits. */}
        <StatCard label="Total group wallet" value={formatCurrency(Number(group.wallet?.total || 0), group.currency)} sub="Rotation, loan, and savings pools combined" icon={WalletCards} />
        <StatCard label="Rotation savings pool" value={formatCurrency(Number(group.wallet?.rotation_pool || 0), group.currency)} sub="Reserved for rotation payouts" icon={RefreshCw} tone="green" />
        <StatCard label="Loan pool" value={formatCurrency(Number(group.wallet?.loan_pool || 0), group.currency)} sub="Available to lend to members" icon={Wallet} tone="green" />
        <StatCard label="Mandatory savings" value={formatCurrency(Number(group.wallet?.mandatory_savings || 0), group.currency)} sub="Locked savings held for members" icon={Shield} tone="green" />
        <StatCard label="Members" value={`${group.member_count || members?.length || 0}`} sub={`${group.max_members} seat capacity`} icon={Users} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <SectionCard
          title="Group rules"
          description="The contribution, savings, and lending figures this group runs on."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <InfoTile label="Contribution target" value={`${formatCurrency(Number(group.contribution_amount || 0), group.currency)} / ${group.contribution_frequency}`} />
            <InfoTile label="Mandatory savings" value={formatCurrency(Number(group.mandatory_savings_amount || 0), group.currency)} />
            <InfoTile label="Monthly loan interest" value={`${group.loan_interest_rate_monthly || 0}%`} />
            <InfoTile label="Contribution day" value={`Day ${group.contribution_day} of each cycle`} />
          </div>
        </SectionCard>

        <div className="space-y-5">
          <LeadersCard leaders={leaders} loading={membersLoading} />
          <NextMeetingCard meeting={nextMeeting} />
        </div>
      </section>
    </div>
  )
}

function InviteMembersCard({ group }: { group: Group }) {
  const [target, setTarget] = useState("")
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const createInvite = useCreateGroupInvite()

  const seatsLeft = Math.max((group.max_members || 0) - (group.member_count || 0), 0)
  const shareText = `You are invited to join "${group.name}" savings group on OrbiSave. Create your account here: `

  const handleCreate = async () => {
    const value = target.trim()
    if (!value) {
      toast.error("Enter the member's email address or phone number.")
      return
    }
    const payload = value.includes("@") ? { email: value } : { phone: value }
    try {
      const result = await createInvite.mutateAsync({ groupId: group.id, ...payload })
      const token = result?.data?.token || result?.token
      if (token) {
        setInviteLink(`${window.location.origin}/register?invite=${token}`)
        toast.success("Invite created. Share the link below with your member.")
      } else {
        toast.success("Invite created and queued for delivery.")
      }
      setTarget("")
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Invite could not be created."))
    }
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    toast.success("Invite link copied.")
  }

  return (
    <SectionCard>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf3] text-[#00ab00]">
          <UserPlus size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Your group is live. Invite your members</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Enter a member&apos;s email or phone number to generate their unique invite link, then share it on
            WhatsApp or by email. {seatsLeft} of {group.max_members} seats are open.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="member@example.com or +254712345678"
          className="h-11 flex-1 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-[#00ab00] focus:ring-2 focus:ring-[#00ab00]/15 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={createInvite.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200] disabled:opacity-50"
        >
          {createInvite.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Create invite
        </button>
      </div>

      {inviteLink && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Unique invite link, valid for 7 days</p>
          <p className="mt-1.5 break-all font-mono text-sm text-gray-800 dark:text-gray-200">{inviteLink}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            >
              <Copy size={15} />
              Copy link
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + inviteLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25d366] px-4 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <MessageCircle size={15} />
              Share on WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(`Join ${group.name} on OrbiSave`)}&body=${encodeURIComponent(shareText + inviteLink)}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0a2540] px-4 text-sm font-semibold text-white transition hover:bg-[#1c3a5f]"
            >
              <Mail size={15} />
              Share by email
            </a>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

function MembersTab({ group }: { group: Group }) {
  const { data: members, isLoading } = useMembers(group.id)

  if (isLoading) return <PanelSkeleton />

  return (
    <SectionCard
      title="Group registry"
      description={`${members?.length || 0} members are linked to this group.`}
      bodyClassName=""
      actions={
        <Link
          href="/dashboard/members"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200"
        >
          Manage members
          <ArrowRight size={14} />
        </Link>
      }
    >
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {members?.length ? (
          members.map((member) => <MemberRow key={member.id} member={member} />)
        ) : (
          <div className="p-5">
            <EmptyState icon={Users} title="No members yet" description="Accepted invitations and active memberships will appear here." />
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function RotationsTab({ group }: { group: Group }) {
  const { data: cycles, isLoading } = useRotations(group.id)
  const currentCycle = cycles?.find((cycle) => cycle.is_current)

  if (isLoading) return <PanelSkeleton />

  return (
    <div className="space-y-5">
      {currentCycle && <CurrentCycleCard cycle={currentCycle} currency={group.currency} />}
      <SectionCard
        title="Rotation history"
        description="Every rotation cycle this group has run, newest first."
        bodyClassName=""
      >
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {cycles?.length ? (
            cycles.map((cycle) => (
              <div key={cycle.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf3] text-[#00ab00]">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Cycle {cycle.cycle_number}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(cycle.start_date)} to {formatDate(cycle.end_date)}</p>
                  </div>
                </div>
                <StatusBadge status={statusLabel(cycle.status)} />
              </div>
            ))
          ) : (
            <div className="p-5">
              <EmptyState icon={RefreshCw} title="No rotation cycles yet" description="Rotation history appears once the payout schedule is initialized." />
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function MeetingsTab({ group }: { group: Group }) {
  const { data: meetings, isLoading } = useMeetings(group.id)

  if (isLoading) return <PanelSkeleton />

  return (
    <SectionCard
      title="Group meetings"
      description="Scheduled sittings and the minutes recorded against them."
      bodyClassName=""
      actions={
        <Link
          href="/dashboard/meetings"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0a2540] px-4 text-sm font-medium text-white transition hover:bg-[#1c3a5f]"
        >
          Open meetings
          <ArrowRight size={14} />
        </Link>
      }
    >
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {meetings?.length ? (
          meetings.map((meeting) => (
            <div key={meeting.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meeting.status === "live" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-200" : "bg-[#ecfdf3] text-[#00ab00]"}`}>
                  <Video size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{meeting.title}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{new Date(meeting.scheduled_at).toLocaleString()}</p>
                </div>
              </div>
              <StatusBadge status={statusLabel(meeting.status)} />
            </div>
          ))
        ) : (
          <div className="p-5">
            <EmptyState icon={Video} title="No meetings scheduled" description="Upcoming meetings and their minutes will appear here." />
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function SettingsTab({ group }: { group: Group }) {
  const user = useAuthStore((state) => state.user)
  const { data: members } = useMembers(group.id)
  const exitGroup = useExitGroup()
  const [confirmingExit, setConfirmingExit] = useState(false)

  const ownMembership = members?.find(
    (member) => member.member === user?.id || member.member_email === user?.email,
  )
  const isChairperson = ownMembership?.role === "chairperson"

  const handleExit = async () => {
    if (!ownMembership) return
    try {
      await exitGroup.mutateAsync({ groupId: group.id, membershipId: ownMembership.id })
      toast.success(`You have left ${group.name}. You can now join or create another group.`)
      setConfirmingExit(false)
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Exit could not be completed."))
      setConfirmingExit(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Group settings"
        description="These figures are read-only here. Changing them requires the group governance process."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Group name" value={group.name} />
          <ReadOnlyField label="Contribution day" value={`Day ${group.contribution_day}`} />
          <ReadOnlyField label="Member capacity" value={`${group.max_members} members`} />
          <ReadOnlyField label="Monthly loan interest" value={`${group.loan_interest_rate_monthly || 0}%`} />
        </div>
        {/* TODO(api): no endpoint yet for governance-approved rule edits, so these fields stay read-only. */}
        <p className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Editing will open once the governance approval workflow ships. Until then, financial rules cannot be changed without the group agreeing first.
        </p>
      </SectionCard>

      <SectionCard
        title="Leave group"
        description={
          isChairperson
            ? "Chairpersons must hand the role to another member before leaving. Contact support to transfer chairpersonship."
            : "Leaving frees your group slot so you can join or create another group. Outstanding loans must be fully repaid first, and your contribution history stays on the group ledger."
        }
        actions={
          !isChairperson ? (
            confirmingExit ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExit}
                  disabled={exitGroup.isPending || !ownMembership}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {exitGroup.isPending ? "Leaving..." : "Confirm exit"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingExit(false)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingExit(true)}
                disabled={!ownMembership}
                title={ownMembership ? "Leave this group" : "Your membership record is still loading"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10"
              >
                Leave this group
              </button>
            )
          ) : undefined
        }
      >
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            {isChairperson
              ? "Your group would be left without a chairperson, so this action is handled by support rather than self-service."
              : "This cannot be undone from the dashboard. Rejoining requires a fresh invite from the chairperson."}
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((state) => state.user)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ExistingAccountGroupForm>(() => initialCreateGroupForm(user?.country))
  const [error, setError] = useState<string | null>(null)
  const createGroup = useCreateGroup()
  const setPin = useSetTransactionPin()

  const countryMeta = LOCATION_DATA[form.country]
  const level1Options = getLevel1(form.country)
  const level2Options = form.level1 ? getLevel2(form.country, form.level1) : []
  const steps = ["Group", "Location", "Review", "Security"]

  const update = (key: keyof ExistingAccountGroupForm, value: string | boolean) => {
    setForm((current) => {
      if (key === "country") return { ...current, country: value as CountryCode, level1: "", level2: "" }
      if (key === "level1") return { ...current, level1: value as string, level2: "" }
      return { ...current, [key]: value }
    })
  }

  const validate = () => {
    if (step === 0) {
      if (form.group_name.trim().length < 3) return "Enter the group name."
      if (form.group_type === "Other" && form.group_type_other.trim().length < 2) return "Specify the group type."
      if (Number(form.contribution_amount) <= 0) return "Enter a contribution amount above zero."
      if (Number(form.mandatory_savings_amount) < 0) return "Mandatory savings cannot be negative."
    }
    if (step === 1 && (!form.level1 || !form.level2)) return "Select the operating location."
    if (step === 2 && (!form.agreePrivacy || !form.agreeTerms)) return "Accept the privacy policy and chairperson responsibilities."
    if (step === 3) {
      if (!/^\d{4}$/.test(form.transaction_pin)) return "Set a 4-digit transaction PIN."
      if (!form.current_password) return "Enter your password to confirm the PIN."
    }
    return null
  }

  const next = () => {
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    setStep((current) => Math.min(steps.length - 1, current + 1))
  }

  const submit = async () => {
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }

    const chairpersonPayload = buildExistingAccountChairpersonPayload({
      country: form.country,
      group_name: form.group_name,
      group_type: form.group_type,
      group_type_other: form.group_type_other,
      contribution_amount: Number(form.contribution_amount),
      contribution_frequency: form.contribution_frequency,
      mandatory_savings_amount: Number(form.mandatory_savings_amount || 0),
      level1: form.level1,
      level2: form.level2,
    })

    const payload: CreateGroupPayload = {
      ...chairpersonPayload,
      contribution_amount: String(chairpersonPayload.contribution_amount),
      rotation_savings_pct: String(chairpersonPayload.rotation_savings_pct),
      loan_pool_pct: String(chairpersonPayload.loan_pool_pct),
      mandatory_savings_amount: String(chairpersonPayload.mandatory_savings_amount),
      max_members: 25,
      max_loan_multiplier: "3.00",
      loan_term_weeks: 12,
      loan_interest_rate_monthly: "5.00",
      savings_access_month: 12,
      savings_access_day: 31,
      rotation_method: "sequential",
    }

    try {
      await createGroup.mutateAsync(payload)
      await setPin.mutateAsync({ pin: form.transaction_pin, password: form.current_password })
      toast.success("Group submitted for review.")
      onClose()
    } catch (err: unknown) {
      setError(errorMessage(err, "The group could not be submitted."))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create group</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Step {step + 1} of {steps.length}: {steps[step]}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-5">
          {steps.map((label, index) => (
            <div key={label} className={`h-1 flex-1 rounded-lg ${index <= step ? "bg-[#00ab00]" : "bg-gray-100 dark:bg-white/10"}`} />
          ))}
        </div>

        <div className="overflow-y-auto p-6">
          {step === 0 && (
            <div className="space-y-5">
              <Field label="Country">
                <select value={form.country} onChange={(event) => update("country", event.target.value)} className="group-input">
                  <option value="kenya">Kenya</option>
                  <option value="rwanda">Rwanda</option>
                  <option value="ghana">Ghana</option>
                </select>
              </Field>
              <Field label="Group name">
                <input value={form.group_name} onChange={(event) => update("group_name", event.target.value)} className="group-input" placeholder="Sunrise Investment Group" />
              </Field>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Group type</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GROUP_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => update("group_type", type)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        form.group_type === type ? "border-[#bfe8c4] bg-[#ecfdf3] text-[#00ab00]" : "border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {form.group_type === "Other" && (
                  <input value={form.group_type_other} onChange={(event) => update("group_type_other", event.target.value)} className="group-input mt-3" placeholder="Specify group type" />
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <MoneyField label="Contribution" currency={countryMeta.currency} value={form.contribution_amount} onChange={(value) => update("contribution_amount", value)} />
                <Field label="Frequency">
                  <select value={form.contribution_frequency} onChange={(event) => update("contribution_frequency", event.target.value)} className="group-input">
                    {CONTRIBUTION_FREQUENCIES.map((frequency) => (
                      <option key={frequency} value={frequency}>{frequency === "Harvest" ? "Harvest (Seasonal)" : frequency}</option>
                    ))}
                  </select>
                </Field>
                <MoneyField label="Mandatory savings" currency={countryMeta.currency} value={form.mandatory_savings_amount} onChange={(value) => update("mandatory_savings_amount", value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                Location is used for country approval, partner bank matching, and regional reporting.
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={countryMeta.level1Label}>
                  <select value={form.level1} onChange={(event) => update("level1", event.target.value)} className="group-input">
                    <option value="">Select {countryMeta.level1Label}</option>
                    {level1Options.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </Field>
                <Field label={countryMeta.level2Label}>
                  <select value={form.level2} onChange={(event) => update("level2", event.target.value)} disabled={!form.level1} className="group-input">
                    <option value="">Select {countryMeta.level2Label}</option>
                    {level2Options.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
                <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Review</h3>
                <div className="space-y-3 text-sm">
                  <ReviewRow label="Group" value={form.group_name || "-"} />
                  <ReviewRow label="Contribution" value={`${countryMeta.currency} ${Number(form.contribution_amount || 0).toLocaleString()} / ${form.contribution_frequency}`} />
                  <ReviewRow label="Mandatory savings" value={`${countryMeta.currency} ${Number(form.mandatory_savings_amount || 0).toLocaleString()}`} />
                  <ReviewRow label="Location" value={`${form.level2 || "-"}, ${form.level1 || "-"}`} />
                </div>
              </div>
              <CheckboxRow checked={form.agreePrivacy} onChange={(value) => update("agreePrivacy", value)} label="I accept the Privacy Policy and consent to group data collection for approval and operations." />
              <CheckboxRow checked={form.agreeTerms} onChange={(value) => update("agreeTerms", value)} label="I accept the Terms of Use and chairperson responsibilities for this group." />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                Your transaction PIN protects sensitive actions such as loan approvals and payout controls.
              </div>
              <Field label="4-digit transaction PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.transaction_pin}
                  onChange={(event) => update("transaction_pin", event.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="group-input text-center text-2xl tracking-[0.5em] tabular-nums"
                  placeholder="0000"
                />
              </Field>
              <Field label="Current password">
                <input type="password" value={form.current_password} onChange={(event) => update("current_password", event.target.value)} className="group-input" placeholder="Confirm your password" />
              </Field>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-5 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setStep((current) => Math.max(0, current - 1))
            }}
            disabled={step === 0 || createGroup.isPending || setPin.isPending}
            className="h-10 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 disabled:opacity-0 dark:border-white/10 dark:hover:text-white"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={next} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200]">
              Continue
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={createGroup.isPending || setPin.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200] disabled:opacity-50"
            >
              <Plus size={14} />
              Submit for review
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RequirementCard({ label, ready, description }: { label: string; ready: boolean; description: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-800 dark:text-white">{label}</p>
        {ready ? <CheckCircle2 className="text-[#00ab00]" size={18} /> : <AlertCircle className="text-amber-500" size={18} />}
      </div>
      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
      <p className={`mt-3 text-xs font-medium ${ready ? "text-[#039855]" : "text-amber-600"}`}>
        {ready ? "Met" : "Still outstanding"}
      </p>
    </div>
  )
}

function LeadersCard({ leaders, loading }: { leaders: Member[]; loading: boolean }) {
  return (
    <SectionCard title="Group leaders" description="Members who hold a governance role in this group.">
      <div className="space-y-3">
        {loading ? (
          <Skeleton className="h-20 rounded-2xl" />
        ) : leaders.length ? (
          leaders.map((leader) => (
            <div key={leader.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
              <Avatar name={leader.member_name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{leader.member_name}</p>
                <p className="mt-0.5 text-xs capitalize text-gray-500 dark:text-gray-400">{leader.role}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
            No chairperson or treasurer has been assigned yet.
          </p>
        )}
      </div>
    </SectionCard>
  )
}

function NextMeetingCard({ meeting }: { meeting?: Meeting }) {
  return (
    <SectionCard title="Next meeting" description="The soonest sitting that is scheduled or already live.">
      {meeting ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{meeting.title}</p>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{new Date(meeting.scheduled_at).toLocaleString()}</p>
          <Link href="/dashboard/meetings" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0a2540] text-sm font-medium text-white transition hover:bg-[#1c3a5f]">
            Open meeting
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
          Nothing is on the calendar right now.
        </p>
      )}
    </SectionCard>
  )
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Avatar name={member.member_name} />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{member.member_name}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{member.member_email}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={statusLabel(member.role)} tone="gray" />
        <StatusBadge status={statusLabel(member.status)} />
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
          {member.rotation_position ? `Rotation position ${member.rotation_position}` : "Rotation position not set"}
        </span>
      </div>
    </div>
  )
}

function CurrentCycleCard({ cycle, currency }: { cycle: RotationCycle; currency: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-[#0a2540] p-6 text-white">
      <p className="text-xs font-medium uppercase tracking-wide text-[#00ab00]">Current rotation cycle</p>
      <h2 className="mt-1.5 text-2xl font-semibold">Cycle {cycle.cycle_number}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoTile dark label="Contributions" value={formatCurrency(Number(cycle.total_contributions || 0), currency)} />
        <InfoTile dark label="Payouts" value={formatCurrency(Number(cycle.total_payouts || 0), currency)} />
        <InfoTile dark label="Cycle ends" value={formatDate(cycle.end_date)} />
      </div>
    </section>
  )
}

function InfoTile({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"}`}>
      <p className={`text-xs ${dark ? "text-white/60" : "text-gray-500 dark:text-gray-400"}`}>{label}</p>
      <p className={`mt-1.5 text-sm font-medium tabular-nums ${dark ? "text-white" : "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <input value={value} readOnly className="group-input cursor-default" />
    </label>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function MoneyField({ label, currency, value, onChange }: { label: string; currency: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
        <span className="flex items-center border-r border-gray-200 px-3 text-xs font-medium text-gray-500 dark:border-white/10">{currency}</span>
        <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent p-3 text-sm font-medium tabular-nums text-gray-900 outline-none dark:text-white" />
      </div>
    </Field>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 dark:border-white/10">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium tabular-nums text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4 text-sm leading-6 text-gray-600 dark:border-white/10 dark:text-gray-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
      <span>{label}</span>
    </label>
  )
}

function Avatar({ name }: { name: string }) {
  return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white ${avatarTone(name)}`}>{initials(name || "?")}</div>
}

function PanelSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  )
}

function MyGroupSkeleton() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-40 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}

function formatDate(value: string) {
  if (!value) return "Not available"
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}
