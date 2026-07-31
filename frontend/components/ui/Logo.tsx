"use client"

import { usePlatformBranding } from "@/lib/useBranding"

/**
 * Member-app logo. Renders the super-admin-uploaded member logo when one is
 * set (Console → Platform settings → Member app), and otherwise the built-in
 * "O OrbiSave" wordmark. Used across the member surfaces, auth screens,
 * dashboard shell, onboarding, so a single upload reflects everywhere.
 *
 *   light, white wordmark, for dark/tinted backgrounds
 *   iconOnly, just the "O" mark (collapsed sidebar, tight spots)
 */
export function Logo({
  light = false,
  iconOnly = false,
  className = "",
}: {
  light?: boolean
  iconOnly?: boolean
  className?: string
}) {
  const { logoUrl } = usePlatformBranding()

  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="OrbiSave" className={`h-8 w-auto max-w-[150px] object-contain ${className}`} />
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm font-bold text-white">O</span>
      {!iconOnly && (
        <span className={`text-xl font-bold tracking-tight ${light ? "text-white" : "text-navy dark:text-white"}`}>
          OrbiSave
        </span>
      )}
    </span>
  )
}
