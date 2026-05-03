"use client"

import { useState } from "react"
import Link from "next/link"
import { AuthImage } from "@/components/auth/AuthImage"
import { AlertTriangle, Mail, Shield } from "lucide-react"

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
            {!submitted ? (
              <>
                <h1 className="text-3xl font-bold text-[#0a2540] mb-3 tracking-tight">Reset your password</h1>
                <p className="text-[#4a5c6a] mb-10 text-[0.95rem] font-medium">Enter your email address and we'll send you a link to reset your password.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  {error && (
                    <div className="p-4 rounded bg-[#ffdad6] text-[#93000a] text-sm font-medium flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#4a5c6a] tracking-tight" htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full h-11 px-4 bg-[#f3f4f1] border-none rounded text-sm text-[#0a2540] placeholder-[#a0a5a1] focus:bg-[#e9eae7] focus:ring-1 focus:ring-[#00ab00] focus:outline-none transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-[#00ab00] hover:bg-[#008a00] text-white text-sm font-bold rounded flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={loading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                  >
                    {loading ? "Sending link…" : "Send reset link"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-[#e9f3ed] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-[#00ab00]" />
                </div>
                <h2 className="text-2xl font-bold text-[#0a2540] mb-3">Check your inbox</h2>
                <p className="text-[#4a5c6a] mb-8 text-[0.95rem] font-medium">
                  We sent a reset link to <strong className="text-[#0a2540]">{email}</strong>. The link expires in 30 minutes.
                </p>
                <Link href="/login">
                  <button className="w-full h-11 bg-[#00ab00] hover:bg-[#008a00] text-white text-sm font-bold rounded transition-all">Back to sign in</button>
                </Link>
                <p className="mt-8 text-xs text-[#4a5c6a] font-medium">
                  Didn't receive it? <button onClick={() => setSubmitted(false)} className="text-[#00ab00] font-bold hover:underline">Resend</button>
                </p>
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
