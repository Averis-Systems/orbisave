"use client"

import { Globe2 } from "lucide-react"

export function AfricaMap() {
  return (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden">
      {/* 
         Simplified SVG Africa Map with highlighted countries 
         (Kenya, Rwanda, Ghana)
      */}
      <div className="text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100 shadow-sm">
          <Globe2 className="w-10 h-10 text-[#00ab00]" />
        </div>
        <h3 className="text-2xl font-black text-[#0a2540] mb-2">Regional Operations</h3>
        <p className="text-gray-500 font-bold max-w-sm mx-auto">
          Currently powering savings groups in Kenya, Rwanda, and Ghana. 
          Expanding soon across the continent.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          {['Kenya', 'Rwanda', 'Ghana'].map((country) => (
            <div key={country} className="px-6 py-3 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#00ab00]" />
              <span className="text-sm font-black text-[#0a2540]">{country}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative element to suggest a map */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30,20 L70,20 L80,50 L70,80 L30,80 L20,50 Z' fill='%2300ab00'/%3E%3C/svg%3E")`,
        backgroundSize: '200px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(40px)'
      }} />
    </div>
  )
}
