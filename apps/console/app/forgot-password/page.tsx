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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a2540] relative overflow-hidden font-sans text-white">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/30 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-[440px] z-10">
        <button 
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to Secure Login</span>
        </button>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-lg p-10 shadow-2xl">
          {!sent ? (
            <>
              <div className="text-center mb-8">
                <Logo className="justify-center mb-6" light iconOnly />
                <h1 className="text-2xl font-bold mb-2">Recover Access</h1>
                <p className="text-white/50 text-sm">Enter your authorized email to receive a secure recovery link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/80 ml-1">Work Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-[#00c000] disabled:bg-primary/50 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group"
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
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Check Your Inbox</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                A secure recovery token has been dispatched to <span className="text-white font-bold">{email}</span>. Please verify your identity within 15 minutes.
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl border border-white/10 transition-all"
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
