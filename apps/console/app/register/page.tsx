'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Mail, User, Phone, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { LoginIllustrationPanel } from '@/components/auth/LoginIllustrationPanel'

/**
 * Console access request.
 *
 * Rebuilt to match /login structurally: same split-screen card on slate-100,
 * same illustration panel, same field treatment. It previously rendered a dark
 * navy glassmorphic card with animated blur orbs, sharing no visual language
 * with the page immediately before it.
 *
 * Console operates from Kenya only, so country is fixed to kenya and the
 * dialling code is stated as +254 rather than offered as a picker with one
 * valid answer.
 *
 * Two behavioural bugs are fixed here too:
 *   1. `country` was never sent, leaving admins with an empty country. Country
 *      scoping keys off that field, so it has to be set at creation.
 *   2. On success the page called setAuth(..., data.data.access), a token the
 *      register endpoint does not return, then redirected to /dashboard. The
 *      account is created is_active=False pending email verification, so that
 *      redirect always bounced straight back. Registration now hands over to
 *      the code entry step, which is what actually activates the account.
 */

const DIAL_CODE = '+254'

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'details' | 'verify'>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.password) {
      setError('All fields are required.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/admin-portal/auth/register/', {
        email: form.email.trim().toLowerCase(),
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        // Stored in full international form, matching the member app.
        phone: `${DIAL_CODE}${form.phone.replace(/\D/g, '').replace(/^0+/, '')}`,
        password: form.password,
        country: 'kenya',
        portal: 'console',
      })

      if (data.success) {
        setSuccess('We emailed a 6 digit code to your work address.')
        setStage('verify')
      } else {
        setError(data.message || 'Access request failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Access request failed. Check your connection and try again.')
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
      // This endpoint flips is_active to true and returns the token pair, so
      // it is the point at which the admin is genuinely signed in.
      const { data } = await api.post('/admin-portal/auth/verify-email/', {
        email: form.email.trim().toLowerCase(),
        code,
      })

      if (data.success) {
        setSuccess('Verified. Opening the Console.')
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans lg:p-10">
      <div className="flex w-full max-w-[1180px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/10 lg:min-h-[640px]">
        <LoginIllustrationPanel />

        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-10 text-center lg:text-left">
              <Logo className="justify-center mb-8 lg:justify-start" />
              <h1 className="text-3xl font-bold text-navy mb-2 tracking-tight">
                {stage === 'details' ? 'Request Console access' : 'Verify your work email'}
              </h1>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                {stage === 'details'
                  ? 'Console access is issued by the platform owner. Request access with your work email.'
                  : `Enter the 6 digit code we sent to ${form.email}. It expires in 15 minutes.`}
              </p>
            </div>

            {stage === 'details' ? (
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">First name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        placeholder="Ada"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">Last name</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="Lovelace"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 px-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 ml-1">Work Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 ml-1">Phone Number</label>
                  <div className="flex gap-2">
                    {/* Console operates from Kenya only, so the dialling code is
                        stated rather than offered as a one-option picker. */}
                    <div className="flex w-24 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50/50 py-4 text-sm font-semibold text-navy">
                      {DIAL_CODE}
                    </div>
                    <div className="relative group flex-1">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="700 000 000"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 ml-1">Password</label>
                  <PasswordInput
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    label=""
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#009200] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending code…
                    </>
                  ) : (
                    <>
                      Request access <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 ml-1">Verification code</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy text-lg font-semibold tracking-[0.4em] placeholder:tracking-normal placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-[#016828] text-sm font-medium">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-primary text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#009200] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      Verify and continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStage('details')
                    setCode('')
                    setError(null)
                    setSuccess(null)
                  }}
                  className="w-full text-sm font-semibold text-slate-500 hover:text-navy transition-colors"
                >
                  Use a different email
                </button>
              </form>
            )}

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-sm font-medium text-slate-500">
                Already have an active profile?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-primary hover:text-primary/80 font-bold transition-all"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
