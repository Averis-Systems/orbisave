import Link from "next/link"
import { ShieldCheck, Lock, Database, ArrowRight } from "lucide-react"

const NAV = {
  Platform: [
    { label: "How It Works",         href: "/#how-it-works" },
    { label: "How Loaning Works",    href: "/how-loaning-works" },
    { label: "Input Financing",      href: "/input-financing" },
    { label: "Grant Eligibility",    href: "/grants" },
  ],
  Company: [
    { label: "About OrbiSave",       href: "/about" },
    { label: "Security & Trust",     href: "/security" },
    { label: "Contact Support",      href: "/support" },
    { label: "Averis Systems",       href: "https://averissystems.com" },
  ],
  Legal: [
    { label: "OrbiSave Fees",        href: "/fees" },
    { label: "Terms of Service",     href: "#" },
    { label: "Privacy Policy",       href: "#" },
    { label: "KYC Policy",           href: "#" },
  ],
  Resources: [
    { label: "Help Centre & FAQs",   href: "/support" },
    { label: "Compare OrbiSave",     href: "/#comparison" },
    { label: "Group Templates",      href: "#" },
  ],
}

const MARKETS = [
  { name: "Kenya",  currency: "KES", network: "M-Pesa · Airtel" },
  { name: "Rwanda", currency: "RWF", network: "MTN MoMo" },
  { name: "Ghana",  currency: "GHS", network: "MTN MoMo" },
]

const SECURITY_BADGES = [
  { icon: ShieldCheck, label: "Bank-Backed Custody" },
  { icon: Database,    label: "SHA-256 Ledger" },
  { icon: Lock,        label: "End-to-End Encrypted" },
  { icon: ShieldCheck, label: "GDPR Compliant" },
]

export function Footer() {
  return (
    <footer>
      {/* ── Pre-footer CTA bar ──────────────────────────────── */}
      <div style={{ background: "#ffffff", borderTop: "1px solid #d6e4df" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3
                className="text-2xl sm:text-3xl font-black tracking-tight mb-3"
                style={{ color: "#0a2540" }}
              >
                Ready to take your chama online?
              </h3>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {["No setup fees", "Mobile money ready", "Free to start"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-medium" style={{ color: "#4a5c6a" }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00ab00" }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-white whitespace-nowrap group transition-opacity hover:opacity-90 flex-shrink-0"
              style={{ background: "#00ab00", borderRadius: "6px" }}
            >
              Get Started
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main footer body ──────────────────────────────────── */}
      <div style={{ background: "#0a2540" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">

          {/* Top grid: brand + nav columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-10 mb-12">

            {/* Brand column */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex flex-col gap-5">
              <Link href="/" className="flex items-center gap-2.5 w-fit group">
                <div
                  className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:rotate-6"
                  style={{ background: "#00ab00", borderRadius: "6px" }}
                >
                  <span className="text-white font-black text-sm">O</span>
                </div>
                <span className="text-lg font-bold text-white tracking-tight">OrbiSave</span>
              </Link>

              <p className="text-sm leading-relaxed max-w-[200px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Digital financial infrastructure for chamas, VSLAs, and co-operatives.
              </p>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                  A product of
                </p>
                <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Averis Systems Ltd.
                </span>
              </div>

              {/* Markets */}
              <div className="flex flex-col gap-1.5 pt-1">
                {MARKETS.map(m => (
                  <div key={m.name} className="flex items-center gap-2 text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#00ab00" }}
                    />
                    <span style={{ color: "rgba(255,255,255,0.55)" }} className="font-semibold">{m.name}</span>
                    <span>{m.currency} · {m.network}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nav columns */}
            {Object.entries(NAV).map(([section, links]) => (
              <div key={section} className="flex flex-col gap-3">
                <h4
                  className="text-xs font-bold tracking-[0.12em] uppercase mb-1"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {section}
                </h4>
                {links.map(link => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm font-medium transition-colors duration-200 hover:text-white"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-xs font-medium text-center sm:text-left" style={{ color: "rgba(255,255,255,0.3)" }}>
              © {new Date().getFullYear()} Averis Systems Ltd. All rights reserved.
              <span className="mx-2 opacity-50">·</span>
              OrbiSave™ is a registered trademark.
            </div>

            {/* Security badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {SECURITY_BADGES.map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3" style={{ color: "#00ab00" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
