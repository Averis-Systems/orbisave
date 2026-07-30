"use client"

import Link from "next/link"
import { ShieldCheck, Lock, ArrowUpRight } from "lucide-react"
import { usePlatformBranding } from "@/lib/useBranding"

/**
 * Public footer — an app footer, not a website footer. It repeats on every
 * marketing and legal page, so it stays lean: brand + one tagline, where
 * OrbiSave operates, a compact link row, and a slim legal + trust bar.
 *
 * OrbiSave is the product; Averis Systems is the company behind it, credited
 * once as a link to its own site — not the subject of the footer.
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

const MARKETS = ["Kenya", "Rwanda", "Ghana"]

export function Footer() {
  const { footerLogoUrl } = usePlatformBranding()

  return (
    <footer style={{ background: "#0a2540" }}>
      {/* Lively brand accent */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, #00ab00 35%, #7ee787 50%, #00ab00 65%, transparent)" }} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand + links */}
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
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

            <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Digitizing Africa&rsquo;s oldest savings tradition — secure group savings and lending, right from your phone.
            </p>

            {/* Where OrbiSave operates */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {MARKETS.map((m) => (
                <span key={m} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00ab00" }} />
                  {m}
                </span>
              ))}
            </div>
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
            <span className="text-xs font-semibold text-white/80">© {new Date().getFullYear()} OrbiSave</span>
            {LEGAL.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-medium transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://averissystems.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-0.5 text-xs font-medium transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              A product of Averis Systems
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#00ab00" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                Bank-backed custody
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" style={{ color: "#00ab00" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                Encrypted
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
