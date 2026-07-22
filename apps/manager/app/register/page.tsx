'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Mail, User, Phone, Globe, ArrowRight, Loader2, ChevronDown } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'

const COUNTRY_CODES: Record<string, string> = {
  kenya: '+254',
  rwanda: '+250',
  ghana: '+233',
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    country: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Two stages, mirroring Console: details, then the emailed 6 digit code.
  // Verification is what flips is_active and signs the admin in, so sending
  // them away to /login between the two steps was a dead end.
  const [stage, setStage] = useState<'details' | 'verify'>('details')
  const [code, setCode] = useState('')
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  // Auto-fill country code when country changes
  useEffect(() => {
    if (form.country && COUNTRY_CODES[form.country]) {
      setForm(prev => ({ ...prev, phone: COUNTRY_CODES[form.country] }))
    }
  }, [form.country])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.password || !form.country) {
      setError('Every field is mandatory. Please complete all sections.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data } = await api.post('/admin-portal/auth/register/', {
        email: form.email.trim().toLowerCase(),
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        phone: form.phone,
        password: form.password,
        country: form.country,
        portal: 'manager' // Maps to platform_admin
      })

      if (data.success) {
        // The account is created is_active=False pending email verification,
        // and the register endpoint returns no tokens. Hand over to the
        // in-page code step; verification is what activates and signs in.
        setSuccess('We emailed a 6 digit code to your work address.')
        setStage('verify')
      } else {
        setError(data.message || 'Enrollment failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Account request failed. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6 digit code from your email.')
      return
    }

    setLoading(true)
    try {
      // Flips is_active and returns the token pair; the proxy captures the
      // tokens into httpOnly cookies and hands back only the profile.
      const { data } = await api.post('/admin-portal/auth/verify-email/', {
        email: form.email.trim().toLowerCase(),
        code,
      })

      if (data.success) {
        setSuccess('Verified. Opening Manager.')
        setAuth(data.data.user)
        setTimeout(() => router.push('/dashboard'), 1000)
      } else {
        setError(data.message || 'Verification failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Request a new code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-[480px] z-10">
        <div className="text-center mb-10">
          <Logo className="justify-center mb-6" />
          <h1 className="text-3xl font-bold text-navy mb-2 tracking-tight">Platform Enrollment</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Regional Administrative Setup</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          {stage === 'verify' ? (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-navy">Check your email</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the 6 digit code we sent to <span className="font-medium text-navy">{form.email.trim().toLowerCase()}</span>.
                  It expires in 15 minutes.
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                aria-label="6 digit verification code"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-4 text-center text-2xl font-semibold tracking-[0.5em] text-navy placeholder:text-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              />

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium">{error}</div>
              )}
              {success && !error && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm font-medium">{success}</div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                title={code.length !== 6 ? 'Enter the full 6 digit code' : undefined}
                className="w-full bg-primary hover:bg-[#009200] disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-bold py-5 rounded-lg transition-all flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify and continue'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStage('details')
                  setCode('')
                  setError(null)
                  setSuccess(null)
                }}
                className="w-full text-center text-sm font-medium text-slate-500 hover:text-navy transition-colors"
              >
                Wrong email? Go back and edit the details
              </button>
            </form>
          ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">First Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({...form, first_name: e.target.value})}
                    placeholder="First"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({...form, last_name: e.target.value})}
                  placeholder="Last"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 px-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 ml-1">Work Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 ml-1">Assigned Jurisdiction</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <select
                  value={form.country}
                  onChange={(e) => setForm({...form, country: e.target.value})}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-10 text-navy appearance-none focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all cursor-pointer relative z-0"
                  required
                >
                  <option value="">Select Country</option>
                  <option value="kenya">Kenya Operations</option>
                  <option value="rwanda">Rwanda Operations</option>
                  <option value="ghana">Ghana Operations</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  placeholder="+Country Code..."
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <PasswordInput
              label="System Password"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              placeholder="••••••••"
              showStrength
              required
            />

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-primary hover:bg-[#009200] disabled:bg-primary/50 text-white font-bold py-5 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="tracking-wide font-bold">Request Platform Access</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-medium">
              Already have an active profile?{' '}
              <button 
                onClick={() => router.push('/login')}
                className="text-primary hover:text-primary/80 font-bold ml-1 transition-all"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
