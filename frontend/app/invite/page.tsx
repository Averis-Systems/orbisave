"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Hash } from "lucide-react"

import { AuthSlider } from "@/components/auth/AuthSlider"
import { extractInviteToken } from "@/hooks/useInvites"

/**
 * Public "enter your invite code" screen.
 *
 * The landing pages advertise a "Join with Invite Code" button, but it used to
 * route to /onboarding, a role chooser that never collects a code. This is the
 * screen that button always implied. It resolves whatever the visitor pastes
 * to a token and hands off to /invite/[token], which handles both signed-in
 * and signed-out visitors.
 */
export default function InviteEntryPage() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const token = extractInviteToken(input)
    if (!token) {
      setError("Enter the invite code or paste the invite link you were sent.")
      return
    }
    router.push(`/invite/${encodeURIComponent(token)}`)
  }

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
          <Link href="/login" className="auth-topbar__link">
            Back to<span>Sign in</span>
          </Link>
        </div>

        <div className="auth-layout__panel-inner">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#00ab00]">
            <Hash size={28} />
          </div>

          <h1 className="auth-heading__title">Join your savings group</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Enter the invite code from your chairperson, or paste the whole link they sent you.
          </p>

          <form onSubmit={handleSubmit} className="mt-7">
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Invite code or link</span>
              <input
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  if (error) setError(null)
                }}
                autoFocus
                placeholder="Paste the invite link, or enter the code"
                className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 text-sm text-navy outline-none transition placeholder:text-slate-300 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </label>

            {error && <p className="ml-1 mt-2 text-xs font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition hover:bg-[#009200]"
            >
              Continue
            </button>
          </form>

          <p className="mt-8 border-t border-slate-100 pt-8 text-center text-sm font-medium text-slate-500">
            Do not have an invite?{" "}
            <Link href="/onboarding" className="font-bold text-primary transition-all hover:text-primary/80">
              Start your own group
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
