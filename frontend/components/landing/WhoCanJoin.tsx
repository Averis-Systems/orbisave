"use client"

import { useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  Sprout, Fish, Heart, Briefcase, Layers, Users,
  ArrowRight, Check,
} from "lucide-react"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

const CATEGORIES = [
  {
    id: "farmers",
    icon: Sprout,
    label: "Crop Farmers",
    headline: "Pool harvest-season income. Access inputs before you need them.",
    bullets: [
      "Seasonal contribution schedules aligned to harvest calendars",
      "Access input financiers for seeds, fertiliser & equipment",
      "Group chama credit builds bank loan eligibility over time",
    ],
    accent: "#00ab00",
    bg: "#e9f3ed",
  },
  {
    id: "fishers",
    icon: Fish,
    label: "Fishers & Aquaculture",
    headline: "Finance your nets, boats, and feed — paid back from your catch.",
    bullets: [
      "Access aquaculture input financiers in one place",
      "Group loans for equipment during off-peak seasons",
      "Contribution schedules match your landing cycles",
    ],
    accent: "#0a2540",
    bg: "#e8edf3",
  },
  {
    id: "women",
    icon: Heart,
    label: "Women's Groups",
    headline: "The traditional merry-go-round — now secure, transparent, and digital.",
    bullets: [
      "All member contributions visible and auditable",
      "Payout rotation is fair, fixed, and tamper-proof",
      "Loan pool for emergency needs between cycles",
    ],
    accent: "#00ab00",
    bg: "#e9f3ed",
  },
  {
    id: "corporates",
    icon: Briefcase,
    label: "Corporate Groups",
    headline: "Staff savings clubs with bank-grade governance built in.",
    bullets: [
      "Full audit trail for HR and compliance reporting",
      "Multi-party approvals prevent financial mismanagement",
      "Group financial statement ready for institutional banking",
    ],
    accent: "#0a2540",
    bg: "#e8edf3",
  },
  {
    id: "coops",
    icon: Layers,
    label: "Farmer Co-ops",
    headline: "Coordinate bulk inputs and savings across an entire cooperative.",
    bullets: [
      "Manage multiple sub-groups under one umbrella",
      "Consolidated financial reporting across members",
      "Grant pathways for qualifying cooperatives",
    ],
    accent: "#00ab00",
    bg: "#e9f3ed",
  },
  {
    id: "youth",
    icon: Users,
    label: "Youth & Community Groups",
    headline: "Start building your financial record from day one.",
    bullets: [
      "Low contribution minimums suited to early earners",
      "Digital-first — no physical meetups required",
      "Credit history building for future individual loans",
    ],
    accent: "#0a2540",
    bg: "#e8edf3",
  },
]

export function WhoCanJoin() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string>("farmers")

  useGSAP(() => {
    gsap.fromTo(".wcj-header",
      { y: 28, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
      }
    )
    gsap.fromTo(".wcj-tab",
      { y: 20, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
    gsap.fromTo(".wcj-panel",
      { y: 24, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.75, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 62%", once: true },
      }
    )
    // Animate icons on scroll
    gsap.fromTo(".wcj-tab-icon",
      { rotate: -15, scale: 0.7 },
      {
        rotate: 0, scale: 1, stagger: 0.07, duration: 0.5, ease: "back.out(2)",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
  }, { scope: ref })

  const activeCategory = CATEGORIES.find(c => c.id === active)!

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32"
      style={{ background: "#e9f3ed" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="wcj-header mb-14">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-5 px-3 py-1.5"
            style={{ color: "#00ab00", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}
          >
            Built for Every Collective
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight"
            style={{ color: "#0a2540" }}
          >
            Who joins OrbiSave?
          </h2>
          <p
            className="mt-4 text-lg font-medium max-w-2xl leading-relaxed"
            style={{ color: "#4a5c6a" }}
          >
            Any group that pools money together stands to benefit. Choose your category below.
          </p>
        </div>

        {/* Tab strip */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`wcj-tab flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200`}
              style={{
                borderRadius: "6px",
                border: `1px solid ${active === id ? "#00ab00" : "#d6e4df"}`,
                background: active === id ? "#00ab00" : "#ffffff",
                color: active === id ? "#ffffff" : "#0a2540",
              }}
            >
              <Icon className="w-4 h-4 wcj-tab-icon flex-shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* Active panel */}
        <div
          key={active}
          className="wcj-panel grid lg:grid-cols-2 gap-0 overflow-hidden"
          style={{
            border: "1px solid #d6e4df",
            borderRadius: "8px",
            background: "#ffffff",
          }}
        >
          {/* Left: content */}
          <div className="p-8 lg:p-12 flex flex-col gap-6">
            <div
              className="w-12 h-12 flex items-center justify-center flex-shrink-0"
              style={{ background: activeCategory.bg, borderRadius: "8px", border: "1px solid #d6e4df" }}
            >
              <activeCategory.icon
                className="w-6 h-6"
                style={{ color: activeCategory.accent }}
              />
            </div>

            <div>
              <div
                className="text-xs font-bold tracking-[0.15em] uppercase mb-3"
                style={{ color: "#4a5c6a" }}
              >
                {activeCategory.label}
              </div>
              <h3
                className="text-2xl sm:text-3xl font-bold leading-snug"
                style={{ color: "#0a2540" }}
              >
                {activeCategory.headline}
              </h3>
            </div>

            <ul className="flex flex-col gap-3">
              {activeCategory.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: "#00ab00" }}
                  />
                  <span className="text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 text-sm font-bold transition-colors group mt-2"
              style={{ color: "#00ab00" }}
            >
              Start your {activeCategory.label.split(" ")[0]} chama
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </a>
          </div>

          {/* Right: visual panel */}
          <div
            className="min-h-[220px] lg:min-h-0 flex items-center justify-center p-12"
            style={{ background: activeCategory.bg, borderLeft: "1px solid #d6e4df" }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className="w-24 h-24 flex items-center justify-center"
                style={{
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: `2px solid ${activeCategory.accent}20`,
                }}
              >
                <activeCategory.icon
                  className="w-12 h-12"
                  style={{ color: activeCategory.accent }}
                />
              </div>
              <div>
                <div
                  className="text-2xl font-black mb-1"
                  style={{ color: activeCategory.accent }}
                >
                  {activeCategory.label}
                </div>
                <div
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#4a5c6a" }}
                >
                  Supported on OrbiSave
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
