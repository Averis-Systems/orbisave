"use client"

import { Landmark, FileText, Users2, Fingerprint } from "lucide-react"

const NETWORKS = [
  { label: "M-Pesa",        logo: "/logos/mpesa.png" },
  { label: "MTN MoMo",      logo: "/logos/mtn-momo.png" },
  { label: "Airtel Money",  logo: "/logos/airtel-money.png" },
  { label: "Bank Transfer", logo: "/logos/bank-transfer.png" },
]

const TRUST_POINTS = [
  {
    icon: Landmark,
    title: "Safe Bank Accounts",
    body: "Your group's money is kept in real bank accounts, not just on the app. It is always safe and reachable.",
  },
  {
    icon: FileText,
    title: "Digital Proof",
    body: "Every single payment is recorded forever. No one can change the records or make a mistake.",
  },
  {
    icon: Users2,
    title: "Group Control",
    body: "The group leaders must all agree before any money is moved. No one can take money alone.",
  },
  {
    icon: Fingerprint,
    title: "Private and Secure",
    body: "Your personal information is locked and safe. Only you and your group can see what you need to.",
  },
]

export function TrustBelt() {
  return (
    <section
      className="relative"
      style={{ background: "#ffffff", borderTop: "1px solid #d6e4df", borderBottom: "1px solid #d6e4df" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">

        {/* Market Authority Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-16">
          
          {/* Left: Text */}
          <div className="max-w-md">
            <h3 
              className="text-xs font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: "#00ab00" }}
            >
              Regional Infrastructure
            </h3>
            <p className="text-2xl font-bold leading-tight" style={{ color: "#0a2540" }}>
              Fully Integrated across <br />
              <span className="text-[#00ab00]">Kenya</span>, 
              <span className="mx-2 text-[#4a5c6a]">·</span> 
              <span className="text-[#00ab00]">Rwanda</span>, 
              <span className="mx-2 text-[#4a5c6a]">·</span> 
              <span className="text-[#00ab00]">Ghana</span>
            </p>
          </div>

          {/* Right: Logos */}
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
            {NETWORKS.map(n => (
              <div 
                key={n.label} 
                className="flex items-center gap-3 transition-opacity hover:opacity-100 grayscale hover:grayscale-0 opacity-70"
              >
                <img
                  src={n.logo}
                  alt={`${n.label} logo`}
                  className="h-7 w-auto object-contain flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <span className="text-sm font-bold tracking-tight" style={{ color: "#0a2540" }}>{n.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider with a modern touch */}
        <div className="relative h-px w-full bg-[#d6e4df] mb-16">
          <div className="absolute top-0 left-0 h-px w-24 bg-[#00ab00]" />
        </div>

        {/* Trust points - Minimalist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {TRUST_POINTS.map(({ icon: Icon, title, body }, i) => (
            <div
              key={i}
              className="flex flex-col gap-4"
            >
              <div 
                className="w-10 h-10 flex items-center justify-center"
                style={{ background: "#f0faf0", borderRadius: "6px" }}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: "#00ab00" }}
                />
              </div>
              <div>
                <div className="text-base font-bold mb-2" style={{ color: "#0a2540" }}>{title}</div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{body}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
