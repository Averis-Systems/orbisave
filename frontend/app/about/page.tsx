"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  HeartHandshake, Users, Globe2, ShieldCheck, ArrowRight
} from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import { AfricaMap } from "@/components/landing/AfricaMap"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

export default function AboutPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".abt-hero",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power2.out", delay: 0.1 }
    )
    gsap.fromTo(".abt-card",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: ".abt-cards-wrap", start: "top 80%", once: true } }
    )
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#ffffff" }}>
      <Navbar />

      <section className="pt-32 pb-24 relative overflow-hidden" style={{ background: "#e9f3ed" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(10,37,64,0.05) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <HeartHandshake className="abt-hero w-10 h-10 mx-auto mb-6" style={{ color: "#00ab00" }} />
          <h1 className="abt-hero text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6" style={{ color: "#0a2540" }}>
            We believe in the power of<br />
            <span style={{ color: "#00ab00" }}>collective trust.</span>
          </h1>
          <p className="abt-hero text-lg font-medium max-w-2xl mx-auto" style={{ color: "#4a5c6a" }}>
            For generations, communities across Africa have pooled their money to build homes, educate children, and grow farms. OrbiSave digitises this tradition. We make it safer, faster, and infinitely more powerful.
          </p>
        </div>
      </section>

      <section className="py-24" style={{ background: "#ffffff" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-4 px-3 py-1.5" style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}>
              <Globe2 className="w-3.5 h-3.5" /> Where We Operate
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
              Built for 600 Million Farmers
            </h2>
            <p className="text-base font-medium max-w-2xl mx-auto" style={{ color: "#4a5c6a" }}>
              We are building the financial infrastructure for sub-Saharan Africa. OrbiSave is currently rolling out across Kenya, Rwanda, and Ghana.
            </p>
          </div>
          <div className="bg-[#f7f9f8] rounded-[24px] p-8 border border-[#d6e4df]">
            <AfricaMap />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-5" style={{ color: "#0a2540" }}>
                The Engine: <span style={{ color: "#00ab00" }}>Averis Systems</span>
              </h2>
              <p className="text-base font-medium leading-relaxed mb-4" style={{ color: "#4a5c6a" }}>
                OrbiSave is a digital system provided by <strong>Averis Systems</strong>. Our mission is to bridge the gap between informal savings groups and formal banks.
              </p>
              <p className="text-base font-medium leading-relaxed mb-8" style={{ color: "#4a5c6a" }}>
                By providing a secure digital record, we allow traditional Chamas to build the credit history needed to access bank loans, farm inputs, and philanthropic grants.
              </p>
              <a href="https://averissystems.com" target="_blank" rel="noopener noreferrer">
                <button className="h-11 px-6 text-sm font-bold flex items-center gap-2 group transition-colors hover:bg-[#e9f3ed]" style={{ color: "#00ab00", background: "transparent", border: "1px solid #00ab00", borderRadius: "6px" }}>
                  Visit Averis Systems <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </a>
            </div>
            <div className="abt-cards-wrap grid gap-4">
              <div className="abt-card p-6 flex items-start gap-4" style={{ background: "#f7f9f8", borderRadius: "8px", border: "1px solid #d6e4df" }}>
                <Users className="w-6 h-6 flex-shrink-0" style={{ color: "#00ab00" }} />
                <div>
                  <h3 className="font-bold text-base mb-1" style={{ color: "#0a2540" }}>For the Farmers</h3>
                  <p className="text-sm font-medium" style={{ color: "#4a5c6a" }}>Ensuring no one is left behind during planting season by unlocking group credit.</p>
                </div>
              </div>
              <div className="abt-card p-6 flex items-start gap-4" style={{ background: "#f7f9f8", borderRadius: "8px", border: "1px solid #d6e4df" }}>
                <ShieldCheck className="w-6 h-6 flex-shrink-0" style={{ color: "#0a2540" }} />
                <div>
                  <h3 className="font-bold text-base mb-1" style={{ color: "#0a2540" }}>For the Treasurers</h3>
                  <p className="text-sm font-medium" style={{ color: "#4a5c6a" }}>Removing the burden of manual bookkeeping and eliminating human error.</p>
                </div>
              </div>
              <div className="abt-card p-6 flex items-start gap-4" style={{ background: "#f7f9f8", borderRadius: "8px", border: "1px solid #d6e4df" }}>
                <Globe2 className="w-6 h-6 flex-shrink-0" style={{ color: "#00ab00" }} />
                <div>
                  <h3 className="font-bold text-base mb-1" style={{ color: "#0a2540" }}>For the Future</h3>
                  <p className="text-sm font-medium" style={{ color: "#4a5c6a" }}>Building a borderless, transparent financial ecosystem across East & West Africa.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  )
}
