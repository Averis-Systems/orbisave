"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import Link from "next/link"

// 8 members placed around a circle of radius 200 centered at 260,260
const POOL_MEMBERS = [
  { id: 0, initials: "AK", name: "Amara K.",   country: "Kenya",  amount: "KES 5,000", angle: -90  }, // top
  { id: 1, initials: "KO", name: "Kwame O.",   country: "Kenya",  amount: "KES 5,000", angle: -45  },
  { id: 2, initials: "NW", name: "Njeri W.",   country: "Kenya",  amount: "KES 5,000", angle:   0  },
  { id: 3, initials: "KA", name: "Kofi A.",    country: "Ghana",  amount: "KES 5,000", angle:  45  },
  { id: 4, initials: "FM", name: "Fatima M.",  country: "Rwanda", amount: "KES 5,000", angle:  90  }, // bottom
  { id: 5, initials: "DO", name: "David O.",   country: "Kenya",  amount: "KES 5,000", angle: 135  },
  { id: 6, initials: "RK", name: "Rose K.",    country: "Kenya",  amount: "KES 5,000", angle: 180  },
  { id: 7, initials: "JM", name: "James M.",   country: "Rwanda", amount: "KES 5,000", angle: -135 },
]

const CX = 260
const CY = 260
const RING_R = 200

function toRad(deg: number) { return (deg * Math.PI) / 180 }

function memberPos(angle: number) {
  return {
    x: CX + RING_R * Math.cos(toRad(angle)),
    y: CY + RING_R * Math.sin(toRad(angle)),
  }
}

// Cubic bezier arc path from a point to center vault
function arcPath(angle: number): string {
  const { x: sx, y: sy } = memberPos(angle)
  const dx = CX - sx
  const dy = CY - sy
  const cpx1 = sx + dx * 0.3
  const cpy1 = sy + dy * 0.1
  const cpx2 = sx + dx * 0.7
  const cpy2 = sy + dy * 0.9
  return `M${sx},${sy} C${cpx1},${cpy1} ${cpx2},${cpy2} ${CX},${CY}`
}

// Payout arc from center to top (member 0, angle=-90)
const payoutPath = `M${CX},${CY} C${CX + 40},${CY - 100} ${CX - 40},${CY - 150} ${CX},${CY - RING_R}`

export function RotationPool() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [payoutIdx, setPayoutIdx] = useState(0)
  const [vaultTotal, setVaultTotal] = useState(0)
  const [cycle, setCycle] = useState(1)
  const [cycleLabel, setCycleLabel] = useState("Collecting...")
  const activeTokens = useRef<Set<number>>(new Set())

  useGSAP(() => {
    if (typeof window === "undefined") return
    gsap.registerPlugin(MotionPathPlugin)

    const MEMBERS_COUNT = POOL_MEMBERS.length
    let animationKilled = false

    // Entrance: section title
    gsap.from(".pool-heading", {
      y: 40, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: sectionRef.current, start: "top 70%" }
    })

    // Entrance: member nodes stagger in
    gsap.from(".pool-member-node", {
      scale: 0, opacity: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)",
      scrollTrigger: { trigger: sectionRef.current, start: "top 60%" }
    })

    // Vault entrance
    gsap.from(".pool-vault", {
      scale: 0, opacity: 0, duration: 0.8, delay: 0.6, ease: "back.out(1.4)",
      scrollTrigger: { trigger: sectionRef.current, start: "top 60%" }
    })

    // Breathing glow on vault
    gsap.to(".vault-glow", {
      scale: 1.3, opacity: 0.15, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut"
    })

    // Outer ring pulse
    gsap.to(".outer-ring", {
      strokeDashoffset: -40, duration: 8, repeat: -1, ease: "none"
    })

    // ─── Main contribution → payout cycle ───
    function runCycle() {
      if (animationKilled) return

      let total = 0
      const tl = gsap.timeline({
        onComplete: () => {
          if (animationKilled) return
          setTimeout(() => {
            setCycle(c => c + 1)
            runCycle()
          }, 2000)
        }
      })

      setCycleLabel("Collecting contributions...")

      // Tokens travel along each member's arc to the vault
      POOL_MEMBERS.forEach((member, i) => {
        const tokenId = `#pool-token-${member.id}`
        const { x: sx, y: sy } = memberPos(member.angle)

        tl.set(tokenId, { attr: { cx: sx, cy: sy }, opacity: 0, scale: 0 }, i === 0 ? 0 : `>-0.5`)
        tl.to(tokenId, { opacity: 1, scale: 1, duration: 0.15 }, "<")
        tl.to(tokenId, {
          motionPath: {
            path: arcPath(member.angle),
            align: "self",
            autoRotate: false,
            start: 0, end: 1,
          },
          duration: 1.2,
          ease: "power1.inOut",
          onUpdate: function() {
            total = Math.round((total + 5000 / 60))
            setVaultTotal(Math.min(total, MEMBERS_COUNT * 5000))
          }
        }, "<0.1")
        tl.to(tokenId, { opacity: 0, scale: 0, duration: 0.15 }, "-=0.2")
      })

      // Vault fills
      tl.to(".vault-inner", { fill: "#00ab00", duration: 0.5, ease: "power2.inOut" }, "-=0.2")
      tl.call(() => { setCycleLabel("Pool collected. Paying out..."); setVaultTotal(MEMBERS_COUNT * 5000) })

      // Pause, then pay out
      tl.to({}, { duration: 1.2 })

      // Payout token travels from vault to payout member
      const payoutMember = POOL_MEMBERS[payoutIdx]
      const { x: px, y: py } = memberPos(payoutMember.angle)
      const payoutTokenId = "#pool-payout-token"

      tl.set(payoutTokenId, { attr: { cx: CX, cy: CY }, opacity: 0, scale: 0 })
      tl.to(payoutTokenId, { opacity: 1, scale: 1.4, duration: 0.2 })
      tl.to(payoutTokenId, {
        attr: { cx: px, cy: py },
        duration: 1.6, ease: "power2.out"
      }, "<0.1")
      tl.to(payoutTokenId, { opacity: 0, scale: 0, duration: 0.25 }, "-=0.3")
      tl.to(".vault-inner", { fill: "#0a2540", duration: 0.4 }, "<")

      tl.call(() => {
        setCycleLabel("Payout complete ✓")
        setVaultTotal(0)
        setPayoutIdx(prev => (prev + 1) % MEMBERS_COUNT)
      })

      return tl
    }

    // Start after entrance
    ScrollTriggerStart()
    function ScrollTriggerStart() {
      const st = gsap.to({}, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 50%",
          once: true,
          onEnter: () => { setTimeout(runCycle, 1200) }
        }
      })
    }

    return () => { animationKilled = true; gsap.killTweensOf("*") }
    // Ensure all ScrollTriggers are refreshed after layout
    ScrollTrigger.refresh()
  }, { scope: sectionRef })

  const currentPayout = POOL_MEMBERS[payoutIdx]

  return (
    <section
      ref={sectionRef}
      className="py-28 lg:py-44 bg-[#0a2540] relative overflow-hidden"
    >
      {/* Background dot pattern */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "36px 36px" }}
      />

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00ab00]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="pool-heading text-center mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold tracking-[0.3em] text-[#00ab00] uppercase">
            Live Rotation Engine
          </div>
          <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter text-white leading-tight">
            Watch the Cycle Run
          </h2>
          <p className="text-lg text-white/50 font-medium max-w-xl mx-auto">
            Every member contributes. The pool grows. OrbiSave automatically
            pays out to the next person in rotation — no manual work, no missing funds.
          </p>
        </div>

        {/* Main layout: SVG + info panel */}
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* SVG Visualizer */}
          <div className="flex-1 flex items-center justify-center">
            <svg viewBox="0 0 520 520" className="w-full max-w-[520px]" aria-label="Rotation pool visualizer">
              <defs>
                <radialGradient id="vaultGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00ab00" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0a2540" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Outer decorative ring */}
              <circle className="outer-ring" cx={CX} cy={CY} r={RING_R + 30}
                fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 12" />

              {/* Member orbit ring */}
              <circle cx={CX} cy={CY} r={RING_R}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              {/* Arc connector paths (faint) */}
              {POOL_MEMBERS.map(m => (
                <path key={`arc-${m.id}`}
                  d={arcPath(m.angle)}
                  stroke="rgba(0,171,0,0.08)" strokeWidth="1" fill="none"
                  strokeDasharray="4 8"
                />
              ))}

              {/* Payout arc (green, faint) */}
              <path d={payoutPath}
                stroke="rgba(0,171,0,0.15)" strokeWidth="1.5" fill="none" strokeDasharray="6 6" />

              {/* Vault glow */}
              <circle className="vault-glow" cx={CX} cy={CY} r={70}
                fill="url(#vaultGrad)" opacity={0.3} />

              {/* Vault circle */}
              <g className="pool-vault">
                <circle className="vault-inner" cx={CX} cy={CY} r={55}
                  fill="#0a2540" stroke="rgba(0,171,0,0.3)" strokeWidth="2" />
                <text x={CX} y={CY - 12} textAnchor="middle"
                  fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="sans-serif"
                  fontWeight="700" letterSpacing="2">COLLECTIVE VAULT</text>
                <text x={CX} y={CY + 8} textAnchor="middle"
                  fill="#ffffff" fontSize="13" fontFamily="sans-serif" fontWeight="900">
                  {vaultTotal === 0 ? "—" : `KES ${(vaultTotal / 1000).toFixed(0)}K`}
                </text>
                <text x={CX} y={CY + 22} textAnchor="middle"
                  fill="rgba(0,171,0,0.8)" fontSize="7" fontFamily="sans-serif"
                  fontWeight="700" letterSpacing="1">CYCLE {cycle}</text>
              </g>

              {/* Member nodes */}
              {POOL_MEMBERS.map((member) => {
                const { x, y } = memberPos(member.angle)
                const isPayout = member.id === currentPayout.id
                return (
                  <g key={member.id} className="pool-member-node">
                    {/* Pulse ring on payout member */}
                    {isPayout && (
                      <circle cx={x} cy={y} r={32}
                        fill="none" stroke="rgba(0,171,0,0.3)" strokeWidth="1.5"
                        style={{ animation: "poolPulse 2s ease-out infinite" }} />
                    )}
                    <circle cx={x} cy={y} r={24}
                      fill={isPayout ? "#00ab00" : "rgba(255,255,255,0.06)"}
                      stroke={isPayout ? "#00ab00" : "rgba(255,255,255,0.15)"}
                      strokeWidth="1.5" />
                    <text x={x} y={y + 5} textAnchor="middle"
                      fill={isPayout ? "#ffffff" : "rgba(255,255,255,0.8)"}
                      fontSize="10" fontFamily="sans-serif" fontWeight="800">
                      {member.initials}
                    </text>
                    {/* Amount badge on non-payout members */}
                    {!isPayout && (
                      <text x={x} y={y + 42} textAnchor="middle"
                        fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="sans-serif" fontWeight="600">
                        {member.amount}
                      </text>
                    )}
                    {/* "NEXT PAYOUT" badge on payout member */}
                    {isPayout && (
                      <>
                        <rect x={x - 34} y={y - 46} width={68} height={16} rx={4} fill="#00ab00" />
                        <text x={x} y={y - 33} textAnchor="middle"
                          fill="#ffffff" fontSize="7" fontFamily="sans-serif" fontWeight="800" letterSpacing="0.8">
                          NEXT PAYOUT
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

              {/* Animated contribution tokens */}
              {POOL_MEMBERS.map(m => (
                <circle key={`token-${m.id}`} id={`pool-token-${m.id}`}
                  r={6} fill="#00ab00" opacity={0}
                  style={{ filter: "drop-shadow(0 0 4px rgba(0,171,0,0.8))" }}
                />
              ))}

              {/* Payout token */}
              <circle id="pool-payout-token"
                r={8} fill="#00ab00" opacity={0}
                style={{ filter: "drop-shadow(0 0 8px rgba(0,171,0,0.9))" }}
              />
            </svg>
          </div>

          {/* Info panel */}
          <div className="lg:w-[340px] space-y-6">
            {/* Live status card */}
            <div className="bg-white/5 border border-white/10 rounded-[8px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase">Live Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#00ab00] animate-pulse" />
                  <span className="text-[9px] font-black text-[#00ab00] tracking-widest uppercase">Active</span>
                </div>
              </div>
              <p className="text-base font-bold text-white">{cycleLabel}</p>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00ab00] rounded-full transition-all duration-500"
                  style={{ width: vaultTotal === 0 ? "0%" : `${Math.min(100, (vaultTotal / (POOL_MEMBERS.length * 5000)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/30 font-bold uppercase tracking-wider">
                <span>0</span>
                <span>KES {(POOL_MEMBERS.length * 5000).toLocaleString()}</span>
              </div>
            </div>

            {/* Next payout */}
            <div className="bg-white/5 border border-[#00ab00]/20 rounded-[8px] p-6 space-y-3">
              <div className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase">Next Payout</div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00ab00] flex items-center justify-center text-white font-black text-sm">
                  {currentPayout.initials}
                </div>
                <div>
                  <div className="text-base font-bold text-white">{currentPayout.name}</div>
                  <div className="text-xs text-white/40">{currentPayout.country} · Cycle {cycle}</div>
                </div>
              </div>
              <div className="text-2xl font-black text-[#00ab00]">KES 40,000</div>
              <div className="text-xs text-white/30">= 8 members × KES 5,000</div>
            </div>

            {/* Members list */}
            <div className="bg-white/5 border border-white/10 rounded-[8px] p-5 space-y-3">
              <div className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase mb-3">Rotation Order</div>
              {POOL_MEMBERS.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${i === payoutIdx ? "bg-[#00ab00] text-white" : "bg-white/10 text-white/40"}`}>
                    {i + 1}
                  </div>
                  <div className={`text-xs font-bold ${i === payoutIdx ? "text-white" : "text-white/40"}`}>{m.name}</div>
                  {i === payoutIdx && <div className="ml-auto text-[9px] font-black text-[#00ab00] uppercase tracking-wider">This cycle</div>}
                </div>
              ))}
            </div>

            <Link href="/chama-onboarding">
              <button className="w-full h-[52px] bg-[#00ab00] text-white font-bold rounded-[8px] flex items-center justify-center gap-2 hover:bg-[#009900] transition-colors mt-2">
                Start Your Group's Cycle
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Inject pulse keyframes */}
      <style>{`
        @keyframes poolPulse {
          0% { r: 32; opacity: 0.5; }
          100% { r: 48; opacity: 0; }
        }
      `}</style>
    </section>
  )
}
