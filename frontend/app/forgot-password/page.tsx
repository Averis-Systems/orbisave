"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthImage } from "@/components/auth/AuthImage"
import { AlertTriangle, KeyRound, ShieldCheck } from "lucide-react"
import { useConfirmPasswordReset, useRequestPasswordReset } from "@/hooks/useAuth"

function errorMessage(err: unknown, fallback: string) {
  if (typeof err !== "object" || !err || !("response" in err)) return fallback
  const response = (err as { response?: { data?: { error?: string; message?: string } } }).response
  return response?.data?.error || response?.data?.message || fallback
}

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
    <div className="flex flex-col min-h-screen bg-[#f9faf6]">
      {/* Global Topbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-6 w-full bg-[#f9faf6] absolute top-0 z-50 gap-4 sm:gap-0">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#0a2540] tracking-tight self-start sm:self-center">
          <div className="w-8 h-8 rounded-lg bg-[#00ab00] flex items-center justify-center text-white text-sm tracking-normal flex-shrink-0">O</div>
          OrbiSave
        </Link>
        <div className="text-sm font-medium text-[#4a5c6a] self-end sm:self-center">
          Remembered your password? <Link href="/login" className="text-[#00ab00] font-bold ml-1 hover:text-[#008a00] transition-colors whitespace-nowrap">Sign In</Link>
        </div>
      </div>

      <div className="flex flex-1 pt-[140px] sm:pt-[88px]">
        {/* Left Image Panel */}
        <div className="hidden lg:block relative w-[48%] bg-[#f3f4f1]">
          <AuthImage />
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
          <div className="w-full max-w-md mt-16 pb-12">
            {step === "request" && (
              <>
                <h1 className="text-3xl font-bold text-[#0a2540] mb-3 tracking-tight">Reset your password</h1>
                <p className="text-[#4a5c6a] mb-10 text-[0.95rem] font-medium">
                  Enter the phone number on your account and we&apos;ll text you a 6-digit reset code.
                </p>

                <form onSubmit={handleRequest} className="space-y-6" noValidate>
                  {error && (
                    <div className="p-4 rounded bg-[#ffdad6] text-[#93000a] text-sm font-medium flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight" htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+254 7XX XXX XXX"
                      autoComplete="tel"
                      className="w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-[#00ab00] hover:bg-[#008a00] text-white text-sm font-bold rounded flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={requestReset.isPending || phone.trim().length < 9}
                  >
                    {requestReset.isPending ? "Sending code…" : "Send reset code"}
                  </button>
                </form>
              </>
            )}

            {step === "confirm" && (
              <>
                <h1 className="text-3xl font-bold text-[#0a2540] mb-3 tracking-tight">Enter your reset code</h1>
                <p className="text-[#4a5c6a] mb-10 text-[0.95rem] font-medium">
                  If an account exists for <strong className="text-[#0a2540]">{phone}</strong>, an SMS with a
                  6-digit code is on its way. Enter it with your new password.
                </p>

                <form onSubmit={handleConfirm} className="space-y-6" noValidate>
                  {error && (
                    <div className="p-4 rounded bg-[#ffdad6] text-[#93000a] text-sm font-medium flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight" htmlFor="code">6-digit code</label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      className="w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-center text-lg tracking-[0.4em] text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight" htmlFor="new-password">New password</label>
                    <input
                      id="new-password"
                      type="password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-[#00ab00] hover:bg-[#008a00] text-white text-sm font-bold rounded flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={confirmReset.isPending || code.length !== 6 || newPassword.length < 8}
                  >
                    <KeyRound className="w-4 h-4" />
                    {confirmReset.isPending ? "Updating password…" : "Set new password"}
                  </button>

                  <p className="text-xs text-[#4a5c6a] font-medium text-center">
                    Didn&apos;t get it?{" "}
                    <button type="button" onClick={() => { setStep("request"); setCode(""); setError(null) }} className="text-[#00ab00] font-bold hover:underline">
                      Request a new code
                    </button>
                  </p>
                </form>
              </>
            )}

            {step === "done" && (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-[#e9f3ed] rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-[#00ab00]" />
                </div>
                <h2 className="text-2xl font-bold text-[#0a2540] mb-3">Password updated</h2>
                <p className="text-[#4a5c6a] mb-8 text-[0.95rem] font-medium">
                  Your password has been changed. Sign in with your new password to continue.
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full h-11 bg-[#00ab00] hover:bg-[#008a00] text-white text-sm font-bold rounded transition-all"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>

          {/* Simple Global Footer */}
          <div className="w-full max-w-md mt-auto pt-12">
             <div className="flex flex-col items-center gap-4 border-t border-black/5 pt-8">
                <div className="flex justify-between w-full text-[11px] text-[#a0a5a1] font-bold tracking-tight">
                  <span>© {new Date().getFullYear()} OrbiSave</span>
                  <div className="flex gap-4">
                    <Link href="/privacy" className="hover:text-[#0a2540] transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-[#0a2540] transition-colors">Terms of Service</Link>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
