"use client"

import { Suspense, useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AuthSlider } from "@/components/auth/AuthSlider"
import { AppStatePanel } from "@/components/states/AppState"
import { AlertTriangle } from "lucide-react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"

const CODE_LENGTH = 6

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

function VerifyPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")
  const user = useAuthStore((state) => state.user)

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [verified, setVerified] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const requestedRef = useRef(false)

  const requestCode = useCallback(async () => {
    try {
      await api.post("/auth/otp/request/")
    } catch (err: unknown) {
      setError(errorMessage(err, "The code could not be sent. Try resending in a moment."))
    }
  }, [])

  // Send the first code automatically when the page opens.
  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    void requestCode()
  }, [requestCode])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
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

  const handleVerify = async () => {
    const code = digits.join("")
    if (code.length < CODE_LENGTH) return
    setLoading(true)
    setError(null)
    try {
      await api.post("/auth/otp/confirm/", { code })

      // Invited members accept their invite once the phone is verified —
      // joining a group requires a verified number.
      if (inviteToken) {
        try {
          await api.post(`/invites/${inviteToken}/`)
        } catch (err: unknown) {
          setError(errorMessage(err, "Phone verified, but the invite could not be accepted. Open your invite link again."))
          setLoading(false)
          return
        }
      }
      setVerified(true)
    } catch (err: unknown) {
      setError(errorMessage(err, "Invalid or expired code. Please try again."))
      setDigits(Array(CODE_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setCountdown(60)
    setCanResend(false)
    setDigits(Array(CODE_LENGTH).fill(""))
    inputRefs.current[0]?.focus()
    await requestCode()
  }

  const isFull = digits.every(Boolean)

  if (verified) {
    return (
      <div className="auth-layout">
        <div className="auth-layout__slider">
          <AuthSlider />
        </div>

        <div className="auth-layout__panel">
          <div className="auth-topbar">
            <Link href="/" className="auth-topbar__logo" id="verify-home-link">
              <div className="auth-topbar__logo-mark">O</div>
              OrbiSave
            </Link>
            <Link href="/login" className="auth-topbar__link" id="verify-login-link">
              Back to<span>Sign in</span>
            </Link>
          </div>

          <div className="auth-layout__panel-inner">
            <AppStatePanel
              outcomeKey="accountVerified"
              className="border-solid"
              onPrimaryAction={() => router.push("/dashboard")}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__slider">
        <AuthSlider />
      </div>

      <div className="auth-layout__panel">
        <div className="auth-topbar">
          <Link href="/" className="auth-topbar__logo" id="verify-home-link">
            <div className="auth-topbar__logo-mark">O</div>
            OrbiSave
          </Link>
          <Link href="/login" className="auth-topbar__link" id="verify-login-link">
            Back to<span>Sign in</span>
          </Link>
        </div>

        <div className="auth-layout__panel-inner">
          <div className="auth-heading">
            <div className="auth-heading__eyebrow">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
              Identity Verification
            </div>
            <h1 className="auth-heading__title">Verify your phone number</h1>
            <p className="auth-heading__sub">
              We sent a 6-digit code by SMS to {user?.phone || "your phone number"}. Enter it below —
              this is the number your contributions and payouts will flow through.
            </p>
          </div>

          <div className="auth-card">
            {error && <div className="auth-error-banner"><AlertTriangle className="w-4 h-4" /> {error}</div>}

            {/* OTP Grid */}
            <div className="otp-group" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`otp-input ${d ? "otp-input--filled" : ""}`}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            <button
              className="auth-btn"
              onClick={handleVerify}
              disabled={!isFull || loading}
              id="verify-submit-btn"
            >
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>

            <p className="auth-resend" style={{ marginTop: "1.25rem" }}>
              Didn&apos;t receive the code?
              <button onClick={handleResend} disabled={!canResend}>
                {canResend ? "Resend now" : `Resend in ${countdown}s`}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageInner />
    </Suspense>
  )
}
