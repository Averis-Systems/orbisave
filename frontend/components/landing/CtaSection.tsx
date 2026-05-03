"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import { ArrowRight, Hash } from "lucide-react"
import { gsap } from "@/lib/gsap-init"

export function CtaSection() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".cta-content",
      { y: 35, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.9, ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%", once: true },
      }
    )
    // Arrow animation
    gsap.to(".cta-arrow", {
      x: 3, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut",
    })
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 relative overflow-hidden"
      style={{ background: "#f7f9f8" }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(10,37,64,0.05) 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative cta-content">
        <div
          className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-6 px-3 py-1.5"
          style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}
        >
          Ready to start your group?
        </div>

        <h2
          className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-5"
          style={{ color: "#0a2540" }}
        >
          Run your group easily.<br />
          <span style={{ color: "#00ab00" }}>Starting today.</span>
        </h2>

        <p
          className="text-lg sm:text-xl font-medium leading-relaxed mb-12 max-w-2xl mx-auto"
          style={{ color: "#4a5c6a" }}
        >
          Start your group in minutes, invite members safely, and let OrbiSave handle the records. We manage the savings, payments, and loans automatically on your phone.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/onboarding">
            <button
              className="h-12 px-8 text-sm font-bold text-white flex items-center gap-2 min-w-[200px] justify-center group transition-opacity hover:opacity-90"
              style={{ background: "#00ab00", borderRadius: "6px" }}
            >
              Start a Group
              <ArrowRight className="w-4 h-4 cta-arrow icon-arrow" />
            </button>
          </Link>
          <Link href="/onboarding">
            <button
              className="h-12 px-8 text-sm font-semibold flex items-center gap-2 min-w-[200px] justify-center transition-colors hover:bg-[#e9f3ed]"
              style={{
                color: "#0a2540",
                background: "#ffffff",
                borderRadius: "6px",
                border: "1px solid #d6e4df",
              }}
            >
              <Hash className="w-4 h-4" />
              Join with Invite Code
            </button>
          </Link>
        </div>

        <div
          className="flex flex-wrap justify-center gap-x-7 gap-y-2 mt-10 pt-8"
          style={{ borderTop: "1px solid #d6e4df" }}
        >
          {[
            "No setup fees",
            "ID verification for leaders only",
            "M-Pesa · MTN MoMo · Airtel Money",
            "Kenya · Rwanda · Ghana",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#4a5c6a" }}>
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#00ab00" }} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
