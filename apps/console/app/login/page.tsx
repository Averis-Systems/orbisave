'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { LoginIllustrationPanel } from '@/components/auth/LoginIllustrationPanel'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data } = await api.post('/admin-portal/auth/login/', { email, password })

      if (data.success) {
        if (data.data.user.role !== 'super_admin') {
          setError('This account does not have Console access.')
          return
        }
        setSuccess(data.message || 'Signed in. Redirecting…')
        setAuth(data.data.user, data.data.access, remember)
        setTimeout(() => {
          router.push('/dashboard')
        }, 1200)
      } else {
        setError(data.message || 'Login failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify your connection and credentials.')
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
              <h1 className="text-3xl font-bold text-navy mb-2 tracking-tight">Sign in to the Console</h1>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Manage payment providers, platform admins, and country oversight across Kenya, Rwanda, and Ghana.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
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

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  label=""
                  required
                />
              </div>

              <label className="flex items-center gap-2.5 px-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20 accent-primary"
                />
                <span className="text-xs font-semibold text-slate-600">
                  Keep me signed in on this device
                </span>
              </label>

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
                className="w-full bg-primary hover:bg-[#009200] disabled:bg-primary/50 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in…</span>
                  </div>
                ) : (
                  <>
                    <span className="tracking-wide">Sign In to Console</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Encrypted connection · credentials never stored in plaintext</span>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-sm font-medium">
                Access is limited to authorized Averis Systems personnel.
              </p>
              <button
                onClick={() => router.push('/register')}
                className="mt-3 text-primary hover:text-primary/80 text-sm font-bold transition-all border-b border-primary/20 pb-0.5"
              >
                New Averis team member? Request console access
              </button>
            </div>

            <div className="flex justify-between mt-10 px-1">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                &copy; 2026 Averis Global
              </p>
              <div className="flex gap-4">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer hover:text-slate-600 transition-colors">Privacy</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer hover:text-slate-600 transition-colors">Terms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
