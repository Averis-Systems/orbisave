"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { AlertTriangle, User, Users, Shield, CheckCircle, Key, Info } from "lucide-react"

const memberSchema = z.object({
  full_name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Use international format e.g. +254700000000"),
  password: z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string(),
  group_invite_code: z.string().optional(),
  terms: z.boolean().refine(val => val === true, "You must accept the terms"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type MemberFormValues = z.infer<typeof memberSchema>
type Role = "member" | "chairperson"

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<MemberFormValues>({ resolver: zodResolver(memberSchema) })

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
        invite_token: inviteToken || data.group_invite_code
      }
      await api.post("/auth/register/", regPayload)
      
      // 2. Log in
      const tokenRes = await api.post("/auth/token/", {
        email: data.email,
        password: data.password,
      })
      const { access } = tokenRes.data
      
      const profileRes = await api.get("/auth/me/", {
        headers: { Authorization: `Bearer ${access}` },
      })
      setAuth(profileRes.data, access)
      
      // 3. Accept invite explicitly if needed
      if (inviteToken) {
        try {
          await api.post(`/invites/${inviteToken}/`, {}, {
             headers: { Authorization: `Bearer ${access}` }
          })
        } catch (inviteErr) {
          console.error("Invite accept failed", inviteErr)
          // Continue to dashboard anyway, they are logged in
        }
      }

      router.push("/dashboard")
    } catch (err: any) {
      if (err.response?.data) {
        const d = err.response.data
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
          <p className="text-[10px] font-bold text-[#717973] tracking-widest uppercase mb-3 text-left">Select Account Purpose</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              className={`relative p-4 rounded bg-white text-left transition-colors border ${selectedRole === "member" ? "border-[#00ab00] shadow-sm" : "border-black/5 hover:bg-[#f3f4f1]"}`}
              onClick={() => handleRoleSelect("member")}
            >
              <User className="w-5 h-5 text-[#00ab00] mb-3" />
              <div className="text-sm font-bold text-[#0a2540] mb-1">Member</div>
              <div className="text-[0.65rem] text-[#4a5c6a] leading-snug">Individual savings and yield tracking.</div>
            </button>
            <button
              type="button"
              className={`relative p-4 rounded bg-white text-left transition-colors border ${selectedRole === "chairperson" ? "border-[#00ab00] shadow-sm" : "border-black/5 hover:bg-[#f3f4f1]"}`}
              onClick={() => handleRoleSelect("chairperson")}
            >
              <Users className="w-5 h-5 text-[#00ab00] mb-3" />
              <div className="text-sm font-bold text-[#0a2540] mb-1">Chama Leader</div>
              <div className="text-[0.65rem] text-[#4a5c6a] leading-snug">Group management and cycle coordination.</div>
            </button>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <div className="mb-6 p-4 rounded bg-[#ffdad6] text-[#93000a] text-sm font-medium flex gap-2 items-center"><AlertTriangle className="w-4 h-4" /> {error}</div>}

        <div className="mb-5">
          <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight mb-2">Full Name</label>
          <input
            type="text"
            placeholder="As it appears on ID"
            autoComplete="name"
            className={`w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all ${errors.full_name ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
            {...register("full_name")}
          />
          {errors.full_name && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.full_name.message}</p>}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight mb-2">Email Address</label>
          <input
            type="email"
            placeholder="name@domain.com"
            autoComplete="email"
            className={`w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all ${errors.email ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.email.message}</p>}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight mb-2">Phone Number</label>
          <div className="flex gap-2">
            <div className="h-11 px-4 bg-[#f3f4f1] rounded flex items-center gap-2 w-28 text-sm text-[#0a2540]">
              +254 <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="ml-auto opacity-50"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <input
              type="tel"
              placeholder="700 000 000"
              autoComplete="tel"
              className={`flex-1 h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all ${errors.phone ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
              {...register("phone")}
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full h-11 px-4 pr-10 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all ${errors.password ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
                {...register("password")}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a5a1] hover:text-[#0a2540] focus:outline-none" onClick={() => setShowPassword(v => !v)}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full h-11 px-4 pr-10 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all ${errors.confirmPassword ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight mb-2">Group Referral Code (Optional)</label>
          <input
            type="text"
            placeholder="e.g. ABC-123-XYZ"
            className={`w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all ${errors.group_invite_code ? "border-l-2 border-l-[#ba1a1a]" : ""}`}
            {...register("group_invite_code")}
          />
          {errors.group_invite_code && <p className="mt-1 text-xs text-[#ba1a1a] font-medium">{errors.group_invite_code.message}</p>}
          <p className="mt-1.5 text-[0.65rem] text-[#4a5c6a] flex items-center gap-1"><Info className="w-3 h-3" /> If you were invited by a Chairperson, enter the code here.</p>
        </div>

        {/* Terms agreement */}
        <div className="mb-8 bg-[#f3f4f1] p-4 rounded flex items-start gap-4 border border-black/5">
          <div className="mt-0.5">
            <input 
              type="checkbox" 
              id="terms" 
              className="w-4 h-4 rounded border-gray-300 text-[#00ab00] focus:ring-[#00ab00]"
              {...register("terms")}
            />
          </div>
          <label htmlFor="terms" className="text-[0.65rem] leading-relaxed text-[#4a5c6a]">
            By creating an account, you agree to our <Link href="/terms" className="underline decoration-black/30 hover:text-black">Terms of Use</Link> and <Link href="/privacy" className="underline decoration-black/30 hover:text-black">Privacy Policy</Link>. Your data is encrypted with enterprise-grade AES-256 standards.
          </label>
        </div>

        <button type="submit" className="w-full h-11 bg-[#00ab00] hover:bg-[#008a00] text-white text-sm font-bold rounded flex items-center justify-center gap-2 transition-all shadow-sm" disabled={isSubmitting}>
          {isSubmitting ? "Creating Account…" : "Join the Collective"}
          {!isSubmitting && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
        </button>
      </form>

      {/* Simple Security Footer */}
      <div className="mt-12 pt-8 border-t border-black/5">
        <p className="text-[11px] text-[#a0a5a1] font-bold tracking-tight text-center">© {new Date().getFullYear()} OrbiSave</p>
      </div>
    </div>
  )
}
