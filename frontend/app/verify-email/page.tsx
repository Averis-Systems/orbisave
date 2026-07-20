"use client"

import { Suspense, useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthSlider } from "@/components/auth/AuthSlider"
import { AlertTriangle, CheckCircle2, Plus, LayoutDashboard } from "lucide-react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"

const CODE_LENGTH = 6

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

/**
 * sessionStorage does not exist during server render, so this is called from a
 * lazy useState initialiser, which only ever runs on the client.
 */
function readPendingValue(key: string) {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(key)
}

function VerifyEmailInner() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const user = useAuthStore((state) => state.user)

  // Read once, lazily, on the client. These were previously copied out of
  // sessionStorage inside an effect, which meant an extra render pass and a
  // first paint addressed to an empty email.
  // Seeded from sessionStorage, but still editable: someone who lands here
  // without that value gets an email field to fill in.
  const [email, setEmail] = useState(() => readPendingValue("orbisave_pending_email") || "")
  const [pendingInvite] = useState(() => readPendingValue("orbisave_pending_invite"))
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)
  // Post-verification state: email is the ONLY gate to the dashboard, so we
  // land the member on a welcome step here rather than a phone-OTP detour.
  const [verified, setVerified] = useState(false)
  const [joinedGroup, setJoinedGroup] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Derived, not stored. Holding this in state meant the effect had to write it
  // back on every tick, and the two could disagree for a render.
  const canResend = !verified && countdown <= 0

  useEffect(() => {
    if (verified || countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, verified])

  const handleChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = [...digits]
    pasted.split("").forEach((c, i) => { next[i] = c })
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
    e.preventDefault()
  }

  const handleVerify = useCallback(async () => {
    const code = digits.join("")
    if (code.length < CODE_LENGTH) return
    if (!email) {
      setError("Enter the email address you registered with.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Confirms the email AND logs the user in: the proxy captures the
      // returned tokens into httpOnly cookies, so /auth/me/ is authenticated.
      await api.post("/auth/email/confirm/", { email, code })
      const profileRes = await api.get("/auth/me/")
      setAuth(profileRes.data)

      // Invited members join their group right here: phone verification is
      // no longer part of the signup path.
      if (pendingInvite) {
        try {
          await api.post(`/invites/${pendingInvite}/`)
          setJoinedGroup(true)
        } catch {
          // Verification succeeded; only the group link failed. Say so on the
          // next screen instead of blocking an otherwise-active account.
          setJoinedGroup(false)
        }
      }

      sessionStorage.removeItem("orbisave_pending_email")
      sessionStorage.removeItem("orbisave_pending_invite")
      setVerified(true)
      setLoading(false)
    } catch (err: unknown) {
      setError(errorMessage(err, "Invalid or expired code. Please try again."))
      setDigits(Array(CODE_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
      setLoading(false)
    }
  }, [digits, email, pendingInvite, setAuth])

  const handleResend = async () => {
    if (!email) {
      setError("Enter the email address you registered with.")
      return
    }
    // canResend derives from countdown, so resetting the clock is enough.
    setCountdown(60)
    setDigits(Array(CODE_LENGTH).fill(""))
    setError(null)
    try {
      await api.post("/auth/email/resend/", { email })
      inputRefs.current[0]?.focus()
    } catch (err: unknown) {
      setError(errorMessage(err, "The code could not be sent. Try again in a moment."))
    }
  }

  const isFull = digits.every(Boolean)
  const firstName = user?.full_name?.split(" ")[0]

  return (
    <div className="auth-layout">
      <div className="auth-layout__slider">
        <AuthSlider />
      </div>

      <div className="auth-layout__panel">
        <div className="auth-topbar">
          <Link href="/" className="auth-topbar__logo">
            <div className="auth-topbar__logo-mark">O</div>
            OrbiSave
          </Link>
          {!verified && (
            <Link href="/login" className="auth-topbar__link">
              Back to<span>Sign in</span>
            </Link>
          )}
        </div>

        <div className="auth-layout__panel-inner">
          {verified ? (
            /* ── Welcome / next-step step ─────────────────────────────── */
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#00ab00]">
                <CheckCircle2 size={28} />
              </div>

              <h1 className="auth-heading__title">
                {joinedGroup ? "You're in: welcome aboard" : "Your email is verified"}
              </h1>

              <p className="mt-3 text-sm font-semibold leading-6 text-gray-500">
                {joinedGroup ? (
                  <>
                    Welcome{firstName ? `, ${firstName}` : ""}. Your account is active and you&apos;ve joined your
                    savings group. You can start contributing as soon as your group&apos;s next cycle opens.
                  </>
                ) : (
                  <>
                    Welcome to OrbiSave{firstName ? `, ${firstName}` : ""}. Your account is active. You&apos;re not in a
                    savings group yet. Join one using an invite code from your chairperson, or create your own group
                    and invite members to it.
                  </>
                )}
              </p>

              {!joinedGroup && (
                <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">What happens next</p>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      "Create a group if you're starting one. You'll set the contribution amount and rotation order.",
                      "Or join an existing group with the invite code your chairperson shares with you.",
                      "Contributions, rotation payouts, savings and loans all unlock once you're in a group.",
                    ].map((line) => (
                      <li key={line} className="flex gap-2.5 text-sm leading-6 text-gray-600">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00ab00]" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-7 grid gap-3">
                <button
                  onClick={() => router.push(joinedGroup ? "/dashboard" : "/dashboard/my-group")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] text-sm font-bold text-white transition hover:bg-[#009200]"
                >
                  {joinedGroup ? <LayoutDashboard size={17} /> : <Plus size={17} />}
                  {joinedGroup ? "Go to my dashboard" : "Create or join a group"}
                </button>
                {!joinedGroup && (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-[#0a2540] transition hover:bg-gray-50"
                  >
                    <LayoutDashboard size={17} />
                    Go to my dashboard
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── Code entry step ──────────────────────────────────────── */
            <>
              <div className="auth-heading">
                <div className="auth-heading__eyebrow">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4" /></svg>
                  Email Verification
                </div>
                <h1 className="auth-heading__title">Verify your email address</h1>
                <p className="auth-heading__sub">
                  We sent a 6-digit code to {email ? <strong>{email}</strong> : "your email address"}. Enter it below to
                  activate your account. The code expires in 10 minutes.
                </p>
              </div>

              <div className="auth-card">
                {error && <div className="auth-error-banner"><AlertTriangle className="w-4 h-4" /> {error}</div>}

                {!email && (
                  <div className="mb-5">
                    <label className="ml-1 mb-2 block text-sm font-semibold text-slate-700">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-navy outline-none transition-all placeholder:text-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                )}

                <div className="otp-group" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      id={`otp-digit-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`otp-input ${d ? "otp-input--filled" : ""}`}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                <button className="auth-btn" onClick={handleVerify} disabled={!isFull || loading}>
                  {loading ? "Verifying…" : "Verify & Continue"}
                </button>

                <p className="auth-resend" style={{ marginTop: "1.25rem" }}>
                  Didn&apos;t receive the code?
                  <button onClick={handleResend} disabled={!canResend}>
                    {canResend ? "Resend now" : `Resend in ${countdown}s`}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  )
}
