"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import {
  Landmark, RotateCcw, Building2, ClipboardList, ShieldCheck,
  Users, Wallet, Scale, UserCheck, Bell, FileText,
  Smartphone, User, CircleDollarSign
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────
const accountSchema = z.object({
  full_name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Use international format e.g. +254700000000"),
  password: z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type AccountValues = z.infer<typeof accountSchema>

// ─── Step Data ────────────────────────────────────────────────────────────────
const STEP_LABELS = ["Welcome", "Duties", "Terms", "Requirements", "Account"]
const TOTAL_STEPS = STEP_LABELS.length

// ─── Sub-components ──────────────────────────────────────────────────────────
function TermsAccordion() {
  const [open, setOpen] = useState<number | null>(0)
  const items = [
    {
      title: "1. Chairperson Responsibilities",
      body: "As chairperson, you are the primary accountable party for your Chama. You must ensure all contributions are tracked, rotations are conducted fairly, and group rules are enforced consistently. Failure to act in good faith may result in suspension of your group.",
    },
    {
      title: "2. KYC & Identity Verification",
      body: "You must complete full KYC (Know Your Customer) verification — including uploading a valid National ID — before your group can be activated or invite new members. This is a regulatory requirement for all group leaders.",
    },
    {
      title: "3. Financial Integrity",
      body: "All financial transactions within your Chama are recorded on OrbiSave's ledger. The chairperson is responsible for ensuring no fraudulent contributions are submitted. Disputes must be escalated to OrbiSave support within 14 days.",
    },
    {
      title: "4. Group Activation Requirements",
      body: "A minimum of 3 confirmed members and a completed first contribution cycle are required before your Chama is marked as active. The chairperson must make the first contribution to unlock the group invite system.",
    },
    {
      title: "5. Data & Privacy",
      body: "Member data shared within your Chama is protected under our Privacy Policy. You may not share or export member information to third parties. OrbiSave complies with Kenya Data Protection Act 2019 and relevant financial regulations.",
    },
  ]

  return (
    <div className="terms-accordion">
      {items.map((item, i) => (
        <div key={i} className="terms-accordion__item">
          <button
            type="button"
            className="terms-accordion__trigger"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {item.title}
            <span className={`terms-accordion__chevron ${open === i ? "terms-accordion__chevron--open" : ""}`}>▼</span>
          </button>
          {open === i && (
            <div className="terms-accordion__body">{item.body}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────
function StepWelcome() {
  return (
    <div>
      <div className="onboard-hero-card">
        <span className="onboard-hero-card__icon"><Landmark className="w-8 h-8 text-[#012d1d]" /></span>
        <h2 className="onboard-hero-card__title">You're starting a Chama</h2>
        <p className="onboard-hero-card__body">
          A <strong style={{ color: "#012d1d" }}>Chama</strong> is a rotating savings group where members pool funds, take turns receiving payouts, and support each other financially. As the founder, you'll serve as <strong style={{ color: "#012d1d" }}>Chairperson</strong> — the trusted leader who keeps everything running smoothly.
        </p>
      </div>

      <div className="onboard-cards">
        {[
          { icon: <RotateCcw className="w-5 h-5 text-[#012d1d]" />, title: "Rotating Payouts", body: "Each cycle, one member receives the pooled contributions. Fair, transparent, and automatic." },
          { icon: <Building2 className="w-5 h-5 text-[#012d1d]" />, title: "Shared Loan Pool", body: "Members can access emergency loans from the group fund — with full audit trails." },
          { icon: <ClipboardList className="w-5 h-5 text-[#012d1d]" />, title: "Group Rules You Set", body: "You define contribution amounts, frequencies, penalties, and payout order." },
          { icon: <ShieldCheck className="w-5 h-5 text-[#012d1d]" />, title: "Secure & Auditable", body: "Every transaction is ledgered. No silent failures. No missing funds." },
        ].map((c) => (
          <div key={c.title} className="onboard-card">
            <span className="onboard-card__icon">{c.icon}</span>
            <div className="onboard-card__title">{c.title}</div>
            <div className="onboard-card__body">{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepDuties() {
  const duties = [
    { icon: <Users className="w-5 h-5 text-[#012d1d]" />, title: "Group Leadership", body: "You represent the group and make final decisions on disputes, rule changes, and member removals. Your members trust you to be fair and consistent." },
    { icon: <Wallet className="w-5 h-5 text-[#012d1d]" />, title: "Financial Oversight", body: "Track all contributions, monitor late payments, and enforce penalty rules. You are the primary point of contact for all financial queries." },
    { icon: <Scale className="w-5 h-5 text-[#012d1d]" />, title: "Dispute Resolution", body: "When conflicts arise between members, you mediate and escalate to OrbiSave support if unresolved within 7 days. Document all decisions." },
    { icon: <UserCheck className="w-5 h-5 text-[#012d1d]" />, title: "KYC & Compliance", body: "You must complete full identity verification (National ID) before activating the group. Ensure all members also complete their KYC where required." },
    { icon: <Bell className="w-5 h-5 text-[#012d1d]" />, title: "Member Communication", body: "Inform members of upcoming payouts, contribution deadlines, and group updates via the platform's notification tools." },
    { icon: <FileText className="w-5 h-5 text-[#012d1d]" />, title: "Recordkeeping", body: "Maintain accurate group records and review monthly reports. OrbiSave provides automated summaries but the chairperson must verify accuracy." },
  ]
  return (
    <div>
      {duties.map((d) => (
        <div key={d.title} className="onboard-req-card">
          <div className="onboard-req-card__icon-wrap">{d.icon}</div>
          <div className="onboard-req-card__content">
            <div className="onboard-req-card__title">{d.title}</div>
            <div className="onboard-req-card__body">{d.body}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StepTerms({ agreed, setAgreed }: { agreed: boolean; setAgreed: (v: boolean) => void }) {
  return (
    <div>
      <TermsAccordion />
      <label className="terms-agree">
        <input
          type="checkbox"
          className="terms-agree__checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          id="terms-agree-checkbox"
        />
        <span className="terms-agree__text">
          I have read and understood all the terms above. I accept the responsibilities of being an OrbiSave Chama Chairperson and agree to operate in good faith at all times.
        </span>
      </label>
    </div>
  )
}

function StepRequirements() {
  const reqs = [
    { icon: <UserCheck className="w-5 h-5 text-[#012d1d]" />, title: "Valid National ID", body: "A clear scan or photo of your Kenyan National ID, Passport, or Alien ID. Required for KYC verification before group activation.", badge: "Mandatory" },
    { icon: <Smartphone className="w-5 h-5 text-[#012d1d]" />, title: "Active Phone Number", body: "A mobile number linked to M-Pesa or another supported mobile money service in Kenya. Used for payouts and dual-factor auth.", badge: "Mandatory" },
    { icon: <User className="w-5 h-5 text-[#012d1d]" />, title: "Minimum 3 Members", body: "You need at least 3 confirmed members (including yourself) before your Chama can be activated and start rotations.", badge: "Required" },
    { icon: <CircleDollarSign className="w-5 h-5 text-[#012d1d]" />, title: "Initial Contribution", body: "The chairperson must make the first contribution to unlock the group invite system. This shows commitment and builds member trust.", badge: "Required" },
    { icon: <ClipboardList className="w-5 h-5 text-[#012d1d]" />, title: "Defined Savings Rules", body: "Before inviting members, define contribution amount, frequency (weekly/monthly), and payout schedule. These can be amended by group vote later.", badge: "Before Inviting" },
    { icon: <Building2 className="w-5 h-5 text-[#012d1d]" />, title: "Bank or Mobile Account", body: "A verified bank account or M-Pesa number to receive payouts when it's your rotation. Payouts are processed within 24 hours of cycle close.", badge: "For Payouts" },
  ]
  return (
    <div>
      {reqs.map((r) => (
        <div key={r.title} className="onboard-req-card">
          <div className="onboard-req-card__icon-wrap">{r.icon}</div>
          <div className="onboard-req-card__content">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
              <div className="onboard-req-card__title" style={{ margin: 0 }}>{r.title}</div>
              <span style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "0.1rem 0.5rem",
                borderRadius: "9999px",
                background: "rgba(1, 45, 29, 0.08)",
                border: "1px solid rgba(1, 45, 29, 0.15)",
                color: "#012d1d",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}>{r.badge}</span>
            </div>
            <div className="onboard-req-card__body">{r.body}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StepAccount() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [showCp, setShowCp] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<AccountValues>({ resolver: zodResolver(accountSchema) })

  const onSubmit = async (data: AccountValues) => {
    setError(null)
    try {
      await api.post("/auth/register/", {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: "chairperson",
      })
      const tokenRes = await api.post("/auth/token/", { email: data.email, password: data.password })
      const { access } = tokenRes.data
      const profileRes = await api.get("/auth/users/me/", { headers: { Authorization: `Bearer ${access}` } })
      setAuth(profileRes.data, access)
      router.push("/dashboard")
    } catch (err: any) {
      if (err.response?.data) {
        const d = err.response.data
        setError(d.email?.[0] || d.phone?.[0] || d.non_field_errors?.[0] || "Registration failed.")
      } else {
        setError("Network error. Please check your connection.")
      }
    }
  }

  const Eye = ({ open }: { open: boolean }) =>
    open ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && <div className="auth-error-banner">⚠️ {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
          <label className="auth-label" htmlFor="ch-name">Full name</label>
          <input id="ch-name" type="text" placeholder="Alice Wanjiru" autoComplete="name" className={`auth-input ${errors.full_name ? "auth-input--error" : ""}`} {...register("full_name")} />
          {errors.full_name && <p className="auth-field-error">{errors.full_name.message}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="ch-email">Email address</label>
          <input id="ch-email" type="email" placeholder="alice@example.com" autoComplete="email" className={`auth-input ${errors.email ? "auth-input--error" : ""}`} {...register("email")} />
          {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="ch-phone">Phone number</label>
          <input id="ch-phone" type="tel" placeholder="+254700000000" autoComplete="tel" className={`auth-input ${errors.phone ? "auth-input--error" : ""}`} {...register("phone")} />
          {errors.phone && <p className="auth-field-error">{errors.phone.message}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="ch-password">Password</label>
          <div className="auth-input-wrap">
            <input id="ch-password" type={showPw ? "text" : "password"} placeholder="Min. 8 characters" autoComplete="new-password" className={`auth-input auth-input--pr ${errors.password ? "auth-input--error" : ""}`} {...register("password")} />
            <button type="button" className="auth-input-icon" onClick={() => setShowPw(v => !v)}><Eye open={showPw} /></button>
          </div>
          {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="ch-confirm">Confirm password</label>
          <div className="auth-input-wrap">
            <input id="ch-confirm" type={showCp ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" className={`auth-input auth-input--pr ${errors.confirmPassword ? "auth-input--error" : ""}`} {...register("confirmPassword")} />
            <button type="button" className="auth-input-icon" onClick={() => setShowCp(v => !v)}><Eye open={showCp} /></button>
          </div>
          {errors.confirmPassword && <p className="auth-field-error">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      <button type="submit" className="auth-btn" disabled={isSubmitting} id="chairperson-create-account-btn" style={{ marginTop: "0.5rem" }}>
        {isSubmitting ? "Creating your Chama account…" : "Create Chairperson Account →"}
      </button>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChamaOnboardingPage() {
  const [step, setStep] = useState(0)
  const [agreed, setAgreed] = useState(false)

  const canAdvance = () => {
    if (step === 2 && !agreed) return false
    if (step === TOTAL_STEPS - 1) return false // account step uses its own submit
    return true
  }

  const stepDescriptions = [
    "Learn what a Chama is and how OrbiSave powers it.",
    "Understand what's expected of you as a chairperson.",
    "Read and agree to the chairperson terms of service.",
    "Know what documents and setup you'll need.",
    "Create your chairperson account to get started.",
  ]

  return (
    <div className="onboard-layout">
      {/* Top bar */}
      <div className="onboard-topbar">
        <Link href="/" className="onboard-topbar__logo" id="onboard-home-link">
          <div className="onboard-topbar__logo-mark">O</div>
          OrbiSave
        </Link>
        <div className="onboard-topbar__step-label">
          Step <span>{step + 1}</span> of {TOTAL_STEPS} — {STEP_LABELS[step]}
        </div>
      </div>

      {/* Progress */}
      <div className="onboard-progress">
        <div className="onboard-progress__track">
          <div
            className="onboard-progress__fill"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="onboard-progress__steps">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`onboard-progress__step ${
                i === step ? "onboard-progress__step--active" : i < step ? "onboard-progress__step--done" : ""
              }`}
            >
              {i < step ? "✓ " : ""}{label}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="onboard-main">
        <div className="onboard-step__eyebrow">
          <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
          Chairperson Onboarding · Step {step + 1}
        </div>
        <h1 className="onboard-step__title">{STEP_LABELS[step]}</h1>
        <p className="onboard-step__desc">{stepDescriptions[step]}</p>

        {step === 0 && <StepWelcome />}
        {step === 1 && <StepDuties />}
        {step === 2 && <StepTerms agreed={agreed} setAgreed={setAgreed} />}
        {step === 3 && <StepRequirements />}
        {step === 4 && <StepAccount />}
      </div>

      {/* Footer navigation (not shown on final step — that has its own submit) */}
      {step < TOTAL_STEPS - 1 && (
        <div className="onboard-footer">
          <button
            type="button"
            className="onboard-footer__back"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            id="onboard-back-btn"
          >
            ← Back
          </button>
          <button
            type="button"
            className="onboard-footer__next"
            onClick={() => setStep(s => Math.min(TOTAL_STEPS - 1, s + 1))}
            disabled={!canAdvance()}
            id={`onboard-next-step-${step + 1}`}
          >
            {step === TOTAL_STEPS - 2 ? "Set up account →" : "Continue →"}
          </button>
        </div>
      )}

      {step === TOTAL_STEPS - 1 && (
        <div className="onboard-footer">
          <button
            type="button"
            className="onboard-footer__back"
            onClick={() => setStep(s => s - 1)}
            id="onboard-account-back-btn"
          >
            ← Back
          </button>
          <p style={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.5)" }}>
            Fill in the form above and click Create Account
          </p>
        </div>
      )}
    </div>
  )
}
