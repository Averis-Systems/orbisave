"use client"

import Link from "next/link"
import { ShieldCheck, Lock } from "lucide-react"
import { usePlatformBranding } from "@/lib/useBranding"

/**
 * Public footer — an app footer, not a website footer. It repeats on every
 * marketing and legal page, so it stays lean: brand + one tagline, a single
 * compact link row, a legal micro-line, and a slim trust signal. The old
 * five-column sitemap, pre-footer CTA bar, and "a product of" block were the
 * website-footer sprawl this replaced.
 */

const LINKS = [
  { label: "About", href: "/about" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Security", href: "/security" },
  { label: "Fees", href: "/fees" },
  { label: "Support", href: "/support" },
]

const LEGAL = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "KYC Policy", href: "/kyc-policy" },
]

export function Footer() {
  const { footerLogoUrl } = usePlatformBranding()

  return (
    <footer style={{ background: "#0a2540" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand + links */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex w-fit items-center gap-2.5">
              {footerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={footerLogoUrl} alt="OrbiSave" className="h-8 w-auto max-w-[160px] object-contain" />
              ) : (
                <>
                  <span
                    className="flex h-8 w-8 items-center justify-center text-sm font-black text-white"
                    style={{ background: "#00ab00", borderRadius: "6px" }}
                  >
                    O
                  </span>
                  <span className="text-lg font-bold tracking-tight text-white">OrbiSave</span>
                </>
              )}
            </Link>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Digitizing Africa&rsquo;s oldest savings tradition. By Averis Systems, across Kenya, Rwanda &amp; Ghana.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2.5">
            {LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
              © {new Date().getFullYear()} Averis Systems Ltd.
            </span>
            {LEGAL.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-medium transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#00ab00" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                Bank-backed custody
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" style={{ color: "#00ab00" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                Encrypted
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
