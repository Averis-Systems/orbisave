"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useGSAP } from "@gsap/react"
import dynamic from "next/dynamic"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { gsap } from "@/lib/gsap-init"

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
    <div className="min-h-screen bg-[#f9faf6] flex flex-col font-sans selection:bg-[#00ab00]/20" ref={containerRef}>
      {/* Topbar */}
      <nav className="flex items-center justify-between px-8 py-6 w-full absolute top-0 z-50 animate-header">
        <Link href="/" className="flex items-center gap-2 text-2xl font-black text-[#012d1d] tracking-tighter">
          <div className="w-10 h-10 rounded-xl bg-[#012d1d] flex items-center justify-center shadow-lg shadow-[#012d1d]/30">
            <span className="text-white text-lg font-black tracking-normal">O</span>
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#012d1d] to-[#00ab00]">OrbiSave</span>
        </Link>
        <div className="text-sm font-medium text-[#717973] flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00ab00]/20 flex items-center justify-center text-[#012d1d] font-bold text-xs">
            OS
          </div>
          Welcome
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-12 w-full max-w-5xl mx-auto">
        <div className="text-center mb-12 animate-header">
          <h1 className="text-3xl md:text-[2.5rem] font-bold text-[#1a1c1a] mb-4 tracking-tight">
            How would you like to use OrbiSave?
          </h1>
          <p className="text-[#717973] text-[1.05rem] font-medium">
            We are here to help you choose the path that fits your financial goals.
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
                  ? "border-[#00ab00] bg-[#ecfdf5] transform scale-[1.02]"
                  : "border-black/5 bg-white hover:border-[#00ab00]/30"
              }`}
            >
              <div className="flex-1 flex flex-col items-center w-full mb-8">
                <div className="w-full h-48 flex items-center justify-center relative group">
                  <DotLottieReact
                    src="/lottie/join-as-member.lottie"
                    loop
                    autoplay
                    className="w-full h-full max-w-[240px]"
                  />
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
                  ? "border-[#00ab00] bg-[#ecfdf5] transform scale-[1.02]"
                  : "border-black/5 bg-white hover:border-[#00ab00]/30"
              }`}
            >
              <div className="flex-1 flex flex-col items-center w-full mb-8">
                <div className="w-full h-48 flex items-center justify-center relative group">
                  <DotLottieReact
                    src="/lottie/create new group and invitation.lottie"
                    loop
                    autoplay
                    className="w-full h-full max-w-[240px]"
                  />
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
                ? "bg-[#00ab00] hover:bg-[#0ea5e9] hover:shadow-md text-white border-transparent" // Changing hover to slight gradient feel, or just deeper green
                : "bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed"
            }`}
            style={selectedRole ? { backgroundColor: "#00ab00" } : {}}
          >
            Let's start
          </button>
        </div>
      </div>
    </div>
  )
}
