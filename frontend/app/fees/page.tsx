"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  Wallet, RefreshCw, Smartphone, Landmark, Check
} from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

const FEES_DATA = [
  {
    icon: RefreshCw,
    title: "Platform Maintenance Fee",
    cost: "3% of payout",
    details: "We charge a small 3% fee only when members receive their payouts. This pays for the secure digital records and automatic text messages."
  },
  {
    icon: Smartphone,
    title: "Mobile Money Charges (M-Pesa / MTN MoMo)",
    cost: "Standard Telecom Rates",
    details: "OrbiSave does not add any extra charges to mobile money transfers. You only pay the normal network fees when you deposit or receive money."
  },
  {
    icon: Landmark,
    title: "Secure Bank Escrow",
    cost: "Free",
    details: "Your group's money is kept safe in a trusted bank account while your cycle is running. We do not charge any monthly fees to hold your money."
  },
  {
    icon: Wallet,
    title: "Internal Group Loans",
    cost: "Set by your Group",
    details: "OrbiSave does not charge interest on internal loans. Your Chairperson and Treasurer decide the interest rate, and all the profit goes back to your group."
  },
  {
    icon: Check,
    title: "Premium Group Features",
    cost: "KES 1,200 per year",
    details: "For larger cooperatives and NGO groups, we offer an advanced yearly subscription that includes better reporting tools and dedicated support."
  }
]

export default function FeesPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".fee-hero",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power2.out", delay: 0.1 }
    )
    gsap.fromTo(".fee-card",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: ".fees-wrap", start: "top 80%", once: true } }
    )
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />

      <section className="pt-32 pb-20 relative overflow-hidden" style={{ background: "#0a2540" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <Wallet className="fee-hero w-10 h-10 mx-auto mb-6" style={{ color: "#00ab00" }} />
          <h1 className="fee-hero text-4xl sm:text-5xl font-black tracking-tight mb-5 text-white">
            Transparent Pricing
          </h1>
          <p className="fee-hero text-lg font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            No hidden charges. No monthly subscriptions. You only pay a tiny fraction when the platform actively coordinates your capital.
          </p>
        </div>
      </section>

      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fees-wrap flex flex-col gap-5">
            {FEES_DATA.map((fee, i) => {
              const Icon = fee.icon
              return (
                <div key={i} className="fee-card flex flex-col md:flex-row items-start md:items-center gap-6 p-6 md:p-8 transition-colors hover:bg-[#f7f9f8]" style={{ border: "1px solid #d6e4df", borderRadius: "12px", background: "#ffffff" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#e9f3ed" }}>
                    <Icon className="w-5 h-5" style={{ color: "#00ab00" }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1" style={{ color: "#0a2540" }}>{fee.title}</h3>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{fee.details}</p>
                  </div>
                  <div className="md:text-right flex-shrink-0">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#00ab00" }}>Cost</div>
                    <div className="text-lg font-black" style={{ color: "#0a2540" }}>{fee.cost}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-16 p-8 flex flex-col items-center text-center" style={{ background: "#e9f3ed", borderRadius: "12px", border: "1px solid #d6e4df" }}>
            <Check className="w-8 h-8 mb-4" style={{ color: "#00ab00" }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: "#0a2540" }}>Free Account Creation</h3>
            <p className="text-sm font-medium max-w-lg" style={{ color: "#4a5c6a" }}>
              It costs absolutely nothing to create an OrbiSave profile, verify your identity, or browse available input financiers and grants.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
