"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Lock } from "lucide-react"

const slides = [
  {
    id: 1,
    image: "https://loremflickr.com/1200/1600/africa,farmer,agriculture/all",
    tag: "TIER-1 SECURITY",
    headline: "Coordinated\nwealth for\n<i>generational</i>\ngrowth.",
    body: "OrbiSave aligns your capital with the natural rhythms of agricultural cycles. We provide the infrastructure for collective savings, ensuring every season brings measurable impact and secured returns.",
    stats: [
      { value: "40K+", label: "FARMERS SERVED" },
      { value: "KES 2.1B", label: "POOLED SAVINGS" },
    ],
  },
  {
    id: 2,
    image: "https://loremflickr.com/1200/1600/africa,business,meeting/all",
    tag: "TIER-1 SECURITY",
    headline: "Empower your\nsupply chain\n<i>seamlessly</i>.",
    body: "Enable financial inclusion across your supplier network with transparent group savings infrastructure built for scale and reliability.",
    stats: [
      { value: "120+", label: "PARTNER COMPANIES" },
      { value: "99.9%", label: "UPTIME GUARANTEE" },
    ],
  },
  {
    id: 3,
    image: "https://loremflickr.com/1200/1600/africa,leader,professional/all",
    tag: "TIER-1 SECURITY",
    headline: "Lead with\n<i>confidence</i>\nand clarity.",
    body: "Powerful tools for group leaders. Manage rotations, enforce rules, and build member trust with immutable ledger technology.",
    stats: [
      { value: "8,500+", label: "ACTIVE CHAMAS" },
      { value: "$2.4B", label: "ASSETS SECURED" },
    ],
  },
  {
    id: 4,
    image: "https://loremflickr.com/1200/1600/africa,market,people/all",
    tag: "TIER-1 SECURITY",
    headline: "Strength in\n<i>numbers</i>\nand unity.",
    body: "Whatever your size, OrbiSave scales with your community. From 5 to 500 members, our platform adapts to your unique saving cycles.",
    stats: [
      { value: "500K+", label: "TOTAL MEMBERS" },
      { value: "KES 890M", label: "PAYOUTS PROCESSED" },
    ],
  },
]

export function AuthSlider() {
  const [current, setCurrent] = useState(0)

  const goTo = useCallback((index: number) => {
    setCurrent(index)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (current + 1) % slides.length
      goTo(next)
    }, 6000)
    return () => clearInterval(timer)
  }, [current, goTo])

  return (
    <div className="auth-slider">
      {/* Background Images */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`auth-slider__bg ${i === current ? "auth-slider__bg--active" : ""}`}
        >
          {i === current && (
            <Image
              src={s.image}
              alt={s.tag}
              fill
              priority={i === 0}
              className="object-cover"
              sizes="50vw"
            />
          )}
        </div>
      ))}

      <div className="auth-slider__overlay" />

      {slides.map((slide, i) => (
        <div 
          key={slide.id}
          className={`auth-slider__content ${i === current ? "auth-slider__content--in" : "auth-slider__content--out"}`}
          style={{ pointerEvents: i === current ? "auto" : "none" }}
        >
          <div className="auth-slider__tag">
            <Lock className="w-3 h-3 text-white" />
            {slide.tag}
          </div>

          <h2 className="auth-slider__headline">
            {slide.headline.split("\n").map((line, idx) => (
              <span key={idx}>
                {line.includes('<i>') ? (
                  <span dangerouslySetInnerHTML={{ __html: line }} />
                ) : (
                  line
                )}
                {idx < slide.headline.split("\n").length - 1 && <br />}
              </span>
            ))}
          </h2>

          <p className="auth-slider__body">{slide.body}</p>
        </div>
      ))}

      {slides.map((slide, i) => (
        i === current && (
          <div key={slide.id} className="auth-slider__stats">
            {slide.stats.map((stat) => (
              <div key={stat.label} className="auth-slider__stat">
                <span className="auth-slider__stat-value">{stat.value}</span>
                <span className="auth-slider__stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        )
      ))}

    </div>
  )
}
