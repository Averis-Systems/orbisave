"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-init"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { ArrowRight, Globe as GlobeIcon, ShieldCheck, Zap, TrendingUp } from "lucide-react"
import Link from "next/link"


// Extended to 8 members for the hero orbital
const HERO_MEMBERS = [
  { id: 0, initials: "AK", isPayout: true,  sx: 240, sy: 65  },
  { id: 1, initials: "KO", isPayout: false, sx: 381, sy: 128 },
  { id: 2, initials: "NW", isPayout: false, sx: 415, sy: 240 },
  { id: 3, initials: "KA", isPayout: false, sx: 381, sy: 352 },
  { id: 4, initials: "FM", isPayout: false, sx: 240, sy: 415 },
  { id: 5, initials: "DO", isPayout: false, sx:  99, sy: 352 },
  { id: 6, initials: "RK", isPayout: false, sx:  65, sy: 240 },
  { id: 7, initials: "JM", isPayout: false, sx:  99, sy: 128 },
]

// Quadratic arc path from member → vault center (240,240)
function arcToVault(sx: number, sy: number): string {
  const mx = (sx + 240) / 2 + (sy > 240 ? 30 : -30)
  const my = (sy + 240) / 2 + (sx > 240 ? -30 : 30)
  return `M${sx},${sy} Q${mx},${my} 240,240`
}

export function Home2Hero() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (typeof window === "undefined") return
    gsap.registerPlugin(MotionPathPlugin)

    // ── Text entrance ───────────────────────────────────────────────
    const tl = gsap.timeline()
    tl.from(".hero-badge", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" })
    tl.from(".hero-h1-line", { y: 48, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" }, "-=0.3")
    tl.from(".hero-sub", { y: 20, opacity: 0, duration: 0.7, ease: "power2.out" }, "-=0.4")
    tl.from(".hero-cta", { y: 16, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.3")
    tl.from(".hero-trust", { opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.2")

    // ── Orbital SVG entrance ─────────────────────────────────────────
    tl.from(".hero-orbital", { scale: 0.85, opacity: 0, duration: 1.2, ease: "power3.out" }, "-=0.8")

    // ── Dashed contribution lines scroll ────────────────────────────
    gsap.to(".contribution-line", {
      strokeDashoffset: -18, duration: 1.8, repeat: -1, ease: "none"
    })

    // ── Payout line ─────────────────────────────────────────────────
    gsap.to("#h2-payout-line", {
      strokeDashoffset: 16, duration: 1.4, repeat: -1, ease: "none"
    })

    // ── Vault glow breathe ──────────────────────────────────────────
    gsap.to("#h2-vault-glow", {
      attr: { r: 80 }, opacity: 0.3, duration: 2.8, yoyo: true, repeat: -1, ease: "sine.inOut"
    })

    // ── Payout ring pulse ───────────────────────────────────────────
    gsap.to("#h2-payout-ring", {
      attr: { r: 52 }, opacity: 0, duration: 2, repeat: -1, ease: "power2.out"
    })

    // ── Vault counter ───────────────────────────────────────────────
    const obj = { val: 0 }
    gsap.to(obj, {
      val: 1200000, duration: 2.5, delay: 1, ease: "power2.out",
      onUpdate: () => {
        const el = document.getElementById("h2-vault-amount")
        if (el) {
          const v = Math.round(obj.val)
          el.textContent = v >= 1000000
            ? `KES ${(v / 1000000).toFixed(1)}M`
            : `KES ${(v / 1000).toFixed(0)}K`
        }
      }
    })

    // ── MotionPath: contribution tokens along arcs ──────────────────
    HERO_MEMBERS.filter(m => !m.isPayout).forEach((m, i) => {
      const path = arcToVault(m.sx, m.sy)
      const tokenEl = document.getElementById(`h2-token-${m.id}`)
      if (!tokenEl) return

      const loopTl = gsap.timeline({ repeat: -1, repeatDelay: 4, delay: i * 0.6 + 1.2 })
      loopTl.set(tokenEl, { attr: { cx: m.sx, cy: m.sy }, opacity: 0 })
      loopTl.to(tokenEl, { opacity: 1, duration: 0.15 })
      loopTl.to(tokenEl, {
        motionPath: { path, align: "self", autoRotate: false, start: 0, end: 1 },
        duration: 1.6, ease: "power1.inOut"
      }, "<0.05")
      loopTl.to(tokenEl, { opacity: 0, duration: 0.2 }, "-=0.3")
    })

    // ── MotionPath: payout token vault → member 0 ───────────────────
    const payoutPath = `M240,240 Q260,150 240,65`
    const payoutToken = document.getElementById("h2-token-payout")
    if (payoutToken) {
      const payTl = gsap.timeline({ repeat: -1, repeatDelay: 4, delay: 5.5 })
      payTl.set(payoutToken, { attr: { cx: 240, cy: 240 }, opacity: 0 })
      payTl.to(payoutToken, { opacity: 1, duration: 0.2 })
      payTl.to(payoutToken, {
        motionPath: { path: payoutPath, align: "self", autoRotate: false, start: 0, end: 1 },
        duration: 2, ease: "power2.out"
      }, "<0.05")
      payTl.to(payoutToken, { opacity: 0, duration: 0.3 }, "-=0.4")
    }

  }, { scope: containerRef })

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-[#0a2540]"
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-woman.png"
          alt="Member celebrating success"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a2540] via-[#0a2540]/75 to-[#0a2540]/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2540]/40 via-transparent to-[#0a2540]/60" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Copy ─────────────────────────────────────────── */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
              <GlobeIcon className="w-3.5 h-3.5 text-[#00ab00]" />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80">
                Kenya · Rwanda · Ghana
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[2.8rem] sm:text-5xl lg:text-[4.8rem] font-bold leading-[1.02] tracking-tighter overflow-hidden">
              <span className="hero-h1-line block text-white">Your Community.</span>
              <span className="hero-h1-line block text-white">Your Savings.</span>
              <span className="hero-h1-line block text-[#00ab00]">Automated.</span>
            </h1>

            {/* Subtext */}
            <p className="hero-sub text-base lg:text-xl text-white/65 font-medium max-w-[500px] leading-relaxed">
              OrbiSave digitizes your Chama, Susu, or Ikimina. Automated STK Push collections.
              Funds held in regulated bank custody. Every shilling tracked in an immutable ledger.
            </p>

            {/* CTAs */}
            <div className="hero-cta flex flex-wrap gap-4">
              <Link href="/chama-onboarding">
                <button
                  className="h-[52px] px-8 text-sm font-bold text-white flex items-center gap-2 group transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: "#00ab00", borderRadius: "8px" }}
                >
                  Start a Group
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              {/* Goes to the code entry screen, not the role chooser: this
                  button promises a code field, so it must land on one. */}
              <Link href="/invite">
                <button
                  className="h-[52px] px-8 text-sm font-bold text-white bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-2 transition-all hover:bg-white/20 active:scale-[0.98]"
                  style={{ borderRadius: "8px" }}
                >
                  Join with Invite Code
                </button>
              </Link>
            </div>

            {/* Trust micro-signals */}
            <div className="hero-trust flex flex-wrap items-center gap-6 pt-2">
              {[
                { icon: ShieldCheck, text: "Bank-Grade Custody" },
                { icon: Zap, text: "Automated STK Push" },
                { icon: TrendingUp, text: "Credit History Built" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                  <Icon className="w-4 h-4 text-[#00ab00]" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Orbital SVG ─────────────────────────────────── */}
          <div className="hero-orbital flex items-center justify-center relative">

            {/* Live badge */}
            <div className="absolute top-0 right-0 z-10 flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#00ab00] animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">Cycle 3 · Live</span>
            </div>

            <svg viewBox="0 0 480 480" className="w-full max-w-[480px]" aria-label="OrbiSave rotation savings">

              {/* Rings */}
              <circle cx="240" cy="240" r="200" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 10" />
              <circle cx="240" cy="240" r="140" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Arc paths (faint) */}
              {HERO_MEMBERS.filter(m => !m.isPayout).map(m => (
                <path key={`arc-${m.id}`} d={arcToVault(m.sx, m.sy)}
                  stroke="rgba(0,171,0,0.08)" strokeWidth="1" fill="none" strokeDasharray="3 8" />
              ))}

              {/* Contribution dashed lines */}
              {HERO_MEMBERS.filter(m => !m.isPayout).map(m => (
                <line key={`line-${m.id}`} className="contribution-line"
                  x1={m.sx} y1={m.sy} x2="240" y2="240"
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 7" />
              ))}

              {/* Payout line */}
              <line id="h2-payout-line" x1="240" y1="240" x2="240" y2="65"
                stroke="rgba(0,171,0,0.5)" strokeWidth="2" strokeDasharray="6 6" />

              {/* Vault glow */}
              <circle id="h2-vault-glow" cx="240" cy="240" r="60"
                fill="rgba(0,171,0,0.1)" opacity="0.2" />

              {/* Vault */}
              <circle cx="240" cy="240" r="54" fill="#0a2540" stroke="rgba(0,171,0,0.3)" strokeWidth="2" />
              <text x="240" y="228" textAnchor="middle" fill="rgba(255,255,255,0.3)"
                fontSize="7" fontFamily="sans-serif" fontWeight="700" letterSpacing="2">COLLECTIVE VAULT</text>
              <text id="h2-vault-amount" x="240" y="248" textAnchor="middle" fill="#ffffff"
                fontSize="16" fontFamily="sans-serif" fontWeight="900">KES 0</text>
              <text x="240" y="262" textAnchor="middle" fill="rgba(0,171,0,0.8)"
                fontSize="7" fontFamily="sans-serif" fontWeight="700" letterSpacing="1">8 MEMBERS · ACTIVE</text>

              {/* Payout ring pulse on member 0 */}
              <circle id="h2-payout-ring" cx="240" cy="65" r="36"
                fill="none" stroke="rgba(0,171,0,0.3)" strokeWidth="1.5" />

              {/* Members */}
              {HERO_MEMBERS.map(m => (
                <g key={m.id}>
                  <circle cx={m.sx} cy={m.sy} r={m.isPayout ? 28 : 22}
                    fill={m.isPayout ? "#e9f3ed" : "rgba(255,255,255,0.05)"}
                    stroke={m.isPayout ? "#00ab00" : "rgba(255,255,255,0.15)"}
                    strokeWidth={m.isPayout ? 2 : 1.5} />
                  <text x={m.sx} y={m.sy + 5} textAnchor="middle"
                    fill={m.isPayout ? "#0a2540" : "rgba(255,255,255,0.75)"}
                    fontSize={m.isPayout ? 11 : 9} fontFamily="sans-serif" fontWeight="800">
                    {m.initials}
                  </text>
                </g>
              ))}

              {/* NEXT PAYOUT badge */}
              <rect x="194" y="26" width="92" height="18" rx="5" fill="#00ab00" />
              <text x="240" y="38.5" textAnchor="middle" fill="#fff"
                fontSize="7.5" fontFamily="sans-serif" fontWeight="800" letterSpacing="0.8">NEXT PAYOUT</text>

              {/* Animated tokens */}
              {HERO_MEMBERS.filter(m => !m.isPayout).map(m => (
                <circle key={`token-${m.id}`} id={`h2-token-${m.id}`}
                  r="5" fill="#00ab00" opacity="0"
                  style={{ filter: "drop-shadow(0 0 4px rgba(0,171,0,0.9))" }} />
              ))}
              <circle id="h2-token-payout" r="6" fill="#00ab00" opacity="0"
                style={{ filter: "drop-shadow(0 0 6px rgba(0,171,0,0.9))" }} />
            </svg>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 opacity-40">
        <span className="text-[9px] font-black text-white tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/60 to-transparent" />
      </div>
    </section>
  )
}
