"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"

/**
 * Left panel of the full-bleed auth layout (verify / verify-email).
 *
 * Rewritten to match AuthIllustrationPanel (login / register): a soft
 * brand-tinted gradient with brand-recolored unDraw vectors: NO photography,
 * no real people, no external image hosts. Typography is the app's Montserrat
 * (font-sans) throughout; the accent word is a green span, not an italic /
 * serif treatment. The messages rotate to keep the panel alive.
 */
const slides = [
  {
    image: "/illustrations/security.svg",
    pre: "Bank-grade security,",
    accent: "by design.",
    body: "Identity checks and bank-backed custody protect every shilling. Your contributions move on an immutable, audited ledger.",
    stats: [
      { value: "KYC", label: "Identity gates" },
      { value: "Trust", label: "Bank-backed custody" },
    ],
  },
  {
    image: "/illustrations/savings.svg",
    pre: "Save together,",
    accent: "grow together.",
    body: "OrbiSave gives your group the infrastructure to save collectively, so every cycle brings measurable, shared progress.",
    stats: [
      { value: "Auto", label: "Contribution cycles" },
      { value: "Ledger", label: "Every entry auditable" },
    ],
  },
  {
    image: "/illustrations/money-received.svg",
    pre: "Rotation payouts",
    accent: "you can trust.",
    body: "Schedule-driven, PIN-gated payouts reach the right member at the right time. No disputes, no guesswork.",
    stats: [
      { value: "Fair", label: "Schedule-driven" },
      { value: "Secure", label: "PIN-gated release" },
    ],
  },
  {
    image: "/illustrations/team-spirit.svg",
    pre: "Strength in",
    accent: "numbers and unity.",
    body: "Whatever your size, OrbiSave scales with your community, from 5 to 500 members on your own saving rhythm.",
    stats: [
      { value: "5 to 500", label: "Members per group" },
      { value: "Roles", label: "Clear governance" },
    ],
  },
]

export function AuthSlider() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6000)
    return () => clearInterval(timer)
  }, [])

  const slide = slides[current]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Brand-tinted gradient + soft blobs: matches AuthIllustrationPanel */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e9f3ed] via-[#f4faf5] to-white" />
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00ab00]/10 blur-3xl" />
      <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[#0a2540]/5 blur-3xl" />

      <div className="pointer-events-auto relative flex h-full flex-col p-12 xl:p-16">
        <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[#0a2540]">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-[#00ab00] text-sm text-white">O</span>
          OrbiSave
        </Link>

        {/* Rotating illustration */}
        <div className="flex flex-1 items-center justify-center py-8">
          {slides.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.image}
              src={s.image}
              alt=""
              loading="lazy"
              className={`absolute h-56 w-auto max-w-[70%] transition-all duration-700 xl:h-64 ${
                i === current ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4"
              }`}
            />
          ))}
        </div>

        {/* Rotating copy: Montserrat, green accent (no italic/serif) */}
        <div key={current} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00ab00] ring-1 ring-[#00ab00]/15 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Tier-1 security
          </div>

          <h2 className="max-w-md text-3xl font-bold leading-[1.15] tracking-tight text-[#0a2540] xl:text-4xl">
            {slide.pre} <span className="text-[#00ab00]">{slide.accent}</span>
          </h2>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500 xl:text-base">{slide.body}</p>

          <div className="mt-8 flex gap-10">
            {slide.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <span className="text-lg font-bold text-[#0a2540]">{stat.value}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-10 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.image}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-[#00ab00]" : "w-2 bg-[#0a2540]/15"}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
