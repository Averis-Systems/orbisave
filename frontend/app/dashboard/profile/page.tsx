"use client"

import { useAuthStore } from "@/store/auth"
import { 
  User, Shield, Phone, Mail, MapPin, Edit2, AlertCircle, 
  CheckCircle2, Heart, CreditCard, Smartphone, Building2, Save, ShieldCheck
} from "lucide-react"
import { useState, useEffect } from "react"
import { KYCModal } from "@/components/dashboard/KYCModal"
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

  return (
    <div className="max-w-6xl mx-auto">
      <KYCModal isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} />

      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#0a2540] mb-2">Profile & Security</h1>
        <p className="text-gray-500 font-bold">Manage your identity, next of kin, and disbursement preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Financials */}
        <div className="lg:col-span-8 space-y-8">
          {/* Profile Card */}
          <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-6 mb-10 pb-8 border-b border-gray-50">
              <div className="w-20 h-20 rounded-2xl bg-[#0a2540] flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "ME"}
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0a2540]">{user.full_name}</h2>
                <p className="text-gray-400 font-bold mb-3">{user.email}</p>
                <span className="bg-green-50 text-[#00ab00] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-green-100">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: "Full Name",  val: user.full_name,  Icon: User },
                { label: "Email Address", val: user.email, Icon: Mail },
                { label: "Phone Number", val: user.phone || "Not set", Icon: Phone },
                { label: "Region", val: user.country || "Not set", Icon: MapPin },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#00ab00] group-hover:bg-green-50 transition-all">
                    <r.Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{r.label}</p>
                    <p className="text-sm font-black text-[#0a2540]">{r.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Settings Section */}
          <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-[#0a2540] flex items-center gap-2">
                 <CreditCard size={20} className="text-[#00ab00]" /> Financial Preferences
               </h3>
               <button 
                 onClick={handleSaveFinancials}
                 disabled={isSaving}
                 className="flex items-center gap-2 px-6 py-2.5 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-navy/90 transition-all disabled:opacity-50"
               >
                 {isSaving ? "Saving..." : <><Save size={14} /> Save Changes</>}
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Gender */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender Identity</label>
                <select 
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:border-primary outline-none transition-all appearance-none"
                >
                  <option value="">Select Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {/* Next of Kin */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Next of Kin Name</label>
                <div className="relative">
                  <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="text"
                    value={formData.next_of_kin_name}
                    onChange={e => setFormData({ ...formData, next_of_kin_name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Next of Kin Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="tel"
                    value={formData.next_of_kin_phone}
                    onChange={e => setFormData({ ...formData, next_of_kin_phone: e.target.value })}
                    placeholder="Phone Number"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Disbursement */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Disbursement Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'mobile_money', label: 'Mobile', Icon: Smartphone },
                    { id: 'bank_transfer', label: 'Bank', Icon: Building2 }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setFormData({ ...formData, disbursement_method: m.id as any })}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-xs ${
                        formData.disbursement_method === m.id 
                          ? 'bg-navy text-white border-navy' 
                          : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <m.Icon size={14} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formData.disbursement_method === 'bank_transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="e.g. Equity Bank"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={e => setFormData({ ...formData, bank_account_number: e.target.value })}
                    placeholder="Enter Account Number"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status & Security */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
             <h3 className="font-black text-[#0a2540] mb-6 flex items-center gap-2">
               <Shield size={20} className="text-[#00ab00]" /> Compliance Status
             </h3>

             <div 
               style={{ background: statusStyle.bg, borderColor: statusStyle.border }}
               className="border rounded-2xl p-6 mb-8"
             >
                <div className="flex items-start gap-4">
                   <div className="mt-1">
                      {user.kyc_status === 'verified' ? <CheckCircle2 size={20} style={{ color: statusStyle.icon }} /> : <AlertCircle size={20} style={{ color: statusStyle.icon }} />}
                   </div>
                   <div>
                      <p className="font-black text-sm capitalize" style={{ color: statusStyle.text }}>
                        KYC {user.kyc_status}
                      </p>
                      <p className="text-xs font-bold opacity-70 mt-1" style={{ color: statusStyle.text }}>
                         {user.kyc_status === 'verified' 
                           ? "Your account is fully verified. All financial limits removed."
                           : user.kyc_status === 'submitted'
                           ? "Verification in progress. Manual review typically takes 24h."
                           : "Verify your identity to unlock loan requests and payouts."}
                      </p>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                {[
                  { label: "Phone Verification", status: "Completed" },
                  { label: "Identity Document", status: user.kyc_status === 'verified' ? "Verified" : user.kyc_status === 'submitted' ? "Pending" : "Required" },
                  { label: "Biometric Selfie", status: user.kyc_status === 'verified' ? "Verified" : user.kyc_status === 'submitted' ? "Pending" : "Required" },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                    <span className="text-xs font-bold text-gray-400">{s.label}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${s.status === 'Completed' || s.status === 'Verified' ? 'text-[#00ab00]' : 'text-orange-500'}`}>{s.status}</span>
                  </div>
                ))}
             </div>

             {user.kyc_status !== 'verified' && user.kyc_status !== 'submitted' && (
                <button 
                  onClick={() => setIsKycModalOpen(true)}
                  className="mt-8 w-full py-4 bg-[#00ab00] text-white rounded-xl font-black text-sm hover:bg-[#008a00] transition-all shadow-lg shadow-[#00ab00]/20"
                >
                  Start Verification
                </button>
             )}
          </div>

          <div className="p-8 bg-navy rounded-[24px] text-white space-y-4 relative overflow-hidden">
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
             <ShieldCheck size={40} className="text-[#00ab00] mb-4" />
             <h4 className="font-black text-lg">Secure Wallet</h4>
             <p className="text-xs font-medium text-white/60 leading-relaxed">
               All financial operations are protected by multi-sig escrow and regional banking regulations. Your data is always encrypted.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
