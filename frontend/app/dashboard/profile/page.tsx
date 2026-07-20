"use client"

import { useAuthStore } from "@/store/auth"
import {
  User, Phone, Mail, MapPin, AlertCircle,
  CheckCircle2, Heart, Smartphone, Building2, Save, ShieldCheck
} from "lucide-react"
import { useState, useEffect } from "react"
import { KYCModal } from "@/components/dashboard/KYCModal"
import { PageHeader, SectionCard } from "@/components/dashboard/ui"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [isKycModalOpen, setIsKycModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    gender: user?.gender || '',
    next_of_kin_name: user?.next_of_kin_name || '',
    next_of_kin_phone: user?.next_of_kin_phone || '',
    disbursement_method: user?.disbursement_method || 'mobile_money',
    bank_name: user?.bank_name || '',
    bank_account_number: user?.bank_account_number || ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        gender: user.gender || '',
        next_of_kin_name: user.next_of_kin_name || '',
        next_of_kin_phone: user.next_of_kin_phone || '',
        disbursement_method: user.disbursement_method || 'mobile_money',
        bank_name: user.bank_name || '',
        bank_account_number: user.bank_account_number || ''
      })
    }
  }, [user])

  const handleSaveFinancials = async () => {
    setIsSaving(true)
    try {
      const response = await api.patch('auth/profile/update/', formData)
      const userData = response.data?.success ? response.data.data : response.data
      setUser(userData)
      toast.success("Financial settings updated successfully!")
    } catch (err) {
      toast.error("Failed to update settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return null

  const getStatusColor = () => {
    switch(user.kyc_status) {
      case 'verified': return { bg: "#e9f3ed", border: "#d6e4df", text: "#016828", icon: "#00ab00" }
      case 'submitted': return { bg: "#eff6ff", border: "#dbeafe", text: "#1e40af", icon: "#3b82f6" }
      case 'rejected': return { bg: "#fef2f2", border: "#fee2e2", text: "#991b1b", icon: "#ef4444" }
      default: return { bg: "#fffbeb", border: "#fef3c7", text: "#92400e", icon: "#f59e0b" }
    }
  }

  const statusStyle = getStatusColor()

  // KYC is an obligation of whoever is accountable for the group pool, not of
  // every saver. Chairpersons (and treasurers, who co-sign money movement)
  // must clear it before a group can be activated. Plain members contribute
  // and receive payouts without submitting identity documents.
  const kycRequiredForRole = user.role === "chairperson" || user.role === "treasurer"

  return (
    <div className="max-w-6xl mx-auto">
      <KYCModal isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} />

      <PageHeader
        eyebrow="Account"
        title="Profile and security"
        description="Your account details, next of kin, and where OrbiSave sends your payouts."
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Financials */}
        <div className="lg:col-span-8 space-y-8">
          {/* Profile Card */}
          <SectionCard>
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
              <div className="w-20 h-20 rounded-2xl bg-[#0a2540] flex items-center justify-center text-white text-2xl font-semibold">
                {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "ME"}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.full_name}</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                <span className="mt-3 inline-flex items-center rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-xs font-medium capitalize text-[#039855] dark:bg-emerald-500/10 dark:text-emerald-300">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Full name",  val: user.full_name,  Icon: User },
                { label: "Email address", val: user.email, Icon: Mail },
                { label: "Phone number", val: user.phone || "Not set", Icon: Phone },
                { label: "Country", val: user.country || "Not set", Icon: MapPin },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <r.Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.label}</p>
                    <p className="mt-0.5 truncate text-sm font-medium capitalize text-gray-900 dark:text-white">{r.val}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* TODO(api): name, email, phone, and country are read-only here. No self-service profile edit endpoint exists yet. */}
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              These details come from your registration. Contact support to change your name, email, or phone number.
            </p>
          </SectionCard>

          {/* Financial Settings Section */}
          <SectionCard
            title="Payout and next of kin details"
            description="Where your rotation payouts and loan disbursements are sent, and who to contact on your behalf."
            actions={
              <button
                onClick={handleSaveFinancials}
                disabled={isSaving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0a2540] px-5 text-sm font-semibold text-white transition hover:bg-[#1c3a5f] disabled:opacity-50"
              >
                {isSaving ? "Saving..." : <><Save size={14} /> Save changes</>}
              </button>
            }
          >
            <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gender */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:border-[#00ab00] outline-none transition-all appearance-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {/* Next of Kin */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Next of kin name</label>
                <div className="relative">
                  <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={formData.next_of_kin_name}
                    onChange={e => setFormData({ ...formData, next_of_kin_name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:border-[#00ab00] outline-none transition-all dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Next of kin phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    value={formData.next_of_kin_phone}
                    onChange={e => setFormData({ ...formData, next_of_kin_phone: e.target.value })}
                    placeholder="e.g. +254712345678"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium tabular-nums text-gray-900 focus:border-[#00ab00] outline-none transition-all dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Disbursement */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Disbursement method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'mobile_money', label: 'Mobile money', Icon: Smartphone },
                    { id: 'bank_transfer', label: 'Bank transfer', Icon: Building2 }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setFormData({ ...formData, disbursement_method: m.id as any })}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all font-medium text-xs ${
                        formData.disbursement_method === m.id
                          ? 'bg-[#0a2540] text-white border-[#0a2540]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}
                    >
                      <m.Icon size={14} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formData.disbursement_method === 'bank_transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Bank name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="e.g. Equity Bank"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:border-[#00ab00] outline-none transition-all dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Account number</label>
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={e => setFormData({ ...formData, bank_account_number: e.target.value })}
                    placeholder="Enter account number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium tabular-nums text-gray-900 focus:border-[#00ab00] outline-none transition-all dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Status & Security */}
        <div className="lg:col-span-4 space-y-8">
          <SectionCard
            title="Compliance status"
            description={
              kycRequiredForRole
                ? "Group leaders verify their identity before the group can hold money."
                : "What OrbiSave needs from you before you can contribute and receive payouts."
            }
          >
             {kycRequiredForRole ? (
               <div
                 style={{ background: statusStyle.bg, borderColor: statusStyle.border }}
                 className="border rounded-2xl p-5 mb-6"
               >
                  <div className="flex items-start gap-4">
                     <div className="mt-1">
                        {user.kyc_status === 'verified' ? <CheckCircle2 size={20} style={{ color: statusStyle.icon }} /> : <AlertCircle size={20} style={{ color: statusStyle.icon }} />}
                     </div>
                     <div>
                        <p className="font-semibold text-sm capitalize" style={{ color: statusStyle.text }}>
                          KYC {user.kyc_status}
                        </p>
                        <p className="text-sm leading-6 opacity-80 mt-1" style={{ color: statusStyle.text }}>
                           {user.kyc_status === 'verified'
                             ? "Your identity is verified. You can activate your group and approve group money movement."
                             : user.kyc_status === 'submitted'
                             ? "Verification in progress. Manual review usually completes within 24 hours."
                             : "As group leader, verify your identity to activate your group and approve payouts."}
                        </p>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="border border-gray-200 bg-gray-50 rounded-2xl p-5 mb-6 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-start gap-4">
                     <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#00ab00]" />
                     <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">No identity documents needed</p>
                        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                           Members contribute and receive payouts without submitting KYC. Only the group
                           leader verifies identity, on behalf of the group.
                        </p>
                     </div>
                  </div>
               </div>
             )}

             <div className="space-y-1">
                {[
                  // Email is the real account gate (login is blocked until it is
                  // verified). "Phone Verification: Completed" used to be
                  // hardcoded here, which claimed a check the platform does not
                  // currently run at all.
                  { label: "Email address", status: user.email_verified ? "Verified" : "Required" },
                  ...(kycRequiredForRole
                    ? [
                        { label: "Identity document", status: user.kyc_status === 'verified' ? "Verified" : user.kyc_status === 'submitted' ? "Pending" : "Required" },
                        { label: "Biometric selfie", status: user.kyc_status === 'verified' ? "Verified" : user.kyc_status === 'submitted' ? "Pending" : "Required" },
                      ]
                    : []),
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center gap-3 py-3 border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
                    <span className={`text-xs font-medium ${s.status === 'Verified' ? 'text-[#039855]' : s.status === 'Pending' ? 'text-amber-600' : 'text-orange-600'}`}>{s.status}</span>
                  </div>
                ))}
             </div>

             {kycRequiredForRole && user.kyc_status !== 'verified' && user.kyc_status !== 'submitted' && (
                <button
                  onClick={() => setIsKycModalOpen(true)}
                  className="mt-6 w-full py-3.5 bg-[#00ab00] text-white rounded-lg font-semibold text-sm hover:bg-[#009200] transition-all"
                >
                  Start verification
                </button>
             )}
          </SectionCard>

          {/* TODO(copy): the previous version claimed "multi-sig escrow" and regulatory
              protection. Product/compliance need to supply the security claims we can
              actually stand behind before anything stronger goes here. */}
          <div className="p-6 bg-[#0a2540] rounded-2xl text-white space-y-3">
             <ShieldCheck size={32} className="text-[#00ab00]" />
             <h4 className="text-base font-semibold">How your money is protected</h4>
             <p className="text-sm leading-6 text-white/70">
               Group money moves only with a chairperson transaction PIN, and every contribution,
               loan, and payout is written to the group ledger that all members can see.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
