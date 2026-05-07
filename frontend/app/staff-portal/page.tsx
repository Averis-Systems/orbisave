"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { 
  Users, ShieldCheck, UserPlus, AlertCircle, 
  TrendingUp, Globe, ArrowRight
} from "lucide-react"
import Link from "next/link"

interface Stats {
  total_users: number
  verified_users: number
  pending_kyc: number
  rejected_kyc: number
  platform_admins: number
  country: string
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin-portal/stats/')
        setStats(res.data)
      } catch (err) {
        console.error("Failed to fetch admin stats", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return (
    <div className="grid grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
    </div>
  )

  const cards = [
    { label: "Total Users", value: stats?.total_users, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Verified Users", value: stats?.verified_users, icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pending KYC", value: stats?.pending_kyc, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", link: "/staff-portal/kyc" },
    { label: "Admins", value: stats?.platform_admins, icon: Globe, color: "text-purple-600", bg: "bg-purple-50" },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#0a2540]">Operations Dashboard</h2>
          <p className="text-gray-500 text-sm">Managing OrbiSave infrastructure for {stats?.country?.toUpperCase()}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-[#0a2540] hover:bg-gray-50 transition-all flex items-center gap-2">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${card.bg} ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon size={20} />
              </div>
              {card.link && (
                <Link href={card.link} className="text-gray-300 hover:text-[#00ab00] transition-colors">
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
            <p className="text-3xl font-black text-[#0a2540] mb-1">{card.value ?? 0}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Recent Activity / Actions */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-black text-[#0a2540]">Pending KYC Submissions</h3>
              <Link href="/staff-portal/kyc" className="text-xs font-bold text-[#00ab00] hover:underline">View All</Link>
            </div>
            <div className="p-0">
               {stats?.pending_kyc === 0 ? (
                 <div className="py-20 text-center">
                    <ShieldCheck size={48} className="mx-auto text-gray-100 mb-4" />
                    <p className="text-sm font-bold text-gray-300">All caught up! No pending KYCs.</p>
                 </div>
               ) : (
                 <div className="p-6 text-center py-12">
                   <p className="text-sm text-gray-500 mb-4">There are {stats?.pending_kyc} users waiting for verification.</p>
                   <Link href="/staff-portal/kyc" className="inline-flex items-center gap-2 bg-[#0a2540] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f3460] transition-all">
                     Open Review Queue
                   </Link>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="space-y-6">
          <div className="bg-[#0a2540] rounded-2xl p-6 text-white relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-black text-lg mb-2">Help Center</h3>
               <p className="text-xs text-white/60 mb-6 leading-relaxed">Respond to support tickets and internal queries from users in your region.</p>
               <button className="w-full py-3 bg-[#00ab00] rounded-xl font-bold text-sm hover:bg-[#008a00] transition-all">
                 Manage Tickets
               </button>
             </div>
             <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-black text-[#0a2540] mb-4">Operations Status</h3>
            <div className="space-y-4">
              {[
                { name: "KYC Processor", status: "Operational" },
                { name: "Document Storage", status: "Operational" },
                { name: "Regional Gateway", status: "Operational" }
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4a5c6a]">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#00ab00] rounded-full" />
                    <span className="text-[10px] font-bold text-[#00ab00] uppercase">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
