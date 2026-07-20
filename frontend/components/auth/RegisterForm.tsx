"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { LOCATION_DATA, type CountryCode } from "@/lib/location-data"
import { AlertTriangle, User, Users, Info, Loader2, Check, Lock } from "lucide-react"

const COUNTRY_CODES: CountryCode[] = ["kenya", "rwanda", "ghana"]

const memberSchema = z.object({
  full_name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
  country: z.enum(["kenya", "rwanda", "ghana"], { error: "Select your country first" }),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string(),
  group_invite_code: z.string().optional(),
  terms: z.boolean().refine(val => val === true, "You must accept the terms"),
})
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    // Validate the phone against the SELECTED country's national format :
    // a Kenyan number can't pass as a Rwandan one.
    if (data.country && data.phone) {
      const info = LOCATION_DATA[data.country]
      const full = info.phoneCode + data.phone.replace(/\D/g, "").replace(/^0+/, "")
      if (!info.phonePattern.test(full)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enter a valid ${info.label} number (${info.phoneHint})`,
          path: ["phone"],
        })
      }
    }
  })

type MemberFormValues = z.infer<typeof memberSchema>
type Role = "member" | "chairperson"

const inputClass = (hasError?: boolean, disabled?: boolean) =>
  `w-full rounded-lg border bg-slate-50/50 px-4 py-3.5 text-sm text-navy outline-none transition-all placeholder:text-slate-300 focus:ring-4 ${
    disabled ? "cursor-not-allowed opacity-60" : ""
  } ${
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
  country?: CountryCode
}

// ── Password strength (advisory; submission still gated by the schema) ──────
type Strength = { score: number; label: string; checks: { label: string; met: boolean }[] }

function scorePassword(pw: string): Strength {
  const checks = [
    { label: "8+ characters", met: pw.length >= 8 },
    { label: "Upper & lowercase", met: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: "A number", met: /\d/.test(pw) },
    { label: "A symbol", met: /[^A-Za-z0-9]/.test(pw) },
  ]
  const score = checks.filter((c) => c.met).length
  const label = pw.length === 0 ? "" : score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong"
  return { score, label, checks }
}

const STRENGTH_BAR = ["bg-red-400", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-primary"]
const STRENGTH_TEXT = ["text-slate-400", "text-red-500", "text-amber-600", "text-blue-600", "text-primary"]

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")

  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role>("member")
  const [showPassword, setShowPassword] = useState(false)
  // When the country is dictated by an invite, the selector is locked so an
  // invited member can't accidentally sign up on the wrong national rail.
  const [countryLocked, setCountryLocked] = useState(false)

  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<MemberFormValues>({
      resolver: zodResolver(memberSchema),
      mode: "onChange",
    })

  const passwordValue = watch("password") || ""
  const selectedCountry = watch("country") as CountryCode | undefined
  const strength = useMemo(() => scorePassword(passwordValue), [passwordValue])
  const countryInfo = selectedCountry ? LOCATION_DATA[selectedCountry] : null

  useEffect(() => {
    if (!inviteToken) return
    setSelectedRole("member")
    // The referral field is the invite itself when arriving from a link.
    setValue("group_invite_code", inviteToken)
    const fetchInvite = async () => {
      setLoadingInvite(true)
      try {
        const res = await api.get(`/invites/${inviteToken}/`)
        setInvitePreview(res.data)
        // Lock the phone selector to the group's country so the account is
        // created on the correct national rail (Kenya / Rwanda / Ghana).
        if (res.data?.country && COUNTRY_CODES.includes(res.data.country)) {
          setValue("country", res.data.country, { shouldValidate: true })
          setCountryLocked(true)
        }
      } catch (err) {
        console.error("Failed to load invite details", err)
      } finally {
        setLoadingInvite(false)
      }
    }
    fetchInvite()
  }, [inviteToken, setValue])

  const handleRoleSelect = (role: Role) => {
    if (inviteToken) return // locked to member
    setSelectedRole(role)
    if (role === "chairperson") {
      router.push("/chama-onboarding")
    }
  }

  const stashPending = (email: string, invite?: string) => {
    sessionStorage.setItem("orbisave_pending_email", email)
    if (invite) sessionStorage.setItem("orbisave_pending_invite", invite)
    else sessionStorage.removeItem("orbisave_pending_invite")
  }

  const onSubmit = async (data: MemberFormValues) => {
    setError(null)
    const effectiveInvite = inviteToken || data.group_invite_code || undefined
    // Compose the full international number from the selected country + local digits.
    const info = LOCATION_DATA[data.country]
    const fullPhone = info.phoneCode + data.phone.replace(/\D/g, "").replace(/^0+/, "")
    try {
      await api.post("/auth/register/", {
        full_name: data.full_name,
        email: data.email,
        phone: fullPhone,
        country: data.country,
        password: data.password,
        role: "member",
        invite_token: effectiveInvite,
      })
      stashPending(data.email, effectiveInvite)
      router.push("/verify-email")
    } catch (err: any) {
      if (!err.response?.data) {
        setError("Network error. Please check your connection and retry.")
        return
      }
      const d = err.response.data

      const alreadyExists = d.email?.[0]?.includes("already exists") || d.phone?.[0]?.includes("already exists")
      if (alreadyExists) {
        stashPending(data.email, effectiveInvite)
        try {
          await api.post("/auth/token/", { email: data.email, password: data.password })
          const profileRes = await api.get("/auth/me/")
          setAuth(profileRes.data)
          // Email is the only verification gate: accept any invite inline and
          // go straight to the dashboard rather than via a phone-OTP step.
          if (effectiveInvite) {
            try { await api.post(`/invites/${effectiveInvite}/`) } catch { /* group link is best-effort here */ }
          }
          router.push("/dashboard")
          return
        } catch (loginErr: any) {
          if (loginErr.response?.status === 403 && loginErr.response?.data?.code === "email_unverified") {
            router.push("/verify-email")
            return
          }
          setError("This email is already registered. Try logging in instead.")
          return
        }
      }

      setError(d.email?.[0] || d.phone?.[0] || d.password?.[0] || d.non_field_errors?.[0] || "Registration failed.")
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
                  Completing this form will link your account directly to <strong>{invitePreview.group_name}</strong>
                  {invitePreview.country && <> in <strong>{LOCATION_DATA[invitePreview.country]?.label}</strong></>}, chaired by {invitePreview.chairperson_name}.
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
          <p className="mb-3 ml-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Select account purpose</p>
          <div className="mb-8 grid grid-cols-2 gap-4">
            <button
              type="button"
              className={`relative rounded-lg border p-4 text-left transition-all ${
                selectedRole === "member" ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => handleRoleSelect("member")}
            >
              <User className="mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-bold text-navy">Member</div>
              <div className="text-xs leading-snug text-slate-500">Individual savings and yield tracking.</div>
            </button>
            <button
              type="button"
              className={`relative rounded-lg border p-4 text-left transition-all ${
                selectedRole === "chairperson" ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => handleRoleSelect("chairperson")}
            >
              <Users className="mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-bold text-navy">Chama Leader</div>
              <div className="text-xs leading-snug text-slate-500">Group management and cycle coordination.</div>
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

        {/* Country: must be picked before a phone number can be entered */}
        <div className="mb-5">
          <label className={labelClass}>
            Country
            {countryLocked && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Lock size={11} /> Set by your invitation
              </span>
            )}
          </label>
          <select
            className={`${inputClass(!!errors.country, countryLocked)} appearance-none bg-[right_1rem_center] bg-no-repeat`}
            disabled={countryLocked}
            defaultValue=""
            {...register("country")}
          >
            <option value="" disabled>Select your country</option>
            {COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>
                {LOCATION_DATA[code].label} ({LOCATION_DATA[code].phoneCode})
              </option>
            ))}
          </select>
          {errors.country && <p className={errorClass}>{errors.country.message}</p>}
        </div>

        <div className="mb-5">
          <label className={labelClass}>Phone Number</label>
          <div className="flex gap-2">
            <div className={`flex w-24 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3.5 text-sm font-semibold ${countryInfo ? "text-navy" : "text-slate-300"}`}>
              {countryInfo ? countryInfo.phoneCode : "+"}
            </div>
            <input
              type="tel"
              inputMode="numeric"
              disabled={!selectedCountry}
              placeholder={countryInfo ? countryInfo.phoneHint.replace(countryInfo.phoneCode, "").trim() : "Select a country first"}
              autoComplete="tel-national"
              className={`flex-1 ${inputClass(!!errors.phone, !selectedCountry)}`}
              {...register("phone")}
            />
          </div>
          {!selectedCountry && !errors.phone && (
            <p className="mt-1.5 ml-1 text-xs text-slate-400">Choose your country above to enter a phone number.</p>
          )}
          {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
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

        {/* Real-time password strength: turns brand-green only when strong. */}
        {passwordValue && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    i < strength.score ? STRENGTH_BAR[strength.score] : "bg-slate-200"
                  }`}
                />
              ))}
              <span className={`ml-2 w-12 text-right text-xs font-semibold ${STRENGTH_TEXT[strength.score]}`}>
                {strength.label}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {strength.checks.map((c) => (
                <span
                  key={c.label}
                  className={`inline-flex items-center gap-1 text-xs transition-colors ${c.met ? "text-primary" : "text-slate-400"}`}
                >
                  <Check size={13} strokeWidth={3} className={c.met ? "opacity-100" : "opacity-30"} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Referral code: auto-filled and locked when arriving from an invite link. */}
        <div className="mb-6">
          <label className={labelClass}>
            Group Referral Code {inviteToken ? "" : "(Optional)"}
          </label>
          <input
            type="text"
            placeholder="e.g. ABC-123-XYZ"
            readOnly={!!inviteToken}
            className={inputClass(!!errors.group_invite_code, !!inviteToken)}
            {...register("group_invite_code")}
          />
          {errors.group_invite_code && <p className={errorClass}>{errors.group_invite_code.message}</p>}
          <p className="mt-1.5 ml-1 flex items-center gap-1 text-xs text-slate-500">
            {inviteToken ? (
              <><Check size={12} className="text-primary" /> Auto-filled from your invitation: you&apos;ll join the exact group on signup.</>
            ) : (
              <><Info className="h-3 w-3" /> If you were invited by a Chairperson, enter the code here.</>
            )}
          </p>
        </div>

        {/* Terms agreement: deliberately unboxed, sits inline like a banking form. */}
        <div className="mb-2 flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary accent-primary focus:ring-primary/20"
            {...register("terms")}
          />
          <label htmlFor="terms" className="text-xs leading-relaxed text-slate-500">
            By creating an account, you agree to our <Link href="/terms" className="font-medium text-navy underline decoration-slate-300 underline-offset-2 hover:decoration-navy">Terms of Use</Link> and <Link href="/privacy" className="font-medium text-navy underline decoration-slate-300 underline-offset-2 hover:decoration-navy">Privacy Policy</Link>. Your data is encrypted with enterprise-grade AES-256 standards.
          </label>
        </div>
        {errors.terms && <p className={`${errorClass} mb-4`}>{errors.terms.message}</p>}

        <button
          type="submit"
          className="group mt-6 flex w-full items-center justify-center gap-3 rounded-lg bg-primary py-4 font-bold text-white transition-all hover:bg-[#009200] active:scale-[0.98] disabled:bg-primary/50"
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
