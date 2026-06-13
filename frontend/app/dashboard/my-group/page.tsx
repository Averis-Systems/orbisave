"use client"

import { useState } from "react"
import { Plus, Users, Activity, Phone, Shield, Video, RefreshCw, Settings, ChevronLeft, ChevronRight, MapPin, Wallet, ArrowRight, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react"
import { useGroups, useActivateGroup, useCreateGroup, type CreateGroupPayload } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { useMeetings } from "@/hooks/useMeetings"
import { useKYCStatus } from "@/hooks/useAuth"
import { useAuthStore } from "@/store/auth"
import { Skeleton } from "@/components/ui/skeleton"
import { fmt } from "@/lib/formatters"
import { CustomSelect } from "@/components/ui/select"
import { LOCATION_DATA, getLevel1, getLevel2, type CountryCode } from "@/lib/location-data"
import { CONTRIBUTION_FREQUENCIES, GROUP_TYPES, buildExistingAccountChairpersonPayload, type ContributionFrequency } from "@/lib/chairperson-onboarding"
import { api } from "@/lib/api"

const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "MB"
const avatarColors = ["bg-[#0a2540]", "bg-[#016828]", "bg-[#0f3460]", "bg-[#018a35]", "bg-[#00ab00]"]
const avatarColorClass = (name: string) => { 
  if (!name) return avatarColors[0]
  let h = 0; for (const c of name || "") h = (h * 31 + c.charCodeAt(0)) % avatarColors.length; return avatarColors[Math.abs(h)] 
}
const statusLabel = (status: string) => status?.replace(/_/g, " ") || "pending"

const TABS = [
  { id: "overview", label: "Pool Insight", Icon: Activity },
  { id: "members", label: "Registry", Icon: Users },
  { id: "rotations", label: "Cycles", Icon: RefreshCw },
  { id: "meetings", label: "Sessions", Icon: Video },
  { id: "settings", label: "Controls", Icon: Settings },
]

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

const getInitialCreateGroupForm = (country: string | undefined): ExistingAccountGroupForm => ({
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
})

function GroupCard({ group, onClick }: any) {
  return (
    <div 
      onClick={onClick} 
      className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm transition-all cursor-pointer group hover:border-[#00ab00]/20"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-[#00ab00] group-hover:scale-110 transition-transform shadow-sm">
          <Users size={20} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#00ab00] bg-green-50 px-3 py-1 rounded-lg border border-green-100">{statusLabel(group.status)}</span>
      </div>
      <h3 className="text-xl font-semibold text-[#0a2540] mb-2 group-hover:text-[#00ab00] transition-colors">{group.name}</h3>
      <div className="flex items-center gap-2 text-gray-400 text-xs font-bold mb-6">
         <MapPin size={12} className="text-gray-300" />
         <span>{group.location}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Total Vault</p>
          <p className="text-sm font-semibold text-[#0a2540]">{fmt(group.balance)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Contributors</p>
          <p className="text-sm font-semibold text-[#0a2540]">{group.members} Active</p>
        </div>
      </div>
    </div>
  )
}

function Breadcrumbs({ groupName, onBack }: any) {
  return (
    <div className="flex items-center gap-3 text-sm mb-4">
      <button onClick={onBack} className="text-gray-400 hover:text-[#00ab00] flex items-center gap-1 font-semibold uppercase text-[10px] tracking-widest">
        <ChevronLeft size={14} /> My Collectives
      </button>
      <span className="text-gray-200">/</span>
      <span className="text-[#0a2540] font-semibold text-[10px] uppercase tracking-widest">{groupName}</span>
    </div>
  )
}

export default function MyGroupsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [tab, setTab] = useState("overview")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data: groups, isLoading: groupsLoading } = useGroups()
  const selectedGroup = groups?.find(g => g.id === selectedGroupId)

  const handleBack = () => {
    setSelectedGroupId(null)
    setTab("overview")
  }

  // Loading is now handled at the component level

  if (!selectedGroup) {
    return (
      <div className="space-y-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#0a2540]">Group Inventory</h1>
            <p className="text-gray-500 font-bold">Monitor your established collectives and participation metrics.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#00ab00] text-white px-6 py-3 rounded-lg font-semibold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#008a00] transition-all"
          >
            <Plus size={16} /> Establish New Pool
          </button>
        </div>

        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#00ab00] shadow-sm border border-green-100">
                <Users size={18} />
              </div>
              <h2 className="text-xl font-semibold text-[#0a2540]">Chama Pools</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {groupsLoading ? (
                <div className="col-span-full py-20 flex items-center justify-center">
                   <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
                </div>
              ) : groups?.map(g => (
                <GroupCard 
                  key={g.id} 
                  group={{
                    ...g,
                    balance: g.wallet.total,
                    members: g.member_count,
                    location: g.currency + " Reserve Pool"
                  }} 
                  onClick={() => setSelectedGroupId(g.id)} 
                />
              ))}
              {!groupsLoading && groups?.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-300 font-bold border-2 border-dashed border-gray-100 rounded-lg italic">
                  No active group memberships recorded in your profile.
                </div>
              )}
            </div>
          </section>
        </div>
        <CreateChamaDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Breadcrumbs groupName={selectedGroup.name} onBack={handleBack} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-[#0a2540] tracking-tight">{selectedGroup.name}</h1>
          <div className="flex items-center gap-3 mt-2 font-bold text-xs text-gray-400 uppercase tracking-widest">
             <span className="text-[#00ab00]">Pool ID: {selectedGroup.id.slice(0, 8)}</span>
             <span className="w-1 h-1 rounded-full bg-gray-200" />
             <span>Status: {statusLabel(selectedGroup.status)}</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-4">
           <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Current Payout Capacity</p>
              <p className="text-lg font-semibold text-[#0a2540]">{fmt(selectedGroup.wallet.total)}</p>
           </div>
           <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#00ab00] border border-green-100">
              <Wallet size={18} />
           </div>
        </div>
      </div>

      {/* Modern Dashboard Navigation */}
      <div className="flex flex-wrap p-1 bg-gray-100 rounded-lg w-full lg:w-fit gap-1 shadow-inner">
        {TABS.map((t) => {
          const isActive = tab === t.id
          const Icon = t.Icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all ${
                isActive ? 'bg-white text-[#0a2540]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#00ab00]' : ''} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Module Workspace */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {tab === "overview" && <OverviewTab group={selectedGroup} />}
        {tab === "members" && <MembersTab group={selectedGroup} />}
        {tab === "rotations" && <RotationsTab group={selectedGroup} />}
        {tab === "meetings" && <MeetingsTab group={selectedGroup} />}
        {tab === "settings" && <SettingsTab group={selectedGroup} />}
      </div>
    </div>
  )
}

function OverviewTab({ group }: { group: any }) {
  const { data: members } = useMembers(group.id)
  const { data: meetings } = useMeetings(group.id)
  const { data: kyc } = useKYCStatus()
  const { mutate: activate, isPending: isActivating } = useActivateGroup()
  
  const leaders = members?.filter(m => m.role !== 'member') || []
  const nextMeeting = meetings?.find(m => m.status === 'scheduled')

  const isPending = group.status === 'pending_activation' || group.verification_status === 'pending_review'
  const isKycVerified = kyc?.kyc_status === 'verified'
  const hasFirstDeposit = (group.wallet?.total || 0) > 0
  const canActivate = isKycVerified && hasFirstDeposit

  return (
    <div className="space-y-8">
      {isPending && (
        <div className="bg-white rounded-lg border-2 border-dashed border-[#00ab00]/20 p-8 shadow-sm">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-[#00ab00] shadow-sm border border-green-100">
                 <Shield size={22} />
              </div>
              <div>
                 <h3 className="text-xl font-semibold text-[#0a2540]">Activation Protocol</h3>
                 <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Complete the following requirements to authorize live operations.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className={`p-6 rounded-xl border transition-all ${isKycVerified ? 'bg-green-50/30 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Security Requirement #1</span>
                    {isKycVerified ? <CheckCircle2 className="text-[#00ab00]" size={18} /> : <AlertCircle className="text-orange-400" size={18} />}
                 </div>
                 <h4 className="font-semibold text-[#0a2540] mb-2">KYC Verification</h4>
                 <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">Chairperson identity must be verified by OrbiSave Compliance for regulatory adherence.</p>
                 {!isKycVerified && (
                    <button className="text-[10px] font-semibold uppercase tracking-widest text-[#00ab00] hover:underline">Complete Identity Audit</button>
                 )}
              </div>

              <div className={`p-6 rounded-xl border transition-all ${hasFirstDeposit ? 'bg-green-50/30 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Liquidity Requirement #2</span>
                    {hasFirstDeposit ? <CheckCircle2 className="text-[#00ab00]" size={18} /> : <AlertCircle className="text-orange-400" size={18} />}
                 </div>
                 <h4 className="font-semibold text-[#0a2540] mb-2">First Deposit Gate</h4>
                 <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">The pool must contain at least one confirmed contribution to instantiate the financial engine.</p>
                 {!hasFirstDeposit && (
                    <button className="text-[10px] font-semibold uppercase tracking-widest text-[#00ab00] hover:underline">Initiate First Deposit</button>
                 )}
              </div>
           </div>

           <button 
             onClick={() => activate(group.id)}
             disabled={!canActivate || isActivating}
             className={`w-full py-5 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                canActivate ? 'bg-[#00ab00] text-white hover:bg-[#008a00]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
             }`}
           >
              {isActivating ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
              Authorize Live Financial Engine
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
       <div className="lg:col-span-8 space-y-8">
          {/* Main Liquidity Card */}
          <div className="bg-[#0a2540] rounded-lg p-10 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ab00]/10 rounded-full blur-3xl -mr-20 -mt-20" />
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                   <span className="w-2 h-2 rounded-full bg-[#00ab00] animate-pulse" />
                   <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#00ab00]">Group Liquidity Pool</span>
                </div>
                <h2 className="text-5xl font-semibold mb-10 tracking-tight">{fmt(group.wallet.total)}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-white/5 rounded-lg border border-white/5 backdrop-blur-md">
                   <div>
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-1">Loan Reserve</p>
                      <p className="text-lg font-semibold">{fmt(group.wallet.loan_pool)}</p>
                   </div>
                   <div className="border-l border-white/10 pl-8">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-1">Cycle Reserve</p>
                      <p className="text-lg font-semibold">{fmt(group.wallet.rotation_pool)}</p>
                   </div>
                   <div className="border-l border-white/10 pl-8">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-1">Active Quorum</p>
                      <p className="text-lg font-semibold">{group.member_count} Members</p>
                   </div>
                </div>
             </div>
             <Activity className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 rotate-12" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="font-semibold text-[#0a2540]">Registry Governance</h3>
                   <Shield size={16} className="text-[#00ab00]" />
                </div>
                <div className="space-y-4">
                   {leaders.length > 0 ? leaders.map((l, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border border-gray-100 group hover:border-[#00ab00]/20 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-lg ${avatarColorClass(l.member_name)} flex items-center justify-center text-white font-semibold text-xs shadow-sm`}>
                             {initials(l.member_name)}
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-[#0a2540]">{l.member_name}</p>
                              <p className="text-[9px] font-semibold text-[#00ab00] uppercase tracking-widest">{l.role}</p>
                           </div>
                        </div>
                        <button className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-[#00ab00] transition-all shadow-sm"><Phone size={14} /></button>
                     </div>
                   )) : <p className="text-xs text-gray-300 font-bold italic text-center py-4">No designated pool leaders established.</p>}
                </div>
             </div>

             <div className="bg-green-50 rounded-lg p-8 border border-green-100 shadow-sm">
                <h3 className="font-semibold text-[#016828] mb-8 uppercase text-[10px] tracking-widest">Protocol Configurations</h3>
                <div className="space-y-5">
                   <div className="flex justify-between items-center py-3 border-b border-green-100/50">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#016828]/60">Monthly Contribution</span>
                      <span className="text-sm font-semibold text-[#0a2540]">{fmt(group.contribution_amount)}</span>
                   </div>
                   <div className="flex justify-between items-center py-3 border-b border-green-100/50">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#016828]/60">Yield (Loan Interest)</span>
                      <span className="text-sm font-semibold text-[#0a2540]">{group.loan_interest_rate_monthly}% Fixed</span>
                   </div>
                   <div className="flex justify-between items-center py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#016828]/60">Quorum Limit</span>
                      <span className="text-sm font-semibold text-[#0a2540]">{group.max_members} Participants</span>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm">
             <h3 className="font-semibold text-[#0a2540] mb-8 flex items-center gap-2">
                <Settings size={18} className="text-[#00ab00]" /> Access Strategy
             </h3>
             <div className="space-y-4">
                {[
                  { k: "Frequency", v: group.contribution_frequency },
                  { k: "Payout Model", v: group.payout_strategy },
                  { k: "Loan Ratio", v: "30% Allocation" },
                  { k: "Verification", v: "KYC Required" },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0">
                     <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{r.k}</span>
                     <span className="text-xs font-semibold text-[#0a2540] capitalize">{r.v}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm hover:border-[#00ab00]/20 transition-all">
             <div className="flex items-center justify-between mb-8">
                <h3 className="font-semibold text-[#0a2540]">Active Session</h3>
                <Video size={16} className="text-[#00ab00]" />
             </div>
             {nextMeeting ? (
               <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#00ab00]" />
                     <p className="text-[10px] font-semibold uppercase tracking-widest text-[#0a2540] truncate">{nextMeeting.title}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 font-bold mb-6">
                    {new Date(nextMeeting.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <button className="w-full py-4 bg-[#0a2540] text-white rounded-lg font-semibold text-[10px] uppercase tracking-widest hover:bg-[#0f3460] transition-all flex items-center justify-center gap-2">
                    Enter Agenda <ArrowRight size={14} />
                  </button>
               </div>
             ) : (
               <div className="py-10 text-center border-2 border-dashed border-gray-50 rounded-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">No scheduled sessions</p>
               </div>
             )}
          </div>
          </div>
       </div>
    </div>
  )
}

function CreateChamaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((state) => state.user)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ExistingAccountGroupForm>(() => getInitialCreateGroupForm(user?.country))
  const [error, setError] = useState<string | null>(null)
  const createGroup = useCreateGroup()

  if (!open) return null

  const countryMeta = LOCATION_DATA[form.country]
  const level1Options = getLevel1(form.country).map(value => ({ value, label: value }))
  const level2Options = form.level1 ? getLevel2(form.country, form.level1).map(value => ({ value, label: value })) : []
  const steps = ["Group", "Location", "Review", "Security"]

  const update = (key: keyof ExistingAccountGroupForm, value: string | boolean) => {
    setForm(current => {
      if (key === "country") {
        return { ...current, country: value as CountryCode, level1: "", level2: "" }
      }
      if (key === "level1") {
        return { ...current, level1: value as string, level2: "" }
      }
      return { ...current, [key]: value }
    })
  }

  const validateStep = () => {
    if (step === 0) {
      if (form.group_name.trim().length < 3) return "Enter the chama name."
      if (!form.group_type) return "Choose the group type."
      if (form.group_type === "Other" && form.group_type_other.trim().length < 2) return "Specify the group type."
      if (Number(form.contribution_amount) <= 0) return "Enter a contribution amount above zero."
      if (Number(form.mandatory_savings_amount) < 0) return "Mandatory savings cannot be negative."
    }
    if (step === 1) {
      if (!form.level1 || !form.level2) return "Select the operating location."
    }
    if (step === 2) {
      if (!form.agreePrivacy || !form.agreeTerms) return "Accept the privacy policy and chairperson terms."
    }
    if (step === 3) {
      if (!/^\d{4}$/.test(form.transaction_pin)) return "Set a 4-digit numeric transaction PIN."
      if (!form.current_password) return "Enter your account password to confirm the PIN."
    }
    return null
  }

  const handleNext = () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep(current => Math.min(steps.length - 1, current + 1))
  }

  const handleBack = () => {
    setError(null)
    setStep(current => Math.max(0, current - 1))
  }

  const closeAndReset = () => {
    setStep(0)
    setError(null)
    setForm(getInitialCreateGroupForm(user?.country))
    onClose()
  }

  const submit = async () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
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
    const groupPayload: CreateGroupPayload = {
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
      await createGroup.mutateAsync(groupPayload)
      await api.post("/auth/transaction-pin/", {
        pin: form.transaction_pin,
        password: form.current_password,
      })
      closeAndReset()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || "The chama could not be submitted. Check the details and try again.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a2540]/50 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[5px] border border-gray-100 bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-[#0a2540]">Create Chama</h2>
            <p className="mt-1 text-xs font-medium text-gray-500">Step {step + 1} of {steps.length}: {steps[step]}</p>
          </div>
          <button type="button" onClick={closeAndReset} className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-gray-100 text-gray-400 hover:text-[#0a2540]">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-5">
          {steps.map((label, index) => (
            <div key={label} className={`h-1 flex-1 rounded-[5px] ${index <= step ? "bg-[#00ab00]" : "bg-gray-100"}`} />
          ))}
        </div>

        <div className="space-y-5 p-6">
          {step === 0 && (
            <div className="space-y-5">
              <CustomSelect
                label="Country of Operation"
                value={form.country}
                onChange={(value) => update("country", value)}
                options={[
                  { value: "kenya", label: "Kenya" },
                  { value: "rwanda", label: "Rwanda" },
                  { value: "ghana", label: "Ghana" },
                ]}
              />
              <label className="space-y-2 block">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Chama Name</span>
                <input value={form.group_name} onChange={e => update("group_name", e.target.value)} className="w-full rounded-[5px] border border-gray-100 bg-gray-50 p-4 text-sm font-medium text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00]" placeholder="Sunrise Investment Group" />
              </label>
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Group Type</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GROUP_TYPES.map(type => (
                    <button key={type} type="button" onClick={() => update("group_type", type)} className={`rounded-[5px] border px-3 py-2 text-sm font-medium ${form.group_type === type ? "border-[#00ab00] bg-green-50 text-[#016828]" : "border-gray-100 bg-white text-gray-500"}`}>
                      {type}
                    </button>
                  ))}
                </div>
                {form.group_type === "Other" && (
                  <input value={form.group_type_other} onChange={e => update("group_type_other", e.target.value)} className="mt-3 w-full rounded-[5px] border border-gray-100 bg-gray-50 p-4 text-sm font-medium text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00]" placeholder="Specify group type" />
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Contribution</span>
                  <div className="flex overflow-hidden rounded-[5px] border border-gray-100 bg-gray-50">
                    <span className="flex items-center border-r border-gray-100 px-3 text-xs font-semibold text-gray-500">{countryMeta.currency}</span>
                    <input inputMode="decimal" value={form.contribution_amount} onChange={e => update("contribution_amount", e.target.value)} className="min-w-0 flex-1 bg-transparent p-4 text-sm font-medium text-[#0a2540] outline-none" />
                  </div>
                </label>
                <CustomSelect
                  label="Frequency"
                  value={form.contribution_frequency}
                  onChange={(value) => update("contribution_frequency", value)}
                  options={CONTRIBUTION_FREQUENCIES.map(value => ({ value, label: value === "Harvest" ? "Harvest (Seasonal)" : value }))}
                />
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Mandatory Savings</span>
                  <div className="flex overflow-hidden rounded-[5px] border border-gray-100 bg-gray-50">
                    <span className="flex items-center border-r border-gray-100 px-3 text-xs font-semibold text-gray-500">{countryMeta.currency}</span>
                    <input inputMode="decimal" value={form.mandatory_savings_amount} onChange={e => update("mandatory_savings_amount", e.target.value)} className="min-w-0 flex-1 bg-transparent p-4 text-sm font-medium text-[#0a2540] outline-none" />
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-[5px] border border-green-100 bg-green-50 p-4 text-sm font-medium text-[#016828]">
                This location is used for country approval, local partner matching, and regional reporting.
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <CustomSelect
                  label={countryMeta.level1Label}
                  value={form.level1}
                  onChange={(value) => update("level1", value)}
                  placeholder={`Select ${countryMeta.level1Label}`}
                  options={level1Options}
                />
                <CustomSelect
                  label={countryMeta.level2Label}
                  value={form.level2}
                  onChange={(value) => update("level2", value)}
                  placeholder={`Select ${countryMeta.level2Label}`}
                  disabled={!form.level1}
                  options={level2Options}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-[5px] border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-4 text-base font-semibold text-[#0a2540]">Review</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-gray-100 pb-3"><dt className="text-gray-500">Chama</dt><dd className="font-semibold text-[#0a2540]">{form.group_name || "-"}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-gray-100 pb-3"><dt className="text-gray-500">Contribution</dt><dd className="font-semibold text-[#00ab00]">{countryMeta.currency} {Number(form.contribution_amount || 0).toLocaleString()} / {form.contribution_frequency}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-gray-100 pb-3"><dt className="text-gray-500">Mandatory Savings</dt><dd className="font-semibold text-[#00ab00]">{countryMeta.currency} {Number(form.mandatory_savings_amount || 0).toLocaleString()}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Location</dt><dd className="font-semibold text-[#0a2540]">{form.level2 || "-"}, {form.level1 || "-"}</dd></div>
                </dl>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-[5px] border border-gray-100 p-4 text-sm text-gray-600">
                <input type="checkbox" checked={form.agreePrivacy} onChange={e => update("agreePrivacy", e.target.checked)} className="mt-1" />
                <span>I accept the Privacy Policy and consent to group data collection for approval and operations.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-[5px] border border-gray-100 p-4 text-sm text-gray-600">
                <input type="checkbox" checked={form.agreeTerms} onChange={e => update("agreeTerms", e.target.checked)} className="mt-1" />
                <span>I accept the Terms of Use and chairperson responsibilities for this chama.</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-[5px] border border-green-100 bg-green-50 p-4 text-sm font-medium text-[#016828]">
                Your transaction PIN is required for sensitive actions such as loan approvals and payout controls.
              </div>
              <label className="space-y-2 block">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">4-Digit Transaction PIN</span>
                <input type="password" inputMode="numeric" maxLength={4} value={form.transaction_pin} onChange={e => update("transaction_pin", e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full rounded-[5px] border border-gray-100 bg-gray-50 p-4 text-center text-2xl font-semibold tracking-[0.5em] text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00]" placeholder="0000" />
              </label>
              <label className="space-y-2 block">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Current Account Password</span>
                <input type="password" value={form.current_password} onChange={e => update("current_password", e.target.value)} className="w-full rounded-[5px] border border-gray-100 bg-gray-50 p-4 text-sm font-medium text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00]" placeholder="Confirm your password" />
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-[5px] border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-5">
          <button type="button" onClick={handleBack} disabled={step === 0 || createGroup.isPending} className="rounded-[5px] border border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-[#0a2540] disabled:opacity-0">
            Back
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={handleNext} className="flex items-center gap-2 rounded-[5px] bg-[#00ab00] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#008a00]">
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={createGroup.isPending} className="flex items-center gap-2 rounded-[5px] bg-[#00ab00] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#008a00] disabled:cursor-not-allowed disabled:bg-gray-200">
              {createGroup.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Submit for Review
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MembersTab({ group }: { group: any }) {
  const { data: members, isLoading } = useMembers(group.id)
  const canInvite = group.status === "active"

  if (isLoading) return (
    <div className="py-20 flex items-center justify-center bg-white rounded-lg border border-gray-100">
      <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
    </div>
  )


  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div>
           <h3 className="font-semibold text-[#0a2540]">Pool Registry</h3>
           <p className="text-xs font-bold text-gray-400 mt-1">{members?.length || 0} Participants Authenticated</p>
        </div>
        <button
          disabled={!canInvite}
          title={canInvite ? "Invite Contributor" : "Complete KYC and first contribution to activate invites"}
          className={`text-[10px] font-semibold uppercase tracking-widest bg-white px-5 py-2.5 rounded-lg border transition-all shadow-sm ${
            canInvite ? "text-[#00ab00] border-green-100" : "cursor-not-allowed text-gray-300 border-gray-100"
          }`}
        >
          {canInvite ? "Invite Contributor" : "Invites Locked"}
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {members?.map((m: any) => (
          <div key={m.id} className="p-8 flex items-center justify-between hover:bg-gray-50 transition-all group">
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm ${avatarColorClass(m.member_name)}`}>
                {initials(m.member_name)}
              </div>
              <div>
                <p className="font-semibold text-[#0a2540] group-hover:text-[#00ab00] transition-colors">{m.member_name}</p>
                <p className="text-xs text-gray-400 font-bold">{m.member_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-10">
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Access Tier</p>
                <p className="text-xs font-semibold text-[#0a2540] capitalize">{m.role}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Cycle Status</p>
                <p className="text-xs font-semibold text-[#00ab00] capitalize">{statusLabel(m.status)}</p>
              </div>
              <button className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 hover:text-[#0a2540] transition-all">
                 <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useRotations } from "@/hooks/useRotations"

function RotationsTab({ group }: { group: any }) {
  const { data: cycles, isLoading } = useRotations(group.id)
  const currentCycle = cycles?.find(c => c.is_current)

  if (isLoading) return (
    <div className="py-20 flex items-center justify-center bg-white rounded-lg border border-gray-100">
      <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
    </div>
  )

  return (
    <div className="space-y-8">
      {currentCycle && (
        <div className="bg-[#0a2540] rounded-lg p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ab00]/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
               <span className="w-2 h-2 rounded-full bg-[#00ab00] animate-pulse" />
               <span className="text-[10px] font-semibold uppercase tracking-widest text-[#00ab00]">Current Live Cycle #{currentCycle.cycle_number}</span>
            </div>
            <h3 className="text-3xl font-semibold mb-10 tracking-tight">Financial Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-white/5 rounded-lg border border-white/5 backdrop-blur-md">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-1">Net Collections</p>
                <p className="text-xl font-semibold">{fmt(currentCycle.total_contributions)}</p>
              </div>
              <div className="border-l border-white/10 pl-8">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-1">Total Distributions</p>
                <p className="text-xl font-semibold">{fmt(currentCycle.total_payouts)}</p>
              </div>
              <div className="border-l border-white/10 pl-8">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-1">Cycle Maturation</p>
                <p className="text-xl font-semibold">{new Date(currentCycle.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
          <RefreshCw className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 rotate-45" />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
           <div>
              <h3 className="font-semibold text-[#0a2540]">Pool History</h3>
              <p className="text-xs font-bold text-gray-400 mt-1">Audit trail of all previous financial cycles.</p>
           </div>
           <button className="text-[10px] font-semibold uppercase tracking-widest text-[#00ab00] hover:underline underline-offset-4 transition-all">Audit Full Schedule</button>
        </div>
        <div className="divide-y divide-gray-50">
          {cycles?.map(c => (
            <div key={c.id} className="p-8 flex items-center justify-between hover:bg-gray-50 transition-all group">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm border transition-all ${
                  c.is_current ? 'bg-green-50 text-[#00ab00] border-green-100' : 'bg-gray-50 text-gray-300 border-gray-100 group-hover:border-gray-200'
                }`}>
                  <RefreshCw size={20} className={c.is_current ? 'animate-spin-slow' : ''} />
                </div>
                <div>
                  <p className="font-semibold text-[#0a2540] group-hover:text-[#00ab00] transition-colors">Distribution Cycle #{c.cycle_number}</p>
                  <p className="text-[11px] text-gray-400 font-bold">{new Date(c.start_date).toLocaleDateString()} — {new Date(c.end_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <span className={`text-[9px] font-semibold uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg border ${
                   c.is_current ? 'bg-green-50 text-[#00ab00] border-green-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                 }`}>
                   {c.status}
                 </span>
                 <button className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-300 hover:text-[#0a2540] transition-all shadow-sm group-hover:border-gray-200">
                    <ChevronRight size={14} />
                 </button>
              </div>
            </div>
          ))}
          {cycles?.length === 0 && <div className="p-20 text-center text-gray-300 font-bold italic">No historical cycles recorded for this pool.</div>}
        </div>
      </div>
    </div>
  )
}

function MeetingsTab({ group }: { group: any }) {
  const { data: meetings, isLoading } = useMeetings(group.id)

  if (isLoading) return (
    <div className="py-20 flex items-center justify-center bg-white rounded-lg border border-gray-100">
      <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
    </div>
  )


  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div>
           <h3 className="font-semibold text-[#0a2540]">Session Minutes</h3>
           <p className="text-xs font-bold text-gray-400 mt-1">Record of all past and upcoming member gatherings.</p>
        </div>
        <button className="bg-[#0a2540] text-white px-6 py-3 rounded-lg font-semibold text-[10px] uppercase tracking-widest hover:bg-[#0f3460] transition-all">Schedule Session</button>
      </div>
      <div className="divide-y divide-gray-50">
        {meetings?.map(m => (
          <div key={m.id} className="p-8 flex items-center justify-between hover:bg-gray-50 transition-all group">
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm border transition-all ${
                m.status === 'live' ? 'bg-red-50 text-red-500 border-red-100 animate-pulse' : 'bg-blue-50 text-blue-500 border-blue-100 group-hover:border-blue-200'
              }`}>
                <Video size={22} />
              </div>
              <div>
                <p className="font-semibold text-[#0a2540] group-hover:text-[#00ab00] transition-colors">{m.title}</p>
                <p className="text-[11px] text-gray-400 font-bold">{new Date(m.scheduled_at).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {m.status === 'live' ? (
                <button className="bg-red-500 text-white px-6 py-2.5 rounded-lg font-semibold text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Join Live</button>
              ) : (
                <button className="text-[9px] font-semibold uppercase tracking-widest text-[#0a2540] bg-white px-5 py-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all shadow-sm group-hover:border-gray-200">View Details</button>
              )}
            </div>
          </div>
        ))}
        {meetings?.length === 0 && <div className="p-20 text-center text-gray-300 font-bold italic">No session documentation found in the archives.</div>}
      </div>
    </div>
  )
}

function SettingsTab({ group }: { group: any }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden p-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="flex items-center gap-5 pb-8 border-b border-gray-50">
          <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center text-[#0a2540] border border-gray-100 shadow-sm">
             <Settings size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-[#0a2540]">Pool Controls</h3>
            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Configure your collective's financial and governance protocols.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-3">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Pool Identity</label>
              <input type="text" defaultValue={group.name} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm font-semibold text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all" />
           </div>
           <div className="space-y-3">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contribution Anchor Day</label>
              <input type="number" defaultValue={group.contribution_day} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm font-semibold text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all" />
           </div>
           <div className="space-y-3">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contributor Capacity</label>
              <input type="number" defaultValue={group.max_members} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm font-semibold text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all" />
           </div>
           <div className="space-y-3">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Loan Yield (Monthly %)</label>
              <input type="number" defaultValue={group.loan_interest_rate_monthly} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm font-semibold text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all" />
           </div>
        </div>

        <div className="pt-8">
           <button className="w-full py-5 bg-[#00ab00] text-white rounded-lg font-semibold text-xs uppercase tracking-widest hover:bg-[#008a00] transition-all">Commit Configuration Changes</button>
           <p className="text-center text-[10px] font-bold text-gray-300 mt-6 uppercase tracking-tighter">Certain changes may require consensus from all pool contributors.</p>
        </div>
      </div>
    </div>
  )
}
