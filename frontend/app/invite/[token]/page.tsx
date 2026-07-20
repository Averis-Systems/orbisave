"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react"

import { AuthSlider } from "@/components/auth/AuthSlider"
import { useAcceptInvite, useInvitePreview, describeInviteError } from "@/hooks/useInvites"
import { useAuthStore } from "@/store/auth"

/**
 * Invite landing page.
 *
 * docs/integration_advisory.md has always documented the share URL as
 * /invite/{token}, but the route never existed, so any link circulated in that
 * shape 404'd. The chairperson invite card generates /register?invite=TOKEN
 * instead. This page serves the documented shape and routes each visitor to
 * the right place:
 *   signed out  -> /register?invite=TOKEN (register, then auto-join)
 *   signed in   -> accept here, in one click
 */
export default function InviteLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [isMounted, setIsMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [joined, setJoined] = useState(false)

  const { data: preview, isLoading, isError } = useInvitePreview(token)
  const acceptInvite = useAcceptInvite()

  // Auth state is persisted client-side, so wait for hydration before deciding
  // which path this visitor gets. Otherwise a signed-in member briefly sees the
  // signed-out call to action.
  useEffect(() => setIsMounted(true), [])

  const handleAccept = async () => {
    setError(null)
    setNeedsProfile(false)
    try {
      await acceptInvite.mutateAsync(token)
      setJoined(true)
    } catch (err) {
      const described = describeInviteError(err)
      setError(described.message)
      setNeedsProfile(described.needsProfile)
    }
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
        </div>

        <div className="auth-layout__panel-inner">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Checking your invitation
            </p>
          )}

          {isError && !isLoading && (
            <div>
              <h1 className="auth-heading__title">This invitation is not valid</h1>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                It may have expired, already been used, or been typed incorrectly. Invites are valid for 7 days.
                Ask your chairperson to send you a new one.
              </p>
              <Link
                href="/login"
                className="mt-7 inline-flex h-12 items-center justify-center rounded-lg bg-[#00ab00] px-6 text-sm font-semibold text-white transition hover:bg-[#009200]"
              >
                Go to sign in
              </Link>
            </div>
          )}

          {preview && !joined && (
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#00ab00]">
                <UserPlus size={28} />
              </div>

              <h1 className="auth-heading__title">You have been invited to {preview.group_name}</h1>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Chaired by {preview.chairperson_name}
                {preview.member_count != null && preview.max_members != null && (
                  <>. {preview.member_count} of {preview.max_members} seats taken</>
                )}
                .
              </p>

              {error && (
                <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-4">
                  <p className="flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error}
                  </p>
                  {needsProfile && (
                    <button
                      onClick={() => router.push("/dashboard/profile")}
                      className="mt-3 text-sm font-semibold text-[#00ab00] transition hover:underline"
                    >
                      Go to my profile
                    </button>
                  )}
                </div>
              )}

              {isMounted && (
                <div className="mt-7">
                  {isAuthenticated ? (
                    <button
                      onClick={handleAccept}
                      disabled={acceptInvite.isPending}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition hover:bg-[#009200] disabled:opacity-50"
                    >
                      {acceptInvite.isPending && <Loader2 size={16} className="animate-spin" />}
                      Accept and join this group
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/register?invite=${encodeURIComponent(token)}`}
                        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition hover:bg-[#009200]"
                      >
                        Create your account to join
                      </Link>
                      <p className="mt-4 text-center text-sm text-gray-500">
                        Already have an account?{" "}
                        <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="font-semibold text-[#00ab00] hover:underline">
                          Log in
                        </Link>
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {joined && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#00ab00]">
                <CheckCircle2 size={28} />
              </div>
              <h1 className="auth-heading__title">You have joined {preview?.group_name}</h1>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Your membership is pending activation by the chairperson. You can follow contributions and payouts
                from your dashboard in the meantime.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition hover:bg-[#009200]"
              >
                Go to my dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
