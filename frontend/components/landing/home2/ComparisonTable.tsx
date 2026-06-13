"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import { ArrowRight, AlertCircle, ShieldCheck, Zap, TrendingUp, BookOpen } from "lucide-react"
import Link from "next/link"

const LEDGER_ENTRIES = [
  "Grace Akinyi · KES 5,000 · ✓ Confirmed",
  "David Omondi · KES 5,000 · ✓ Confirmed",
  "Njeri Wanjiku · KES 5,000 · ✓ Confirmed",
  "James Mwangi · KES 5,000 · ✓ Confirmed",
  "Faith Otieno  · KES 5,000 · ✓ Confirmed",
  "Kofi Asante  · KES 5,000 · ✓ Confirmed",
]

export function ComparisonTable() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ledgerIdx, setLedgerIdx] = useState(0)
  const [visible, setVisible] = useState(false)

  // Cycle through ledger entries
  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setLedgerIdx(i => (i + 1) % LEDGER_ENTRIES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [visible])

  useGSAP(() => {
    gsap.from(".comparison-card", {
      y: 60, opacity: 0, duration: 1, stagger: 0.2, ease: "power3.out",
      scrollTrigger: {
        trigger: containerRef.current, start: "top 70%",
        onEnter: () => setVisible(true),
      }
    })

    gsap.from(".comparison-heading", {
      y: 40, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: containerRef.current, start: "top 75%" }
    })
    // Ensure all ScrollTriggers are refreshed after layout
    ScrollTrigger.refresh()
  }, { scope: containerRef })

  return (
    <section ref={containerRef} className="py-24 lg:py-40 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Heading */}
        <div className="comparison-heading text-center mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold tracking-[0.25em] text-[#4a5c6a] uppercase">
            Before & After
          </div>
          <h2 className="text-4xl lg:text-[5rem] font-bold tracking-tighter text-[#0a2540] leading-none">
            Beyond the <span className="text-[#00ab00]">Notebook</span>
          </h2>
          <p className="text-lg text-[#4a5c6a] font-medium max-w-xl mx-auto">
            Traditional chamas built the foundation. OrbiSave builds the future on top of it.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-stretch">

          {/* ── THE PAPER PAST ─────────────────────────────── */}
          <div className="comparison-card relative bg-[#f9fafb] rounded-[8px] p-10 lg:p-14 overflow-hidden border border-gray-100 flex flex-col gap-8">
            {/* Sepia texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
            />

            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3 text-[#4a5c6a]/40 font-bold text-[10px] tracking-[0.4em] uppercase">
                <AlertCircle size={14} />
                The Paper Past
              </div>

              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-[#0a2540] mb-3">Vulnerable & Manual</h3>
                <p className="text-[#4a5c6a] font-medium leading-relaxed text-sm">
                  Physical ledgers are prone to errors, damage, and disputes.
                  Cash handling creates unnecessary risk. No records means no credit history.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: BookOpen, text: "Handwritten ledgers — lost or falsified" },
                  { icon: AlertCircle, text: "Treasurer holds all cash — trust erodes" },
                  { icon: AlertCircle, text: "No credit history for banks" },
                  { icon: AlertCircle, text: "Disputes dissolve groups" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-[#4a5c6a]/60">
                    <item.icon size={15} />
                    <span className="text-sm font-medium line-through decoration-[#4a5c6a]/30">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notebook image */}
            <div className="relative z-10 opacity-25 grayscale -rotate-1 mt-auto">
              <img src="/notebook-era.png" alt="Traditional Ledger"
                className="rounded-[8px] shadow-xl w-full object-cover max-h-[200px]" />
            </div>
          </div>

          {/* ── THE DIGITAL FUTURE ─────────────────────────── */}
          <div className="comparison-card relative bg-[#0a2540] rounded-[8px] p-10 lg:p-14 overflow-hidden flex flex-col gap-8 text-white">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#00ab00]/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3 text-[#00ab00] font-bold text-[10px] tracking-[0.4em] uppercase">
                <ShieldCheck size={14} />
                The Digital Future
              </div>

              <div>
                <h3 className="text-2xl lg:text-3xl font-bold mb-3">Secure & Automated</h3>
                <p className="text-white/60 font-medium leading-relaxed text-sm">
                  OrbiSave digitizes every shilling. Funds held in regulated bank trust accounts.
                  Every transaction logged in an immutable ledger that no one can alter.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, text: "Regulated bank-grade custody" },
                  { icon: Zap, text: "Automated mobile money payouts" },
                  { icon: TrendingUp, text: "Builds institutional credit score" },
                  { icon: ShieldCheck, text: "Triple-approval fraud prevention" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-[#00ab00]">
                    <item.icon size={15} />
                    <span className="text-sm font-bold text-white">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Live ledger */}
              <div className="bg-white/5 border border-white/10 rounded-[8px] p-4 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Live Ledger</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ab00] animate-pulse" />
                    <span className="text-[9px] font-black text-[#00ab00] uppercase tracking-wider">Recording</span>
                  </div>
                </div>
                <div className="font-sans text-xs text-[#00ab00] transition-all duration-500">
                  {LEDGER_ENTRIES[ledgerIdx]}
                </div>
                <div className="h-px bg-white/5" />
                <div className="text-[10px] text-white/20 font-sans">
                  Cycle 3 · KCB Trust A/C #00847291 · Immutable
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-auto">
              <Link href="/chama-onboarding">
                <button className="h-[50px] px-8 bg-[#00ab00] text-white font-bold rounded-[8px] inline-flex items-center gap-2 hover:bg-[#009900] transition-colors">
                  Make the Switch <ArrowRight size={18} />
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
