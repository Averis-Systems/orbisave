"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-init"
import { ScrollTrigger } from "gsap/dist/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const SLIDES = [
  {
    id: "cycle",
    tag: "THE CYCLE",
    title: "Seasonal Wealth",
    desc: "Most farmers earn during 3 small harvest windows but need capital year-round. Traditional savings are often depleted before planting season begins.",
    img: "/notebook-era.png",
    accent: "#f59e0b"
  },
  {
    id: "discipline",
    tag: "THE DISCIPLINE",
    title: "Automated Trust",
    desc: "OrbiSave schedules contributions to match harvest cycles. STK Push technology ensures savings happen when money is available, protecting your future.",
    img: "/digital-leap.png",
    accent: "#00ab00"
  },
  {
    id: "growth",
    tag: "THE GROWTH",
    title: "A Financial Bridge",
    desc: "Digitized records create a verifiable financial history. Unlock group loans for seeds and fertilizer, turning seasonal income into intergenerational wealth.",
    img: "/collective-wealth.png",
    accent: "#3b82f6"
  }
]

export function HorizontalScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const slides = gsap.utils.toArray(".horizontal-slide")

    // Master horizontal scrub
    const masterTween = gsap.to(slides, {
      xPercent: -100 * (slides.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: triggerRef.current,
        pin: true,
        scrub: true,
        end: () => `+=${triggerRef.current?.offsetWidth}`,
      }
    })

    // Progress dots animation
    const dots = gsap.utils.toArray(".progress-dot")
    dots.forEach((dot: any, i: number) => {
      gsap.to(dot, {
        scale: 1.5,
        backgroundColor: SLIDES[i].accent,
        opacity: 1,
        scrollTrigger: {
          trigger: slides[i] as any,
          start: "left center",
          containerAnimation: masterTween,
          toggleActions: "play none none reverse",
        }
      })
    })

    // Text animations keyed to the master tween
    slides.forEach((slide: any) => {
      gsap.from(slide.querySelector(".slide-content"), {
        y: 40,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: slide,
          start: "left center",
          containerAnimation: masterTween,
          toggleActions: "play none none reverse"
        }
      })
    })

    // Fade dots in/out based on section visibility
    gsap.fromTo(".progress-dots-container", 
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0,
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play reverse play reverse",
        }
      }
    )

    // Ensure all ScrollTriggers are refreshed after layout
    ScrollTrigger.refresh()
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="bg-[#0a2540] overflow-hidden">
      <div ref={triggerRef} className="flex h-screen w-[300vw] relative">
        {SLIDES.map((slide, i) => (
          <section 
            key={slide.id}
            className="horizontal-slide w-screen h-screen flex items-center justify-center p-6 lg:p-24 relative overflow-hidden"
          >
            {/* Background Image Layer */}
            <div className="absolute inset-0 z-0">
              <img 
                src={slide.img} 
                alt="" 
                className="w-full h-full object-cover opacity-10 grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a2540] via-[#0a2540]/95 to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10 slide-content">
              <div className="space-y-10">
                <div 
                  className="inline-flex items-center gap-4 font-bold text-[10px] tracking-[0.4em] px-4 py-2 bg-white/5 rounded-full border border-white/10"
                  style={{ color: slide.accent }}
                >
                  {slide.tag}
                </div>
                <h3 className="text-5xl lg:text-8xl font-bold tracking-tighter leading-[0.9] text-white">
                  {slide.title}
                </h3>
                <p className="text-xl lg:text-2xl text-white/50 font-medium leading-relaxed max-w-xl">
                  {slide.desc}
                </p>
                
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-4 text-white/30 font-bold text-[10px] tracking-[0.3em]">
                    <div className="h-px w-16 bg-white/10" />
                    SCROLL TO EXPLORE
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/3] lg:aspect-[16/10] rounded-[8px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/5 group bg-[#0a2540]">
                <img 
                  src={slide.img} 
                  alt={slide.title} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80"
                />
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Fixed Progress Indicator - now with controlled visibility */}
      <div className="progress-dots-container fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex gap-3 bg-black/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/5 opacity-0">
        {SLIDES.map((_, dotIdx) => (
          <div 
            key={dotIdx}
            className="progress-dot w-2 h-2 rounded-full bg-white/20 transition-all duration-300"
          />
        ))}
      </div>
    </div>
  )
}
