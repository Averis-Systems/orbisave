"use client"

import Link from "next/link"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { LayoutDashboard } from "lucide-react"

export default function DashboardNotFound() {
  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        {/* Lottie Animation Container */}
        <div className="w-full h-48 flex items-center justify-center scale-110">
          <DotLottieReact
            src="https://lottie.host/5a0c3f0d-c6a6-4481-9e7b-83935269786a/nS9KzXz7pM.json"
            loop
            autoplay
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[#012d1d] tracking-tight">
            Feature Not Found
          </h1>
          <p className="text-sm text-[#717973] font-medium max-w-xs mx-auto">
            This part of the dashboard hasn't been mapped yet. We're digitizing Africa's savings traditions one coordinate at a time.
          </p>
        </div>

        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#012d1d] text-white text-sm font-bold hover:bg-[#0a3d2b] transition-colors shadow-sm"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Overview
        </Link>
      </div>
    </div>
  )
}
