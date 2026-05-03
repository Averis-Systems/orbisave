"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useGSAP } from "@gsap/react"
import dynamic from "next/dynamic"
import { gsap } from "@/lib/gsap-init"

// Removed DotLottieReact import due to JSON format incompatibility

export default function OnboardingSelection() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedRole, setSelectedRole] = useState<"member" | "chairperson" | null>(null)

  useGSAP(() => {
    const tl = gsap.timeline()
    
    // Animate Header
    tl.from(".animate-header", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: "power3.out"
    })
    
    // Animate Cards
    tl.from(".animate-card", {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "back.out(1.2)"
    }, "-=0.2")

    // Animate Button
    tl.from(".animate-btn", {
      scale: 0.9,
      opacity: 0,
      duration: 0.4,
      ease: "power2.out"
    }, "-=0.3")

  }, { scope: containerRef })

  const handleStart = () => {
    if (selectedRole === "chairperson") {
      router.push("/chama-onboarding")
    } else if (selectedRole === "member") {
      router.push("/register")
    }
  }

  return (
    <div className="min-h-screen bg-[#f9faf6] flex flex-col font-sans selection:bg-[#10b981]/20" ref={containerRef}>
      {/* Topbar */}
      <nav className="flex items-center justify-between px-8 py-6 w-full absolute top-0 z-50 animate-header">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#012d1d] tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-[#012d1d] flex items-center justify-center">
            <span className="text-white text-sm font-bold tracking-normal">O</span>
          </div>
          OrbiSave
        </Link>
        <div className="text-sm font-medium text-[#717973] flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[#012d1d] font-bold text-xs">
            OS
          </div>
          Welcome
          <div className="w-6 h-6 ml-1 flex items-center justify-center text-lg animate-bounce">
            😊
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-12 w-full max-w-5xl mx-auto">
        <div className="text-center mb-12 animate-header">
          <h1 className="text-3xl md:text-[2.5rem] font-bold text-[#1a1c1a] mb-4 tracking-tight">
            How would you like to use OrbiSave?
          </h1>
          <p className="text-[#717973] text-[1.05rem] font-medium">
            Anyhow, we're here to help you out what's right for you 😎
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl mb-12">
          {/* Join as Member Card */}
          <div className="animate-card flex flex-col h-full w-full">
            <button
              type="button"
              onClick={() => setSelectedRole("member")}
              className={`flex-1 overflow-hidden relative p-6 md:p-8 rounded-lg text-left transition-all duration-300 border-2 flex flex-col min-h-[380px] w-full ${
                selectedRole === "member"
                  ? "border-[#10b981] bg-[#ecfdf5] transform scale-[1.02]"
                  : "border-black/5 bg-white hover:border-[#10b981]/30"
              }`}
            >
              <div className="flex-1 flex flex-col items-center w-full mb-8">
                <div className="w-full h-44 bg-[#e6fcf5] rounded-xl flex items-center justify-center relative overflow-hidden group">
                    <div className="w-28 h-28 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 flex items-center justify-center text-[5rem] animate-pulse">
                      👋
                    </div>
                    {/* Decorative orbital rings */}
                    <div className="absolute w-40 h-40 border-2 border-[#10b981]/10 rounded-full z-0"></div>
                    <div className="absolute w-28 h-28 border-2 border-[#10b981]/20 rounded-full z-0"></div>
                    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#10b981]/10 to-transparent z-0"></div>
                </div>
              </div>
              
              <div className="text-center mt-auto">
                <h3 className="text-xl font-bold text-[#1a1c1a] mb-3">Join as a Member</h3>
                <p className="text-[0.9rem] text-[#717973] leading-relaxed max-w-[280px] mx-auto font-medium">
                  It's a best option for you if you have an invite code. Later, you can create a group, that's easy.
                </p>
              </div>
            </button>
          </div>

          {/* Start a Chama Card */}
          <div className="animate-card flex flex-col h-full w-full">
            <button
              type="button"
              onClick={() => setSelectedRole("chairperson")}
              className={`flex-1 overflow-hidden relative p-6 md:p-8 rounded-lg text-left transition-all duration-300 border-2 flex flex-col min-h-[380px] w-full ${
                selectedRole === "chairperson"
                  ? "border-[#10b981] bg-[#ecfdf5] transform scale-[1.02]"
                  : "border-black/5 bg-white hover:border-[#10b981]/30"
              }`}
            >
              <div className="flex-1 flex flex-col items-center w-full mb-8">
                <div className="w-full h-44 bg-[#f8f9fa] border border-black/5 rounded-xl flex items-center justify-center relative overflow-hidden group">
                    <div className="w-32 h-32 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 flex items-center justify-center text-[6rem] animate-pulse">
                      🤝
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute w-40 h-40 border-2 border-black/5 rounded-full z-0"></div>
                    <div className="absolute w-[100px] h-[40px] rounded-full bg-[#1b4332]/5 top-6 right-2 z-0"></div>
                    <div className="absolute w-4 h-4 rounded-full bg-[#10b981] bottom-8 left-10 z-0 shadow-sm shadow-[#10b981]/40"></div>
                </div>
              </div>

              <div className="text-center mt-auto">
                <h3 className="text-xl font-bold text-[#1a1c1a] mb-3">Start a new group</h3>
                <p className="text-[0.9rem] text-[#717973] leading-relaxed max-w-[280px] mx-auto font-medium">
                  Let's start collaborating with your members and unlock the full access to OrbiSave. Hope you'll enjoy.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="animate-btn w-full max-w-[240px]">
          <button
            onClick={handleStart}
            disabled={!selectedRole}
            className={`w-full h-14 rounded-full font-bold text-[15px] shadow-sm transition-all duration-300 ${
              selectedRole 
                ? "bg-[#10b981] hover:bg-[#0ea5e9] hover:shadow-md text-white border-transparent" // Changing hover to slight gradient feel, or just deeper green
                : "bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed"
            }`}
            style={selectedRole ? { backgroundColor: "#10b981" } : {}}
          >
            Let's start
          </button>
        </div>
      </div>
    </div>
  )
}
