"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Users, Smartphone, RotateCcw, Landmark, ArrowRight } from "lucide-react"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    number: "01",
    icon: Users,
    iconCls: "step-icon-users",
    title: "Create or Join a Collective",
    description:
      "A chairperson launches the group and defines the rules: contribution amount, frequency, rotation order, and the loan pool interest cap. Members join via secure 7-day invite codes.",
    detail: "KES 5,000 · Weekly · 10 Members",
    bg: "#e9f3ed",
    accent: "#00ab00",
  },
  {
    number: "02",
    icon: Smartphone,
    iconCls: "step-icon-phone",
    title: "Members Contribute on Schedule",
    description:
      "Each member funds via M-Pesa STK Push, MTN MoMo, or bank transfer. The platform reconciles every deposit with an idempotent payment lock — eliminating duplicates and manual ledgers.",
    detail: "9/10 Confirmed · 1 Pending",
    bg: "#e8edf3",
    accent: "#0a2540",
  },
  {
    number: "03",
    icon: RotateCcw,
    iconCls: "step-icon-rotate",
    title: "Rotation Payout Fires Automatically",
    description:
      "When the cycle closes, the financial engine calculates the net payout, routes funds to the scheduled member's connected wallet, and records an immutable ledger entry.",
    detail: "Payout → Amara K. · KES 48,500 Net",
    bg: "#e9f3ed",
    accent: "#00ab00",
  },
  {
    number: "04",
    icon: Landmark,
    iconCls: "step-icon-landmark",
    title: "Access the Group Loan Pool",
    description:
      "30% of pooled capital is set aside as a loan reserve. Members request loans which require both the chairperson and treasurer to provide their PINs — enforcing two-key cryptographic governance.",
    detail: "Reserve: KES 18,000 · Rate: 3% / month",
    bg: "#e8edf3",
    accent: "#0a2540",
  },
]

/* The screenshot trust pillars from existing TrustBelt — shown as additional info panel */
const TRUST_PILLARS = [
  "Funds held in licensed bank trust accounts. OrbiSave never holds your money independently.",
  "SHA-256 hash-chained ledger. Every transaction is auditable and cryptographically tamper-evident.",
  "Strict multi-party loan authorizations governed by required administrative PIN approvals.",
]

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".hiw-header",
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 82%", once: true },
      }
    )
    gsap.fromTo(".step-card",
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.13, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 70%", once: true },
      }
    )
    gsap.fromTo(".hiw-trust-panel",
      { y: 24, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: ".hiw-trust-panel", start: "top 85%", once: true },
      }
    )

    // Icon animations
    gsap.fromTo(".step-icon-users",
      { scale: 0.5, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)",
        scrollTrigger: { trigger: containerRef.current, start: "top 70%", once: true },
      }
    )
    gsap.to(".step-icon-rotate", {
      rotate: 360, duration: 3, repeat: -1, ease: "linear",
    })
    gsap.to(".step-icon-phone", {
      y: -2, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut",
    })
    gsap.fromTo(".step-icon-landmark",
      { scale: 0.7, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)",
        scrollTrigger: { trigger: containerRef.current, start: "top 50%", once: true },
      }
    )
  }, { scope: containerRef })

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="py-24 lg:py-32 relative overflow-hidden"
      style={{ background: "#f7f9f8" }}
    >
      {/* dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(10,37,64,0.05) 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <div className="hiw-header max-w-2xl mb-20">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-5 px-3 py-1.5"
            style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}
          >
            Core Mechanism
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-5"
            style={{ color: "#0a2540" }}
          >
            Four phases. One continuous cycle of wealth.
          </h2>
          <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
            We replace volatile cash hand-offs with automated digital governance — the collective model trusted for decades, now fortified with the reliability of a modern bank.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Spine line */}
          <div
            className="absolute left-[2rem] top-0 bottom-0 w-px hidden md:block"
            style={{ background: "#d6e4df" }}
          />
          <div className="flex flex-col gap-14">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className="step-card relative flex flex-col md:flex-row gap-8 md:gap-14 items-start group"
                >
                  {/* Spine node */}
                  <div className="hidden md:flex relative z-10 w-16 justify-center pt-1 flex-shrink-0">
                    <div
                      className="w-4 h-4 rounded-full transition-transform duration-500 group-hover:scale-125"
                      style={{ background: "#ffffff", border: `3px solid ${step.accent}` }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 grid md:grid-cols-[1fr_280px] gap-6 items-start">

                    {/* Text block */}
                    <div
                      className="p-7 flex flex-col gap-5"
                      style={{
                        background: "#ffffff",
                        border: "1px solid #d6e4df",
                        borderRadius: "8px",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-11 h-11 flex items-center justify-center flex-shrink-0"
                          style={{ background: step.bg, borderRadius: "8px", border: "1px solid #d6e4df" }}
                        >
                          <Icon
                            className={`w-5 h-5 ${step.iconCls}`}
                            style={{ color: step.accent }}
                          />
                        </div>
                        <span
                          className="text-5xl font-black select-none tracking-tighter"
                          style={{ color: `${step.accent}12` }}
                        >
                          {step.number}
                        </span>
                      </div>
                      <div>
                        <h3
                          className="text-xl sm:text-2xl font-bold tracking-tight mb-3"
                          style={{ color: "#0a2540" }}
                        >
                          {step.title}
                        </h3>
                        <p className="text-base font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                          {step.description}
                        </p>
                      </div>
                      <div
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 w-fit"
                        style={{
                          background: step.bg,
                          border: `1px solid ${step.accent}30`,
                          borderRadius: "4px",
                          color: step.accent,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: step.accent }} />
                        {step.detail}
                      </div>
                    </div>

                    {/* Visual icon panel */}
                    <div
                      className="min-h-[140px] md:min-h-full flex items-center justify-center p-8"
                      style={{
                        background: step.bg,
                        border: "1px solid #d6e4df",
                        borderRadius: "8px",
                      }}
                    >
                      <Icon
                        className={`w-16 h-16 ${step.iconCls}`}
                        style={{ color: step.accent, opacity: 0.25 }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cycle note */}
        <div
          className="mt-20 pt-10 text-center"
          style={{ borderTop: "1px solid #d6e4df" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#00ab00" }}>
            The cycle repeats systematically until every member receives their scheduled payout.
          </p>
        </div>

        {/* Trust screenshot panel — additional info from platform */}
        <div
          className="hiw-trust-panel mt-16 p-8 lg:p-10"
          style={{
            background: "#0a2540",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            className="text-xs font-bold tracking-[0.15em] uppercase mb-6"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Platform Security — Non-Negotiable
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TRUST_PILLARS.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "#00ab00" }}
                >
                  <svg viewBox="0 0 10 10" className="w-3 h-3 fill-white">
                    <path d="M2 5.5L4.2 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
