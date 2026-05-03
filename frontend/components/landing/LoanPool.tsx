"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { CheckCircle2, Clock, Lock, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"
import { gsap } from "@/lib/gsap-init"

const APPROVAL_STEPS = [
  {
    role: "Chairperson",
    initials: "CH",
    action: "Checks if the loan is okay for the member",
    status: "approved",
    pin: "Approved with PIN",
  },
  {
    role: "Treasurer",
    initials: "TR",
    action: "Checks if the group has enough money",
    status: "approved",
    pin: "Approved with PIN",
  },
  {
    role: "Platform Admin",
    initials: "AD",
    action: "Final safety check for the group",
    status: "pending",
    pin: "Automatic for small amounts",
  },
]

export function LoanPool() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".loan-header",
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 82%", once: true },
      }
    )
    gsap.fromTo(".loan-left",
      { y: 28, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.85, ease: "power2.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 76%", once: true },
      }
    )
    gsap.fromTo(".loan-right",
      { y: 28, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.85, ease: "power2.out", delay: 0.1,
        scrollTrigger: { trigger: containerRef.current, start: "top 76%", once: true },
      }
    )
    gsap.fromTo(".pool-bar-rotation",
      { width: 0 },
      {
        width: "70%", duration: 1.5, ease: "power3.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 70%", once: true },
      }
    )
    gsap.fromTo(".pool-bar-loans",
      { width: 0 },
      {
        width: "30%", duration: 1.5, ease: "power3.out", delay: 0.15,
        scrollTrigger: { trigger: containerRef.current, start: "top 70%", once: true },
      }
    )
    gsap.fromTo(".approval-step",
      { x: 20, opacity: 0 },
      {
        x: 0, opacity: 1, stagger: 0.14, duration: 0.65, ease: "power2.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 65%", once: true },
      }
    )
    // Icon animations
    gsap.to(".loan-icon-trend", {
      y: -3, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut",
    })
    gsap.fromTo(".loan-icon-lock",
      { scale: 0.6, opacity: 0 },
      {
        scale: 1, opacity: 1, stagger: 0.08, duration: 0.5, ease: "back.out(2)",
        scrollTrigger: { trigger: containerRef.current, start: "top 65%", once: true },
      }
    )
  }, { scope: containerRef })

  return (
    <section
      ref={containerRef}
      className="py-24 lg:py-32 overflow-hidden relative"
      style={{ background: "#e9f3ed" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="loan-header text-center max-w-2xl mx-auto mb-16">
          <div
            className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5"
            style={{ color: "#00ab00", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}
          >
            Emergency Money
          </div>
          <h2
            className="text-3xl sm:text-4xl font-black tracking-tight mb-4"
            style={{ color: "#0a2540" }}
          >
            Money Set Aside for You.
          </h2>
          <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
            We set aside 30% of the group's money for loans. If you need money for an emergency or to grow your business, you can borrow from the group easily and safely.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* Left: Pool split + interest */}
          <div className="loan-left flex flex-col gap-5">

            {/* 70/30 bar */}
            <div
              className="p-6"
              style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base" style={{ color: "#0a2540" }}>
                  Pool Allocation (Cycle 3)
                </h3>
                <span
                  className="text-xs font-semibold px-2.5 py-1"
                  style={{ background: "#e9f3ed", color: "#4a5c6a", borderRadius: "4px", border: "1px solid #d6e4df" }}
                >
                  Total: KES 60,000
                </span>
              </div>
              <div className="flex flex-col gap-5">
                {/* Rotation savings bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#0a2540" }} />
                      <span className="text-sm font-semibold" style={{ color: "#0f1924" }}>Big Payouts</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold" style={{ color: "#0f1924" }}>KES 42,000</span>
                      <span className="text-xs ml-1.5" style={{ color: "#4a5c6a" }}>70%</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#e9f3ed" }}>
                    <div className="pool-bar-rotation h-full rounded-full" style={{ background: "#0a2540" }} />
                  </div>
                  <p className="text-xs mt-1.5 font-medium" style={{ color: "#4a5c6a" }}>Disbursed to Amara K. this cycle</p>
                </div>
                {/* Loan reserve bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#00ab00" }} />
                      <span className="text-sm font-semibold" style={{ color: "#0f1924" }}>Emergency Loans</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold" style={{ color: "#0f1924" }}>KES 18,000</span>
                      <span className="text-xs ml-1.5" style={{ color: "#4a5c6a" }}>30%</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#e9f3ed" }}>
                    <div className="pool-bar-loans h-full rounded-full" style={{ background: "#00ab00" }} />
                  </div>
                  <p className="text-xs mt-1.5 font-medium" style={{ color: "#4a5c6a" }}>Available for member loan requests</p>
                </div>
              </div>
            </div>

            {/* Interest return */}
            <div
              className="flex items-start gap-4 p-5"
              style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ background: "#e9f3ed", borderRadius: "8px", border: "1px solid #d6e4df" }}
              >
                <TrendingUp className="w-5 h-5 loan-icon-trend" style={{ color: "#00ab00" }} />
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1.5" style={{ color: "#0a2540" }}>
                  Interest Helps the Group
                </h4>
                <p className="text-xs font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                  When you pay back a loan with a small interest, that extra money goes back to the group. It makes everyone's payout bigger!
                </p>
                <div className="flex items-center gap-1.5 mt-3 text-xs font-bold" style={{ color: "#00ab00" }}>
                  KES 900 interest → pool → +KES 150 per member
                </div>
              </div>
            </div>

            {/* Guardrails */}
            <div
              className="flex flex-col gap-3 p-5"
              style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4a5c6a" }}>
                Simple Rules
              </p>
              {[
                "Max loan: 3× your total savings so far",
                "Interest rate is low and fair for everyone",
                "Safety checks ensure there is always money available",
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm font-medium" style={{ color: "#0f1924" }}>
                  <Lock className="w-3.5 h-3.5 loan-icon-lock flex-shrink-0" style={{ color: "#00ab00" }} />
                  {rule}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Approval flow */}
          <div className="loan-right flex flex-col gap-4">
            <div
              className="p-6"
              style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-base" style={{ color: "#0a2540" }}>Safe Approvals</h3>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#4a5c6a" }}>Leaders agree using their PINs</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: "#0a2540" }}>KES 15,000</div>
                  <div className="text-xs" style={{ color: "#4a5c6a" }}>Requested by Njeri W.</div>
                </div>
              </div>

              {/* Loan details */}
              <div
                className="flex gap-3 mb-5 p-3.5"
                style={{ background: "#f7f9f8", borderRadius: "6px", border: "1px solid #d6e4df" }}
              >
                {[
                  { label: "Amount", value: "KES 15,000" },
                  { label: "Rate",   value: "3% / month" },
                  { label: "Term",   value: "2 months" },
                ].map((d, i) => (
                  <div
                    key={i}
                    className={`flex-1 text-center ${i < 2 ? "border-r" : ""}`}
                    style={{ borderColor: "#d6e4df" }}
                  >
                    <div className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: "#4a5c6a" }}>
                      {d.label}
                    </div>
                    <div className="font-bold text-sm" style={{ color: "#0a2540" }}>{d.value}</div>
                  </div>
                ))}
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-2.5">
                {APPROVAL_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`approval-step flex items-start gap-3.5 p-4`}
                    style={{
                      borderRadius: "6px",
                      border: `1px solid ${step.status === "approved" ? "#d6e4df" : "#e8edf3"}`,
                      background: step.status === "approved" ? "#e9f3ed" : "#f7f9f8",
                      opacity: step.status === "pending" ? 0.65 : 1,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: step.status === "approved" ? "#00ab00" : "#e8edf3",
                        color: step.status === "approved" ? "#ffffff" : "#4a5c6a",
                      }}
                    >
                      {step.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-bold" style={{ color: "#0a2540" }}>{step.role}</span>
                        {step.status === "approved" && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5"
                            style={{ color: "#00ab00", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}
                          >
                            <Lock className="w-2.5 h-2.5 loan-icon-lock" /> {step.pin}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium" style={{ color: "#4a5c6a" }}>{step.action}</p>
                    </div>
                    {step.status === "approved"
                      ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00ab00" }} />
                      : <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#4a5c6a" }} />
                    }
                  </div>
                ))}
              </div>

              {/* Disbursement status */}
              <div
                className="mt-4 p-3.5 flex items-center gap-3"
                style={{ background: "#e9f3ed", borderRadius: "6px", border: "1px solid #d6e4df" }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: "#00ab00" }}
                />
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: "#0a2540" }}>Ready to Send</div>
                  <div className="text-xs font-medium" style={{ color: "#4a5c6a" }}>KES 15,000 → Njeri's Phone</div>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1"
                  style={{ color: "#00ab00", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}
                >
                  Processing
                </span>
              </div>
            </div>

            <p className="text-xs font-medium leading-relaxed px-1" style={{ color: "#4a5c6a" }}>
              Leaders use their own secret PINs to approve money. No one can move the group's money without everyone knowing.
            </p>

            {/* Learn more CTA */}
            <Link
              href="/how-loaning-works"
              className="inline-flex items-center gap-2 text-sm font-bold group transition-colors mt-2"
              style={{ color: "#00ab00" }}
            >
              Learn how group loans work in detail
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
