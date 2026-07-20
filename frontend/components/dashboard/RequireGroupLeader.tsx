"use client"

/**
 * Route-level RBAC guard for group-administration pages.
 *
 * The sidebar already hides leader-only links from ordinary members, but that
 * is presentation, not enforcement: a member could still reach
 * /dashboard/settings/* by typing the URL. This guard is the actual gate.
 *
 * Roles that may administer a group: chairperson, treasurer. Plain members get
 * a clear explanation instead of a configuration screen they cannot use.
 *
 * NOTE: this is the client-side gate for UX. The backend permission classes
 * (IsGroupChairperson / IsGroupLeader) remain the security boundary: never
 * rely on this component alone to protect a write.
 */

import { ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { useAuthStore } from "@/store/auth"
import { EmptyState } from "@/components/dashboard/ui"

const LEADER_ROLES = ["chairperson", "treasurer"]

export function RequireGroupLeader({ children }: { children: ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  // Auth store not hydrated yet: render nothing rather than flashing the
  // "not available" state at a leader who is in fact allowed through.
  if (!user) return null

  if (!LEADER_ROLES.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Only group leaders can open this page"
        description="Group rules, rotation order, and lending settings are managed by your chairperson or treasurer. You can view how they affect you from your group page."
        action={
          <button
            onClick={() => router.push("/dashboard/my-group")}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#00ab00] px-5 text-sm font-semibold text-white transition hover:bg-[#009200]"
          >
            Go to my group
          </button>
        }
      />
    )
  }

  return <>{children}</>
}
