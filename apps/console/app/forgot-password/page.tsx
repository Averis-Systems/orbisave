'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, Loader2, Send, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { LoginIllustrationPanel } from '@/components/auth/LoginIllustrationPanel'

/**
 * Admin password reset.
 *
 * This page used to be a placeholder: submitting ran a setTimeout and showed
 * "Check your email" without making any request, so an admin who forgot their
 * password waited for a code that was never sent. It now drives the real
 * two-step endpoints.
 *
 * The request step always reports the same thing whether or not the account
 * exists, matching the backend, so this page cannot be used to discover which
 * addresses are admins or which email domain grants access.
 */
export default function ForgotPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<'request' | 'reset' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/admin-portal/auth/password-reset/request/', { email: email.trim().toLowerCase() })
      // Always advance, regardless of whether an account matched. Branching
      // here would undo the backend's enumeration safety.
      setStage('reset')
    } catch {
      setError('We could not process that request. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6 digit code from your email.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/admin-portal/auth/password-reset/confirm/', {
        email: email.trim().toLowerCase(),
        code,
        new_password: password,
      })
      if (data.success) {
        setStage('done')
      } else {
        setError(data.message || 'That code is invalid or has expired.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'That code is invalid or has expired.')
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
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 text-slate-400 hover:text-navy mb-8 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-semibold">Back to sign in</span>
            </button>

            {stage === 'request' && (
              <>
                <div className="mb-10 text-center lg:text-left">
                  <Logo className="justify-center mb-8 lg:justify-start" />
                  <h1 className="text-3xl font-bold text-navy mb-2 tracking-tight">Reset your password</h1>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    Enter your work email and we will send you a 6 digit reset code.
                  </p>
                </div>

                <form onSubmit={handleRequest} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">Work Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-[#009200] disabled:bg-primary/50 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span className="tracking-wide">Send reset code</span>
                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {stage === 'reset' && (
              <>
                <div className="mb-10 text-center lg:text-left">
                  <Logo className="justify-center mb-8 lg:justify-start" />
                  <h1 className="text-3xl font-bold text-navy mb-2 tracking-tight">Enter your reset code</h1>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    If an account exists for {email}, we sent a 6 digit code. It expires in 15 minutes.
                  </p>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">Reset code</label>
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

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">New password</label>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      label=""
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6 || !password}
                    className="w-full bg-primary hover:bg-[#009200] disabled:bg-primary/50 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set new password'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStage('request')
                      setCode('')
                      setPassword('')
                      setError(null)
                    }}
                    className="w-full text-sm font-semibold text-slate-500 hover:text-navy transition-colors"
                  >
                    Send another code
                  </button>
                </form>
              </>
            )}

            {stage === 'done' && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-navy mb-3">Password updated</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                  Sign in with your new password to continue.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-primary hover:bg-[#009200] text-white font-bold py-4 rounded-lg transition-all"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
