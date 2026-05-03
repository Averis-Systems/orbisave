"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import Image from "next/image"
import Link from "next/link"
import {
  Gift, Trophy, Target, ArrowRight, ShieldCheck, CheckCircle2
} from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import { gsap } from "@/lib/gsap-init"

const ELIGIBILITY_STEPS = [
  {
    icon: CheckCircle2,
    title: "Register Your Group",
    body: "Sign up your group and make sure your leaders verify who they are. This helps keep everyone's money safe.",
  },
  {
    icon: Target,
    title: "Save Regularly",
    body: "Keep saving together for a few months. A good group is one where everyone saves on time and everyone gets their turn to get paid.",
  },
  {
    icon: ShieldCheck,
    title: "Pay Back Loans on Time",
    body: "Make sure everyone pays back their group loans on time. The app gives your group a 'Trust Score' based on your good habits.",
  },
  {
    icon: Trophy,
    title: "Receive Your Grant",
    body: "Once your group is ready, we connect you to NGOs and funds that give grants directly to your group's account.",
  }
]

export default function GrantsPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".gr-hero",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power2.out", delay: 0.1 }
    )
    gsap.fromTo(".gr-step",
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.15, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: ".gr-features-wrap", start: "top 75%", once: true } }
    )
    gsap.fromTo(".gr-image-wrap",
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, ease: "power2.out",
        scrollTrigger: { trigger: ".gr-features-wrap", start: "top 75%", once: true } }
    )
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />

      <section className="pt-32 pb-24 relative overflow-hidden" style={{ background: "#e9f3ed" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(10,37,64,0.05) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <Gift className="gr-hero w-10 h-10 mx-auto mb-6" style={{ color: "#00ab00" }} />
          <h1 className="gr-hero text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6" style={{ color: "#0a2540" }}>
            Get Free Grants<br />
            <span style={{ color: "#00ab00" }}>for Your Group.</span>
          </h1>
          <p className="gr-hero text-lg font-medium max-w-2xl mx-auto mb-10" style={{ color: "#4a5c6a" }}>
            NGOs and support groups want to fund reliable farmers. OrbiSave keeps clear records of your group's savings, proving that your group is ready for support.
          </p>
        </div>
      </section>

      <section className="py-24" style={{ background: "#ffffff" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="gr-features-wrap grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            {/* Left: Timeline/Features */}
            <div className="flex flex-col gap-10">
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}>
                  <Trophy className="w-3.5 h-3.5" /> Eligibility Pathway
                </div>
                <h2 className="text-3xl font-black tracking-tight" style={{ color: "#0a2540" }}>
                  How to qualify for grants.
                </h2>
              </div>

              <div className="flex flex-col gap-8 relative">
                {/* Connecting Line */}
                <div className="absolute left-[1.35rem] top-2 bottom-8 w-px" style={{ background: "#d6e4df" }} />
                
                {ELIGIBILITY_STEPS.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <div key={i} className="gr-step relative z-10 flex gap-6 items-start">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#ffffff", border: "2px solid #00ab00" }}>
                        <span className="text-sm font-bold" style={{ color: "#0a2540" }}>{i + 1}</span>
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4" style={{ color: "#00ab00" }} />
                          <h3 className="text-base font-bold" style={{ color: "#0a2540" }}>{step.title}</h3>
                        </div>
                        <p className="text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{step.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: UI Mockup */}
            <div className="gr-image-wrap relative lg:h-[600px] flex items-center justify-center rounded-[24px] overflow-hidden" style={{ background: "#0a2540" }}>
              {/* Organic blob background element */}
              <div className="absolute inset-0 opacity-40 blur-3xl" style={{ background: "radial-gradient(circle at 50% 50%, #00ab00 0%, transparent 60%)" }} />
              
              <div className="relative z-10 w-full max-w-[320px] rounded-[16px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)" }}>
                <Image 
                  src="/grants_mockup.png" 
                  alt="Grant Eligibility Interface" 
                  width={320} 
                  height={640}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: "#0a2540" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-5 text-white">
            Are you an NGO or Support Group?
          </h2>
          <p className="text-base font-medium leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>
            Give support safely. OrbiSave makes it easy to send money directly to verified and hardworking groups. Every shilling is tracked and accounted for.
          </p>
          <a href="mailto:info@averissystems.com">
            <button className="h-12 px-8 text-sm font-bold text-white flex items-center gap-2 mx-auto transition-opacity hover:opacity-90" style={{ background: "transparent", border: "1px solid #00ab00", borderRadius: "6px" }}>
              Contact Averis Systems <ArrowRight className="w-4 h-4" />
            </button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}
