"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import { Sprout, ArrowRight, Zap, Globe, TrendingUp } from "lucide-react"
import { gsap } from "@/lib/gsap-init"

const BENEFITS = [
  { icon: Globe,      iconCls: "ift-icon-globe icon-spin",  label: "Everything You Need",  desc: "Get seeds, fertilizer, and tools for your farm or business." },
  { icon: Zap,        iconCls: "ift-icon-zap icon-flash",   label: "Save as a Group",        desc: "Saving together makes your group stronger for loans." },
  { icon: TrendingUp, iconCls: "ift-icon-trend icon-bounce", label: "Pay Slowly",             desc: "Pay for your tools slowly as you earn from your harvest." },
  { icon: Sprout,     iconCls: "ift-icon-sprout",           label: "Get Free Help",           desc: "Good groups can get grants and free support from NGOs." },
]

export function InputFinancingTeaser() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".ift-header",
      { y: 28, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
      }
    )
    gsap.fromTo(".ift-benefit",
      { y: 24, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.1, duration: 0.65, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
    // Icon animations
    gsap.to(".ift-icon-globe", { rotate: 360, duration: 12, repeat: -1, ease: "linear" })
    gsap.to(".ift-icon-zap", {
      opacity: 0.3, duration: 0.5, yoyo: true, repeat: -1, ease: "power1.inOut"
    })
    gsap.to(".ift-icon-trend", {
      y: -3, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut"
    })
    gsap.fromTo(".ift-icon-sprout",
      { scale: 0.8, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
  }, { scope: ref })

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 relative overflow-hidden"
      style={{ background: "#0a2540" }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div className="ift-header">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-6 px-3 py-1.5"
              style={{ color: "#00ab00", background: "rgba(0,171,0,0.1)", borderRadius: "4px", border: "1px solid rgba(0,171,0,0.2)" }}
            >
              Grow Your Farm
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-6"
              style={{ color: "#ffffff" }}
            >
              Access the inputs that{" "}
              <span style={{ color: "#00ab00" }}>grow your harvest.</span>
            </h2>
            <p
              className="text-lg font-medium leading-relaxed mb-8"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              We connect your group to companies that provide seeds, fertilizer, and tools on credit. Your group's savings record is your proof. You don't need to ask anyone else to sign for you.
            </p>
            <Link
              href="/input-financing"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 group"
              style={{ background: "#00ab00", borderRadius: "6px" }}
            >
              Explore Input Financing
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </Link>
          </div>

          {/* Right: benefit grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map(({ icon: Icon, iconCls, label, desc }, i) => {
              return (
                <div
                  key={i}
                  className="ift-benefit p-5 flex flex-col gap-3"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                >
                  <Icon
                    className={`w-5 h-5 ${iconCls}`}
                    style={{ color: "#00ab00" }}
                  />
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>
                      {label}
                    </div>
                    <div className="text-xs font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {desc}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
