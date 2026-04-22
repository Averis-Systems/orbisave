"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Check, X, Minus } from "lucide-react"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

type CellValue = "yes" | "no" | "partial"

interface Row {
  feature: string
  traditional: CellValue
  orbisave: CellValue
  note?: string
}

const ROWS: Row[] = [
  { feature: "Perfect Bookkeeping",          traditional: "no",      orbisave: "yes", note: "Automatic records. No human mistakes." },
  { feature: "Complete Transparency", traditional: "no",   orbisave: "yes", note: "Every member sees all money movements." },
  { feature: "Flexible Savings",       traditional: "no",      orbisave: "yes", note: "Save by harvest seasons instead of rigid monthly payments." },
  { feature: "Automatic Payouts",             traditional: "no",      orbisave: "yes", note: "Money sent directly to your M-Pesa." },
  { feature: "No Money Fights",            traditional: "no",      orbisave: "yes", note: "Digital records solve all arguments." },
  { feature: "Group Loans",          traditional: "partial",  orbisave: "yes", note: "Approved safely on mobile phones." },
  { feature: "Official Statements",  traditional: "no",      orbisave: "yes", note: "Ready for bank applications." },
  { feature: "Bank Loans",         traditional: "no",      orbisave: "yes", note: "Use your group's saving history to get loans." },
  { feature: "Farm Supply Loans",    traditional: "no",      orbisave: "yes", note: "Connect directly to seed and fertilizer companies." },
  { feature: "Grants and Support",                traditional: "no",      orbisave: "yes", note: "Connect your group to NGOs." },
]

function Cell({ value, isOrbisave }: { value: CellValue; isOrbisave?: boolean }) {
  if (value === "yes") {
    return (
      <div className="flex justify-center">
        <div
          className="w-7 h-7 flex items-center justify-center"
          style={{
            background: isOrbisave ? "#e9f3ed" : "#f1f5f0",
            borderRadius: "4px",
          }}
        >
          <Check
            className={`w-4 h-4 ${isOrbisave ? "icon-check-draw" : ""}`}
            style={{ color: isOrbisave ? "#00ab00" : "#9ab09a" }}
            strokeWidth={2.5}
          />
        </div>
      </div>
    )
  }
  if (value === "no") {
    return (
      <div className="flex justify-center">
        <div
          className="w-7 h-7 flex items-center justify-center"
          style={{ background: "#f9f9f9", borderRadius: "4px" }}
        >
          <X className="w-4 h-4" style={{ color: "#c0c8d0" }} strokeWidth={2} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-center">
      <div
        className="w-7 h-7 flex items-center justify-center"
        style={{ background: "#f9f9f9", borderRadius: "4px" }}
      >
        <Minus className="w-4 h-4" style={{ color: "#c0c8d0" }} strokeWidth={2} />
      </div>
    </div>
  )
}

export function ComparisonTable() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".cmp-header",
      { y: 28, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
      }
    )
    gsap.fromTo(".cmp-row",
      { x: -20, opacity: 0 },
      {
        x: 0, opacity: 1, stagger: 0.06, duration: 0.55, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
    // Animate OrbiSave column in with a slight delay
    gsap.fromTo(".cmp-col-orbisave",
      { opacity: 0 },
      {
        opacity: 1, duration: 0.9, ease: "power2.out", delay: 0.3,
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
  }, { scope: ref })

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32"
      style={{ background: "#ffffff" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="cmp-header mb-14 text-center">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-5 px-3 py-1.5"
            style={{ color: "#0a2540", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}
          >
            The Honest Comparison
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight"
            style={{ color: "#0a2540" }}
          >
            Traditional vs OrbiSave
          </h2>
          <p
            className="mt-4 text-lg font-medium max-w-xl mx-auto leading-relaxed"
            style={{ color: "#4a5c6a" }}
          >
            See exactly where your group stands to gain by going digital.
          </p>
        </div>

        {/* Table */}
        <div
          style={{ border: "1px solid #d6e4df", borderRadius: "8px", overflow: "hidden" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_120px_140px] lg:grid-cols-[1fr_160px_180px]"
            style={{ borderBottom: "1px solid #d6e4df" }}
          >
            <div className="px-6 py-4 text-xs font-bold tracking-widest uppercase" style={{ color: "#4a5c6a" }}>
              Feature
            </div>
            <div
              className="px-4 py-4 text-center text-xs font-bold tracking-widest uppercase"
              style={{ color: "#9ab09a", borderLeft: "1px solid #d6e4df" }}
            >
              Traditional
            </div>
            <div
              className="cmp-col-orbisave px-4 py-4 text-center text-xs font-bold tracking-widest uppercase"
              style={{
                color: "#ffffff",
                background: "#0a2540",
                borderLeft: "1px solid #d6e4df",
              }}
            >
              OrbiSave
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={i}
              className="cmp-row grid grid-cols-[1fr_120px_140px] lg:grid-cols-[1fr_160px_180px] transition-colors hover:bg-[#f7faf8]"
              style={{ borderBottom: i < ROWS.length - 1 ? "1px solid #d6e4df" : "none" }}
            >
              {/* Feature */}
              <div className="px-6 py-4">
                <div className="text-sm font-semibold" style={{ color: "#0f1924" }}>
                  {row.feature}
                </div>
                {row.note && (
                  <div className="text-xs mt-0.5 font-medium" style={{ color: "#4a5c6a" }}>
                    {row.note}
                  </div>
                )}
              </div>

              {/* Traditional */}
              <div
                className="flex items-center justify-center"
                style={{ borderLeft: "1px solid #d6e4df" }}
              >
                <Cell value={row.traditional} />
              </div>

              {/* OrbiSave */}
              <div
                className="cmp-col-orbisave flex items-center justify-center"
                style={{ background: "#f0faf0", borderLeft: "1px solid #d6e4df" }}
              >
                <Cell value={row.orbisave} isOrbisave />
              </div>
            </div>
          ))}
        </div>

        {/* CTA below table */}
        <div className="mt-10 text-center">
          <p className="text-sm font-medium mb-4" style={{ color: "#4a5c6a" }}>
            Ready to give your group every advantage?
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white transition-colors group"
            style={{ background: "#00ab00", borderRadius: "6px" }}
          >
            Start Your Group Today
            <X className="w-4 h-4 rotate-45 icon-arrow" />
          </a>
        </div>
      </div>
    </section>
  )
}
