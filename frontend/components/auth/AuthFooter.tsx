"use client"

import Link from "next/link"

/**
 * Shared footer for the auth pages. Client component on purpose: the auth
 * pages are statically prerendered server components, so a server-side
 * `new Date().getFullYear()` freezes at BUILD time — the © year would go
 * stale every January until someone redeployed. Rendering it client-side
 * keeps it correct forever. (suppressHydrationWarning covers the one page
 * load a year where the prerendered year and the client year disagree.)
 */
export function AuthFooter() {
  return (
    <div className="mt-10 flex justify-between px-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400" suppressHydrationWarning>
        &copy; {new Date().getFullYear()} OrbiSave
      </p>
      <div className="flex gap-4">
        <Link
          href="/privacy"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-600"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-600"
        >
          Terms
        </Link>
      </div>
    </div>
  )
}
