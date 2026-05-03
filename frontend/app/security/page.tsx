"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import Image from "next/image"
import Link from "next/link"
import {
  ShieldCheck, Lock, KeyRound, Server, FileCheck, ArrowRight, Activity
} from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import { gsap } from "@/lib/gsap-init"

const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: "Safe PIN Approvals",
    body: "No one can move the group's money alone. Every payment needs a secret PIN from both the leader and the treasurer.",
  },
  {
    icon: Server,
    title: "Clear Records",
    body: "Every shilling saved or paid out is recorded forever. No one can change or delete the records, so there are no money fights.",
  },
  {
    icon: KeyRound,
    title: "Safe Bank Storage",
    body: "OrbiSave does not keep your money. Your money is kept safely in a real bank and is always there when you need it.",
  },
  {
    icon: FileCheck,
    title: "No More Arguments",
    body: "Every payment is recorded automatically from your phone. There is no confusion, and you can always prove when you saved your money.",
  }
]

export default function SecurityPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".sec-hero",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power2.out", delay: 0.1 }
    )
    gsap.fromTo(".sec-feature",
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.15, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: ".sec-features-wrap", start: "top 75%", once: true } }
    )
    gsap.fromTo(".sec-image-wrap",
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, ease: "power2.out",
        scrollTrigger: { trigger: ".sec-features-wrap", start: "top 75%", once: true } }
    )
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />

      <section className="pt-32 pb-24 relative overflow-hidden" style={{ background: "#0a2540" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <ShieldCheck className="sec-hero w-10 h-10 mx-auto mb-6" style={{ color: "#00ab00" }} />
          <h1 className="sec-hero text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white">
            Safe and Secure Savings<br />
            <span style={{ color: "#00ab00" }}>for Your Group.</span>
          </h1>
          <p className="sec-hero text-lg font-medium max-w-2xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.7)" }}>
            Trust is the most important thing for your group. OrbiSave makes that trust even stronger with safe approvals on your phone and clear records that can't be changed.
          </p>
        </div>
      </section>

      <section className="py-24" style={{ background: "#ffffff" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sec-features-wrap grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            {/* Left: Timeline/Features */}
            <div className="flex flex-col gap-10">
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}>
                  <Activity className="w-3.5 h-3.5" /> How We Protect You
                </div>
                <h2 className="text-3xl font-black tracking-tight" style={{ color: "#0a2540" }}>
                  Built so no one has to worry.
                </h2>
              </div>

              <div className="flex flex-col gap-8 relative">
                {/* Connecting Line */}
                <div className="absolute left-[1.35rem] top-2 bottom-8 w-px" style={{ background: "#d6e4df" }} />
                
                {SECURITY_FEATURES.map((feature, i) => {
                  const Icon = feature.icon
                  return (
                    <div key={i} className="sec-feature relative z-10 flex gap-6 items-start">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#ffffff", border: "2px solid #00ab00" }}>
                        <Icon className="w-5 h-5" style={{ color: "#0a2540" }} />
                      </div>
                      <div className="pt-1">
                        <h3 className="text-base font-bold mb-2" style={{ color: "#0a2540" }}>{feature.title}</h3>
                        <p className="text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{feature.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: UI Mockup */}
            <div className="sec-image-wrap relative lg:h-[600px] flex items-center justify-center rounded-[24px] overflow-hidden" style={{ background: "#e9f3ed" }}>
              {/* Organic blob background element */}
              <div className="absolute inset-0 opacity-40 blur-3xl" style={{ background: "radial-gradient(circle at 50% 50%, #00ab00 0%, transparent 60%)" }} />
              
              <div className="relative z-10 w-full max-w-[320px] rounded-[16px] overflow-hidden" style={{ border: "1px solid rgba(10,37,64,0.1)", boxShadow: "0 20px 40px -10px rgba(10,37,64,0.15)" }}>
                <Image 
                  src="/security_mockup.png" 
                  alt="Dual-PIN Approval Interface" 
                  width={320} 
                  height={640}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: "#e9f3ed" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-5" style={{ color: "#0a2540" }}>
            Your Information is Private.
          </h2>
          <p className="text-base font-medium leading-relaxed mb-8" style={{ color: "#4a5c6a" }}>
            We keep your personal details and savings records secret and safe. We follow all the laws in Kenya, Rwanda, and Ghana to protect you. Only your group can see your records, unless you decide to share them with a bank to get a loan.
          </p>
          <Link href="/onboarding">
            <button className="h-12 px-8 text-sm font-bold text-white flex items-center gap-2 mx-auto group transition-opacity hover:opacity-90" style={{ background: "#0a2540", borderRadius: "6px" }}>
              Secure Your Chama Today <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
