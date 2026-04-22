"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Loaning", href: "/how-loaning-works" },
  { label: "Input Financing", href: "/input-financing" },
]

export function Navbar() {
  const navRef = useRef<HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Scroll detection for blur/border effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // GSAP entrance
  useGSAP(() => {
    gsap.from(".nav-item", {
      y: -14, opacity: 0, stagger: 0.08, duration: 0.6, ease: "power2.out", delay: 0.1,
    })
  }, { scope: navRef })

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <>
      <nav
        ref={navRef}
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-[#d6e4df]"
            : "bg-transparent border-b border-transparent"
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="nav-item flex items-center gap-2.5 group"
            aria-label="OrbiSave Home"
          >
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:rotate-6"
              style={{ background: "#00ab00", borderRadius: "6px" }}
            >
              <span className="text-white font-black text-sm leading-none">O</span>
            </div>
            <span
              className="text-lg font-bold tracking-tight transition-colors duration-200"
              style={{ color: scrolled ? "#0a2540" : "#0a2540" }}
            >
              OrbiSave
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="nav-item px-4 py-2 text-sm font-semibold text-[#0f1924] hover:text-[#00ab00] transition-colors duration-200 rounded-[6px] hover:bg-[#e9f3ed]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 nav-item">
            <Link href="/login">
              <Button
                variant="ghost"
                className="h-9 px-4 text-sm font-semibold text-[#0a2540] hover:text-[#0a2540] hover:bg-[#e9f3ed] rounded-[6px]"
              >
                Log in
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button
                className="h-9 px-5 text-sm font-semibold text-white rounded-[6px] flex items-center gap-1.5 group border-0"
                style={{ background: "#00ab00" }}
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5 icon-arrow" />
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-[6px] text-[#0a2540] hover:bg-[#e9f3ed] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`
          fixed inset-0 z-40 md:hidden transition-all duration-300
          ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <div
          className={`
            absolute top-0 right-0 bottom-0 w-[80vw] max-w-xs bg-white flex flex-col
            transition-transform duration-300
            ${mobileOpen ? "translate-x-0" : "translate-x-full"}
          `}
          style={{ borderLeft: "1px solid #d6e4df" }}
        >
          <div className="flex items-center justify-between px-5 h-16 border-b border-[#d6e4df]">
            <span className="font-bold text-[#0a2540]">Menu</span>
            <button
              className="p-1.5 rounded-[6px] hover:bg-[#e9f3ed] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-4 h-4 text-[#0a2540]" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-4 flex-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-4 py-3 text-sm font-semibold text-[#0f1924] hover:text-[#00ab00] hover:bg-[#e9f3ed] rounded-[6px] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[#d6e4df] mt-4 pt-4 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button
                  variant="outline"
                  className="w-full h-10 text-sm font-semibold text-[#0a2540] border-[#d6e4df] rounded-[6px]"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/onboarding" onClick={() => setMobileOpen(false)}>
                <Button
                  className="w-full h-10 text-sm font-semibold text-white rounded-[6px] gap-2 border-0"
                  style={{ background: "#00ab00" }}
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5 icon-arrow" />
                </Button>
              </Link>
            </div>
          </nav>
          <div className="px-5 py-4 border-t border-[#d6e4df]">
            <p className="text-[10px] text-[#4a5c6a] font-semibold uppercase tracking-widest">
              Kenya · Rwanda · Ghana
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
