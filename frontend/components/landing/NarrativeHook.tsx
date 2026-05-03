"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-init"

export function NarrativeHook() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p1Ref = useRef<HTMLParagraphElement>(null)
  const p2Ref = useRef<HTMLParagraphElement>(null)

  useGSAP(() => {
    const p1Text = "Chamas and VSLAs are the heartbeat of our community. For generations, they have been the only bank that says 'Yes' when others say 'No'."
    const p2Text = "But the old way is holding you back. Cash in a box is a risk. A lost notebook leads to broken trust and the imminent collapse of the group. Without digital records, your years of hard work remain invisible to the rest of the world."

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
      }
    })

    tl.to(p1Ref.current, {
      duration: 2.5,
      text: p1Text,
      ease: "none",
    })
    .to(p2Ref.current, {
      duration: 3,
      text: p2Text,
      ease: "none",
    }, "+=0.3")
    .to(".narrative-accent", {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
    }, "+=0.5")
  }, { scope: containerRef })

  return (
    <section 
      ref={containerRef}
      className="py-24 lg:py-40 overflow-hidden"
      style={{ background: "#ffffff" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Emotional Narrative */}
          <div className="max-w-xl">
            <div 
              className="inline-flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase mb-10 px-3 py-1.5"
              style={{ color: "#00ab00", background: "#f0faf0", borderRadius: "4px" }}
            >
              The Community Heart
            </div>
            
            <div className="space-y-10">
              <p 
                ref={p1Ref}
                aria-live="polite"
                className="text-2xl sm:text-3xl lg:text-4xl font-black leading-[1.2] tracking-tight min-h-[6em] lg:min-h-[4em]"
                style={{ color: "#0a2540" }}
              />
              
              <div className="h-px w-24" style={{ background: "#d6e4df" }} />

              <p 
                ref={p2Ref}
                aria-live="polite"
                className="text-lg sm:text-xl lg:text-2xl leading-relaxed font-medium min-h-[8em] lg:min-h-[6em]"
                style={{ color: "#4a5c6a" }}
              />

              <div className="narrative-accent opacity-0 translate-y-8 pt-6">
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black italic tracking-tighter" style={{ color: "#00ab00" }}>
                  This is the key to unlocking the life your family deserves.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Evocative Imagery */}
          <div className="relative aspect-square lg:aspect-[4/5] w-full">
            <div 
              className="absolute inset-0 bg-[#0a2540]"
              style={{ borderRadius: "8px" }}
            >
              <div 
                className="w-full h-full opacity-30 mix-blend-luminosity"
                style={{ 
                  borderRadius: "8px",
                  background: "radial-gradient(circle at 50% 50%, rgba(0,171,0,0.8) 0%, rgba(10,37,64,0.9) 100%)",
                }}
              />
              <div 
                className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(10,37,64,0.8))" }}
              />
            </div>
            
            {/* Minimalist Floating Card (Not the generic ones) */}
            <div 
              className="absolute -bottom-8 -left-8 p-10 bg-white shadow-2xl max-w-xs hidden sm:block"
              style={{ border: "1px solid #d6e4df", borderRadius: "8px" }}
            >
              <div className="text-xs font-black text-[#00ab00] uppercase tracking-widest mb-3">Legacy</div>
              <p className="text-xl font-bold leading-tight" style={{ color: "#0a2540" }}>
                "We are building a future where our children don't just survive—they thrive."
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
