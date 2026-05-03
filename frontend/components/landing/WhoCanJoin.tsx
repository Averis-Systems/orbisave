"use client"

import { useRef, useState, useEffect } from "react"
import { useGSAP } from "@gsap/react"
import {
  Sprout, Fish, Heart, Briefcase, Layers, Users,
  ArrowRight, Check,
} from "lucide-react"
import { gsap } from "@/lib/gsap-init"

const CATEGORIES = [
  {
    id: "farmers",
    icon: Sprout,
    label: "Crop Farmers",
    headline: "Save when you harvest. Get seeds and fertilizer when you need them.",
    bullets: [
      "Save more during harvest and less during lean months",
      "Get seeds, fertilizer, and tools on credit through the app",
      "Your group's good record helps you get bigger bank loans",
    ],
    accent: "#00ab00",
    bg: "#e9f3ed",
    image: "/images/categories/farmers-bg.jpg",
  },
  {
    id: "fishers",
    icon: Fish,
    label: "Fishers & Aquaculture",
    headline: "Get nets, boats, and fish feed now. Pay back from your daily catch.",
    bullets: [
      "Find all the fishing tools you need in one simple app",
      "Get loans for new gear even when the fishing is slow",
      "Save money whenever you have a good catch",
    ],
    accent: "#0a2540",
    bg: "#e8edf3",
    image: "/images/categories/fishers-bg.jpg",
  },
  {
    id: "women",
    icon: Heart,
    label: "Women's Groups",
    headline: "The chama you love, but safer and clearer on your phone.",
    bullets: [
      "Everyone can see every shilling saved. No more arguments",
      "The turn to get paid is fixed. No one can skip the line",
      "Borrow money from the group easily for any emergency",
    ],
    accent: "#00ab00",
    bg: "#e9f3ed",
    image: "/images/categories/women-bg.jpg",
  },
  {
    id: "corporates",
    icon: Briefcase,
    label: "Corporate Groups",
    headline: "Staff savings made simple and safe for everyone in the office.",
    bullets: [
      "Clear records that show exactly where every cent is",
      "Leaders must agree together before any money is moved",
      "Get official group statements ready for any bank",
    ],
    accent: "#0a2540",
    bg: "#e8edf3",
    image: "/images/categories/corporates-bg.jpg",
  },
  {
    id: "coops",
    icon: Layers,
    label: "Farmer Co-ops",
    headline: "Manage savings and tools for your whole co-op in one place.",
    bullets: [
      "Keep track of many smaller groups easily in one app",
      "See the total savings of everyone in one simple report",
      "Your co-op can get special grants and support",
    ],
    accent: "#00ab00",
    bg: "#e9f3ed",
    image: "/images/categories/coops-bg.jpg",
  },
  {
    id: "youth",
    icon: Users,
    label: "Youth & Community Groups",
    headline: "Start saving together and build a good name for your future.",
    bullets: [
      "Start saving with small amounts everyone can afford",
      "No need to meet in person. Save and talk on your phone",
      "Build a good record now to get bigger loans later",
    ],
    accent: "#0a2540",
    bg: "#e8edf3",
    image: "/images/categories/youth-bg.jpg",
  },
]

export function WhoCanJoin() {
  const ref = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [isHovered, setIsHovered] = useState<boolean>(false)

  // Auto-advance logic
  useEffect(() => {
    if (isHovered) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CATEGORIES.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [isHovered])

  useGSAP(() => {
    gsap.fromTo(".wcj-header",
      { y: 28, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
      }
    )
    gsap.fromTo(".wcj-tab",
      { y: 20, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
    gsap.fromTo(".wcj-panel",
      { y: 24, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.75, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 62%", once: true },
      }
    )
    // Animate icons on scroll
    gsap.fromTo(".wcj-tab-icon",
      { rotate: -15, scale: 0.7 },
      {
        rotate: 0, scale: 1, stagger: 0.07, duration: 0.5, ease: "back.out(2)",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      }
    )
  }, { scope: ref })

  // Progress bar and panel content animations when activeIndex changes
  useGSAP(() => {
    // 1. Progress bar
    if (isHovered) {
      gsap.killTweensOf(".tab-progress-active")
    } else {
      gsap.fromTo(".tab-progress-active",
        { scaleX: 0 },
        { scaleX: 1, duration: 6, ease: "none" }
      )
    }

    // 2. Panel content
    const tl = gsap.timeline()
    tl.fromTo(".wcj-content-side > *", 
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power2.out" }
    )
    tl.fromTo(".wcj-visual-overlay", 
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
      "-=0.3"
    )
  }, { scope: ref, dependencies: [activeIndex, isHovered] })

  const activeCategory = CATEGORIES[activeIndex]
  const isReversed = activeIndex % 2 !== 0

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32"
      style={{ background: "#e9f3ed" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="wcj-header mb-14">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase mb-5 px-3 py-1.5"
            style={{ color: "#00ab00", background: "#ffffff", borderRadius: "4px", border: "1px solid #d6e4df" }}
          >
            Built for Every Group
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight"
            style={{ color: "#0a2540" }}
          >
            Who joins OrbiSave?
          </h2>
          <p
            className="mt-4 text-lg font-medium max-w-2xl leading-relaxed"
            style={{ color: "#4a5c6a" }}
          >
            Any group that saves money together can benefit from using OrbiSave. Choose your type of group below.
          </p>
        </div>

        {/* Tab strip */}
        <div className="flex overflow-x-auto flex-nowrap gap-2 mb-8 pb-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {CATEGORIES.map(({ id, icon: Icon, label }, idx) => (
            <button
              key={id}
              onClick={() => setActiveIndex(idx)}
              className={`wcj-tab relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-300 overflow-hidden group`}
              style={{
                borderRadius: "8px",
                border: `1px solid ${activeIndex === idx ? "#00ab00" : "#d6e4df"}`,
                background: activeIndex === idx ? "#00ab00" : "#ffffff",
                color: activeIndex === idx ? "#ffffff" : "#0a2540",
              }}
            >
              <Icon className="w-4 h-4 wcj-tab-icon flex-shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
              {/* Progress bar */}
              {activeIndex === idx && (
                <div 
                  className="tab-progress-active absolute bottom-0 left-0 h-1 w-full origin-left bg-white/40"
                  style={{ transformOrigin: "left" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Active panel */}
        <div
          key={activeIndex}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="wcj-panel grid lg:grid-cols-2 gap-0 overflow-hidden shadow-xl"
          style={{
            border: "1px solid #d6e4df",
            borderRadius: "12px",
            background: "#ffffff",
          }}
        >
          {/* Content side */}
          <div className={`wcj-content-side p-8 lg:p-14 flex flex-col gap-6 ${isReversed ? "lg:order-2" : "lg:order-1"}`}>
            <div
              className="w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: activeCategory.bg, borderRadius: "12px", border: "1px solid #d6e4df" }}
            >
              <activeCategory.icon
                className="w-7 h-7"
                style={{ color: activeCategory.accent }}
              />
            </div>

            <div>
              <div
                className="text-xs font-bold tracking-[0.2em] uppercase mb-4 opacity-60"
                style={{ color: activeCategory.accent }}
              >
                {activeCategory.label}
              </div>
              <h3
                className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
                style={{ color: "#0a2540" }}
              >
                {activeCategory.headline}
              </h3>
            </div>

            <ul className="flex flex-col gap-4 mt-2">
              {activeCategory.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${activeCategory.accent}15` }}>
                    <Check
                      className="w-3 h-3"
                      style={{ color: activeCategory.accent }}
                    />
                  </div>
                  <span className="text-base font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 text-base font-bold transition-all group mt-6 hover:translate-x-1"
              style={{ color: activeCategory.accent }}
            >
              Start your {activeCategory.label.split(" ")[0]} group
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          {/* Visual side with Image */}
          <div
            className={`relative min-h-[340px] lg:min-h-0 flex items-center justify-center overflow-hidden ${isReversed ? "lg:order-1" : "lg:order-2"}`}
            style={{ 
              borderLeft: isReversed ? "none" : "1px solid #d6e4df", 
              borderRight: isReversed ? "1px solid #d6e4df" : "none",
              backgroundColor: activeCategory.bg
            }}
          >
            <img 
              src={activeCategory.image} 
              alt={activeCategory.label} 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Soft Overlay */}
            <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />

            {/* Floating Minimalist Overlay */}
            <div className="wcj-visual-overlay relative z-10 flex flex-col items-center gap-2 text-center drop-shadow-xl">
              <div
                className="w-12 h-12 flex items-center justify-center shadow-lg"
                style={{
                  background: "#ffffff",
                  borderRadius: "8px",
                }}
              >
                <activeCategory.icon
                  className="w-6 h-6"
                  style={{ color: activeCategory.accent }}
                />
              </div>
              <div className="text-white drop-shadow-md">
                <div className="text-2xl font-black mb-0.5 tracking-tight">
                  {activeCategory.label}
                </div>
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-90"
                >
                  Supported on OrbiSave
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
