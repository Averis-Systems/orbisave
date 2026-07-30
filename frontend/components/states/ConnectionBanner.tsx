"use client"

import { Loader2, WifiOff } from "lucide-react"
import { useConnectionStatus } from "@/lib/network"

/**
 * Slim full-width connection strip for the member dashboard shell. Red when
 * offline (persistent), amber when the connection is only slow. Renders
 * nothing on a healthy connection. role="status" + aria-live so screen
 * readers hear the change without losing focus.
 */
export function ConnectionBanner() {
  const { online, slow } = useConnectionStatus()

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm"
      >
        <WifiOff className="h-4 w-4 shrink-0" />
        You&apos;re offline. We&apos;ll reconnect and refresh automatically once your connection returns.
      </div>
    )
  }

  if (slow) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        Slow connection — still loading. Hang tight.
      </div>
    )
  }

  return null
}
