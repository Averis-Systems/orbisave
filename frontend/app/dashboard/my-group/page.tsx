"use client"

import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Users,
  Video,
  Wallet,
  WalletCards,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { useKYCStatus, useSetTransactionPin } from "@/hooks/useAuth"
import { useGroups, useActivateGroup, useCreateGroup, type CreateGroupPayload, type Group } from "@/hooks/useGroups"
import { useMeetings, type Meeting } from "@/hooks/useMeetings"
import { useMembers, type Member } from "@/hooks/useMembers"
import { useRotations, type RotationCycle } from "@/hooks/useRotations"
import { formatCurrency } from "@/lib/formatters"
import { CONTRIBUTION_FREQUENCIES, GROUP_TYPES, buildExistingAccountChairpersonPayload, type ContributionFrequency } from "@/lib/chairperson-onboarding"
import { getLevel1, getLevel2, LOCATION_DATA, type CountryCode } from "@/lib/location-data"
import { useAuthStore } from "@/store/auth"

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

const TABS = [
  { id: "overview" as const, label: "Overview", icon: Activity },
  { id: "members" as const, label: "Members", icon: Users },
  { id: "rotations" as const, label: "Rotations", icon: RefreshCw },
  { id: "meetings" as const, label: "Meetings", icon: Video },
  { id: "settings" as const, label: "Settings", icon: Settings },
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [tab, setTab] = useState<GroupTab>("overview")
  const [createOpen, setCreateOpen] = useState(false)

  const { data: groups, isLoading: groupsLoading } = useGroups()
  const selectedGroup = groups?.find((group) => group.id === selectedGroupId) || null

  if (groupsLoading) return <MyGroupSkeleton />

  if (!selectedGroup) {
    return (
      <div className="space-y-7">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Group Registry</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">My Group</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
              Review the groups you belong to, open a group workspace, or create a new community savings group.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-sm transition hover:bg-green-hover"
          >
            <Plus size={16} />
            Create Group
          </button>
        </section>

        {groups?.length ? (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} onOpen={() => setSelectedGroupId(group.id)} />
            ))}
          </section>
        ) : (
          <EmptyPanel
            icon={<Users size={28} />}
            title="No group memberships yet"
            description="Create a group or accept an invitation to start managing group contributions, rotations, loans, and meetings."
          />
        )}

        {createOpen && <CreateGroupDialog onClose={() => setCreateOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <button
        type="button"
        onClick={() => {
          setSelectedGroupId(null)
          setTab("overview")
        }}
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 transition hover:text-primary"
      >
        <ChevronLeft size={14} />
        All Groups
      </button>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Group Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">{selectedGroup.name}</h1>
          <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
            {selectedGroup.currency} group wallet / {statusLabel(selectedGroup.status)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Group Wallet</p>
          <p className="mt-1 text-2xl font-black text-[#0a2540] dark:text-white">
            {formatCurrency(Number(selectedGroup.wallet?.total || 0), selectedGroup.currency)}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative flex h-12 items-center gap-2 px-2 text-xs font-black uppercase tracking-widest transition ${
                active ? "text-[#0a2540] dark:text-white" : "text-gray-400 hover:text-[#0a2540] dark:hover:text-white"
              }`}
            >
              <Icon size={15} className={active ? "text-primary" : ""} />
              {item.label}
              {active && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />}
            </button>
          )
        })}
      </section>

      {tab === "overview" && <OverviewTab group={selectedGroup} />}
      {tab === "members" && <MembersTab group={selectedGroup} />}
      {tab === "rotations" && <RotationsTab group={selectedGroup} />}
      {tab === "meetings" && <MeetingsTab group={selectedGroup} />}
      {tab === "settings" && <SettingsTab group={selectedGroup} />}
    </div>
  )
}

function GroupCard({ group, onOpen }: { group: Group; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-lg border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:border-emerald-100 hover:shadow-theme-sm dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
          <Users size={20} />
        </div>
        <StatusPill status={group.status} />
      </div>
      <h2 className="mt-5 text-lg font-black text-[#0a2540] transition group-hover:text-primary dark:text-white">{group.name}</h2>
      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-400">
        <MapPin size={13} />
        {group.country} / {group.currency}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 dark:border-white/10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Group Wallet</p>
          <p className="mt-1 text-sm font-black text-[#0a2540] dark:text-white">{formatCurrency(Number(group.wallet?.total || 0), group.currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Members</p>
          <p className="mt-1 text-sm font-black text-[#0a2540] dark:text-white">{group.member_count || 0}</p>
        </div>
      </div>
    </button>
  )
}

function OverviewTab({ group }: { group: Group }) {
  const { data: members, isLoading: membersLoading } = useMembers(group.id)
  const { data: meetings } = useMeetings(group.id)
  const { data: kyc } = useKYCStatus()
  const activateGroup = useActivateGroup()

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
        <section className="rounded-lg border border-dashed border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-500/30 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Group Activation</h2>
                <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Complete identity verification and the first confirmed contribution before live operations begin.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleActivate}
              disabled={!canActivate || activateGroup.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
              {activateGroup.isPending ? <Clock3 size={15} /> : <Activity size={15} />}
              Activate Group
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <RequirementCard label="Chairperson KYC" ready={isKycVerified} description="Identity verification must be approved by OrbiSave compliance." />
            <RequirementCard label="First Contribution" ready={hasFirstDeposit} description="The group wallet needs at least one confirmed contribution." />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Group Wallet" value={formatCurrency(Number(group.wallet?.total || 0), group.currency)} helper="All group wallet streams" icon={<WalletCards size={18} />} tone="navy" />
        <MetricCard label="Rotation Savings Pool" value={formatCurrency(Number(group.wallet?.rotation_pool || 0), group.currency)} helper="Reserved for rotation payouts" icon={<RefreshCw size={18} />} tone="green" />
        <MetricCard label="Loan Pool" value={formatCurrency(Number(group.wallet?.loan_pool || 0), group.currency)} helper="Available for member loans" icon={<Wallet size={18} />} tone="green" />
        <MetricCard label="Mandatory Savings" value={formatCurrency(Number(group.wallet?.mandatory_savings || 0), group.currency)} helper="Auto-deducted savings balance" icon={<Shield size={18} />} tone="green" />
        <MetricCard label="Members" value={`${group.member_count || members?.length || 0}`} helper={`${group.max_members} maximum capacity`} icon={<Users size={18} />} tone="navy" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Group Rules</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Contribution, savings, and lending settings for this group.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoTile label="Contribution Target" value={`${formatCurrency(Number(group.contribution_amount || 0), group.currency)} / ${group.contribution_frequency}`} />
            <InfoTile label="Mandatory Savings" value={formatCurrency(Number(group.mandatory_savings_amount || 0), group.currency)} />
            <InfoTile label="Monthly Loan Interest" value={`${group.loan_interest_rate_monthly || 0}%`} />
            <InfoTile label="Contribution Day" value={`Day ${group.contribution_day}`} />
          </div>
        </div>

        <div className="space-y-5">
          <LeadersCard leaders={leaders} loading={membersLoading} />
          <NextMeetingCard meeting={nextMeeting} />
        </div>
      </section>
    </div>
  )
}

function MembersTab({ group }: { group: Group }) {
  const { data: members, isLoading } = useMembers(group.id)

  if (isLoading) return <PanelSkeleton />

  return (
    <section className="rounded-lg border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Group Registry</h2>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{members?.length || 0} members linked to this group.</p>
        </div>
        <Link
          href="/dashboard/members"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-100 px-4 text-xs font-black uppercase tracking-widest text-[#0a2540] transition hover:border-emerald-100 hover:text-primary dark:border-white/10 dark:text-white"
        >
          Manage Members
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/10">
        {members?.length ? (
          members.map((member) => <MemberRow key={member.id} member={member} />)
        ) : (
          <EmptyPanel compact icon={<Users size={24} />} title="No members yet" description="Accepted invitations and active memberships will appear here." />
        )}
      </div>
    </section>
  )
}

function RotationsTab({ group }: { group: Group }) {
  const { data: cycles, isLoading } = useRotations(group.id)
  const currentCycle = cycles?.find((cycle) => cycle.is_current)

  if (isLoading) return <PanelSkeleton />

  return (
    <div className="space-y-5">
      {currentCycle && <CurrentCycleCard cycle={currentCycle} currency={group.currency} />}
      <section className="rounded-lg border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 p-5 dark:border-white/10">
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Rotation History</h2>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Past and current group rotation cycles.</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/10">
          {cycles?.length ? (
            cycles.map((cycle) => (
              <div key={cycle.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0a2540] dark:text-white">Cycle #{cycle.cycle_number}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">{formatDate(cycle.start_date)} to {formatDate(cycle.end_date)}</p>
                  </div>
                </div>
                <StatusPill status={cycle.status} />
              </div>
            ))
          ) : (
            <EmptyPanel compact icon={<RefreshCw size={24} />} title="No rotation cycles yet" description="Rotation history appears after the schedule is initialized." />
          )}
        </div>
      </section>
    </div>
  )
}

function MeetingsTab({ group }: { group: Group }) {
  const { data: meetings, isLoading } = useMeetings(group.id)

  if (isLoading) return <PanelSkeleton />

  return (
    <section className="rounded-lg border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Group Meetings</h2>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Scheduled meetings and governance records.</p>
        </div>
        <Link
          href="/dashboard/meetings"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0a2540] px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#1c3a5f]"
        >
          Open Meetings
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/10">
        {meetings?.length ? (
          meetings.map((meeting) => (
            <div key={meeting.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meeting.status === "live" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-200" : "bg-emerald-50 text-primary dark:bg-emerald-500/10"}`}>
                  <Video size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0a2540] dark:text-white">{meeting.title}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">{new Date(meeting.scheduled_at).toLocaleString()}</p>
                </div>
              </div>
              <StatusPill status={meeting.status} />
            </div>
          ))
        ) : (
          <EmptyPanel compact icon={<Video size={24} />} title="No meetings scheduled" description="Upcoming meetings and minutes will appear here." />
        )}
      </div>
    </section>
  )
}

function SettingsTab({ group }: { group: Group }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-50 text-[#0a2540] dark:bg-white/10 dark:text-white">
          <Settings size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Group Settings</h2>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
            Rule changes should follow the group governance process before they are applied.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ReadOnlyField label="Group name" value={group.name} />
        <ReadOnlyField label="Contribution day" value={`Day ${group.contribution_day}`} />
        <ReadOnlyField label="Member capacity" value={`${group.max_members} members`} />
        <ReadOnlyField label="Monthly loan interest" value={`${group.loan_interest_rate_monthly || 0}%`} />
      </div>
      <p className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm font-semibold leading-6 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
        Editable settings will be wired after the governance approval workflow is finalized. This prevents unsafely changing financial rules without group approval.
      </p>
    </section>
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
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Create Group</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Step {step + 1} of {steps.length}: {steps[step]}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0a2540] dark:hover:bg-white/10 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-5">
          {steps.map((label, index) => (
            <div key={label} className={`h-1 flex-1 rounded-lg ${index <= step ? "bg-primary" : "bg-gray-100 dark:bg-white/10"}`} />
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
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Group type</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GROUP_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => update("group_type", type)}
                      className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                        form.group_type === type ? "border-emerald-100 bg-emerald-50 text-primary" : "border-gray-100 bg-white text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
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
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-[#016828] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Location is used for country approval, partner matching, and regional reporting.
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
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
                <h3 className="mb-4 text-base font-black text-[#0a2540] dark:text-white">Review</h3>
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
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-[#016828] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Your transaction PIN protects sensitive actions such as loan approvals and payout controls.
              </div>
              <Field label="4-digit transaction PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.transaction_pin}
                  onChange={(event) => update("transaction_pin", event.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="group-input text-center text-2xl tracking-[0.5em]"
                  placeholder="0000"
                />
              </Field>
              <Field label="Current password">
                <input type="password" value={form.current_password} onChange={(event) => update("current_password", event.target.value)} className="group-input" placeholder="Confirm your password" />
              </Field>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
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
            className="h-10 rounded-lg border border-gray-100 px-5 text-xs font-black uppercase tracking-widest text-gray-400 transition hover:text-[#0a2540] disabled:opacity-0 dark:border-white/10 dark:hover:text-white"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={next} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover">
              Continue
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={createGroup.isPending || setPin.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:opacity-50"
            >
              <Plus size={14} />
              Submit for Review
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RequirementCard({ label, ready, description }: { label: string; ready: boolean; description: string }) {
  return (
    <div className={`rounded-lg border p-5 ${ready ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10" : "border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        {ready ? <CheckCircle2 className="text-primary" size={18} /> : <AlertCircle className="text-amber-500" size={18} />}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}

function MetricCard({ label, value, helper, icon, tone }: { label: string; value: string; helper: string; icon: ReactNode; tone: "green" | "navy" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-primary dark:bg-emerald-500/10 dark:text-emerald-200" : "bg-gray-50 text-[#0a2540] dark:bg-white/10 dark:text-white"
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

function LeadersCard({ leaders, loading }: { leaders: Member[]; loading: boolean }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Group Leaders</h2>
      <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Members with governance responsibilities.</p>
      <div className="mt-5 space-y-3">
        {loading ? (
          <Skeleton className="h-20 rounded-lg" />
        ) : leaders.length ? (
          leaders.map((leader) => (
            <div key={leader.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
              <Avatar name={leader.member_name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#0a2540] dark:text-white">{leader.member_name}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary">{leader.role}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm font-semibold text-gray-400 dark:border-white/10">No leaders assigned yet.</p>
        )}
      </div>
    </section>
  )
}

function NextMeetingCard({ meeting }: { meeting?: Meeting }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Next Meeting</h2>
      {meeting ? (
        <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-black text-[#0a2540] dark:text-white">{meeting.title}</p>
          <p className="mt-2 text-xs font-semibold text-gray-400">{new Date(meeting.scheduled_at).toLocaleString()}</p>
          <Link href="/dashboard/meetings" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0a2540] text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#1c3a5f]">
            Open Meeting
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm font-semibold text-gray-400 dark:border-white/10">No meeting scheduled.</p>
      )}
    </section>
  )
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Avatar name={member.member_name} />
        <div>
          <p className="text-sm font-black text-[#0a2540] dark:text-white">{member.member_name}</p>
          <p className="mt-1 text-xs font-semibold text-gray-400">{member.member_email}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={member.role} />
        <StatusPill status={statusLabel(member.status)} />
        <span className="rounded-lg bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-white/10 dark:text-gray-300">
          Position {member.rotation_position || "Not set"}
        </span>
      </div>
    </div>
  )
}

function CurrentCycleCard({ cycle, currency }: { cycle: RotationCycle; currency: string }) {
  return (
    <section className="rounded-lg border border-[#0a2540]/10 bg-[#0a2540] p-6 text-white shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Current Rotation Cycle</p>
      <h2 className="mt-2 text-2xl font-black">Cycle #{cycle.cycle_number}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoTile dark label="Contributions" value={formatCurrency(Number(cycle.total_contributions || 0), currency)} />
        <InfoTile dark label="Payouts" value={formatCurrency(Number(cycle.total_payouts || 0), currency)} />
        <InfoTile dark label="Ends" value={formatDate(cycle.end_date)} />
      </div>
    </section>
  )
}

function InfoTile({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${dark ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${dark ? "text-white/40" : "text-gray-400"}`}>{label}</p>
      <p className={`mt-2 text-sm font-black ${dark ? "text-white" : "text-[#0a2540] dark:text-white"}`}>{value}</p>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <input value={value} readOnly className="group-input cursor-default" />
    </label>
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

function MoneyField({ label, currency, value, onChange }: { label: string; currency: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
        <span className="flex items-center border-r border-gray-200 px-3 text-xs font-black text-gray-500 dark:border-white/10">{currency}</span>
        <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent p-3 text-sm font-bold text-[#0a2540] outline-none dark:text-white" />
      </div>
    </Field>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 dark:border-white/10">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-black text-[#0a2540] dark:text-white">{value}</span>
    </div>
  )
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-4 text-sm font-semibold leading-6 text-gray-600 dark:border-white/10 dark:text-gray-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
      <span>{label}</span>
    </label>
  )
}

function Avatar({ name }: { name: string }) {
  return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${avatarTone(name)}`}>{initials(name || "?")}</div>
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-lg border border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      {statusLabel(status)}
    </span>
  )
}

function EmptyPanel({ icon, title, description, compact = false }: { icon: ReactNode; title: string; description: string; compact?: boolean }) {
  return (
    <section className={`rounded-lg border border-dashed border-gray-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03] ${compact ? "m-5 p-8" : "p-12"}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</div>
      <h2 className="mt-4 text-lg font-black text-[#0a2540] dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    </section>
  )
}

function PanelSkeleton() {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
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
        <Skeleton className="h-11 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  )
}

function formatDate(value: string) {
  if (!value) return "Not available"
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}
