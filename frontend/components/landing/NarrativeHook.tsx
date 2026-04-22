"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Users, TrendingUp, ShieldCheck } from "lucide-react"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

const STATS = [
  { value: "47M+", label: "People in African savings groups", icon: Users },
  { value: "KES 800B", label: "Pooled annually across East Africa", icon: TrendingUp },
  { value: "0%", label: "With a verified digital credit record", icon: ShieldCheck },
]

export function NarrativeHook() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Lines reveal sequentially
    gsap.fromTo(".narrative-line",
      { y: 32, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.18, duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 78%", once: true },
      }
    )
    // Stat counters slide up
    gsap.fromTo(".narrative-stat",
      { y: 24, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 60%", once: true },
      }
    )
    // Icon animations
    gsap.fromTo(".stat-icon-users",
      { scale: 0.6, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)",
        scrollTrigger: { trigger: ref.current, start: "top 60%", once: true },
      }
    )
    gsap.to(".stat-icon-trending", {
      y: -3, duration: 2, yoyo: true, repeat: -1, ease: "sine.inOut",
    })
    gsap.fromTo(".stat-icon-shield",
      { scale: 0.5, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)",
        scrollTrigger: { trigger: ref.current, start: "top 60%", once: true },
      }
    )
    // Divider line draw
    gsap.fromTo(".narrative-divider",
      { scaleX: 0 },
      {
        scaleX: 1, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 72%", once: true },
      }
    )
  }, { scope: ref })

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 relative overflow-hidden"
      style={{
        background: "#ffffff",
      }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(10,37,64,0.05) 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Eyebrow */}
        <div className="narrative-line inline-flex items-center gap-2 mb-8">
          <span
            className="text-xs font-bold tracking-[0.15em] uppercase px-3 py-1.5"
            style={{
              color: "#00ab00",
              background: "#e9f3ed",
              borderRadius: "4px",
              border: "1px solid #d6e4df",
            }}
          >
            The Problem We Solve
          </span>
        </div>

        {/* Story block */}
        <div className="max-w-4xl">
          <p
            className="narrative-line text-2xl sm:text-3xl lg:text-4xl font-bold leading-[1.25] tracking-tight mb-6"
            style={{ color: "#0a2540" }}
          >
            For generations, farmers, fishers, and families across Africa have pooled their money together.
          </p>
          <p
            className="narrative-line text-lg sm:text-xl lg:text-2xl font-medium leading-relaxed mb-6"
            style={{ color: "#4a5c6a" }}
          >
            Weekly savings. Monthly rotations. Loans between neighbors. The group savings model has lifted millions out of poverty, built entirely on trust and tradition.
          </p>

          {/* Divider with tension */}
          <div
            className="narrative-divider h-px w-full mb-6 origin-left"
            style={{ background: "#d6e4df" }}
          />

          <p
            className="narrative-line text-lg sm:text-xl font-medium leading-relaxed mb-4"
            style={{ color: "#4a5c6a" }}
          >
            But cash in a tin leaks. A notebook ledger is one dispute away from collapse.
            A missing treasurer can erase years of savings.
          </p>
          <p
            className="narrative-line text-xl sm:text-2xl lg:text-3xl font-bold leading-tight"
            style={{ color: "#0a2540" }}
          >
            OrbiSave doesn't change your group.{" "}
            <span style={{ color: "#00ab00" }}>It makes it unbreakable.</span>
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-16 narrative-stat"
          style={{ background: "#d6e4df", borderRadius: "8px", overflow: "hidden" }}
        >
          {STATS.map(({ value, label, icon: Icon }, i) => {
            const iconClasses = [
              "stat-icon-users",
              "stat-icon-trending icon-bounce",
              "stat-icon-shield",
            ]
            return (
              <div
                key={i}
                className="flex flex-col gap-3 px-6 py-7"
                style={{ background: "#ffffff" }}
              >
                <Icon
                  className={`w-5 h-5 ${iconClasses[i]}`}
                  style={{ color: "#00ab00" }}
                />
                <div>
                  <div
                    className="text-3xl font-black tracking-tight mb-1"
                    style={{ color: "#0a2540" }}
                  >
                    {value}
                  </div>
                  <div className="text-sm font-medium" style={{ color: "#4a5c6a" }}>
                    {label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
