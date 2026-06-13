"use client"

import { Settings2, RefreshCw, CreditCard, Users, Calendar, ChevronRight, ShieldCheck, Zap } from "lucide-react"
import Link from "next/link"

const SETTING_CARDS = [
  {
    icon: Settings2,
    title: "Protocol Configuration",
    desc: "Global rules, contribution thresholds, grace periods and penalty governance.",
    href: "/dashboard/settings",
    color: "bg-[#0a2540]",
  },
  {
    icon: RefreshCw,
    title: "Rotation Logic",
    desc: "Manage payout sequencing, reorder positions, and configure settlement rules.",
    href: "/dashboard/settings/rotations",
    color: "bg-[#00ab00]",
  },
  {
    icon: CreditCard,
    title: "Liquidity Pool Settings",
    desc: "Enable/disable the loan pool, define interest yields, and eligibility criteria.",
    href: "/dashboard/settings/loans",
    color: "bg-orange-500",
  },
  {
    icon: Calendar,
    title: "Governance & Quorum",
    desc: "Meeting schedules, attendance requirements, and consensus voting rules.",
    href: "/dashboard/settings/meetings",
    color: "bg-blue-600",
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Group Governance</h1>
          <p className="text-gray-500 font-bold">Configure internal protocols, financial logic, and meeting consensus rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SETTING_CARDS.map(card => (
          <Link key={card.title} href={card.href} className="group block no-underline">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 hover:shadow-xl hover:shadow-[#0a2540]/5 hover:-translate-y-1 transition-all duration-300 flex items-start gap-6 h-full border-l-4 border-l-[#0a2540]">
              <div className={`w-14 h-14 rounded-lg ${card.color} text-white flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <card.icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-black text-[#0a2540] group-hover:text-[#00ab00] transition-colors">{card.title}</h3>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#00ab00] group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-sm font-bold text-gray-400 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Snapshot Overlay */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-[#0a2540] border border-gray-100">
              <Zap size={20} />
           </div>
           <div>
              <h3 className="text-lg font-black text-[#0a2540]">Active Configuration Snapshot</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Read-only system status</p>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
          {[
            { label: "Group Instance",       val: "Kisumu Agri Collective" },
            { label: "Base Contribution",    val: "KES 5,000" },
            { label: "Settlement Frequency", val: "5th of each month" },
            { label: "Default Grace Window", val: "5 days" },
            { label: "Infraction Penalty",   val: "KES 200" },
            { label: "Liquidity Pool",       val: "ACTIVE — KES 45,000" },
            { label: "Interest Rate Flat",   val: "10%" },
            { label: "Maximum Tenure",       val: "12 Weeks" },
            { label: "Sequencing Mode",      val: "Chronological" },
            { label: "Consensus Quorum",     val: "60% Threshold" },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0 md:even:border-b md:last:border-b-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{r.label}</span>
              <span className="text-xs font-black text-[#0a2540]">{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Banner */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100 flex items-center gap-4">
         <ShieldCheck size={24} className="text-blue-600 flex-shrink-0" />
         <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
            All configuration changes require a 2/3 majority vote via the meetings portal before they are committed to the live environment. Internal protocols are protected by 256-bit AES encryption.
         </p>
      </div>
    </div>
  )
}
