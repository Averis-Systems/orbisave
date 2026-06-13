'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call for password reset
    setTimeout(() => {
      setSent(true)
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-[440px] z-10">
        <button 
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-slate-400 hover:text-navy mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to Login</span>
        </button>

        <div className="bg-white border border-slate-200 rounded-lg p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          {!sent ? (
            <>
              <div className="text-center mb-8">
                <Logo className="justify-center mb-6" iconOnly />
                <h1 className="text-2xl font-bold text-navy mb-2">Recover Access</h1>
                <p className="text-slate-500 text-sm">Enter your work email to receive a secure recovery link.</p>
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
                      placeholder="name@company.com"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-[#009200] disabled:bg-primary/50 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <span>Send Recovery Link</span>
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
              <h2 className="text-2xl font-bold text-navy mb-3">Check Your Inbox</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                A secure recovery token has been sent to <span className="text-navy font-bold">{email}</span>.
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="w-full bg-slate-50 hover:bg-slate-100 text-navy font-bold py-4 rounded-2xl border border-slate-200 transition-all"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
