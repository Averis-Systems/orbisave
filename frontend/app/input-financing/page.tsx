"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Link from "next/link"
import {
  Sprout, Fish, Leaf, Wheat, Package, ArrowRight,
  CheckCircle2, Users, TrendingUp, Globe, Zap,
  ShieldCheck, Gift,
} from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

// ─── DATA ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    icon: Wheat,
    label: "Crop Farmers",
    items: ["Seeds", "Fertiliser", "Pesticides", "Irrigation equipment"],
    color: "#00ab00",
    bg: "#e9f3ed",
  },
  {
    icon: Fish,
    label: "Fishers & Aquaculture",
    items: ["Fish feed", "Nets and lines", "Pond liners", "Fingerlings"],
    color: "#0a2540",
    bg: "#e8edf3",
  },
  {
    icon: Leaf,
    label: "Livestock Farmers",
    items: ["Animal feed", "Veterinary inputs", "Dips and vaccines", "Housing materials"],
    color: "#00ab00",
    bg: "#e9f3ed",
  },
  {
    icon: Sprout,
    label: "Horticulture",
    items: ["Seedlings", "Shade nets", "Drip kits", "Packaging"],
    color: "#0a2540",
    bg: "#e8edf3",
  },
  {
    icon: Package,
    label: "Agribusiness",
    items: ["Processing equipment", "Storage bags", "Milling inputs", "Cold chain"],
    color: "#00ab00",
    bg: "#e9f3ed",
  },
]

const HOW_IT_WORKS = [
  {
    number: "01",
    icon: Users,
    iconCls: "if-icon-1",
    title: "Join or create your chama on OrbiSave",
    body: "Gather your farming group — neighbours, cooperative members, or community friends. Register together on OrbiSave. Each member contributes on a schedule.",
    accent: "#00ab00",
    bg: "#e9f3ed",
  },
  {
    number: "02",
    icon: TrendingUp,
    iconCls: "if-icon-2",
    title: "Build your contribution record",
    body: "Every payment you make is recorded automatically. After a few cycles, your group has a verified financial history — proof that you save together and repay consistently.",
    accent: "#0a2540",
    bg: "#e8edf3",
  },
  {
    number: "03",
    icon: Globe,
    iconCls: "if-icon-3",
    title: "OrbiSave connects you to input financiers",
    body: "The platform matches your group to vetted input providers in your area. You see all options in one place — no middlemen, no hidden fees. The group chooses together.",
    accent: "#00ab00",
    bg: "#e9f3ed",
  },
  {
    number: "04",
    icon: ShieldCheck,
    iconCls: "if-icon-4",
    title: "The financier reviews your group's record",
    body: "The input financier sees your group's verified contribution history on OrbiSave. A strong group record means better terms — lower down payment, longer repayment period.",
    accent: "#0a2540",
    bg: "#e8edf3",
  },
  {
    number: "05",
    icon: Package,
    iconCls: "if-icon-5",
    title: "Inputs are delivered. You repay over time.",
    body: "Seeds, feed, fertiliser — delivered to your group. Repayments are small and spread out over your harvest or earning cycle. All tracked automatically on the platform.",
    accent: "#00ab00",
    bg: "#e9f3ed",
  },
]

const BENEFITS = [
  {
    icon: Users,
    iconCls: "icon-pulse-soft",
    title: "Your group is your guarantee",
    body: "No single farmer carries the risk alone. The group's combined record and contributions back the financing. Everyone benefits — and everyone is responsible.",
  },
  {
    icon: Globe,
    iconCls: "icon-spin",
    title: "All financiers in one place",
    body: "Instead of travelling to many offices, you see every available input financier on one screen. Compare options and choose what works for your group.",
  },
  {
    icon: Zap,
    iconCls: "icon-flash",
    title: "Tiny repayments over time",
    body: "Instead of one big payment at planting time, you repay in small amounts across the season. Your harvest pays for the inputs that made it possible.",
  },
  {
    icon: Gift,
    iconCls: "icon-bounce",
    title: "Access to grants",
    body: "Groups with a verified financial record can be connected to agricultural grants routed through OrbiSave. A clean record opens doors that cash alone cannot.",
  },
]

const COMPARISON = [
  { label: "You need to travel to find a supplier",    old: true,  newWay: false },
  { label: "One person must sign as guarantor",        old: true,  newWay: false },
  { label: "Full payment required before planting",    old: true,  newWay: false },
  { label: "No record of your purchases",              old: true,  newWay: false },
  { label: "Group's contribution history counts",      old: false, newWay: true },
  { label: "Repay across your harvest cycle",          old: false, newWay: true },
  { label: "Compare multiple financiers",              old: false, newWay: true },
  { label: "All payments tracked automatically",       old: false, newWay: true },
]

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function InputFinancingPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".if-hero-text",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.14, duration: 0.85, ease: "power2.out", delay: 0.2 }
    )
    gsap.fromTo(".cat-card",
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.09, duration: 0.65, ease: "power2.out",
        scrollTrigger: { trigger: ".cats-wrap", start: "top 80%", once: true } }
    )
    gsap.fromTo(".hiw-step",
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.11, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: ".hiw-wrap", start: "top 80%", once: true } }
    )
    gsap.fromTo(".benefit-card",
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.65, ease: "power2.out",
        scrollTrigger: { trigger: ".benefits-wrap", start: "top 80%", once: true } }
    )
    gsap.fromTo(".cmp-row-if",
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.07, duration: 0.55, ease: "power2.out",
        scrollTrigger: { trigger: ".cmp-wrap-if", start: "top 80%", once: true } }
    )
    // Icon animations
    gsap.to(".if-icon-2", { y: -3, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" })
    gsap.to(".if-icon-3", { rotate: 360, duration: 12, repeat: -1, ease: "linear" })
    gsap.fromTo(".if-icon-1", { scale: 0.7 }, { scale: 1, duration: 0.6, ease: "back.out(2)", scrollTrigger: { trigger: ".hiw-wrap", start: "top 80%", once: true } })
    gsap.to(".if-icon-4", { y: -2, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut" })
    gsap.to(".if-icon-5", { rotate: 8, duration: 2, yoyo: true, repeat: -1, ease: "sine.inOut" })
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />

      {/* ── HERO ── */}
      <section className="pt-28 pb-20 relative overflow-hidden" style={{ background: "#e9f3ed" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(10,37,64,0.05) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="if-hero-text inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-6 px-3 py-1.5" style={{ color: "#00ab00", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}>
                Input Financing
              </div>
              <h1 className="if-hero-text text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5" style={{ color: "#0a2540" }}>
                Get your seeds, feed, and tools —{" "}
                <span style={{ color: "#00ab00" }}>pay across the season.</span>
              </h1>
              <p className="if-hero-text text-lg font-medium leading-relaxed mb-8" style={{ color: "#4a5c6a" }}>
                You should not have to choose between buying inputs and feeding your family. OrbiSave connects your farming group to input suppliers who are willing to wait for harvest time.
              </p>
              <div className="if-hero-text flex flex-wrap gap-3">
                <Link href="/onboarding">
                  <button className="h-11 px-6 text-sm font-bold text-white flex items-center gap-2 group transition-opacity hover:opacity-90" style={{ background: "#00ab00", borderRadius: "6px" }}>
                    Join OrbiSave <ArrowRight className="w-4 h-4 icon-arrow" />
                  </button>
                </Link>
                <Link href="/how-loaning-works">
                  <button className="h-11 px-6 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-[#d6e4df]" style={{ color: "#0a2540", background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "6px" }}>
                    How Group Loans Work
                  </button>
                </Link>
              </div>
            </div>

            {/* Hero stat block */}
            <div className="flex flex-col gap-3">
              {[
                { value: "No single guarantor", sub: "Your group backs the financing together" },
                { value: "Repay at harvest time", sub: "Repayment follows your earning season" },
                { value: "All inputs. One platform.", sub: "Seeds, feed, equipment — all in one place" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-4 p-5" style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}>
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#00ab00" }} />
                  <div>
                    <div className="font-black text-base" style={{ color: "#0a2540" }}>{s.value}</div>
                    <div className="text-sm font-medium mt-0.5" style={{ color: "#4a5c6a" }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT CAN YOU FINANCE ── */}
      <section className="py-20 lg:py-28" style={{ background: "#ffffff" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}>
              What Can Be Financed
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
              What inputs can your group access?
            </h2>
            <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
              Whether you grow crops, raise animals, or farm fish — there are input financiers on OrbiSave who specialise in your type of farming.
            </p>
          </div>

          <div className="cats-wrap grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map(({ icon: Icon, label, items, color, bg }, i) => (
              <div key={i} className="cat-card p-6 flex flex-col gap-4" style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}>
                <div className="w-10 h-10 flex items-center justify-center" style={{ background: bg, borderRadius: "8px", border: "1px solid #d6e4df" }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <div className="font-bold text-base mb-3" style={{ color: "#0a2540" }}>{label}</div>
                  <ul className="flex flex-col gap-2">
                    {items.map((item, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm font-medium" style={{ color: "#4a5c6a" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 lg:py-28" style={{ background: "#e9f3ed" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#0a2540", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}>
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
              Five simple steps to access inputs.
            </h2>
            <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
              From joining a group to receiving your seeds — here is exactly what happens.
            </p>
          </div>

          <div className="hiw-wrap flex flex-col gap-4">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="hiw-step grid sm:grid-cols-[64px_1fr] gap-0 overflow-hidden" style={{ border: "1px solid #d6e4df", borderRadius: "8px", background: "#ffffff" }}>
                  <div className="flex items-center justify-center p-4" style={{ background: step.bg, borderRight: "1px solid #d6e4df" }}>
                    <span className="text-3xl font-black" style={{ color: `${step.accent}25` }}>{step.number}</span>
                  </div>
                  <div className="p-5 flex gap-4 items-start">
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: step.bg, borderRadius: "6px", border: "1px solid #d6e4df" }}>
                      <Icon className={`w-4.5 h-4.5 ${step.iconCls}`} style={{ color: step.accent }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1.5" style={{ color: "#0a2540" }}>{step.title}</h3>
                      <p className="text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{step.body}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── WHY THIS IS BETTER ── */}
      <section className="py-20 lg:py-28 benefits-wrap" style={{ background: "#ffffff" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}>
              Why Input Financing via OrbiSave
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
              Why is this better than going alone?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-12">
            {BENEFITS.map(({ icon: Icon, iconCls, title, body }, i) => (
              <div key={i} className="benefit-card p-6 flex flex-col gap-4" style={{ background: "#f7f9f8", border: "1px solid #d6e4df", borderRadius: "8px" }}>
                <Icon className={`w-5 h-5 ${iconCls}`} style={{ color: "#00ab00" }} />
                <div>
                  <div className="font-bold text-base mb-2" style={{ color: "#0a2540" }}>{title}</div>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Old vs New comparison */}
          <div className="cmp-wrap-if" style={{ border: "1px solid #d6e4df", borderRadius: "8px", overflow: "hidden" }}>
            <div className="grid grid-cols-[1fr_80px_80px]" style={{ background: "#0a2540", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Feature</div>
              <div className="px-3 py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Old way</div>
              <div className="px-3 py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#00ab00" }}>OrbiSave</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className="cmp-row-if grid grid-cols-[1fr_80px_80px] hover:bg-[#f7faf8] transition-colors" style={{ borderBottom: i < COMPARISON.length - 1 ? "1px solid #d6e4df" : "none", background: "#ffffff" }}>
                <div className="px-5 py-3 text-sm font-medium" style={{ color: "#0f1924" }}>{row.label}</div>
                <div className="flex items-center justify-center" style={{ borderLeft: "1px solid #d6e4df" }}>
                  {row.old
                    ? <CheckCircle2 className="w-4 h-4" style={{ color: "#c0c8d0" }} />
                    : <span className="w-4 h-0.5 rounded" style={{ background: "#d6e4df", display: "block" }} />
                  }
                </div>
                <div className="flex items-center justify-center" style={{ borderLeft: "1px solid #d6e4df", background: row.newWay ? "#f0faf0" : "transparent" }}>
                  {row.newWay
                    ? <CheckCircle2 className="w-4 h-4" style={{ color: "#00ab00" }} />
                    : <span className="w-4 h-0.5 rounded" style={{ background: "#d6e4df", display: "block" }} />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GRANTS TEASER ── */}
      <section className="py-16" style={{ background: "#0a2540" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Gift className="w-8 h-8 mx-auto mb-5 icon-bounce" style={{ color: "#00ab00" }} />
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-4 text-white">
            Grants for farming groups
          </h2>
          <p className="text-base font-medium leading-relaxed mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            Organisations and governments sometimes give money to help small farmers — without asking for it back. These are called grants. On OrbiSave, groups that have a verified financial record can be matched to grant providers. The platform handles the connection.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ color: "#00ab00", background: "rgba(0,171,0,0.1)", borderRadius: "4px", border: "1px solid rgba(0,171,0,0.2)" }}>
            Coming to qualifying groups · Build your record now
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20" style={{ background: "#e9f3ed" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
            Start your farming group today.
          </h2>
          <p className="text-lg font-medium leading-relaxed mb-8" style={{ color: "#4a5c6a" }}>
            The sooner you begin, the sooner your record grows — and the sooner you access the inputs your farm needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/onboarding">
              <button className="h-12 px-8 text-sm font-bold text-white flex items-center gap-2 justify-center w-full sm:w-auto group transition-opacity hover:opacity-90" style={{ background: "#00ab00", borderRadius: "6px" }}>
                Join OrbiSave Free <ArrowRight className="w-4 h-4 icon-arrow" />
              </button>
            </Link>
            <Link href="/how-loaning-works">
              <button className="h-12 px-8 text-sm font-semibold flex items-center gap-2 justify-center w-full sm:w-auto transition-colors hover:bg-white" style={{ color: "#0a2540", background: "transparent", border: "1px solid #d6e4df", borderRadius: "6px" }}>
                How Group Loans Work
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
