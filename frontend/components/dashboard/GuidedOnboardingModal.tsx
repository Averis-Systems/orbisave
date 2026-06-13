"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Heart, 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Building2,
  CheckCircle2,
  User
} from "lucide-react"
import { toast } from "sonner"

const GENDERS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'other', label: 'Other' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' }
]

const LANGUAGES = [
  { id: 'english', label: 'English' },
  { id: 'swahili', label: 'Swahili' },
  { id: 'kinyarwanda', label: 'Kinyarwanda' },
  { id: 'twi', label: 'Twi' },
  { id: 'ga', label: 'Ga' },
  { id: 'french', label: 'French' },
]

const DISBURSEMENT_METHODS = [
  { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, description: 'Directly to your M-Pesa or MoMo wallet.' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Secure transfer to your linked bank account.' }
]

const COUNTRY_CODES: Record<string, string> = {
  'kenya': '+254',
  'rwanda': '+250',
  'ghana': '+233'
}

export function GuidedOnboardingModal() {
  const { user, setUser } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const hasTriggeredRef = useRef(false)

  // Local form state
  const [formData, setFormData] = useState({
    gender: '',
    languages: [] as string[],
    next_of_kin_name: '',
    next_of_kin_phone: '',
    disbursement_method: 'mobile_money',
    bank_name: '',
    bank_account_number: ''
  })

  useEffect(() => {
    if (user && !user.onboarding_popup_seen && !hasTriggeredRef.current) {
      setIsOpen(true)
      hasTriggeredRef.current = true
      
      const countryCode = user.country ? COUNTRY_CODES[user.country.toLowerCase()] || '' : ''
      const phone = user.next_of_kin_phone || countryCode
      
      setFormData({
        gender: user.gender || '',
        languages: user.languages || [],
        next_of_kin_name: user.next_of_kin_name || '',
        next_of_kin_phone: phone,
        disbursement_method: user.disbursement_method || 'mobile_money',
        bank_name: user.bank_name || '',
        bank_account_number: user.bank_account_number || ''
      })
    }
  }, [user])

  const handleNext = () => setStep(s => s + 1)
  const handleBack = () => setStep(s => s - 1)

  const toggleLanguage = (id: string) => {
    setFormData(prev => {
      const exists = prev.languages.includes(id)
      if (exists) {
        return { ...prev, languages: prev.languages.filter(l => l !== id) }
      }
      if (prev.languages.length >= 2) return prev
      return { ...prev, languages: [...prev.languages, id] }
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      console.log('[Onboarding] Starting synchronization with backend...')
      
      const response = await api.patch('auth/profile/update/', {
        ...formData,
        onboarding_popup_seen: true
      })
      
      console.log('[Onboarding] Sync successful:', response.status)
      
      // The backend returns a success envelope: { success: true, data: { ...user }, message: "..." }
      // If for some reason it's raw data, we fall back to response.data
      const result = response.data
      const userData = result?.success ? result.data : result
      
      if (userData && typeof userData === 'object' && userData.id) {
        console.log('[Onboarding] Updating local user state...')
        setUser(userData)
        
        // Only close if we successfully updated the state
        setIsOpen(false)
        toast.success("Onboarding complete! Welcome to Orbisave.")
      } else {
        throw new Error("Received invalid user data from server")
      }
      
    } catch (err: any) {
      console.error('[Onboarding] Critical Failure!')
      console.error('Error Message:', err.message || 'No message')
      
      if (err.response) {
        console.error('Status:', err.response.status)
        console.error('Response Data:', JSON.stringify(err.response.data, null, 2))
      } else if (err.request) {
        console.error('No response received. Request details:', err.config ? { url: err.config.url, method: err.config.method } : 'No config')
      } else {
        console.error('Error config:', err.config)
      }

      const errorDetail = err.response?.data?.message || err.response?.data?.error || err.message
      toast.error(`Sync failed: ${errorDetail}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a2540]/60 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[440px] rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative animate-in zoom-in-95 duration-300 border border-slate-100">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 flex gap-1 px-8 pt-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i} 
              className={`h-full flex-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-primary' : 'bg-slate-100'
              }`} 
            />
          ))}
        </div>

        <div className="p-8 pt-12">
          {step > 1 && (
            <button 
              onClick={handleBack}
              className="absolute top-8 left-8 p-2 text-slate-400 hover:text-navy transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* Step 1: Gender */}
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-navy tracking-tight">How do you identify?</h2>
                <p className="text-slate-400 font-medium">This information will always be private.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {GENDERS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setFormData({ ...formData, gender: g.id })}
                    className={`w-full py-3.5 px-6 rounded-lg font-black text-sm transition-all border text-left flex items-center justify-between ${
                      formData.gender === g.id 
                        ? 'bg-[#0a2540] text-white border-[#0a2540]' 
                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {g.label}
                    {formData.gender === g.id && <CheckCircle2 size={18} className="text-primary" />}
                  </button>
                ))}
              </div>
              <button
                disabled={!formData.gender}
                onClick={handleNext}
                className="w-full py-4 bg-[#00ab00] text-white rounded-lg font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-[#00ab00]/30 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Languages */}
          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-navy tracking-tight">Your primary languages</h2>
                <p className="text-slate-400 font-medium leading-relaxed">Select up to 2. We use this to translate your dashboard into your local dialect.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGES.map(l => (
                  <button
                    key={l.id}
                    onClick={() => toggleLanguage(l.id)}
                    className={`py-3.5 px-6 rounded-lg font-black text-sm transition-all border text-center flex items-center justify-center gap-2 ${
                      formData.languages.includes(l.id) 
                        ? 'bg-[#0a2540] text-white border-[#0a2540]' 
                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {l.label}
                    {formData.languages.includes(l.id) && <CheckCircle2 size={14} className="text-[#00ab00]" />}
                  </button>
                ))}
              </div>
              <button
                disabled={formData.languages.length === 0}
                onClick={handleNext}
                className="w-full py-4 bg-[#00ab00] text-white rounded-lg font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-[#00ab00]/30 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3: Next of Kin */}
          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-navy tracking-tight">Safeguarding your legacy</h2>
                <p className="text-slate-400 font-medium">Set your Next of Kin. This is mandatory for security.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      value={formData.next_of_kin_name}
                      onChange={e => setFormData({ ...formData, next_of_kin_name: e.target.value })}
                      placeholder="e.g. Jane Doe"
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-lg text-sm font-black focus:border-[#00ab00] outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="tel"
                      value={formData.next_of_kin_phone}
                      onChange={e => {
                        const val = e.target.value
                        // Ensure they can't delete the + if they try, or at least keep it clean
                        if (val.length < 1) {
                           setFormData({ ...formData, next_of_kin_phone: '+' })
                        } else {
                           setFormData({ ...formData, next_of_kin_phone: val })
                        }
                      }}
                      placeholder={user?.country ? `e.g. ${COUNTRY_CODES[user.country.toLowerCase()]} ...` : "e.g. +254 700 ..."}
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-lg text-sm font-black focus:border-[#00ab00] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
              <button
                disabled={
                  !formData.next_of_kin_name || 
                  !formData.next_of_kin_phone || 
                  formData.next_of_kin_phone.length < 10
                }
                onClick={handleNext}
                className="w-full py-4 bg-[#00ab00] text-white rounded-lg font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-[#00ab00]/30 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4: Financial Settings */}
          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-navy tracking-tight">Financial Connectivity</h2>
                <p className="text-slate-400 font-medium">How would you like to receive your payouts?</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {DISBURSEMENT_METHODS.map(m => {
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      onClick={() => setFormData({ ...formData, disbursement_method: m.id })}
                      className={`w-full p-6 rounded-lg border text-left flex gap-4 transition-all ${
                        formData.disbursement_method === m.id 
                          ? 'bg-[#0a2540] text-white border-[#0a2540]' 
                          : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        formData.disbursement_method === m.id ? 'bg-[#00ab00] text-white' : 'bg-slate-50 text-[#0a2540]'
                      }`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black uppercase tracking-tight text-xs mb-1">{m.label}</p>
                        <p className={`text-xs font-medium leading-relaxed ${
                          formData.disbursement_method === m.id ? 'text-white/60' : 'text-slate-400'
                        }`}>{m.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {formData.disbursement_method === 'bank_transfer' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Bank Name (e.g. Equity)"
                    className="px-4 py-3.5 bg-white border border-slate-100 rounded-lg text-xs font-black focus:border-[#00ab00] outline-none transition-all"
                  />
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={e => setFormData({ ...formData, bank_account_number: e.target.value })}
                    placeholder="Account Number"
                    className="px-4 py-3.5 bg-white border border-slate-100 rounded-lg text-xs font-black focus:border-[#00ab00] outline-none transition-all"
                  />
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full py-4 bg-[#00ab00] text-white rounded-lg font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-[#00ab00]/30 transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 5: Final Nudge */}
          {step === 5 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 text-center">
              <div className="w-16 h-16 bg-[#00ab00]/10 rounded-lg flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-[#00ab00]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-navy tracking-tight">You're all set!</h2>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Head over to your <strong>Billing Settings</strong> to set your preferred contribution method (e.g. M-Pesa) and finalize your financial connection.
                </p>
              </div>
              
              <div className="p-6 bg-slate-50/50 rounded-lg border border-slate-100 text-left flex gap-4">
                <ShieldCheck size={24} className="text-[#00ab00] shrink-0" />
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  We take security seriously. Your banking details are encrypted and only used for authorized disbursements via our partner banks.
                </p>
              </div>

              <button
                disabled={loading}
                onClick={handleSubmit}
                className="w-full py-4 bg-[#0a2540] text-white rounded-lg font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-[#0a2540]/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'FINISHING...' : 'FINISH'}
                {!loading && <CheckCircle2 size={16} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
