"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { CheckCircle2, Clock } from "lucide-react"
import { gsap } from "@/lib/gsap-init"

import { ORBITAL_MEMBERS, PAST, ROTATION_QUEUE } from "@/lib/demo-data"

// Navy vault colors
const SVG_CX = 220, SVG_CY = 220, SVG_R = 160
const POOL_MEMBERS = ORBITAL_MEMBERS.map((m, i) => {
  const angles = [-90, -30, 30, 90, 150, 210]
  const angle = angles[i] || 0
  return {
    ...m,
    id: m.id,
    angle,
    x: Math.round(SVG_CX + SVG_R * Math.cos((angle * Math.PI) / 180)),
    y: Math.round(SVG_CY + SVG_R * Math.sin((angle * Math.PI) / 180)),
  }
})

export function RotationVisualizer() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".viz-header",
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%", once: true },
      }
    )
    gsap.fromTo(".viz-pool-wrap",
      { opacity: 0, scale: 0.93 },
      {
        opacity: 1, scale: 1, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      }
    )
    gsap.fromTo(".viz-queue-item",
      { x: 28, opacity: 0 },
      {
        x: 0, opacity: 1, stagger: 0.09, duration: 0.65, ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 68%", once: true },
      }
    )

    // Contribution dashes flow inward
    gsap.to(".rv-contrib-line", {
      strokeDashoffset: -16, duration: 2, repeat: -1, ease: "none",
    })
    // Payout dash flows outward
    gsap.to(".rv-payout-line", {
      strokeDashoffset: 16, duration: 1.6, repeat: -1, ease: "none",
    })

    // Contribution tokens
    const contributors = POOL_MEMBERS.filter(m => !m.isPayout)
    contributors.forEach((m, i) => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 4, delay: i * 0.6 + 0.5 })
      tl.set(`#rv-token-${m.id}`, { attr: { cx: m.x, cy: m.y }, opacity: 0 })
      tl.to(`#rv-token-${m.id}`, { opacity: 1, duration: 0.2 })
      tl.to(`#rv-token-${m.id}`, { attr: { cx: SVG_CX, cy: SVG_CY }, duration: 1.8, ease: "power1.inOut" }, "<0.05")
      tl.to(`#rv-token-${m.id}`, { opacity: 0, duration: 0.25 }, "-=0.3")
    })

    // Payout token
    const payout = POOL_MEMBERS.find(m => m.isPayout)!
    const ptl = gsap.timeline({ repeat: -1, repeatDelay: 4, delay: 5 })
    ptl.set("#rv-token-payout", { attr: { cx: SVG_CX, cy: SVG_CY }, opacity: 0 })
    ptl.to("#rv-token-payout", { opacity: 1, duration: 0.25 })
    ptl.to("#rv-token-payout", { attr: { cx: payout.x, cy: payout.y }, duration: 2, ease: "power2.out" }, "<0.05")
    ptl.to("#rv-token-payout", { opacity: 0, duration: 0.4 }, "-=0.3")

    // Payout ring pulse
    gsap.to("#rv-payout-pulse", {
      attr: { r: 38 }, opacity: 0, duration: 1.8, repeat: -1, ease: "power2.out",
    })
    // Vault glow breathing
    gsap.to("#rv-vault-glow", {
      attr: { r: 58 }, opacity: 0.35, duration: 2.5, yoyo: true, repeat: -1, ease: "sine.inOut",
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 overflow-hidden" style={{ background: "#ffffff" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="viz-header text-center max-w-2xl mx-auto mb-16">
          <div
            className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5"
            style={{ color: "#0a2540", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}
          >
            Fair and Simple
          </div>
          <h2
            className="text-3xl sm:text-4xl font-black tracking-tight"
            style={{ color: "#0a2540" }}
          >
            Everyone Gets Their Turn.
          </h2>
          <p className="mt-5 text-base font-medium leading-relaxed max-w-xl mx-auto" style={{ color: "#4a5c6a" }}>
            The order of who gets paid is set at the start. No one can skip the line or play favorites. Everything is fair, fixed, and clear for everyone to see.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left: Pool SVG */}
          <div className="viz-pool-wrap flex flex-col items-center">
            <div className="relative w-full" style={{ maxWidth: "460px" }}>
              <svg
                viewBox="0 0 440 440"
                className="w-full"
                aria-label="Rotation pool visualization"
              >
                {/* Ring */}
                <circle cx={SVG_CX} cy={SVG_CY} r="170" fill="none" stroke="rgba(10,37,64,0.07)" strokeWidth="1" strokeDasharray="3 8" />

                {/* Contribution lines */}
                {POOL_MEMBERS.filter(m => !m.isPayout).map(m => (
                  <line
                    key={`rv-line-${m.id}`}
                    className="rv-contrib-line"
                    x1={m.x} y1={m.y} x2={SVG_CX} y2={SVG_CY}
                    stroke="rgba(10,37,64,0.12)" strokeWidth="1" strokeDasharray="4 4"
                  />
                ))}

                {/* Payout line — green */}
                {POOL_MEMBERS.filter(m => m.isPayout).map(m => (
                  <line
                    key="rv-payout-l"
                    className="rv-payout-line"
                    x1={SVG_CX} y1={SVG_CY} x2={m.x} y2={m.y}
                    stroke="rgba(0,171,0,0.7)" strokeWidth="1.5" strokeDasharray="6 4"
                  />
                ))}

                {/* Vault glow — navy */}
                <circle id="rv-vault-glow" cx={SVG_CX} cy={SVG_CY} r="46" fill="rgba(10,37,64,0.15)" opacity="0.2" />

                {/* Vault — navy */}
                <circle cx={SVG_CX} cy={SVG_CY} r="44" fill="#0a2540" />
                <circle cx={SVG_CX} cy={SVG_CY} r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                <text x={SVG_CX} y={SVG_CY - 9} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontWeight="600" letterSpacing="1.5">VAULT</text>
                <text x={SVG_CX} y={SVG_CY + 10} textAnchor="middle" fill="white" fontSize="15" fontWeight="700">1.2M</text>
                <text x={SVG_CX} y={SVG_CY + 22} textAnchor="middle" fill="rgba(0,171,0,0.9)" fontSize="7" fontWeight="600">KES</text>

                {/* Payout ring — green pulse */}
                <circle id="rv-payout-pulse" cx={POOL_MEMBERS[0].x} cy={POOL_MEMBERS[0].y} r="27" fill="none" stroke="rgba(0,171,0,0.45)" strokeWidth="1.5" />

                {/* Member nodes */}
                {POOL_MEMBERS.map(m => (
                  <g key={`rv-node-${m.id}`}>
                    <circle
                      cx={m.x} cy={m.y} r="22"
                      fill={m.isPayout ? "#0a2540" : "#ffffff"}
                      stroke={m.isPayout ? "#00ab00" : "#d6e4df"}
                      strokeWidth={m.isPayout ? "2.5" : "1.2"}
                    />
                    <text
                      x={m.x} y={m.y + 5}
                      textAnchor="middle"
                      fill={m.isPayout ? "#00ab00" : "#4a5c6a"}
                      fontSize="10.5" fontWeight="700"
                    >
                      {m.initials}
                    </text>
                  </g>
                ))}

                {/* Payout badge — green */}
                <rect x={POOL_MEMBERS[0].x - 36} y={POOL_MEMBERS[0].y - 50} width="72" height="16" rx="4" fill="#00ab00" />
                <text x={POOL_MEMBERS[0].x} y={POOL_MEMBERS[0].y - 39} textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="800" letterSpacing="0.8">RECEIVES PAYOUT</text>

                {/* Animated tokens */}
                {POOL_MEMBERS.filter(m => !m.isPayout).map(m => (
                  <circle key={`rv-token-${m.id}`} id={`rv-token-${m.id}`} cx={m.x} cy={m.y} r="5" fill="#00ab00" opacity="0" />
                ))}
                <circle id="rv-token-payout" cx={SVG_CX} cy={SVG_CY} r="6.5" fill="#00ab00" opacity="0" />
              </svg>
            </div>

            {/* Pool stat chips */}
            <div className="flex gap-3 w-full max-w-[460px] mt-1">
              {[
                { label: "Members",      value: "6",        color: "#0a2540" },
                { label: "Cycles Total", value: "8",        color: "#0a2540" },
                { label: "Per Payout",   value: "KES 48.5K", color: "#00ab00" },
              ].map(s => (
                <div
                  key={s.label}
                  className="flex-1 px-4 py-3 text-center"
                  style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #d6e4df" }}
                >
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-wide mt-0.5"
                    style={{ color: "#4a5c6a" }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Queue */}
          <div className="viz-queue flex flex-col gap-2.5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg" style={{ color: "#0a2540" }}>Rotation Queue</h3>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1"
                style={{ background: "#e9f3ed", color: "#4a5c6a", borderRadius: "4px", border: "1px solid #d6e4df" }}
              >
                Fixed Turn Order
              </span>
            </div>

            {/* Past */}
            {PAST.map((p, i) => (
              <div
                key={i}
                className="viz-queue-item flex items-center gap-3 p-3.5"
                style={{ borderRadius: "6px", border: "1px solid #d6e4df", background: "#f7f9f8" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "#e9f3ed", color: "#4a5c6a", border: "1px solid #d6e4df" }}
                >
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold" style={{ color: "#4a5c6a" }}>{p.name}</span>
                  <span className="text-xs ml-2" style={{ color: "#9ab09a" }}>{p.cycle}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#4a5c6a" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00ab00" }} />
                  {p.amount}
                </div>
              </div>
            ))}

            {/* Active + upcoming */}
            {ROTATION_QUEUE.map((m) => (
              <div
                key={m.position}
                className={`viz-queue-item flex items-center gap-3 p-3.5 transition-all`}
                style={{
                  borderRadius: "6px",
                  border: `1px solid ${m.status === "current" ? "#00ab00" : "#d6e4df"}`,
                  background: m.status === "current" ? "#e9f3ed" : "#ffffff",
                }}
              >
                {/* Position badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}
                  style={{
                    background: m.status === "current" ? "#00ab00" : "#f7f9f8",
                    color: m.status === "current" ? "#ffffff" : "#4a5c6a",
                    border: `1px solid ${m.status === "current" ? "#00ab00" : "#d6e4df"}`,
                  }}
                >
                  {m.status === "current" ? "↓" : m.position}
                </div>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: m.status === "current" ? "#0a2540" : "#e9f3ed",
                    color: m.status === "current" ? "#ffffff" : "#4a5c6a",
                    border: `2px solid ${m.status === "current" ? "#00ab00" : "#d6e4df"}`,
                  }}
                >
                  {m.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold truncate" style={{ color: "#0a2540" }}>{m.name}</span>
                    <span className="text-sm">{m.country}</span>
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "#4a5c6a" }}>
                    {m.cycle} · {m.amount}
                  </div>
                </div>

                {/* Status */}
                {m.status === "current" ? (
                  <div
                    className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 flex-shrink-0"
                    style={{ background: "#00ab00", color: "#ffffff", borderRadius: "4px" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Getting Paid
                  </div>
                ) : (
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#d6e4df" }} />
                )}
              </div>
            ))}

            <p
              className="text-xs font-medium mt-1 leading-relaxed pl-3"
              style={{ color: "#4a5c6a", borderLeft: "2px solid #00ab00" }}
            >
              The turn order is fixed and cannot be changed by one person. Everyone in the group can see the turn list anytime on their phone.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
