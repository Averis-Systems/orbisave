"use client"

import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { useEffect, useState } from "react"
import { gsap } from "@/lib/gsap-init"

interface SuccessOverlayProps {
  message: string
  submessage?: string
  onComplete?: () => void
  duration?: number
}

export function SuccessOverlay({ message, submessage, onComplete, duration = 3000 }: SuccessOverlayProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const tl = gsap.timeline()
    
    tl.from(".success-content", {
      scale: 0.8,
      opacity: 0,
      duration: 0.5,
      ease: "back.out(1.7)"
    })

    const timer = setTimeout(() => {
      tl.to(".success-overlay", {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          setIsVisible(false)
          if (onComplete) onComplete()
        }
      })
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f9faf6]/95 backdrop-blur-sm success-overlay">
      <div className="max-w-md w-full p-8 text-center space-y-6 success-content">
        <div className="w-64 h-64 mx-auto">
          <DotLottieReact
            src="/lottie/transaction success.lottie"
            autoplay
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-[#012d1d] tracking-tighter italic uppercase">{message}</h2>
          {submessage && <p className="text-[#717973] font-medium">{submessage}</p>}
        </div>
      </div>
    </div>
  )
}
