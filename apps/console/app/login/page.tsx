'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
          setError('Unauthorized access. Professional credentials required.')
          return
        }
        setSuccess(data.message || 'Authorization granted! Redirecting...')
        setAuth(data.data.user, data.data.access)
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a2540] relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/30 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-[440px] z-10">
        <div className="text-center mb-12">
          <Logo className="justify-center mb-8" light />
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Console Access</h1>
          <p className="text-white/50 text-sm tracking-wide uppercase font-semibold">Global Infrastructure Management</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-lg p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80 ml-1">Work Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-sm font-medium text-white/80">Security Password</label>
                <button 
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-xs text-primary/80 hover:text-primary font-semibold transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                label="" // Hidden as we use custom label above
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm animate-in fade-in slide-in-from-top-2">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-[#00c000] disabled:bg-primary/50 text-white font-bold py-5 rounded-lg transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span className="tracking-wide">Authorize Entry</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-white/5 text-center">
            <p className="text-white/30 text-sm font-medium">
              Averis Systems Security Protocol Restricted.
            </p>
            <button 
              onClick={() => router.push('/register')}
              className="mt-4 text-primary hover:text-primary/80 text-sm font-bold transition-all border-b border-primary/20 pb-0.5"
            >
              Create Administrator Profile
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-12 px-2">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">
            &copy; 2026 Averis Global
          </p>
          <div className="flex gap-4">
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer hover:text-white/40 transition-colors">Privacy</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer hover:text-white/40 transition-colors">Terms</span>
          </div>
        </div>
      </div>
    </div>
  )
}
