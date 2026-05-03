"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { Check, Minus } from "lucide-react"
import { gsap } from "@/lib/gsap-init"

type CellValue = "yes" | "no" | "partial" | "na" | "indirect"

interface Row {
  feature: string
  mpesa: CellValue
  sacco: CellValue
  chama: CellValue
  bank: CellValue
  orbisave: CellValue
}

const ROWS: Row[] = [
  { feature: "Works on basic phones (USSD)", mpesa: "yes",      sacco: "no",      chama: "na",      bank: "no",      orbisave: "yes" },
  { feature: "Seasonal / flexible contributions", mpesa: "no",       sacco: "no",      chama: "partial", bank: "no",      orbisave: "yes" },
  { feature: "Automated contribution collection", mpesa: "no",       sacco: "no",      chama: "no",      bank: "no",      orbisave: "yes" },
  { feature: "Immutable group ledger",       mpesa: "no",       sacco: "no",      chama: "no",      bank: "yes",     orbisave: "yes" },
  { feature: "Group governance & voting",    mpesa: "no",       sacco: "partial", chama: "no",      bank: "no",      orbisave: "yes" },
  { feature: "Regulated fund custody",       mpesa: "indirect", sacco: "yes",     chama: "no",      bank: "yes",     orbisave: "yes" },
  { feature: "48-hour emergency credit",      mpesa: "no",       sacco: "no",      chama: "partial", bank: "no",      orbisave: "yes" },
  { feature: "Builds formal credit history",   mpesa: "no",       sacco: "partial", chama: "no",      bank: "yes",     orbisave: "yes" },
]

function Cell({ value, isOrbisave }: { value: CellValue; isOrbisave?: boolean }) {
  if (value === "yes") {
    return (
      <div className="flex justify-center">
        <Check 
          className="w-5 h-5" 
          style={{ color: isOrbisave ? "#00ab00" : "#4a5c6a" }} 
          strokeWidth={3} 
        />
      </div>
    )
  }
  if (value === "no") {
    return (
      <div className="flex justify-center opacity-20">
        <Minus className="w-4 h-4 text-[#4a5c6a]" />
      </div>
    )
  }
  if (value === "partial") {
    return <span className="text-[10px] font-black text-[#4a5c6a] italic tracking-tight">PARTIAL</span>
  }
  if (value === "na") {
    return <span className="text-[10px] font-black text-[#4a5c6a] italic tracking-tight">N/A</span>
  }
  if (value === "indirect") {
    return <span className="text-[10px] font-black text-[#4a5c6a] italic tracking-tight">INDIRECT</span>
  }
  return null
}

export function WhyChooseUs() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Advantage reveal
    gsap.from(".advantage-item", {
      y: 40,
      opacity: 0,
      stagger: 0.2,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".advantage-grid",
        start: "top 80%",
      }
    })

    // Table reveal
    gsap.from(".wc-table-container", {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out",
      scrollTrigger: {
        trigger: ".wc-table-container",
        start: "top 75%",
      }
    })
  }, { scope: containerRef })

  return (
    <section 
      ref={containerRef}
      className="py-24 lg:py-40"
      style={{ background: "#f8fbf9" }}
      id="why-choose-orbisave"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* The Transition: From Problems to Solution */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-24 items-start mb-32">
          <div className="lg:col-span-5">
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-[0.9] mb-8" style={{ color: "#0a2540" }}>
              The Digital<br />
              <span style={{ color: "#00ab00" }}>Advantage.</span>
            </h2>
            <p className="text-lg sm:text-xl font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
              OrbiSave doesn't change how your group saves—it changes what your 
              group is capable of. We turn your community trust into an 
              impenetrable financial machine.
            </p>
          </div>

          <div className="lg:col-span-7 advantage-grid grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-16">
            
            <div className="advantage-item">
              <div className="text-4xl font-black mb-4" style={{ color: "#0a2540" }}>01.</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#0a2540" }}>
                Zero Manual Errors
              </h3>
              <p className="text-base font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                No more notebooks or messy bookkeeping. Every deposit is 
                automatically recorded, verified, and visible to all.
              </p>
            </div>

            <div className="advantage-item">
              <div className="text-4xl font-black mb-4" style={{ color: "#0a2540" }}>02.</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#0a2540" }}>
                Regulated Safety
              </h3>
              <p className="text-base font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                Your funds are held in licensed partner bank vaults, 
                not in a cash box. Professional security for community savings.
              </p>
            </div>

            <div className="advantage-item">
              <div className="text-4xl font-black mb-4" style={{ color: "#0a2540" }}>03.</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#0a2540" }}>
                Built for Seasons
              </h3>
              <p className="text-base font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                Flexible schedules that understand harvest cycles. 
                Save what you can, when you can, without the penalties.
              </p>
            </div>

            <div className="advantage-item">
              <div className="text-4xl font-black mb-4" style={{ color: "#0a2540" }}>04.</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#0a2540" }}>
                Credit Independence
              </h3>
              <p className="text-base font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                Your group's history builds a verifiable score. Use your 
                discipline to unlock loans that traditional banks refuse.
              </p>
            </div>

          </div>
        </div>

        {/* The Authority: Comparison Table */}
        <div className="wc-table-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00ab00] mb-2 block">Comparative Audit</span>
              <h3 className="text-3xl font-black tracking-tight" style={{ color: "#0a2540" }}>
                How We Compare
              </h3>
            </div>
            <p className="max-w-md text-sm font-medium" style={{ color: "#4a5c6a" }}>
              OrbiSave is the only platform built specifically to protect 
              community governance while providing institutional-grade security.
            </p>
          </div>

          <div className="max-w-5xl mx-auto overflow-x-auto rounded-xl shadow-2xl shadow-green-900/5">
            <div 
              className="min-w-[900px] bg-white"
              style={{ border: "1px solid #d6e4df", overflow: "hidden" }}
            >
              {/* Header */}
              <div 
                className="grid grid-cols-[minmax(220px,2.5fr)_repeat(5,minmax(110px,1fr))]"
                style={{ background: "#0a2540" }}
              >
                <div className="px-6 py-5 flex items-center text-xs font-bold uppercase tracking-wider text-white">Feature Capability</div>
                <div className="px-4 py-5 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-gray-300">M-Pesa</div>
                <div className="px-4 py-5 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-gray-300">SACCO</div>
                <div className="px-4 py-5 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-gray-300">Trad. Chama</div>
                <div className="px-4 py-5 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-gray-300">Bank</div>
                <div className="px-4 py-5 flex items-center justify-center text-[12px] font-black uppercase tracking-wider text-white bg-[#00ab00] shadow-inner">OrbiSave</div>
              </div>

              {/* Rows */}
              <div className="wc-table-rows">
                {ROWS.map((row, i) => (
                  <div 
                    key={i}
                    className="wc-table-row grid grid-cols-[minmax(220px,2.5fr)_repeat(5,minmax(110px,1fr))] transition-colors hover:bg-[#f8faf9]"
                    style={{ borderBottom: i < ROWS.length - 1 ? "1px solid #d6e4df" : "none" }}
                  >
                    <div className="px-6 py-5 flex items-center text-sm font-bold leading-snug" style={{ color: "#0a2540" }}>{row.feature}</div>
                    <div className="px-4 py-5 flex items-center justify-center border-l border-[#d6e4df]"><Cell value={row.mpesa} /></div>
                    <div className="px-4 py-5 flex items-center justify-center border-l border-[#d6e4df]"><Cell value={row.sacco} /></div>
                    <div className="px-4 py-5 flex items-center justify-center border-l border-[#d6e4df]"><Cell value={row.chama} /></div>
                    <div className="px-4 py-5 flex items-center justify-center border-l border-[#d6e4df]"><Cell value={row.bank} /></div>
                    <div 
                      className="px-4 py-5 flex items-center justify-center border-l border-[#d6e4df]"
                      style={{ background: "#fafffa" }}
                    >
                      <Cell value={row.orbisave} isOrbisave />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
