"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { AlertTriangle, Mail, Lock, Loader2, ArrowRight } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
})

type LoginFormValues = z.infer<typeof loginSchema>

/**
 * Defined at module scope, not inside LoginForm. Declaring a component in the
 * render body creates a brand new component type on every render, so React
 * unmounts and remounts the icon on each keystroke rather than updating it.
 */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  )
}

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
      // The proxy captures the JWTs into httpOnly cookies: the browser
      // never sees a token; subsequent calls are authenticated automatically.
      await api.post("/auth/token/", {
        email: data.email,
        password: data.password,
      })
      const profileRes = await api.get("/auth/me/")
      setAuth(profileRes.data)
      // Email verification is the only gate on an account, and the token
      // endpoint above already enforces it. Phone verification is deferred
      // (no SMS provider funded yet), so logging in must never divert to the
      // phone OTP page: that stranded verified members outside the dashboard.
      router.push("/dashboard")
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid email or password. Please try again.")
      } else if (err.response?.data) {
        setError(`Login failed: ${JSON.stringify(err.response.data)}`)
      } else {
        setError(`Network error: ${err.message}. Please check your connection.`)
      }
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="ml-1 block text-sm font-semibold text-slate-700">Email Address</label>
          <div className="group relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full rounded-lg border bg-slate-50/50 py-4 pl-12 pr-4 text-sm text-navy outline-none transition-all placeholder:text-slate-300 focus:ring-4 ${
                errors.email
                  ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-primary focus:ring-primary/10"
              }`}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="ml-1 text-xs font-medium text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="block text-sm font-semibold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs font-bold text-primary transition-colors hover:text-primary/80">
              Forgot password?
            </Link>
          </div>
          <div className="group relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              className={`w-full rounded-lg border bg-slate-50/50 py-4 pl-12 pr-11 text-sm text-navy outline-none transition-all placeholder:text-slate-300 focus:ring-4 ${
                errors.password
                  ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-primary focus:ring-primary/10"
              }`}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-navy focus:outline-none"
              onClick={() => setShowPassword(v => !v)}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password && <p className="ml-1 text-xs font-medium text-red-600">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          className="group flex w-full items-center justify-center gap-3 rounded bg-primary py-4 font-bold text-white transition-all hover:bg-[#009200] active:scale-[0.98] disabled:bg-primary/50"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span className="tracking-wide">Sign In to My Account</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
