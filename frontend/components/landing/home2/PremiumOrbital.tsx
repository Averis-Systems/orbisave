"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import { ShieldCheck, Zap, BarChart3, Building2 } from "lucide-react"

const STATS = [
  { value: "Trust", label: "Bank-backed custody" },
  { value: "Ledger", label: "Group wallet records" },
  { value: "3", label: "Launch jurisdictions" },
  { value: "Mobile", label: "Money automation" },
]

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Regulated Safety",
    desc: "Funds held in licensed bank vaults. Not by OrbiSave. Member money is ring-fenced and protected under banking law.",
    badge: "KCB · Equity · MTN"
  },
  {
    icon: Zap,
    title: "Instant STK Payouts",
    desc: "When a cycle completes, the payout hits the member's mobile money account automatically — no treasurer needed.",
    badge: "M-Pesa · Airtel · MTN MoMo"
  },
  {
    icon: BarChart3,
    title: "Credit Visibility",
    desc: "Consistent savings over 12+ months creates a verifiable financial record. Your group's discipline becomes institutional trust.",
    badge: "Bank Credit Pathway"
  },
]

const PARTNERS = ["M-Pesa", "MTN MoMo", "KCB Bank", "Equity", "Airtel", "Bank Transfer"]

export function PremiumOrbital() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Stats counter
    const statEls = document.querySelectorAll(".stat-number")
    gsap.from(statEls, {
      opacity: 0, y: 20, duration: 0.7, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: containerRef.current, start: "top 70%" }
    })

    // Section heading
    gsap.from(".orbital-h2-heading", {
      y: 40, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: containerRef.current, start: "top 75%" }
    })

    // Pillar cards stagger
    gsap.from(".pillar-card", {
      y: 50, opacity: 0, duration: 0.7, stagger: 0.15, ease: "power2.out",
      scrollTrigger: { trigger: ".pillars-grid", start: "top 80%" }
    })
    // Ensure all ScrollTriggers are refreshed after layout
    ScrollTrigger.refresh()
  }, { scope: containerRef })

  return (
    <section ref={containerRef} className="bg-white overflow-hidden">

      {/* ── Stats strip ──────────────────────────────────────── */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="stat-number text-3xl lg:text-4xl font-black text-[#0a2540] tracking-tight">{s.value}</div>
                <div className="text-xs font-bold text-[#4a5c6a]/60 uppercase tracking-[0.2em] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="py-24 lg:py-40">
        <div className="max-w-7xl mx-auto px-6">

          {/* Heading */}
          <div className="orbital-h2-heading max-w-3xl mb-20 space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#e9f3ed] border border-[#00ab00]/20 rounded-full text-[10px] font-bold tracking-[0.25em] text-[#00ab00] uppercase">
              The Trust Engine
            </div>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter leading-tight text-[#0a2540]">
              Automation built on<br />
              <span className="text-[#00ab00]">regulated infrastructure</span>
            </h2>
            <p className="text-lg text-[#4a5c6a] font-medium leading-relaxed max-w-2xl">
              OrbiSave is the software layer. Licensed banks hold the custody layer.
              This separation means your funds are protected by banking law, not just a promise.
            </p>
          </div>

          {/* Pillar cards */}
          <div className="pillars-grid grid lg:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <div
                key={p.title}
                className="pillar-card group border border-gray-100 rounded-[8px] p-8 hover:border-[#00ab00]/30 hover:shadow-xl hover:shadow-[#00ab00]/5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-[8px] bg-[#e9f3ed] flex items-center justify-center text-[#00ab00] mb-6 group-hover:bg-[#0a2540] group-hover:text-white transition-all duration-300">
                  <p.icon size={26} />
                </div>
                <h3 className="text-xl font-bold text-[#0a2540] mb-3">{p.title}</h3>
                <p className="text-sm text-[#4a5c6a] font-medium leading-relaxed mb-5">{p.desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f8fafc] border border-gray-100 rounded-[4px]">
                  <Building2 size={12} className="text-[#00ab00]" />
                  <span className="text-[9px] font-black text-[#4a5c6a] uppercase tracking-widest">{p.badge}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Partner logos strip */}
          <div className="mt-16 pt-10 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-black text-[#4a5c6a]/40 uppercase tracking-[0.3em] mr-4">
                Payment Rails
              </span>
              {PARTNERS.map((p) => (
                <div key={p}
                  className="h-9 px-5 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-[6px] text-[11px] font-bold text-[#4a5c6a] hover:border-[#00ab00]/30 hover:text-[#0a2540] transition-colors"
                >
                  {p}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
