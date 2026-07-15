'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { LoginIllustrationPanel } from '@/components/auth/LoginIllustrationPanel'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // TODO: no admin-portal password-reset endpoint exists yet on the
    // backend (only the member app has one, phone-based) — this is a
    // placeholder until that's built.
    setTimeout(() => {
      setSent(true)
      setLoading(false)
    }, 1500)
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
              <span className="text-sm font-bold uppercase tracking-widest">Back to Login</span>
            </button>

            {!sent ? (
              <>
                <div className="mb-10 text-center lg:text-left">
                  <Logo className="justify-center mb-8 lg:justify-start" />
                  <h1 className="text-3xl font-bold text-navy mb-2 tracking-tight">Reset your password</h1>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    Enter your work email and we&apos;ll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">Work Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@averissystems.com"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-[#009200] disabled:bg-primary/50 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span className="tracking-wide">Send Reset Link</span>
                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-navy mb-3">Check your email</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                  We&apos;ve sent a password reset link to <span className="text-navy font-bold">{email}</span>. It expires in 15 minutes.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-navy font-bold py-4 rounded-lg border border-slate-200 transition-all"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
