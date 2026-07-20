"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { useAcceptInvite, useInvitePreview, describeInviteError, extractInviteToken } from "@/hooks/useInvites"

/**
 * Lets an already-registered member join a group with an invite code.
 *
 * Previously this only worked during first-time signup, so an existing member
 * who was invited had to re-run the whole registration form. Accepts a bare
 * token or a pasted link, and previews the group before the member commits.
 */
export function JoinGroupDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)

  const acceptInvite = useAcceptInvite()

  const token = useMemo(() => extractInviteToken(input), [input])
  // Only look up once the token is long enough to be real, so we are not
  // firing a request on every keystroke while someone pastes.
  const { data: preview, isLoading: previewLoading } = useInvitePreview(token.length >= 8 ? token : null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setNeedsProfile(false)

    if (!token) {
      setError("Enter the invite code or paste the invite link you were sent.")
      return
    }

    try {
      await acceptInvite.mutateAsync(token)
      toast.success("You have joined the group. Your membership is pending activation.")
      onClose()
    } catch (err) {
      const described = describeInviteError(err)
      setError(described.message)
      setNeedsProfile(described.needsProfile)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#00ab00]">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Join a group</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Use the invite your chairperson sent you.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Invite code or link</span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoFocus
              placeholder="Paste the invite link, or enter the code"
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-800 outline-none transition focus:border-[#00ab00] focus:bg-white focus:ring-2 focus:ring-[#00ab00]/15 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </label>

          {previewLoading && token.length >= 8 && (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              Checking that invite
            </p>
          )}

          {preview && (
            <div className="rounded-lg border border-[#bfe8c4] bg-[#f7fbf8] p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{preview.group_name}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Chaired by {preview.chairperson_name}
                {preview.member_count != null && preview.max_members != null && (
                  <>. {preview.member_count} of {preview.max_members} seats taken</>
                )}
                .
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
              <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </p>
              {needsProfile && (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/profile")}
                  className="mt-3 text-sm font-semibold text-[#00ab00] transition hover:underline"
                >
                  Go to my profile
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg px-5 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={acceptInvite.isPending || !token}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200] disabled:opacity-50"
          >
            {acceptInvite.isPending && <Loader2 size={14} className="animate-spin" />}
            Join group
          </button>
        </div>
      </form>
    </div>
  )
}
