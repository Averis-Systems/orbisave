"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import { ArrowRight, ShieldCheck, ClipboardList, Globe } from "lucide-react"
import { Navbar }                 from "@/components/landing/Navbar"
import { TrustBelt }              from "@/components/landing/TrustBelt"
import { HowItWorks }             from "@/components/landing/HowItWorks"
import { CtaSection }             from "@/components/landing/CtaSection"
import { Footer }                 from "@/components/landing/Footer"
import { gsap }                   from "@/lib/gsap-init"
import { ORBITAL_MEMBERS }        from "@/lib/landing-data"

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.set(".invisible-until-hydrated", { visibility: "visible" })

    // Hero text stagger entrance
    gsap.from(".hero-text-el", {
      y: 28, opacity: 0, duration: 0.85, stagger: 0.13, ease: "power2.out",
    })

    // Orbital SVG entrance
    gsap.from(".hero-orbital", {
      opacity: 0, scale: 0.88, duration: 1.3, ease: "power3.out", delay: 0.2,
    })

    // Contribution dashed lines — animate stroke-dashoffset
    gsap.to(".contribution-line", {
      strokeDashoffset: -18, duration: 1.8, repeat: -1, ease: "none",
    })
    gsap.to("#payout-line", {
      strokeDashoffset: 18, duration: 1.4, repeat: -1, ease: "none",
    })

    // Contribution tokens: travel to vault
    const contributors = ORBITAL_MEMBERS.filter(m => !m.isPayout)
    contributors.forEach((m, i) => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.5, delay: i * 0.55 + 0.7 })
      tl.set(`#token-m${m.id}`, { attr: { cx: m.sx, cy: m.sy }, opacity: 0 })
      tl.to(`#token-m${m.id}`, { opacity: 1, duration: 0.2 })
      tl.to(`#token-m${m.id}`, { attr: { cx: 240, cy: 240 }, duration: 1.8, ease: "power1.inOut" }, "<0.05")
      tl.to(`#token-m${m.id}`, { opacity: 0, duration: 0.25 }, "-=0.35")
    })

    // Payout token: vault → Amara
    const payoutTl = gsap.timeline({ repeat: -1, repeatDelay: 3.5, delay: 5.5 })
    payoutTl.set("#token-payout", { attr: { cx: 240, cy: 240 }, opacity: 0 })
    payoutTl.to("#token-payout", { opacity: 1, duration: 0.25 })
    payoutTl.to("#token-payout", { attr: { cx: 240, cy: 65 }, duration: 2.2, ease: "power2.out" }, "<0.05")
    payoutTl.to("#token-payout", { opacity: 0, duration: 0.4 }, "-=0.35")

    // Payout member ring pulse
    gsap.to("#payout-ring-pulse", {
      attr: { r: 46 }, opacity: 0, duration: 2, repeat: -1, ease: "power2.out",
    })

    // Vault glow breathing
    gsap.to("#vault-glow", {
      attr: { r: 72 }, opacity: 0.2, duration: 2.8, yoyo: true, repeat: -1, ease: "sine.inOut",
    })

    // Shield icon pulse
    gsap.to(".hero-shield", {
      scale: 1.15, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut",
    })
    // Globe icon slow spin
    gsap.to(".hero-globe", {
      rotate: 360, duration: 14, repeat: -1, ease: "linear",
    })

  }, { scope: heroRef })

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: "#f7f9f8" }}
      suppressHydrationWarning
    >
      {/* ── STICKY NAVBAR ──────────────────────────────────────────────── */}
      <Navbar />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[85vh] flex items-center overflow-hidden pt-16"
        style={{ background: "#f7f9f8" }}
      >
        {/* Subtle People-Icon Pattern Overlay (Emulating the reference) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 20c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm8.5 2h-1c-1.5 0-3 1-3 1s-1.5-1-3-1h-1c-2.5 0-4.5 2-4.5 4.5V35h3v-8.5l1.5 1.5V35h3V28l1.5-1.5V35h3V26.5c0-2.5-2-4.5-4.5-4.5z' fill='%230a2540' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: "120px 120px",
          }}
        />

        {/* Hero content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)]">

          {/* Left — Copy */}
          <div className="flex flex-col gap-6 invisible-until-hydrated">

            {/* Market badge */}
            <div
              className="hero-text-el inline-flex items-center gap-2 w-fit px-3.5 py-1.5"
              style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "4px" }}
            >
              <Globe className="w-3.5 h-3.5 hero-globe flex-shrink-0" style={{ color: "#00ab00" }} />
              <span
                className="text-xs font-bold tracking-[0.15em] uppercase"
                style={{ color: "#0a2540" }}
              >
                Kenya · Rwanda · Ghana
              </span>
            </div>

            <h1
              className="hero-text-el text-[2.8rem] sm:text-5xl lg:text-[4.5rem] font-bold leading-[1.05] tracking-tight"
              style={{ color: "#0a2540" }}
            >
              Take Your Group<br />
              <span style={{ color: "#00ab00" }}>Savings Online.</span>
            </h1>

            <p
              className="hero-text-el text-base lg:text-xl leading-relaxed font-medium max-w-[520px]"
              style={{ color: "#4a5c6a" }}
            >
              OrbiSave helps your group save and borrow money safely on your phone. No more notebooks or cash-in-a-box. Save when you have money from harvest, keep clear records, and build a good name for your group with banks.
            </p>

            {/* CTAs */}
            <div className="hero-text-el flex flex-wrap gap-3 pt-2">
              <Link href="/onboarding">
                <button
                className="h-[52px] px-8 text-sm font-semibold text-white flex items-center gap-2 group transition-opacity hover:opacity-90"
                  style={{ background: "#00ab00", borderRadius: "5px" }}
                >
                  Start a Group
                  <ArrowRight className="w-4 h-4 icon-arrow" />
                </button>
              </Link>
              {/* Goes to the code entry screen, not the role chooser: this
                  button promises a code field, so it must land on one. */}
              <Link href="/invite">
                <button
                  className="h-12 px-7 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-[#e9f3ed]"
                  style={{ color: "#0a2540", background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "5px" }}
                >
                  Join with Invite Code
                </button>
              </Link>
            </div>

            {/* Trust micro-signals */}
            <div className="hero-text-el flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 mt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#4a5c6a" }}>
                <ShieldCheck className="w-4 h-4 hero-shield flex-shrink-0" style={{ color: "#00ab00" }} />
                Safe Bank Storage
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#4a5c6a" }}>
                <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: "#00ab00" }} />
                Clear Records
              </div>
            </div>
          </div>

          {/* Right — Animated Orbital SVG */}
          <div className="flex items-center justify-center hero-orbital invisible-until-hydrated relative">

            {/* Live status badge */}
            <div
              className="absolute top-4 right-4 lg:top-0 lg:right-0 z-10 flex items-center gap-2 px-4 py-2"
              style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "5px" }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "#00ab00" }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#0a2540" }}>
                Cycle 3 · Live
              </span>
            </div>

            <svg
              viewBox="0 0 480 480"
              className="w-full h-full"
              style={{ maxWidth: "520px" }}
              aria-label="OrbiSave rotation savings visualization"
            >
              {/* Background rings */}
              <circle cx="240" cy="240" r="185" fill="none" stroke="rgba(10,37,64,0.06)" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="240" cy="240" r="130" fill="none" stroke="rgba(10,37,64,0.04)" strokeWidth="1" />

              {/* Contribution lines: each contributor → vault */}
              {ORBITAL_MEMBERS.filter(m => !m.isPayout).map(m => (
                <line
                  key={`line-${m.id}`}
                  className="contribution-line"
                  x1={m.sx} y1={m.sy} x2="240" y2="240"
                  stroke="rgba(10,37,64,0.12)" strokeWidth="1.5"
                  strokeDasharray="4 6"
                />
              ))}

              {/* Payout line — green */}
              <line
                id="payout-line"
                x1="240" y1="240" x2="240" y2="65"
                stroke="rgba(0,171,0,0.45)" strokeWidth="2"
                strokeDasharray="6 6"
              />

              {/* Vault ambient glow */}
              <circle id="vault-glow" cx="240" cy="240" r="60" fill="rgba(10,37,64,0.08)" opacity="0.1" />

              {/* Central vault — navy */}
              <circle cx="240" cy="240" r="52" fill="#0a2540" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
              <text x="240" y="227" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="sans-serif" fontWeight="700" letterSpacing="1.5">GROUP WALLET</text>
              <text x="240" y="249" textAnchor="middle" fill="#ffffff" fontSize="15" fontFamily="sans-serif" fontWeight="900">LIVE LEDGER</text>
              <text x="240" y="263" textAnchor="middle" fill="rgba(0,171,0,0.85)" fontSize="7.5" fontFamily="sans-serif" fontWeight="700" letterSpacing="1">6 MEMBERS · CYCLE 3</text>

              {/* Payout member ring */}
              <circle id="payout-ring-pulse" cx="240" cy="65" r="30" fill="none" stroke="rgba(0,171,0,0.25)" strokeWidth="1.5" />

              {/* PAYOUT MEMBER */}
              {(() => {
                const payout = ORBITAL_MEMBERS.find(m => m.isPayout)!
                return (
                  <g>
                    <circle cx={payout.sx} cy={payout.sy} r="27" fill="#e9f3ed" stroke="#00ab00" strokeWidth="2" />
                    <text x={payout.sx} y={payout.sy + 5} textAnchor="middle" fill="#0a2540" fontSize="12" fontFamily="sans-serif" fontWeight="800">{payout.initials}</text>
                  </g>
                )
              })()}

              {/* Payout badge */}
              <rect x="195" y="28" width="90" height="18" rx="4" fill="#00ab00" />
              <text x="240" y="40.5" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontFamily="sans-serif" fontWeight="800" letterSpacing="1">NEXT PAYOUT</text>

              {/* CONTRIBUTOR MEMBERS */}
              {ORBITAL_MEMBERS.filter(m => !m.isPayout).map(m => (
                <g key={`contrib-${m.id}`}>
                  <circle cx={m.sx} cy={m.sy} r="24" fill="#ffffff" stroke="#d6e4df" strokeWidth="1.5" />
                  <text x={m.sx} y={m.sy + 5} textAnchor="middle" fill="#0f1924" fontSize="10.5" fontFamily="sans-serif" fontWeight="700">{m.initials}</text>
                  {(m.id === 1 || m.id === 2) && (
                    <g>
                      <rect x={m.sx + 14} y={m.sy - 14} width="58" height="16" rx="4" fill="#e9f3ed" />
                      <text x={m.sx + 43} y={m.sy - 2.5} textAnchor="middle" fill="#00ab00" fontSize="7.5" fontFamily="sans-serif" fontWeight="800">+5K KES</text>
                    </g>
                  )}
                </g>
              ))}

              {/* Animated contribution tokens */}
              {ORBITAL_MEMBERS.filter(m => !m.isPayout).map(m => (
                <circle key={`token-${m.id}`} id={`token-m${m.id}`} cx={m.sx} cy={m.sy} r="4.5" fill="#00ab00" opacity="0" />
              ))}
              {/* Payout token */}
              <circle id="token-payout" cx="240" cy="240" r="5" fill="#00ab00" opacity="0" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── CONTENT SECTIONS (story order) ────────────────────────────── */}
      {/* S2: Trust Belt */}
      <TrustBelt />
      {/* S3: Narrative Hook — emotional story */}
      {/* S4: Why Choose Us — Authority Pillars & Comparison */}
      {/* S5: Who Can Join */}
      {/* S6: How It Works */}
      <HowItWorks />
      {/* S7: Rotation Visualizer */}
      {/* S8: Loan Pool */}
      {/* S9: Input Financing Teaser */}
      {/* S10: Final CTA */}
      <CtaSection />
      {/* Footer */}
      <Footer />
    </div>
  )
}
