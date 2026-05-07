"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { 
  Users, ShieldCheck, Globe, Activity,
  ArrowUpRight, ArrowDownRight, Layers,
  CreditCard, Wallet, Banknote
} from "lucide-react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts'

interface CountryStat {
  country: string
  total_users: number
  pending_kyc: number
  verified_users: number
}

interface Stats {
  total_users: number
  verified_users: number
  pending_kyc: number
  rejected_kyc: number
  platform_admins: number
  by_country: CountryStat[]
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin-portal/stats/')
        setStats(res.data)
      } catch (err) {
        console.error("Failed to fetch super admin stats", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return <div className="h-96 bg-white rounded-3xl animate-pulse" />

  const mainStats = [
    { label: "Total Users", value: stats?.total_users, trend: "+12%", up: true, icon: Users, color: "#00ab00" },
    { label: "KYC Verified", value: stats?.verified_users, trend: "+8%", up: true, icon: ShieldCheck, color: "#3b82f6" },
    { label: "Pending Review", value: stats?.pending_kyc, trend: "-2%", up: false, icon: Activity, color: "#f59e0b" },
    { label: "Total Liquidity", value: "KES 4.2M", trend: "+24%", up: true, icon: Banknote, color: "#8b5cf6" },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[#0a2540]">Platform Overview</h2>
        <p className="text-gray-500 text-sm">Consolidated data from Kenya, Rwanda, and Ghana operations</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-6">
        {mainStats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#0a2540] group-hover:text-white transition-all duration-300">
                <s.icon size={22} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${s.up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {s.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {s.trend}
              </div>
            </div>
            <p className="text-3xl font-black text-[#0a2540] mb-1">{s.value}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Country Breakdown */}
        <div className="col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h3 className="font-black text-[#0a2540] mb-8 flex items-center gap-3">
               <Globe size={20} className="text-[#00ab00]" /> Regional User Distribution
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.by_country || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="country" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_users" radius={[8, 8, 0, 0]} barSize={60}>
                    {stats?.by_country.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#00ab00', '#0a2540', '#3b82f6'][index % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* System Health / Pending Tasks */}
        <div className="col-span-5 space-y-6">
           <div className="bg-[#0a2540] rounded-3xl p-8 text-white">
              <h3 className="font-black text-lg mb-6 flex items-center gap-3">
                 <Layers size={20} className="text-amber-500" /> Platform Infrastructure
              </h3>
              <div className="space-y-6">
                 {[
                   { name: "Global Vault (KCB)", status: "Verified", color: "bg-green-500" },
                   { name: "Regional Databases", status: "Active", color: "bg-green-500" },
                   { name: "Payout Engine", status: "Standby", color: "bg-blue-500" },
                   { name: "Security Protocols", status: "Hardened", color: "bg-green-500" }
                 ].map((s, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white/70">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.status}</span>
                        <div className={`w-2 h-2 rounded-full ${s.color}`} />
                      </div>
                   </div>
                 ))}
              </div>
              <button className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-sm transition-all border border-white/10">
                 Run Platform Audit
              </button>
           </div>

           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-[#0a2540] mb-4 text-sm uppercase tracking-widest">Global KYC Status</h3>
              <div className="flex items-center gap-8">
                 <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold mb-2">
                       <span className="text-gray-400">Completion Rate</span>
                       <span className="text-[#0a2540]">84%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-[#00ab00]" style={{ width: '84%' }} />
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-2xl font-black text-[#0a2540] leading-none">{stats?.pending_kyc}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Awaiting Staff</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
