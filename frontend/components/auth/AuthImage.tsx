"use client"

import Image from "next/image"

export function AuthImage() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#e9f3ed]">
      <Image
        src="/images/categories/women-bg.jpg"
        alt="OrbiSave Community"
        fill
        priority
        className="object-cover"
        sizes="50vw"
      />
      {/* Soft Overlay */}
      <div className="absolute inset-0 bg-[#0a2540]/30" />
      
      {/* Bottom Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-12 lg:p-16 bg-gradient-to-t from-black/60 via-transparent to-transparent">
        <h2 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] mb-6 whitespace-pre-line tracking-tight">
          Digitizing<br />
          <span className="text-[#00ab00]">Africa's oldest</span><br />
          savings tradition.
        </h2>
        <p className="text-base text-white/80 max-w-lg leading-relaxed font-medium">
          OrbiSave provides the digital infrastructure for collective savings, 
          ensuring trust is backed by transparency and secure returns.
        </p>
      </div>
    </div>
  )
}
