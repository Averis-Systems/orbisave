"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { AlertTriangle, Shield, CheckCircle, Key } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    try {
      const response = await api.post("/auth/token/", {
        email: data.email,
        password: data.password,
      })
      const { access } = response.data
      const profileRes = await api.get("/auth/users/me/", {
        headers: { Authorization: `Bearer ${access}` },
      })
      setAuth(profileRes.data, access)
      router.push("/dashboard")
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid email or password. Please try again.")
      } else {
        setError("Something went wrong. Please check your connection and retry.")
      }
    }
  }

  const EyeIcon = ({ open }: { open: boolean }) =>
    open ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    )

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <div className="mb-6 p-4 rounded bg-[#ffdad6] text-[#93000a] text-sm font-medium flex gap-2 items-center"><AlertTriangle className="w-4 h-4" /> {error}</div>}

        <div className="mb-5">
          <label className="block text-[10px] font-bold text-[#717973] tracking-widest uppercase mb-2">Professional Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className={`w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#1a1c1a] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#012d1d] focus:outline-none transition-all ${errors.email ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.email.message}</p>}
        </div>

        <div className="mb-8 relative">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[10px] font-bold text-[#717973] tracking-widest uppercase">Secure Password</label>
            <Link href="/forgot-password" className="text-xs font-bold text-[#012d1d] hover:text-black">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              className={`w-full h-11 px-4 pr-10 bg-[#f3f4f1] border-none rounded text-sm text-[#1a1c1a] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#012d1d] focus:outline-none transition-all ${errors.password ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
              {...register("password")}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a] focus:outline-none" onClick={() => setShowPassword(v => !v)}>
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.password.message}</p>}
        </div>

        <button type="submit" className="w-full h-11 bg-[#012d1d] hover:bg-black text-white text-sm font-bold rounded flex items-center justify-center gap-2 transition-all shadow-sm" disabled={isSubmitting}>
          {isSubmitting ? "Authenticating…" : "Access My Vault"}
          {!isSubmitting && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
        </button>
      </form>

      {/* Security badges */}
      <div className="flex justify-center gap-8 mt-12 border-t border-black/5 pt-8">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#717973] tracking-widest uppercase">
          <Shield className="w-4 h-4" /> SSL Secured
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#717973] tracking-widest uppercase">
          <CheckCircle className="w-4 h-4" /> FDIC Member
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#717973] tracking-widest uppercase">
          <Key className="w-4 h-4" /> 2FA Ready
        </div>
      </div>
    </div>
  )
}
