'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Globe, 
  Users, 
  ShieldCheck, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  ChevronRight,
  CreditCard,
  Zap,
  Loader2
} from 'lucide-react'

interface GlobalStats {
  total_groups: number
  pending_review: number
  verified: number
  by_country: Array<{
    country: string
    total: number
    pending_review: number
    verified: number
  }>
}

export default function GlobalDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await api.get('/admin-portal/group-stats/')
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch global stats', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const mainStats = [
    { label: 'Global Groups', value: stats?.total_groups || 0, icon: Globe, detail: '+12% from last month' },
    { label: 'Total Members', value: 1420, icon: Users, detail: 'Across all regions' },
    { label: 'Platform Admins', value: 3, icon: ShieldCheck, detail: 'Authorized staff' },
    { label: 'Net Liquidity', value: '$84,200', icon: CreditCard, detail: 'Total pool value' },
  ]

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-3">
            <Zap className="w-3 h-3 fill-current" />
            Global Infrastructure
          </div>
          <h1 className="text-5xl font-bold text-navy tracking-tight">System Oversight</h1>
          <p className="text-slate-500 text-lg mt-3 max-w-xl font-medium">Monitoring cross-jurisdictional financial coordination and administrative integrity.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-navy hover:bg-slate-50 transition-all shadow-sm">
            Export Logs
          </button>
          <button className="px-6 py-3 bg-navy text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-xl shadow-navy/10">
            System Config
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-lg border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all group">
            <div className="flex items-start justify-between mb-8">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <stat.icon className="w-6 h-6" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-navy mb-2 h-9 flex items-center">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" />
                ) : stat.value.toLocaleString()}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{stat.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Regional Grid - Pinterest/Dribbble Style Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Country Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-lg border border-slate-100 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-2xl font-bold text-navy tracking-tight">Regional Distribution</h3>
                <p className="text-sm text-slate-400 font-medium mt-1">Active sharding and group density by country.</p>
              </div>
              <button className="text-sm font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-xl transition-all">
                Manage Jurisdictions
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats?.by_country.map((c) => (
                <div key={c.country} className="p-8 bg-slate-50/50 rounded-lg border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-xl transition-all group cursor-pointer">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-primary">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-navy text-sm uppercase tracking-widest">{c.country}</span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Groups</p>
                      <p className="text-3xl font-bold text-navy">{c.total}</p>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${c.pending_review > 0 ? 'bg-amber-400 animate-pulse' : 'bg-primary'}`} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Queue</span>
                      </div>
                      <span className="text-sm font-bold text-navy">{c.pending_review}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health / Right Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-navy rounded-lg p-10 text-white relative overflow-hidden shadow-2xl shadow-navy/20">
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">Active Shards</h3>
                <Activity className="w-5 h-5 text-primary" />
              </div>
              
              <div className="space-y-4">
                {[
                  { name: 'M-Pesa Gateway', loc: 'Kenya Shard', status: 'optimal' },
                  { name: 'MTN Gateway', loc: 'Ghana/Rwanda', status: 'optimal' },
                  { name: 'Auth Cluster', loc: 'Global Edge', status: 'optimal' },
                ].map((shard) => (
                  <div key={shard.name} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{shard.loc}</p>
                      <p className="text-sm font-bold text-white/90">{shard.name}</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Network Load</span>
                    <span className="text-xs font-bold text-primary">Normal</span>
                  </div>
                  <div className="flex gap-1 h-8 items-end">
                    {[3,5,8,4,6,9,12,8,6,7,5,4,6,8].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/20 rounded-t-sm" style={{ height: `${h * 6}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
