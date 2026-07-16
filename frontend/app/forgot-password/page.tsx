"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel"
import { AuthFooter } from "@/components/auth/AuthFooter"
import { AlertTriangle, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react"
import { useConfirmPasswordReset, useRequestPasswordReset } from "@/hooks/useAuth"

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

// Manager/Console-style bordered input, matching LoginForm/RegisterForm.
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-navy outline-none transition-all placeholder:text-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<"request" | "confirm" | "done">("request")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const requestReset = useRequestPasswordReset()
  const confirmReset = useConfirmPasswordReset()

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setError(null)
    try {
      await requestReset.mutateAsync({ phone: phone.trim() })
      setStep("confirm")
    } catch (err: unknown) {
      setError(errorMessage(err, "The reset code could not be requested. Please try again."))
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6 || !newPassword) return
    setError(null)
    try {
      await confirmReset.mutateAsync({ phone: phone.trim(), code, new_password: newPassword })
      setStep("done")
    } catch (err: unknown) {
      setError(errorMessage(err, "The code is invalid or has expired. Request a new one."))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans lg:p-10">
      <div className="flex w-full max-w-[1180px] overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-[640px]">
        <AuthIllustrationPanel illustration="/illustrations/security.svg" />

        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[420px]">
            <Link
              href="/login"
              className="group mb-8 flex items-center gap-2 text-slate-400 transition-colors hover:text-navy"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-bold uppercase tracking-widest">Back to Login</span>
            </Link>

            {step === "request" && (
              <>
                <div className="mb-10 text-center lg:text-left">
                  {/* The logo lives on the illustration panel at lg+; keep it
                      here for small screens where that panel is hidden. */}
                  <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-navy lg:hidden"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm text-white">O</span>
                    OrbiSave
                  </Link>
                  <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy">Reset your password</h1>
                  <p className="text-sm font-medium leading-relaxed text-slate-500">
                    Enter the phone number on your account and we&apos;ll text you a 6-digit reset code.
                  </p>
                </div>

                <form onSubmit={handleRequest} className="space-y-6" noValidate>
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="ml-1 block text-sm font-semibold text-slate-700" htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+254 7XX XXX XXX"
                      autoComplete="tel"
                      className={inputClass}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-3 rounded bg-primary py-4 font-bold text-white transition-all hover:bg-[#009200] active:scale-[0.98] disabled:bg-primary/50"
                    disabled={requestReset.isPending || phone.trim().length < 9}
                  >
                    {requestReset.isPending ? "Sending code…" : "Send reset code"}
                  </button>
                </form>
              </>
            )}

            {step === "confirm" && (
              <>
                <div className="mb-10 text-center lg:text-left">
                  <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy">Enter your reset code</h1>
                  <p className="text-sm font-medium leading-relaxed text-slate-500">
                    If an account exists for <strong className="text-navy">{phone}</strong>, an SMS with a
                    6-digit code is on its way. Enter it with your new password.
                  </p>
                </div>

                <form onSubmit={handleConfirm} className="space-y-6" noValidate>
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="ml-1 block text-sm font-semibold text-slate-700" htmlFor="code">6-digit code</label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      className={`${inputClass} text-center text-lg tracking-[0.4em]`}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 block text-sm font-semibold text-slate-700" htmlFor="new-password">New password</label>
                    <input
                      id="new-password"
                      type="password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className={inputClass}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-3 rounded bg-primary py-4 font-bold text-white transition-all hover:bg-[#009200] active:scale-[0.98] disabled:bg-primary/50"
                    disabled={confirmReset.isPending || code.length !== 6 || newPassword.length < 8}
                  >
                    <KeyRound className="h-4 w-4" />
                    {confirmReset.isPending ? "Updating password…" : "Set new password"}
                  </button>

                  <p className="text-center text-xs font-medium text-slate-500">
                    Didn&apos;t get it?{" "}
                    <button
                      type="button"
                      onClick={() => { setStep("request"); setCode(""); setError(null) }}
                      className="font-bold text-primary hover:underline"
                    >
                      Request a new code
                    </button>
                  </p>
                </form>
              </>
            )}

            {step === "done" && (
              <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-3 text-2xl font-bold text-navy">Password updated</h2>
                <p className="mb-8 text-sm font-medium leading-relaxed text-slate-500">
                  Your password has been changed. Sign in with your new password to continue.
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full rounded bg-primary py-4 font-bold text-white transition-all hover:bg-[#009200] active:scale-[0.98]"
                >
                  Back to sign in
                </button>
              </div>
            )}

            <AuthFooter />
          </div>
        </div>
      </div>
    </div>
  )
}
