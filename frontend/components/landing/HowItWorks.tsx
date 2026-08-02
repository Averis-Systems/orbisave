"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { Users, Smartphone, RotateCcw, Landmark, ArrowRight, ShieldCheck, Check } from "lucide-react"
import { gsap } from "@/lib/gsap-init"
import { TRUST_PILLARS } from "@/lib/landing-data"

const STEPS = [
  {
    number: "01",
    icon: Users,
    iconCls: "step-icon-users",
    title: "Start your group",
    description:
      "Create your group, set the contribution amount and schedule, and decide the payout order. Members join through secure invite codes, so your circle stays closed and trusted.",
    detail: "KES 5,000 · Weekly · 10 members",
    bg: "#e9f3ed",
    accent: "#00ab00",
    image: "/images/step1.jpg"
  },
  {
    number: "02",
    icon: Smartphone,
    iconCls: "step-icon-phone",
    title: "Save together every cycle",
    description:
      "Members contribute by mobile money or bank transfer. We reconcile every payment automatically and post it to a ledger the whole group can see, so there is no manual bookkeeping and nothing to argue over.",
    detail: "9/10 confirmed · 1 pending",
    bg: "#e8edf3",
    accent: "#0a2540",
    image: "/images/step2.jpg"
  },
  {
    number: "03",
    icon: RotateCcw,
    iconCls: "step-icon-rotate",
    title: "Receive your payout",
    description:
      "When a member's turn comes, we disburse the pooled amount straight to their account. The rotation follows join order and first contribution, so the queue stays fair and on time.",
    detail: "Payout → Amara K. · KES 48,500",
    bg: "#e9f3ed",
    accent: "#00ab00",
    image: "/images/step3.jpg"
  },
  {
    number: "04",
    icon: Landmark,
    iconCls: "step-icon-landmark",
    title: "Borrow from your pool",
    description:
      "Part of the savings forms a loan pool. Members can request affordable loans from their own group, reviewed and approved by the group's leaders, and repaid on clear terms.",
    detail: "Loan pool: KES 18,000 · From your group",
    bg: "#e8edf3",
    accent: "#0a2540",
    image: "/images/step4.jpg"
  },
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

        <div className="hiw-header max-w-2xl mb-16">
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-5"
            style={{ color: "#0a2540" }}
          >
            How OrbiSave works
          </h2>
          <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
            We take the group savings you already know and trust and bring them to your phone. The same circle, now
            safer and simpler for everyone to manage.
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
                  <div className="flex-1 grid md:grid-cols-[1fr_280px] gap-6 items-center">

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
                    </div>

                    <div
                      className="w-full md:w-[280px] aspect-[4/3] md:aspect-square flex items-center justify-center overflow-hidden relative flex-shrink-0 group-hover:scale-[1.02] transition-transform duration-700"
                      style={{
                        background: step.bg,
                        border: "1px solid #d6e4df",
                        borderRadius: "12px",
                      }}
                    >
                      <img 
                        src={step.image} 
                        alt={step.title} 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cycle note */}
        {/* Closing: the cycle note + built-in security, in one panel that
            blends with the light section instead of a hard navy block. */}
        <div
          className="hiw-trust-panel mt-16 overflow-hidden rounded-2xl border"
          style={{ borderColor: "#cfeddb", background: "#f6fef9" }}
        >
          <div className="grid gap-7 p-7 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-center lg:gap-12 lg:p-9">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#039855" }}>
                <ShieldCheck className="h-4 w-4" />
                Security, built in
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#46586a" }}>
                The cycle keeps turning until every member has been paid, and every shilling stays protected the whole
                way round.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {TRUST_PILLARS.map((point, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "#00ab00" }}>
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  <p className="text-sm leading-snug" style={{ color: "#334656" }}>
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
