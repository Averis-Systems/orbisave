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
        if (data.data.user.role !== 'platform_admin') {
          setError('Unauthorized access. Platform credentials required.')
          return
        }
        setSuccess(data.message || 'Verification complete! Redirecting...')
        setAuth(data.data.user, data.data.access)
        setTimeout(() => {
          router.push('/dashboard')
        }, 1200)
      } else {
        setError(data.message || 'Login failed.')
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || 'No message'
      const rawData = JSON.stringify(err.response?.data || {})
      setError(`Login failed: ${serverMsg} (Raw: ${rawData})`)
      console.error('Auth Error Details:', err.response || err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans">
      {/* Subtle Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-[440px] z-10">
        <div className="text-center mb-10">
          <Logo className="justify-center mb-8" />
          <h1 className="text-3xl font-bold text-navy mb-2 tracking-tight">Platform Access</h1>
          <p className="text-slate-500 text-sm font-medium">Regional Operations Management</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <form onSubmit={handleLogin} className="space-y-6">
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

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-sm font-semibold text-slate-700">Security Password</label>
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
                label="" // Hidden
                required
              />
            </div>

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
              className="w-full bg-primary hover:bg-[#009200] disabled:bg-primary/50 text-white font-bold py-5 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <>
                  <span className="tracking-wide font-bold">Sign In to Dashboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-medium">
              Authorized Personnel Access Only.
            </p>
            <button 
              onClick={() => router.push('/register')}
              className="mt-4 text-primary hover:text-primary/80 text-sm font-bold transition-all border-b border-primary/20 pb-0.5"
            >
              Request Administrative Access
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-12 px-2">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            &copy; 2026 Averis Global
          </p>
          <div className="flex gap-4">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer hover:text-slate-600 transition-colors">Security</span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer hover:text-slate-600 transition-colors">Privacy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
