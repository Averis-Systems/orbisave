"use client"

/**
 * Who it's for.
 *
 * The "someone like me" moment. OrbiSave is not only for farmers, it is for any
 * group that saves together. Six segments, each with an honest one-liner in the
 * language of that group. Cards reveal on scroll, staggered.
 */

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import { Sprout, Building2, GraduationCap, BookOpen, HeartHandshake, LineChart } from "lucide-react"

const SEGMENTS = [
  {
    icon: Sprout,
    title: "Farmers & co-ops",
    body: "Save when the harvest pays, keep clear records, and reach input financing and group credit.",
    tint: "#ecfdf3",
    fg: "#039855",
  },
  {
    icon: Building2,
    title: "Workplace & staff welfare",
    body: "Colleagues saving together, transparent to everyone, with emergency loans from your own pool.",
    tint: "#eef4ff",
    fg: "#3538cd",
  },
  {
    icon: BookOpen,
    title: "Teachers & SACCOs",
    body: "Automate the rotation, end the treasurer's headache, and keep every contribution auditable.",
    tint: "#fef6ee",
    fg: "#b93815",
  },
  {
    icon: GraduationCap,
    title: "Students",
    body: "Save small and often, pool for projects, and build your first real financial track record.",
    tint: "#f4f3ff",
    fg: "#6941c6",
  },
  {
    icon: HeartHandshake,
    title: "Faith & community groups",
    body: "Welfare funds and merry-go-rounds, tracked to the shilling, with accountability built in.",
    tint: "#fdf2fa",
    fg: "#c11574",
  },
  {
    icon: LineChart,
    title: "Investment clubs",
    body: "One shared ledger, fair payout order, and a full history everyone can trust.",
    tint: "#eff8ff",
    fg: "#026aa2",
  },
]

export function WhoItsFor() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      // immediateRender:false = content-first: visible unless the trigger fires.
      gsap.from(".wif-head", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: scope.current, start: "top 82%", once: true },
      })
      gsap.from(".wif-card", {
        y: 44,
        opacity: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".wif-grid", start: "top 85%", once: true },
      })
      ScrollTrigger.refresh()
    },
    { scope },
  )

  return (
    <section ref={scope} className="relative bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="wif-head mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#00ab00" }}>
            Built for every group
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: "#0a2540" }}>
            If your group saves together, OrbiSave is for you
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "#46586a" }}>
            The tradition is the same everywhere. Only the names change. We keep the money safe and the records clear,
            whoever you are.
          </p>
        </div>

        <div className="wif-grid mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SEGMENTS.map(({ icon: Icon, title, body, tint, fg }) => (
            <div
              key={title}
              className="wif-card group relative overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1"
              style={{ borderColor: "#e8efe9", boxShadow: "0 1px 2px rgba(10,37,64,0.04)" }}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-70 transition-transform duration-500 group-hover:scale-125"
                style={{ background: tint }}
              />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: tint, color: fg }}>
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-4 text-lg font-bold" style={{ color: "#0a2540" }}>
                {title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed" style={{ color: "#566675" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
