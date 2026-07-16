"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { MAX_LANGUAGES, MIN_LANGUAGES, SUPPORTED_LANGUAGES } from "@/lib/languages"
import { AlertTriangle, User, Users, Info, Loader2, Languages } from "lucide-react"

const memberSchema = z.object({
  full_name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Use international format e.g. +254700000000"),
  password: z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string(),
  group_invite_code: z.string().optional(),
  // Product rule: at least two preferred languages — the system always
  // serves the user in one of their selected languages.
  languages: z.array(z.string())
    .min(MIN_LANGUAGES, `Choose at least ${MIN_LANGUAGES} languages`)
    .max(MAX_LANGUAGES, `Choose at most ${MAX_LANGUAGES} languages`),
  terms: z.boolean().refine(val => val === true, "You must accept the terms"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type MemberFormValues = z.infer<typeof memberSchema>
type Role = "member" | "chairperson"

// Manager/Console-style bordered input, shared across every field.
const inputClass = (hasError?: boolean) =>
  `w-full rounded-lg border bg-slate-50/50 px-4 py-3.5 text-sm text-navy outline-none transition-all placeholder:text-slate-300 focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
      : "border-slate-200 focus:border-primary focus:ring-primary/10"
  }`

const labelClass = "ml-1 block text-sm font-semibold text-slate-700 mb-2"
const errorClass = "mt-1 ml-1 text-xs font-medium text-red-600"

interface InvitePreview {
  group_name: string
  chairperson_name: string
  contribution_amount: number
  contribution_frequency: string
}

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")
  
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role>("member")
  const [showPassword, setShowPassword] = useState(false)
  
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<MemberFormValues>({
      resolver: zodResolver(memberSchema),
      defaultValues: { languages: ["en", "sw"] },
    })

  const selectedLanguages = watch("languages") || []
  const toggleLanguage = (code: string) => {
    const next = selectedLanguages.includes(code)
      ? selectedLanguages.filter((c) => c !== code)
      : [...selectedLanguages, code].slice(0, MAX_LANGUAGES)
    setValue("languages", next, { shouldValidate: true })
  }

  useEffect(() => {
    if (inviteToken) {
      setSelectedRole("member")
      const fetchInvite = async () => {
        setLoadingInvite(true)
        try {
          const res = await api.get(`/invites/${inviteToken}/`)
          setInvitePreview(res.data)
        } catch (err) {
          console.error("Failed to load invite details", err)
          // We can fail silently or show an error.
        } finally {
          setLoadingInvite(false)
        }
      }
      fetchInvite()
    }
  }, [inviteToken])

  const handleRoleSelect = (role: Role) => {
    if (inviteToken) return // locked to member
    setSelectedRole(role)
    if (role === "chairperson") {
      router.push("/chama-onboarding")
    }
  }

  const onSubmit = async (data: MemberFormValues) => {
    setError(null)
    try {
      // 1. Register Member
      const regPayload: any = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: "member",
        languages: data.languages,
        invite_token: inviteToken || data.group_invite_code
      }
      await api.post("/auth/register/", regPayload)
      
      // 2. Log in — the proxy stores the JWTs in httpOnly cookies; all
      // subsequent calls are authenticated automatically.
      await api.post("/auth/token/", {
        email: data.email,
        password: data.password,
      })
      const profileRes = await api.get("/auth/me/")
      setAuth(profileRes.data)

      // 3. Phone verification is mandatory before joining a group — the
      // verify page sends the SMS code and accepts the invite on success.
      const effectiveInvite = inviteToken || data.group_invite_code
      router.push(effectiveInvite ? `/verify?invite=${encodeURIComponent(effectiveInvite)}` : "/verify")
    } catch (err: any) {
      if (err.response?.data) {
        const d = err.response.data
        
        // If the first registration step succeeded but something after it failed,
        // re-clicking "Join" will return "user already exists". We handle this by
        // skipping registration and trying to log in directly.
        const isAlreadyExists = d.email?.[0]?.includes("already exists") || d.phone?.[0]?.includes("already exists")
        
        if (isAlreadyExists) {
           try {
             await api.post("/auth/token/", { email: data.email, password: data.password })
             const profileRes = await api.get("/auth/me/")
             setAuth(profileRes.data)
             const retryInvite = inviteToken || data.group_invite_code
             if (profileRes.data?.phone_verified) {
               router.push("/dashboard")
             } else {
               router.push(retryInvite ? `/verify?invite=${encodeURIComponent(retryInvite)}` : "/verify")
             }
             return
           } catch (loginErr) {
             // Fall through to original error if auto-login also fails
           }
        }

        const msg = d.email?.[0] || d.phone?.[0] || d.non_field_errors?.[0] || "Registration failed."
        setError(msg)
      } else {
        setError("Network error. Please check your connection and retry.")
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
      {/* Invite Preview Banner */}
      {inviteToken && (
        <div className="mb-6 bg-primary/5 border border-primary/10 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-primary mb-1">You have been invited to join a Chama</h4>
              {loadingInvite ? (
                <p className="text-xs text-primary/80">Loading group details...</p>
              ) : invitePreview ? (
                <p className="text-xs text-primary/80 leading-relaxed">
                  Completing this form will link your account directly to <strong>{invitePreview.group_name}</strong>, chaired by {invitePreview.chairperson_name}. (Contribution: {invitePreview.contribution_amount} / {invitePreview.contribution_frequency})
                </p>
              ) : (
                <p className="text-xs text-primary/80">Completing this form will link your account directly to the group.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Selector - Only show if NO invite token */}
      {!inviteToken && (
        <>
          <p className="mb-3 ml-1 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Account Purpose</p>
          <div className="mb-8 grid grid-cols-2 gap-4">
            <button
              type="button"
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selectedRole === "member"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => handleRoleSelect("member")}
            >
              <User className="mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-bold text-navy">Member</div>
              <div className="text-[0.65rem] leading-snug text-slate-500">Individual savings and yield tracking.</div>
            </button>
            <button
              type="button"
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selectedRole === "chairperson"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => handleRoleSelect("chairperson")}
            >
              <Users className="mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-bold text-navy">Chama Leader</div>
              <div className="text-[0.65rem] leading-snug text-slate-500">Group management and cycle coordination.</div>
            </button>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="mb-5">
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            placeholder="As it appears on ID"
            autoComplete="name"
            className={inputClass(!!errors.full_name)}
            {...register("full_name")}
          />
          {errors.full_name && <p className={errorClass}>{errors.full_name.message}</p>}
        </div>

        <div className="mb-5">
          <label className={labelClass}>Email Address</label>
          <input
            type="email"
            placeholder="name@domain.com"
            autoComplete="email"
            className={inputClass(!!errors.email)}
            {...register("email")}
          />
          {errors.email && <p className={errorClass}>{errors.email.message}</p>}
        </div>

        <div className="mb-5">
          <label className={labelClass}>Phone Number</label>
          <div className="flex gap-2">
            <div className="flex w-28 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-navy">
              +254 <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="ml-auto opacity-50"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <input
              type="tel"
              placeholder="700 000 000"
              autoComplete="tel"
              className={`flex-1 ${inputClass(!!errors.phone)}`}
              {...register("phone")}
            />
          </div>
          {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`${inputClass(!!errors.password)} pr-10`}
                {...register("password")}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-navy focus:outline-none" onClick={() => setShowPassword(v => !v)}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password && <p className={errorClass}>{errors.password.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`${inputClass(!!errors.confirmPassword)} pr-10`}
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <div className="mb-5">
          <label className={labelClass}>Group Referral Code (Optional)</label>
          <input
            type="text"
            placeholder="e.g. ABC-123-XYZ"
            className={inputClass(!!errors.group_invite_code)}
            {...register("group_invite_code")}
          />
          {errors.group_invite_code && <p className={errorClass}>{errors.group_invite_code.message}</p>}
          <p className="mt-1.5 ml-1 flex items-center gap-1 text-[0.65rem] text-slate-500"><Info className="h-3 w-3" /> If you were invited by a Chairperson, enter the code here.</p>
        </div>

        {/* Preferred languages */}
        <div className="mb-6">
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" /> Preferred languages</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = selectedLanguages.includes(lang.code)
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                    active
                      ? "border-primary bg-primary/10 text-navy"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {lang.label}
                </button>
              )
            })}
          </div>
          {errors.languages && <p className={errorClass}>{errors.languages.message as string}</p>}
          <p className="mt-1.5 ml-1 flex items-center gap-1 text-[0.65rem] text-slate-500">
            <Info className="h-3 w-3" /> Pick at least two — OrbiSave will always speak to you in one of them.
          </p>
        </div>

        {/* Terms agreement */}
        <div className="mb-8 flex items-start gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="mt-0.5">
            <input
              type="checkbox"
              id="terms"
              className="h-4 w-4 rounded border-slate-300 text-primary accent-primary focus:ring-primary/20"
              {...register("terms")}
            />
          </div>
          <label htmlFor="terms" className="text-[0.65rem] leading-relaxed text-slate-500">
            By creating an account, you agree to our <Link href="/terms" className="underline decoration-slate-300 hover:text-navy">Terms of Use</Link> and <Link href="/privacy" className="underline decoration-slate-300 hover:text-navy">Privacy Policy</Link>. Your data is encrypted with enterprise-grade AES-256 standards.
          </label>
        </div>
        {errors.terms && <p className={`${errorClass} -mt-6 mb-6`}>{errors.terms.message}</p>}

        <button
          type="submit"
          className="group flex w-full items-center justify-center gap-3 rounded-lg bg-primary py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-[#009200] active:scale-[0.98] disabled:bg-primary/50 disabled:shadow-none"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Securing Account…</span>
            </>
          ) : (
            <>
              <span className="tracking-wide">Join the Collective</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
