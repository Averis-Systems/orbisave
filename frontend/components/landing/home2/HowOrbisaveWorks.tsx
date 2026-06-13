"use client"

import { useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import {
  UserCheck, Lock, Smartphone, RefreshCcw,
  ArrowRight, CheckCircle2, Shield, ChevronRight
} from "lucide-react"
import Link from "next/link"

const STEPS = [
  {
    id: 1,
    label: "Identity",
    title: "Chairperson Registers & KYCs",
    desc: "The group leader completes biometric identity verification in under 5 minutes. Once verified, they configure the group — name, contribution amount, payout frequency, and loan pool percentage.",
    tags: ["Biometric KYC", "Group Rules", "Governance"],
    icon: UserCheck,
    status: "VERIFIED",
    mock: {
      type: "kyc",
      title: "Identity Verified",
      lines: [
        { label: "Full Name", value: "David Omondi" },
        { label: "ID Number", value: "KE•••••2841" },
        { label: "KYC Status", value: "✓ Verified", green: true },
        { label: "Group Role", value: "Chairperson" },
      ]
    }
  },
  {
    id: 2,
    label: "Bank Custody",
    title: "A Regulated Trust Account is Created",
    desc: "OrbiSave automatically creates a dedicated Trust Account at a licensed partner bank. Your group's funds are ring-fenced in regulated custody — they never touch OrbiSave's own accounts.",
    tags: ["KCB / Equity / MTN", "Ring-Fenced", "Regulated"],
    icon: Lock,
    status: "VAULT OPEN",
    mock: {
      type: "bank",
      title: "Trust Account Active",
      lines: [
        { label: "Partner Bank", value: "KCB Bank Kenya" },
        { label: "Account Type", value: "Group Trust A/C" },
        { label: "Status", value: "✓ Active", green: true },
        { label: "Balance", value: "KES 0.00" },
      ]
    }
  },
  {
    id: 3,
    label: "Members",
    title: "Members Join & Authorize STK Push",
    desc: "The Chairperson shares an invite link or code. Each member registers, passes a light KYC check, and authorizes an STK Push standing order. From that point, collections are fully automatic.",
    tags: ["Invite Link", "STK Push", "Auto-Collection"],
    icon: Smartphone,
    status: "SYNCED",
    mock: {
      type: "stk",
      title: "STK Push Authorized",
      lines: [
        { label: "Member", value: "Grace Akinyi" },
        { label: "Phone", value: "0712•••678" },
        { label: "M-Pesa STK", value: "✓ Authorized", green: true },
        { label: "Contribution", value: "KES 5,000 / mo" },
      ]
    }
  },
  {
    id: 4,
    label: "Automation",
    title: "The Trust Engine Runs Automatically",
    desc: "At each cycle interval, OrbiSave triggers STK pushes for all members, records every transaction in the immutable ledger, applies any penalties, and automatically disburses the pooled funds to the next scheduled member.",
    tags: ["Auto-Payout", "Immutable Ledger", "Harvest Cycle"],
    icon: RefreshCcw,
    status: "RUNNING",
    mock: {
      type: "ledger",
      title: "Cycle 3 Complete",
      lines: [
        { label: "Collected", value: "KES 40,000", green: true },
        { label: "Recipient", value: "Amara K." },
        { label: "Payout", value: "KES 38,800", green: true },
        { label: "Service Fee", value: "KES 1,200" },
      ]
    }
  },
]

export function HowOrbisaveWorks() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  useGSAP(() => {
    // Heading entrance
    gsap.from(".how-heading", {
      y: 40, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: containerRef.current, start: "top 70%" }
    })

    // Step cards stagger in from left
    gsap.from(".how-step-row", {
      x: -40, opacity: 0, duration: 0.7, stagger: 0.15, ease: "power2.out",
      scrollTrigger: { trigger: containerRef.current, start: "top 60%" }
    })

    // Mock panel entrance
    gsap.from(".how-mock-panel", {
      x: 40, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: containerRef.current, start: "top 60%" }
    })

    // Connector line draw-in via strokeDashoffset
    gsap.from(".how-connector", {
      scaleY: 0, transformOrigin: "top center",
      duration: 0.5, stagger: 0.15, ease: "power2.out",
      scrollTrigger: { trigger: containerRef.current, start: "top 60%" }
    })

    // Pulse dot loop on connector
    gsap.to(".connector-pulse", {
      y: "100%",
      keyframes: { opacity: [0, 1, 1, 0] },
      duration: 2,
      repeat: -1, ease: "none", stagger: { each: 0.5, repeat: -1 }
    })

    // Ensure all ScrollTriggers are refreshed after layout
    ScrollTrigger.refresh()
  }, { scope: containerRef })

  const step = STEPS[activeStep]

  return (
    <section
      ref={containerRef}
      className="py-24 lg:py-40 overflow-hidden relative"
      style={{ background: "#dcf6d4" }}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(#0a2540 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">

        {/* Header */}
        <div className="how-heading text-center mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/70 border border-[#00ab00]/20 rounded-full text-[10px] font-bold tracking-[0.25em] text-[#00ab00] uppercase">
            Platform Workflow
          </div>
          <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter text-[#0a2540] leading-tight">
            How OrbiSave Works
          </h2>
          <p className="text-lg text-[#4a5c6a] font-medium max-w-xl mx-auto leading-relaxed">
            Four automated steps take your community group from a physical notebook
            to a regulated, bank-grade digital savings engine.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">

          {/* Left: Steps */}
          <div className="flex-1 space-y-0">
            {STEPS.map((s, i) => {
              const isActive = i === activeStep
              const isLast = i === STEPS.length - 1
              return (
                <div key={s.id} className="how-step-row flex gap-6">

                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setActiveStep(i)}
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                        isActive
                          ? "bg-[#0a2540] text-white shadow-lg shadow-[#0a2540]/20 scale-110"
                          : "bg-white text-[#0a2540] border border-gray-200"
                      }`}
                    >
                      {/* Outer pulse on active */}
                      {isActive && (
                        <span className="absolute inset-0 rounded-full bg-[#00ab00]/20 animate-ping" />
                      )}
                      <s.icon size={20} className="relative z-10" />
                    </button>

                    {/* Connector */}
                    {!isLast && (
                      <div className="how-connector relative w-px flex-1 my-2 bg-gray-200 min-h-[60px]">
                        <div className="absolute inset-0 border-l-2 border-dashed border-[#00ab00]/30" />
                        {isActive && (
                          <div className="connector-pulse absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#00ab00]" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div
                    onClick={() => setActiveStep(i)}
                    className={`flex-1 text-left pb-8 transition-all duration-300 cursor-pointer ${isLast ? "pb-0" : ""}`}
                  >
                    <div className={`rounded-[8px] p-6 transition-all duration-300 ${
                      isActive
                        ? "bg-white shadow-lg border border-[#00ab00]/20"
                        : "hover:bg-white/50"
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[9px] font-black tracking-[0.3em] text-[#4a5c6a]/50 uppercase">
                          Step {s.id} · {s.label}
                        </span>
                        {isActive && (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ab00] animate-pulse" />
                            <span className="text-[9px] font-black text-[#00ab00] tracking-widest uppercase">{s.status}</span>
                          </div>
                        )}
                      </div>
                      <h3 className={`text-lg font-bold leading-snug mb-2 transition-colors ${isActive ? "text-[#0a2540]" : "text-[#0a2540]/70"}`}>
                        {s.title}
                      </h3>
                      {isActive && (
                        <p className="text-sm text-[#4a5c6a] leading-relaxed mb-4">
                          {s.desc}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {s.tags.map(tag => (
                          <span key={tag} className={`text-[9px] font-black px-2.5 py-1 rounded-[4px] uppercase tracking-widest border transition-colors ${
                            isActive
                              ? "bg-[#e9f3ed] text-[#00ab00] border-[#00ab00]/20"
                              : "bg-white/50 text-[#4a5c6a]/60 border-gray-100"
                          }`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: Mock UI panel */}
          <div className="how-mock-panel lg:w-[400px] lg:sticky lg:top-32">
            <div className="bg-white rounded-[8px] border border-gray-200 shadow-2xl overflow-hidden">

              {/* Panel header bar */}
              <div className="bg-[#0a2540] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase">OrbiSave Platform</span>
                </div>
                <Shield size={14} className="text-[#00ab00]" />
              </div>

              {/* Step indicator */}
              <div className="px-6 py-3 bg-[#f8fafc] border-b border-gray-100 flex gap-1">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-500 ${i === activeStep ? "bg-[#00ab00]" : "bg-gray-200"}`} />
                ))}
              </div>

              {/* Mock content */}
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[#e9f3ed] flex items-center justify-center text-[#00ab00]">
                    <step.icon size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-[#4a5c6a]/40 uppercase tracking-widest">Step {step.id}</div>
                    <div className="text-base font-bold text-[#0a2540]">{step.mock.title}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {step.mock.lines.map((line, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50">
                      <span className="text-xs font-medium text-[#4a5c6a]/70">{line.label}</span>
                      <span className={`text-xs font-bold ${(line as any).green ? "text-[#00ab00]" : "text-[#0a2540]"}`}>
                        {line.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <CheckCircle2 size={16} className="text-[#00ab00]" />
                  <span className="text-xs font-bold text-[#0a2540]">Secured by OrbiSave Trust Engine</span>
                </div>
              </div>

              {/* Navigation */}
              <div className="px-6 pb-6 flex items-center justify-between">
                <button
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="text-xs font-bold text-[#4a5c6a] disabled:opacity-30 hover:text-[#0a2540] transition-colors"
                >
                  ← Previous
                </button>
                {activeStep < STEPS.length - 1 ? (
                  <button
                    onClick={() => setActiveStep(activeStep + 1)}
                    className="flex items-center gap-2 h-9 px-5 bg-[#0a2540] text-white text-xs font-bold rounded-[6px] hover:bg-[#00ab00] transition-colors"
                  >
                    Next Step <ChevronRight size={14} />
                  </button>
                ) : (
                  <Link href="/chama-onboarding">
                    <button className="flex items-center gap-2 h-9 px-5 bg-[#00ab00] text-white text-xs font-bold rounded-[6px]">
                      Get Started <ArrowRight size={14} />
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Trust note below panel */}
            <div className="mt-4 flex items-center gap-2 justify-center text-[11px] text-[#4a5c6a]/60 font-medium">
              <Shield size={12} className="text-[#00ab00]" />
              Funds held in regulated bank trust accounts. Not by OrbiSave.
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/chama-onboarding">
            <button className="h-[52px] px-10 bg-[#0a2540] text-white font-bold rounded-[8px] inline-flex items-center gap-2 hover:bg-[#00ab00] transition-colors duration-300">
              Start Your Group <ArrowRight size={18} />
            </button>
          </Link>
          <Link href="/how-loaning-works">
            <button className="h-[52px] px-10 bg-white text-[#0a2540] font-bold rounded-[8px] inline-flex items-center gap-2 border border-gray-200 hover:border-[#00ab00] hover:text-[#00ab00] transition-colors duration-300">
              Learn About Loans
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
