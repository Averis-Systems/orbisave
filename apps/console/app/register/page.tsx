'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Mail, User, Phone, ArrowRight, Loader2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.password) {
      setError('All fields are mandatory. Please complete the form.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data } = await api.post('/admin-portal/auth/register/', { 
        email: form.email,
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        phone: form.phone,
        password: form.password,
        portal: 'console' // Maps to super_admin
      })
      
      if (data.success) {
        setSuccess(data.message || 'Infrastructure profile initialized! Redirecting...')
        setAuth(data.data.user, data.data.access)
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        setError(data.message || 'Enrollment failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Account request failed. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a2540] relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/30 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-[480px] z-10">
        <div className="text-center mb-10">
          <Logo className="justify-center mb-6" light />
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Super Admin Setup</h1>
          <p className="text-white/50 text-sm tracking-wide uppercase font-semibold">Authorized Personnel Only</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-lg p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80 ml-1">First Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({...form, first_name: e.target.value})}
                    placeholder="First"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80 ml-1">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({...form, last_name: e.target.value})}
                  placeholder="Last"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-4 px-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80 ml-1">Professional Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="name@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80 ml-1">Secure Phone</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  placeholder="+Country Code..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
              light
              required
            />

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
              className="w-full mt-4 bg-primary hover:bg-[#00c000] disabled:bg-primary/50 text-white font-bold py-5 rounded-lg transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="tracking-wide">Create Admin Profile</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-white/30 text-sm font-medium">
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
