"use client"

/**
 * Landing hero.
 *
 * The first five seconds. It must say, to a chama member, a teacher, a student
 * group or an investor alike: this is real financial software, and my group's
 * money is safe here. So we lead with a product moment, a live-looking OrbiSave
 * group ledger in a browser frame, wrapped in a refined orbital that nods to
 * rotating savings, over a calm navy/green field. Motion is meaningful and
 * respects reduced-motion.
 */

import { useRef } from "react"
import Link from "next/link"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-init"
import { ArrowRight, ShieldCheck, Landmark, Layers, Check } from "lucide-react"

const LEDGER = [
  { initials: "GA", name: "Grace Akinyi", amount: "5,000" },
  { initials: "DO", name: "David Omondi", amount: "5,000" },
  { initials: "NW", name: "Njeri Wanjiku", amount: "5,000" },
  { initials: "JM", name: "James Mwangi", amount: "5,000" },
]

/** Marker-pen highlight: a soft green sweep behind the lower half of the text. */
const MARK: React.CSSProperties = {
  color: "#0a2540",
  backgroundImage: "linear-gradient(180deg, transparent 58%, rgba(0,171,0,0.22) 58%)",
  padding: "0 0.12em",
  borderRadius: "2px",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
}

export function HeroLanding() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      gsap.set(".hero-reveal", { visibility: "visible" })
      if (reduce) return

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
      tl.from(".hero-line", { y: 34, opacity: 0, duration: 0.75, stagger: 0.1 })
        .from(".hero-sub", { y: 18, opacity: 0, duration: 0.6 }, "-=0.35")
        .from(".hero-cta", { y: 14, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.3")
        .from(".hero-trust", { opacity: 0, y: 10, duration: 0.5, stagger: 0.08 }, "-=0.25")
        .from(".hero-frame", { y: 40, opacity: 0, scale: 0.97, duration: 0.9 }, "-=0.8")
        .from(".hero-chip", { scale: 0.6, opacity: 0, duration: 0.5, stagger: 0.15, ease: "back.out(1.7)" }, "-=0.4")
        .from(".ledger-row", { x: 16, opacity: 0, duration: 0.45, stagger: 0.1 }, "-=0.5")

      // Gentle continuous life
      gsap.to(".hero-frame", { y: "-=10", duration: 3.2, yoyo: true, repeat: -1, ease: "sine.inOut" })
      gsap.to(".orbit-ring", { rotate: 360, duration: 44, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".orbit-ring-rev", { rotate: -360, duration: 60, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".hero-chip", { y: "-=6", duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.4 })
    },
    { scope },
  )

  return (
    <section
      ref={scope}
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg,#f7f9f8 0%,#eef4f1 100%)" }}
    >
      {/* Ambient brand glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 82% 20%, rgba(0,171,0,0.10), transparent 60%),radial-gradient(50% 50% at 12% 12%, rgba(10,37,64,0.08), transparent 60%)",
        }}
      />
      {/* Faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,37,64,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(10,37,64,0.04) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(75% 70% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-28 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-8 lg:pb-32 lg:pt-32">
        {/* ── Copy ─────────────────────────────────────────────────────── */}
        <div className="hero-reveal invisible flex flex-col gap-6">
          <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[4rem]" style={{ color: "#0a2540" }}>
            <span className="hero-line block">Digitizing Africa&apos;s</span>
            <span className="hero-line block">
              oldest <span style={{ color: "#00ab00" }}>savings tradition</span>
            </span>
          </h1>

          <p className="hero-sub max-w-[560px] text-base leading-relaxed sm:text-lg" style={{ color: "#46586a" }}>
            For generations, communities have saved together in chamas, welfare groups and table-banking circles.
            OrbiSave brings that tradition into one secure app. Your group&apos;s money is channelled straight to a{" "}
            <span className="font-semibold" style={MARK}>licensed partner bank</span>, every contribution is{" "}
            <span className="font-semibold" style={MARK}>recorded on a shared ledger</span>, and payouts and loans run
            on their own. No more notebook, no more cash box.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/onboarding" className="hero-cta">
              <button
                className="group inline-flex h-[52px] items-center gap-2 rounded-lg px-7 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                style={{ background: "#00ab00" }}
              >
                Start a group
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/invite" className="hero-cta">
              <button
                className="inline-flex h-[52px] items-center gap-2 rounded-lg border px-6 text-sm font-semibold transition-colors hover:bg-white"
                style={{ color: "#0a2540", borderColor: "#cfe3d8", background: "rgba(255,255,255,0.6)" }}
              >
                Join with invite code
              </button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
            {[
              { icon: Landmark, label: "Partner-bank held" },
              { icon: Layers, label: "Shared ledger" },
              { icon: ShieldCheck, label: "Encrypted" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="hero-trust flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#46586a" }}>
                <Icon className="h-4 w-4 shrink-0" style={{ color: "#00ab00" }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Product frame + orbital ──────────────────────────────────── */}
        <div className="hero-reveal invisible relative mx-auto w-full max-w-[560px]">
          {/* Orbital rings behind the frame */}
          <svg className="pointer-events-none absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)]" viewBox="0 0 600 600" fill="none" aria-hidden="true">
            <g className="orbit-ring">
              <circle cx="300" cy="300" r="250" stroke="rgba(10,37,64,0.10)" strokeWidth="1.5" strokeDasharray="3 10" />
              <circle cx="300" cy="50" r="5" fill="#00ab00" />
              <circle cx="550" cy="300" r="4" fill="rgba(10,37,64,0.35)" />
            </g>
            <g className="orbit-ring-rev">
              <circle cx="300" cy="300" r="196" stroke="rgba(0,171,0,0.16)" strokeWidth="1.5" strokeDasharray="2 12" />
              <circle cx="104" cy="300" r="4" fill="#00ab00" />
            </g>
          </svg>

          {/* Browser-chrome product frame */}
          <div
            className="hero-frame relative rounded-2xl border bg-white"
            style={{ borderColor: "#e2ebe6", boxShadow: "0 30px 60px -20px rgba(10,37,64,0.35),0 8px 20px -8px rgba(10,37,64,0.12)" }}
          >
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "#eef2f0" }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
              <span className="ml-3 rounded-md px-2 py-1 text-[10px] font-medium" style={{ background: "#f2f6f4", color: "#7c8b98" }}>
                app.orbisave.com
              </span>
            </div>

            <div className="p-5">
              {/* Group header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9aa8b2" }}>
                    Group wallet
                  </p>
                  <p className="text-lg font-bold" style={{ color: "#0a2540" }}>
                    Jerena Self Help Group
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "#ecfdf3", color: "#039855" }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00ab00" }} /> Cycle 3 · Live
                </span>
              </div>

              {/* Balance + pool */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3.5" style={{ background: "#0a2540" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Pooled balance
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-white tabular-nums">KES 540,000</p>
                  <p className="text-[11px]" style={{ color: "rgba(0,171,0,0.9)" }}>36 members · on track</p>
                </div>
                <div className="rounded-xl border p-3.5" style={{ borderColor: "#e7efe9" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9aa8b2" }}>
                    Next payout
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums" style={{ color: "#0a2540" }}>KES 90,000</p>
                  <p className="text-[11px]" style={{ color: "#8a97a2" }}>to Amara K.</p>
                </div>
              </div>

              {/* Live ledger */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9aa8b2" }}>
                    This week&apos;s contributions
                  </p>
                  <p className="text-[11px] font-medium" style={{ color: "#039855" }}>Auto-recorded</p>
                </div>
                <div className="space-y-1.5">
                  {LEDGER.map((r) => (
                    <div key={r.initials} className="ledger-row flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: "#eef2f0" }}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "#eef4f1", color: "#0a2540" }}>
                        {r.initials}
                      </span>
                      <span className="flex-1 truncate text-xs font-medium" style={{ color: "#0a2540" }}>{r.name}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: "#46586a" }}>KES {r.amount}</span>
                      <Check className="h-3.5 w-3.5" style={{ color: "#00ab00" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <div className="hero-chip absolute -left-6 top-24 hidden rounded-xl border bg-white px-3 py-2 shadow-lg sm:block" style={{ borderColor: "#e7efe9" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9aa8b2" }}>Payout sent</p>
            <p className="text-sm font-bold" style={{ color: "#00ab00" }}>+KES 90,000</p>
          </div>
          <div className="hero-chip absolute -right-4 bottom-16 hidden rounded-xl border bg-white px-3 py-2 shadow-lg sm:block" style={{ borderColor: "#e7efe9" }}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" style={{ color: "#00ab00" }} />
              <p className="text-xs font-semibold" style={{ color: "#0a2540" }}>Held in bank trust</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shape divider into the next section */}
      <div className="relative">
        <svg className="block w-full" style={{ height: "72px" }} viewBox="0 0 1440 72" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C360,0 1080,80 1440,32 L1440,72 L0,72 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  )
}
