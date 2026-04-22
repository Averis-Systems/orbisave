"use client"

import { useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  LifeBuoy, Mail, Phone, Globe, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

const CONTACTS = [
  { icon: Phone, title: "Kenya Support", value: "+254 105 374 738\n+254 795 581 750" },
  { icon: Phone, title: "Ghana Support", value: "+233 249 420 040" },
  { icon: Mail, title: "General Email", value: "support@orbisave.com" },
  { icon: Globe, title: "Partnerships", value: "info@averissystems.com\nPowered by Averis Systems" },
]

const FAQS = [
  {
    category: "General",
    questions: [
      {
        q: "What is OrbiSave?",
        a: "OrbiSave is a digital orchestration infrastructure provided by Averis Systems. We digitise traditional savings groups (Chamas), providing automated ledgers, multi-signature security, and connections to formal input financiers and banks."
      },
      {
        q: "Does OrbiSave hold our money?",
        a: "No. OrbiSave does not hold custody of funds. All money moves directly between your group members' mobile wallets (like M-Pesa) and a regulated escrow bank account. We simply provide the secure rails and audit trail."
      },
      {
        q: "How much does it cost?",
        a: "Creating an account and running a basic savings group is subject to standard platform fees and mobile money gateway charges. For a detailed breakdown, please see our OrbiSave Fees page linked in the footer."
      }
    ]
  },
  {
    category: "Loans & Defaults (Edge Cases)",
    questions: [
      {
        q: "What happens if a member defaults on an internal group loan?",
        a: "OrbiSave provides the indisputable, SHA-256 verified audit trail showing exactly who borrowed what and when. The platform will automatically restrict that member from receiving payouts until the balance is cleared. However, the final consequence (e.g., expulsion or asset seizure) is determined by your group's internal constitution."
      },
      {
        q: "What happens if the entire group defaults on a Bank or Financier loan?",
        a: "A default on external financing severely damages the group's OrbiSave Trust Score, permanently blocking access to future loans, grants, and input financing. The partner bank will execute standard recovery protocols as per the terms agreed upon by the Chairperson and Treasurer during the loan approval."
      },
      {
        q: "How does the platform handle disputes like 'I sent the money but it doesn't show'?",
        a: "Disputes are mathematically impossible on OrbiSave. Because payments are integrated directly with mobile money providers (like M-Pesa STK push), the ledger only updates when the telecom confirms the transaction via API. If it is not on the ledger, the telecom did not process it."
      }
    ]
  },
  {
    category: "Membership & Tragic Events",
    questions: [
      {
        q: "What happens to a member's contributions if they pass away?",
        a: "Upon receiving verified notice of a member's passing from the Chairperson, OrbiSave will freeze the deceased member's profile. Any accumulated funds owed to them will be routed to their registered Next-of-Kin (provided during onboarding). The group's cycle will automatically recalibrate mathematically to continue without the deceased member, ensuring no disruption to the remaining rotation."
      },
      {
        q: "Can a member leave a group in the middle of a cycle?",
        a: "A member cannot leave if they have already received a payout but have not finished their contributions (as this equates to defaulting on a loan from the group). If they have only contributed and not received a payout, the Chairperson must authorize a partial refund minus a constitutionally agreed penalty, after which the rotation is recalibrated."
      }
    ]
  }
]

export default function SupportPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const [openFaq, setOpenFaq] = useState<string | null>("What is OrbiSave?")

  useGSAP(() => {
    gsap.fromTo(".sup-hero",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power2.out", delay: 0.1 }
    )
    gsap.fromTo(".contact-card",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: ".contacts-wrap", start: "top 80%", once: true } }
    )
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />

      <section className="pt-32 pb-20 relative overflow-hidden" style={{ background: "#0a2540" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <LifeBuoy className="sup-hero w-10 h-10 mx-auto mb-6" style={{ color: "#00ab00" }} />
          <h1 className="sup-hero text-4xl sm:text-5xl font-black tracking-tight mb-5 text-white">
            Support & Help Centre
          </h1>
          <p className="sup-hero text-lg font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            Need help orchestrating your collective? Find answers to common questions below or contact our regional teams.
          </p>
        </div>
      </section>

      {/* Contacts Grid */}
      <section className="py-12" style={{ background: "#e9f3ed", borderBottom: "1px solid #d6e4df" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="contacts-wrap grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTACTS.map((c, i) => {
              const Icon = c.icon
              return (
                <div key={i} className="contact-card p-5 flex flex-col gap-3 text-center items-center" style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #d6e4df" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#f7f9f8", border: "1px solid #d6e4df" }}>
                    <Icon className="w-4 h-4" style={{ color: "#0a2540" }} />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#4a5c6a" }}>{c.title}</h3>
                  <div className="text-sm font-semibold whitespace-pre-line" style={{ color: "#0a2540" }}>
                    {c.value.includes("Averis") ? (
                      <>
                        info@averissystems.com<br/>
                        <span className="text-xs text-[#00ab00] font-bold">Powered by <a href="https://averissystems.com" target="_blank" rel="noopener noreferrer" className="underline">Averis Systems</a></span>
                      </>
                    ) : c.value}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black tracking-tight mb-3" style={{ color: "#0a2540" }}>Frequently Asked Questions</h2>
            <p className="text-sm font-medium" style={{ color: "#4a5c6a" }}>Detailed explanations covering operations, logic, and edge cases.</p>
          </div>

          <div className="flex flex-col gap-10">
            {FAQS.map((category, i) => (
              <div key={i}>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "#00ab00" }}>
                  {category.category.includes("Edge") && <AlertCircle className="w-4 h-4" />}
                  {category.category}
                </h3>
                <div className="flex flex-col gap-3">
                  {category.questions.map((faq, j) => {
                    const isOpen = openFaq === faq.q
                    return (
                      <div 
                        key={j} 
                        className="overflow-hidden transition-all duration-200" 
                        style={{ border: "1px solid", borderColor: isOpen ? "#00ab00" : "#d6e4df", borderRadius: "8px", background: isOpen ? "#f0faf0" : "#ffffff" }}
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : faq.q)}
                          className="w-full px-5 py-4 flex items-start justify-between text-left gap-4"
                        >
                          <span className="text-sm font-bold leading-snug" style={{ color: "#0a2540" }}>{faq.q}</span>
                          {isOpen ? <ChevronUp className="w-5 h-5 flex-shrink-0 text-[#00ab00]" /> : <ChevronDown className="w-5 h-5 flex-shrink-0 text-[#4a5c6a]" />}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pt-1 text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                            {faq.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
