"use client"

import Link from "next/link"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { ArrowLeft, Home } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { useEffect, useState } from "react"

export default function NotFound() {
  const { isAuthenticated } = useAuthStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#f9faf6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        {/* Lottie Animation Container */}
        <div className="w-full h-64 flex items-center justify-center">
          <DotLottieReact
            src="https://lottie.host/5a0c3f0d-c6a6-4481-9e7b-83935269786a/nS9KzXz7pM.json"
            loop
            autoplay
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-[#012d1d] tracking-tighter">
            Lost in the Orbit?
          </h1>
          <p className="text-[#717973] font-medium leading-relaxed">
            The page you're looking for has drifted away. It might have been moved, deleted, or never existed in our coordinate system.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-black/10 text-[#1a1c1a] font-bold hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <Link 
            href={isMounted && isAuthenticated ? "/dashboard" : "/"}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#00ab00] text-white font-bold hover:bg-[#009100] transition-colors shadow-lg shadow-[#00ab00]/20"
          >
            <Home className="w-4 h-4" />
            {isMounted && isAuthenticated ? "Dashboard" : "Home Page"}
          </Link>
        </div>

        <div className="pt-8">
          <p className="text-[10px] uppercase tracking-widest text-[#717973] font-bold">
            Error Code: 404 · OrbiSave Protocol
          </p>
        </div>
      </div>
    </div>
  )
}
