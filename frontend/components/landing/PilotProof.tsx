"use client"

/**
 * Pilot & partners band.
 *
 * A navy rhythm break that gives real, honest credibility: our first group and
 * our banking-partner progress. No invented testimonials or metrics, only what
 * is true today (pilot group, member count, partner status). Update the partner
 * labels as the deals close.
 */

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import { Users, Landmark, Building2 } from "lucide-react"

export function PilotProof() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      // immediateRender:false keeps the content visible until the trigger
      // actually fires, so a mis-measured trigger (the shape dividers change
      // layout) can never leave the band blank. Content-first, motion enhances.
      gsap.from(".pilot-el", {
        y: 28,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: scope.current, start: "top 85%", once: true },
      })
      ScrollTrigger.refresh()
    },
    { scope },
  )

  return (
    <section ref={scope} className="relative overflow-hidden" style={{ background: "#0a2540" }}>
      {/* top shape divider */}
      <svg className="block w-full" style={{ height: "64px", marginTop: "-1px" }} viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,32 C420,72 1020,-8 1440,40 L1440,0 L0,0 Z" fill="#ffffff" />
      </svg>

      {/* ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(50% 60% at 80% 30%, rgba(0,171,0,0.14), transparent 60%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Pilot */}
          <div>
            <p className="pilot-el text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(0,171,0,0.9)" }}>
              Our first group
            </p>
            <h2 className="pilot-el mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Jerena Self Help Group is live on OrbiSave
            </h2>
            <p className="pilot-el mt-4 max-w-[520px] text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Thirty-six members saving together, every contribution recorded on a shared ledger and their pool held in a
              bank trust account. This is where we prove the model before we scale it.
            </p>

            <div className="pilot-el mt-8 flex flex-wrap gap-8">
              <Stat icon={Users} value="36" label="Members saving" />
              <Stat icon={Landmark} value="Cycle 3" label="Running live" />
              <Stat icon={Building2} value="Kenya" label="First market" />
            </div>
          </div>

          {/* Partners */}
          <div className="pilot-el rounded-2xl border p-6 sm:p-7" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.55)" }}>
              Banking partners
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Member money is ring-fenced in licensed bank trust accounts, never held by OrbiSave. We are bringing on
              regulated custody partners now.
            </p>

            <div className="mt-5 space-y-3">
              <PartnerRow name="Equity Bank" status="Finalizing partnership" strong />
              <PartnerRow name="Absa Bank" status="In active discussion" />
            </div>

            <p className="mt-5 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              Partner status shown honestly and updated as agreements complete.
            </p>
          </div>
        </div>
      </div>

      {/* bottom shape divider */}
      <svg className="block w-full" style={{ height: "64px", marginBottom: "-1px" }} viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,24 C420,-16 1020,64 1440,28 L1440,64 L0,64 Z" fill="#f7f9f8" />
      </svg>
    </section>
  )
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(0,171,0,0.14)", color: "#00ab00" }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xl font-extrabold text-white tabular-nums">{value}</p>
        <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
          {label}
        </p>
      </div>
    </div>
  )
}

function PartnerRow({ name, status, strong }: { name: string; status: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
      <span className="flex items-center gap-2.5 font-semibold text-white">
        <Landmark className="h-4 w-4" style={{ color: "rgba(255,255,255,0.6)" }} />
        {name}
      </span>
      <span
        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={strong ? { background: "rgba(0,171,0,0.16)", color: "#00ab00" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
      >
        {status}
      </span>
    </div>
  )
}
