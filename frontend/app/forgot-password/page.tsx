"use client"

import { useState } from "react"
import Link from "next/link"
import { AuthSlider } from "@/components/auth/AuthSlider"
import { AlertTriangle, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      // API call to request password reset — wire to your backend endpoint here
      // await api.post("/auth/password-reset/", { email })
      await new Promise((r) => setTimeout(r, 900)) // simulated delay
      setSubmitted(true)
    } catch {
      setError("We couldn't send a reset link. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__slider">
        <AuthSlider />
      </div>

      <div className="auth-layout__panel">
        <div className="auth-topbar">
          <Link href="/" className="auth-topbar__logo" id="fp-home-link">
            <div className="auth-topbar__logo-mark">O</div>
            OrbiSave
          </Link>
          <Link href="/login" className="auth-topbar__link" id="fp-login-link">
            Back to<span>Sign in</span>
          </Link>
        </div>

        <div className="auth-layout__panel-inner">
          {!submitted ? (
            <>
              <div className="auth-heading">
                <div className="auth-heading__eyebrow">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
                  Account Recovery
                </div>
                <h1 className="auth-heading__title">Forgot your password?</h1>
                <p className="auth-heading__sub">
                  Enter the email address linked to your account and we'll send you a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-card" noValidate>
                {error && <div className="auth-error-banner"><AlertTriangle className="w-4 h-4" /> {error}</div>}

                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-email">Email address</label>
                  <input
                    id="fp-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-btn"
                  disabled={loading || !email}
                  id="fp-submit-btn"
                >
                  {loading ? "Sending link…" : "Send reset link"}
                </button>
              </form>

              <div className="auth-footer-link">
                Remembered it?
                <Link href="/login">Back to sign in</Link>
              </div>
            </>
          ) : (
            <>
              <div className="auth-heading">
                <div className="auth-heading__eyebrow">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
                  Check your email
                </div>
                <h1 className="auth-heading__title">Reset link sent</h1>
              </div>

              <div className="auth-card">
                <div className="auth-success">
                  <div className="auth-success__icon"><Mail className="w-8 h-8 text-[#012d1d]" /></div>
                  <h2 className="auth-success__title">Check your inbox</h2>
                  <p className="auth-success__body">
                    We sent a password reset link to <strong style={{ color: "#012d1d" }}>{email}</strong>.
                    The link expires in 30 minutes.
                  </p>
                  <Link href="/login">
                    <button className="auth-btn" id="fp-done-btn">Back to sign in</button>
                  </Link>
                </div>
                <p className="auth-resend" style={{ marginTop: "1.25rem" }}>
                  Didn't receive it?
                  <button onClick={() => setSubmitted(false)}>Resend</button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
