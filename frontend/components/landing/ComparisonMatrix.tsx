"use client"

/**
 * Comparison matrix.
 *
 * Answers the quiet objection: "why not my notebook, my WhatsApp group, my
 * SACCO, or some other app?" Honest by design. The OrbiSave column is
 * highlighted, but every claim is one we actually deliver. Status is shown by
 * icon shape (check / partial / cross) plus an accessible label, never colour
 * alone. Horizontal-scrolls on small screens.
 */

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import { Check, Minus, X } from "lucide-react"

type Status = "yes" | "partial" | "no"

const COLUMNS = ["Notebook & cash box", "WhatsApp + spreadsheet", "SACCO / bank", "Other savings apps"]

const ROWS: { feature: string; cells: Status[]; orbi: Status }[] = [
  { feature: "Money held safely in a bank", cells: ["no", "no", "yes", "partial"], orbi: "yes" },
  { feature: "Every payment recorded automatically", cells: ["no", "partial", "yes", "partial"], orbi: "yes" },
  { feature: "One shared ledger everyone can see", cells: ["no", "no", "partial", "no"], orbi: "yes" },
  { feature: "Fair payout rotation, tracked", cells: ["partial", "partial", "no", "no"], orbi: "yes" },
  { feature: "Borrow from your group's own pool", cells: ["partial", "partial", "partial", "no"], orbi: "yes" },
  { feature: "Builds a record banks can lend against", cells: ["no", "no", "partial", "no"], orbi: "yes" },
  { feature: "Works on any phone, any amount", cells: ["yes", "yes", "partial", "yes"], orbi: "yes" },
  { feature: "Across Kenya, Rwanda and Ghana", cells: ["no", "no", "no", "partial"], orbi: "yes" },
]

function Cell({ status }: { status: Status }) {
  if (status === "yes") {
    return (
      <span className="inline-flex flex-col items-center gap-1" role="img" aria-label="Yes">
        <Check className="h-5 w-5" style={{ color: "#039855" }} strokeWidth={2.4} />
      </span>
    )
  }
  if (status === "partial") {
    return (
      <span className="inline-flex flex-col items-center gap-1" role="img" aria-label="Partly">
        <Minus className="h-5 w-5" style={{ color: "#d9930a" }} strokeWidth={2.4} />
      </span>
    )
  }
  return (
    <span className="inline-flex flex-col items-center gap-1" role="img" aria-label="No">
      <X className="h-5 w-5" style={{ color: "#cbd5e1" }} strokeWidth={2.4} />
    </span>
  )
}

export function ComparisonMatrix() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      gsap.from(".cmp-head", {
        y: 28,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: scope.current, start: "top 82%", once: true },
      })
      gsap.from(".cmp-table", {
        y: 36,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".cmp-table", start: "top 88%", once: true },
      })
      ScrollTrigger.refresh()
    },
    { scope },
  )

  return (
    <section ref={scope} className="relative bg-[#f7f9f8] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="cmp-head mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#00ab00" }}>
            The honest comparison
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: "#0a2540" }}>
            How OrbiSave compares
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "#46586a" }}>
            You are already saving as a group. The question is where. Here is how OrbiSave stands next to the ways groups
            save today.
          </p>
        </div>

        <div className="cmp-table thin-scrollbar mt-12 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[#f7f9f8] px-4 py-4 text-left text-sm font-semibold" style={{ color: "#0a2540" }}>
                  What matters
                </th>
                {COLUMNS.map((c) => (
                  <th key={c} className="px-4 py-4 text-center text-xs font-semibold leading-tight" style={{ color: "#7c8b98" }}>
                    {c}
                  </th>
                ))}
                <th className="px-3 py-3 text-center align-bottom">
                  <span className="inline-flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-sm font-bold text-white" style={{ background: "#00ab00" }}>
                    OrbiSave
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature}>
                  <td
                    className="sticky left-0 z-10 bg-[#f7f9f8] px-4 py-4 text-sm font-medium"
                    style={{ color: "#334656", borderTop: "1px solid #e6ede9" }}
                  >
                    {row.feature}
                  </td>
                  {row.cells.map((s, j) => (
                    <td key={j} className="px-4 py-4 text-center" style={{ borderTop: "1px solid #e6ede9" }}>
                      <Cell status={s} />
                    </td>
                  ))}
                  <td
                    className="px-4 py-4 text-center"
                    style={{
                      background: "rgba(0,171,0,0.06)",
                      borderTop: "1px solid rgba(0,171,0,0.18)",
                      borderLeft: "1px solid rgba(0,171,0,0.18)",
                      borderRight: "1px solid rgba(0,171,0,0.18)",
                      ...(i === ROWS.length - 1 ? { borderBottom: "1px solid rgba(0,171,0,0.18)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 } : {}),
                    }}
                  >
                    <Cell status={row.orbi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "#7c8b98" }}>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" style={{ color: "#039855" }} strokeWidth={2.4} /> Yes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Minus className="h-4 w-4" style={{ color: "#d9930a" }} strokeWidth={2.4} /> Partly, or by hand
          </span>
          <span className="inline-flex items-center gap-1.5">
            <X className="h-4 w-4" style={{ color: "#cbd5e1" }} strokeWidth={2.4} /> No
          </span>
        </div>
      </div>
    </section>
  )
}
