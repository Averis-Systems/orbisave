"use client"

import { useEffect } from "react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { RefreshCcw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f9faf6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        {/* Lottie Animation Container */}
        <div className="w-full h-64 flex items-center justify-center">
          <DotLottieReact
            src="/lottie/Internal server error.lottie"
            loop
            autoplay
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-[#012d1d] tracking-tighter">
            System Turbulence
          </h1>
          <p className="text-[#717973] font-medium leading-relaxed">
            Something went wrong on our end. Our technical team has been notified and we're working to stabilize the orbit.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button 
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-black/10 text-[#1a1c1a] font-bold hover:bg-black/5 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
          
          <Link 
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#00ab00] text-white font-bold hover:bg-[#009100] transition-colors shadow-lg shadow-[#00ab00]/20"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="pt-8">
          <p className="text-[10px] uppercase tracking-widest text-[#717973] font-bold">
            Error Code: 500 · OrbiSave Protocol
          </p>
        </div>
      </div>
    </div>
  )
}
