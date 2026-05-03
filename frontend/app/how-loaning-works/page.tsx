"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import {
  Users, Vote, Unlock, Smartphone, CheckCircle2,
  ArrowRight, TrendingUp, Clock, Lock, Banknote,
  FileText, ShieldCheck, Star,
} from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import { gsap } from "@/lib/gsap-init"

// ─── DATA ────────────────────────────────────────────────────────────────────

const LOAN_STEPS = [
  {
    number: "01",
    icon: Users,
    iconCls: "ls-icon-1",
    title: "Your group votes to start",
    body: "The leader asks the group: \"Should we start lending money?\" Every member votes on the app. If the group agrees, the loaning starts. No single person can decide alone.",
    detail: "Group vote · Everyone decides together",
    bg: "#e9f3ed",
    accent: "#00ab00",
  },
  {
    number: "02",
    icon: Unlock,
    iconCls: "ls-icon-2",
    title: "The leader opens the pool",
    body: "The leader uses their own secret PIN to agree. This is a private number that only they know. The app records this so everyone knows the leader agreed.",
    detail: "Leader PIN · Recorded forever",
    bg: "#e8edf3",
    accent: "#0a2540",
  },
  {
    number: "03",
    icon: Lock,
    iconCls: "ls-icon-3",
    title: "The treasurer agrees too",
    body: "The treasurer also uses their secret PIN. Two different leaders must agree before any money is moved. This keeps the group's money safe for everyone.",
    detail: "Treasurer PIN · Two leaders must agree",
    bg: "#e9f3ed",
    accent: "#00ab00",
  },
  {
    number: "04",
    icon: Banknote,
    iconCls: "ls-icon-4",
    title: "Money is set aside for loans",
    body: "We set aside 30 out of every 100 shillings you save for loans. The other 70 shillings go to the person getting paid this week. This way, there's always money for emergencies.",
    detail: "70% for payouts · 30% for loans",
    bg: "#e8edf3",
    accent: "#0a2540",
  },
]

const REQUEST_STEPS = [
  { icon: Smartphone,   label: "Ask for a loan on the app",          detail: "Set how much you need and when to pay back" },
  { icon: Users,        label: "Leader checks and agrees with PIN",  detail: "Checks if you have been saving regularly" },
  { icon: Lock,         label: "Treasurer checks and confirms with PIN", detail: "Makes sure the group has enough money" },
  { icon: ShieldCheck,  label: "The app checks the rules",           detail: "Max loan is 3× your total savings" },
  { icon: Smartphone,   label: "Money is sent to your phone",        detail: "M-Pesa, MTN, or bank account" },
]

const CREDIT_TIMELINE = [
  { period: "Month 1–3",   icon: Star,      color: "#4a5c6a", label: "Start Saving",           desc: "Every payment is recorded. Your good name starts growing." },
  { period: "Month 4–6",   icon: TrendingUp, color: "#00ab00", label: "Borrow from the Group",  desc: "Your group can now lend money to members who need it." },
  { period: "Month 7–12",  icon: FileText,   color: "#00ab00", label: "Get Your Group Report",  desc: "The treasurer creates your group's official report." },
  { period: "Month 13+",   icon: Banknote,   color: "#0a2540", label: "Talk to a Bank",         desc: "Show your group's report to a bank for bigger loans." },
]

const STATEMENT_FIELDS = [
  "Total money saved by the group",
  "Total money paid out to members",
  "Loans taken and paid back on time",
  "Extra money made from interest",
  "Money available for loans now",
  "List of members and their savings history",
]

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function HowLoaningWorks() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".hlw-hero-text",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.14, duration: 0.85, ease: "power2.out", delay: 0.2 }
    )
    gsap.fromTo(".loan-step",
      { y: 36, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.12, duration: 0.75, ease: "power2.out",
        scrollTrigger: { trigger: ".loan-steps-wrap", start: "top 80%", once: true } }
    )
    gsap.fromTo(".req-step",
      { x: -24, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.1, duration: 0.65, ease: "power2.out",
        scrollTrigger: { trigger: ".req-steps-wrap", start: "top 80%", once: true } }
    )
    gsap.fromTo(".timeline-item",
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.13, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: ".timeline-wrap", start: "top 80%", once: true } }
    )
    gsap.fromTo(".stmt-field",
      { x: -18, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.07, duration: 0.55, ease: "power2.out",
        scrollTrigger: { trigger: ".stmt-wrap", start: "top 80%", once: true } }
    )
    // Icon animations
    gsap.to(".ls-icon-2", { rotate: -15, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" })
    gsap.fromTo(".ls-icon-1", { scale: 0.8 }, { scale: 1, duration: 0.5, ease: "back.out(2)", scrollTrigger: { trigger: ".loan-steps-wrap", start: "top 80%", once: true } })
    gsap.to(".ls-icon-3", { y: -3, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" })
    gsap.to(".ls-icon-4", { rotate: 8, duration: 2, yoyo: true, repeat: -1, ease: "sine.inOut" })
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />

      {/* ── HERO ── */}
      <section className="pt-28 pb-20 relative overflow-hidden" style={{ background: "#0a2540" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="hlw-hero-text inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-6 px-3 py-1.5" style={{ color: "#00ab00", background: "rgba(0,171,0,0.1)", borderRadius: "4px", border: "1px solid rgba(0,171,0,0.2)" }}>
            How Group Loans Work
          </div>
          <h1 className="hlw-hero-text text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6" style={{ color: "#ffffff" }}>
            Borrow Money from Your Group<br />
            <span style={{ color: "#00ab00" }}>Safely.</span>
          </h1>
          <p className="hlw-hero-text text-lg sm:text-xl font-medium leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.65)" }}>
            You don't need a bank to get a loan. Your group saves money together, and any member can borrow from that savings when they need it. Your leaders work together to approve every loan, and every shilling is tracked.
          </p>
          <div className="hlw-hero-text flex flex-wrap gap-4 mt-10">
            <Link href="/onboarding">
              <button className="h-11 px-6 text-sm font-bold text-white flex items-center gap-2 group transition-opacity hover:opacity-90" style={{ background: "#00ab00", borderRadius: "6px" }}>
                Start Your Group <ArrowRight className="w-4 h-4 icon-arrow" />
              </button>
            </Link>
            <Link href="/#how-it-works">
              <button className="h-11 px-6 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.75)", background: "transparent", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)" }}>
                How OrbiSave Works
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STEP 1-4: How the loan pool is activated ── */}
      <section className="py-20 lg:py-28" style={{ background: "#ffffff" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <div className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}>
              Step by Step
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
              How do we start loaning?
            </h2>
            <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
              Before anyone can borrow, the whole group must agree together. Then two different leaders unlock the money — one person cannot do it alone.
            </p>
          </div>

          <div className="loan-steps-wrap flex flex-col gap-6">
            {LOAN_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="loan-step grid sm:grid-cols-[72px_1fr] gap-0 overflow-hidden" style={{ border: "1px solid #d6e4df", borderRadius: "8px", background: "#ffffff" }}>
                  {/* Number panel */}
                  <div className="flex items-center justify-center p-4 sm:py-8" style={{ background: step.bg, borderRight: "1px solid #d6e4df" }}>
                    <span className="text-4xl font-black" style={{ color: `${step.accent}30` }}>{step.number}</span>
                  </div>
                  {/* Content */}
                  <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: step.bg, borderRadius: "8px", border: "1px solid #d6e4df" }}>
                      <Icon className={`w-5 h-5 ${step.iconCls}`} style={{ color: step.accent }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2" style={{ color: "#0a2540" }}>{step.title}</h3>
                      <p className="text-base font-medium leading-relaxed mb-3" style={{ color: "#4a5c6a" }}>{step.body}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1" style={{ color: step.accent, background: step.bg, borderRadius: "4px", border: `1px solid ${step.accent}25` }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: step.accent }} />
                        {step.detail}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW TO REQUEST A LOAN ── */}
      <section className="py-20 lg:py-28" style={{ background: "#e9f3ed" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <div className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#0a2540", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}>
              Borrowing from the Pool
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
              How do I get a loan?
            </h2>
            <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
              Any member can request a loan. The money comes from your group's own pool — not from a bank. Two leaders must say yes before the money moves.
            </p>
          </div>

          <div className="req-steps-wrap flex flex-col gap-3">
            {REQUEST_STEPS.map(({ icon: Icon, label, detail }, i) => (
              <div key={i} className="req-step flex items-center gap-5 p-5" style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}>
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm font-black" style={{ background: "#0a2540", color: "#ffffff", borderRadius: "6px" }}>
                  {i + 1}
                </div>
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: "#e9f3ed", borderRadius: "6px", border: "1px solid #d6e4df" }}>
                  <Icon className="w-4 h-4" style={{ color: "#00ab00" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: "#0a2540" }}>{label}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: "#4a5c6a" }}>{detail}</div>
                </div>
                {i < REQUEST_STEPS.length - 1 && (
                  <ArrowRight className="w-4 h-4 flex-shrink-0 hidden sm:block" style={{ color: "#d6e4df" }} />
                )}
              </div>
            ))}
          </div>

          {/* Rules box */}
          <div className="mt-8 p-6" style={{ background: "#0a2540", borderRadius: "8px" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Simple Rules — Everyone Agrees to These</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Maximum you can borrow", value: "3× your total savings" },
                { label: "Maximum interest rate", value: "Low and fair for everyone" },
                { label: "Who sets the interest?", value: "Your group decides together" },
              ].map((r, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{r.label}</div>
                  <div className="text-sm font-bold" style={{ color: "#00ab00" }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GROUP FINANCIAL STATEMENT ── */}
      <section className="py-20 lg:py-28 stmt-wrap" style={{ background: "#ffffff" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}>
                Group Financial Statement
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
                A Good Name for Your Group.
              </h2>
              <p className="text-base font-medium leading-relaxed mb-6" style={{ color: "#4a5c6a" }}>
                After saving for a few months, your treasurer creates a simple report. Everyone in the group checks it to make sure it's correct. This report becomes your group's proof of hard work. You can show it to a bank to get bigger support.
              </p>
              <p className="text-base font-medium leading-relaxed mb-8" style={{ color: "#4a5c6a" }}>
                <span className="font-bold" style={{ color: "#0a2540" }}>The more you save, the bigger the loans you can get</span> — for your farm, your business, and your group.
              </p>
              <Link href="/onboarding">
                <button className="h-11 px-6 text-sm font-bold text-white flex items-center gap-2 group transition-opacity hover:opacity-90" style={{ background: "#00ab00", borderRadius: "6px" }}>
                  Start Building Your Record <ArrowRight className="w-4 h-4 icon-arrow" />
                </button>
              </Link>
            </div>

            {/* Statement mockup */}
            <div style={{ border: "1px solid #d6e4df", borderRadius: "8px", overflow: "hidden" }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: "#0a2540" }}>
                <div>
                  <div className="text-sm font-bold text-white">Group Financial Statement</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>OrbiSave · Verified · Cycle 6</div>
                </div>
                <FileText className="w-5 h-5" style={{ color: "#00ab00" }} />
              </div>
              <div className="flex flex-col divide-y divide-[#d6e4df]">
                {STATEMENT_FIELDS.map((field, i) => (
                  <div key={i} className="stmt-field flex items-center gap-3 px-6 py-3.5" style={{ background: "#ffffff" }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#00ab00" }} />
                    <span className="text-sm font-medium" style={{ color: "#0f1924" }}>{field}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 flex items-center gap-2" style={{ background: "#e9f3ed", borderTop: "1px solid #d6e4df" }}>
                <ShieldCheck className="w-4 h-4" style={{ color: "#00ab00" }} />
                <span className="text-xs font-bold" style={{ color: "#0a2540" }}>Safe and Verified by OrbiSave</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CREDIT TIMELINE ── */}
      <section className="py-20 lg:py-28 timeline-wrap" style={{ background: "#e9f3ed" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <div className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#0a2540", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}>
              Your Credit Journey
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
              Month by month, your record grows.
            </h2>
            <p className="text-lg font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
              Every contribution you make adds to your financial history. Over time, that history opens bigger doors — for your group and for you personally.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_TIMELINE.map(({ period, icon: Icon, color, label, desc }, i) => (
              <div key={i} className="timeline-item flex flex-col gap-4 p-6" style={{ background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "8px" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4a5c6a" }}>{period}</span>
                  <Icon className="w-5 h-5 icon-bounce" style={{ color }} />
                </div>
                <div>
                  <div className="font-bold text-sm mb-2" style={{ color: "#0a2540" }}>{label}</div>
                  <p className="text-xs font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{desc}</p>
                </div>
                <div className="h-1 rounded-full" style={{ background: color, opacity: i < 2 ? 0.3 : 1, width: `${25 * (i + 1)}%`, maxWidth: "100%" }} />
              </div>
            ))}
          </div>

          {/* Bank loan note */}
          <div className="mt-8 p-6 flex flex-col sm:flex-row gap-5 items-start" style={{ background: "#0a2540", borderRadius: "8px" }}>
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,171,0,0.15)", borderRadius: "8px", border: "1px solid rgba(0,171,0,0.2)" }}>
              <Banknote className="w-5 h-5" style={{ color: "#00ab00" }} />
            </div>
            <div>
              <div className="font-bold text-base mb-2" style={{ color: "#ffffff" }}>What happens when you show the report to a bank?</div>
              <p className="text-sm font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                A bank sees that your group has been saving together, paying back loans, and managing money responsibly. They can offer your group a bigger loan based on that good record. This is how small groups grow into big businesses together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
            Ready to give your group access to loans?
          </h2>
          <p className="text-lg font-medium leading-relaxed mb-8" style={{ color: "#4a5c6a" }}>
            Create a group today. Start contributing. The loan pool opens when your group is ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/onboarding">
              <button className="h-12 px-8 text-sm font-bold text-white flex items-center gap-2 justify-center w-full sm:w-auto group transition-opacity hover:opacity-90" style={{ background: "#00ab00", borderRadius: "6px" }}>
                Start a Group <ArrowRight className="w-4 h-4 icon-arrow" />
              </button>
            </Link>
            <Link href="/input-financing">
              <button className="h-12 px-8 text-sm font-semibold flex items-center gap-2 justify-center w-full sm:w-auto transition-colors hover:bg-[#e9f3ed]" style={{ color: "#0a2540", background: "#ffffff", border: "1px solid #d6e4df", borderRadius: "6px" }}>
                See Input Financing
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
