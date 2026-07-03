'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { 
  Users, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Target,
  Banknote,
  Landmark,
  BarChart3,
  Search,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

const currencyByCountry: Record<string, string> = {
  kenya: 'KES',
  rwanda: 'RWF',
  ghana: 'GHS',
}

function formatCurrency(amount: number | undefined, currency: string) {
  return `${currency} ${Number(amount || 0).toLocaleString()}`
}

interface Analytics {
  summary: {
    total_groups: number
    active_groups: number
    pending_review: number
    total_members: number
    kyc_verified: number
    kyc_pending: number
    total_contributions_this_month: number
    total_contributions_last_month: number
    active_loans: number
    pending_admin_loans: number
    defaulted_loans: number
    total_loan_value: number
  }
  monthly_contribution_trend: Array<{ month: string; contributions: number }>
}

export default function DashboardOverview() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data } = await api.get('/admin-portal/analytics/')
        setData(data)
      } catch (err) {
        console.error('Failed to fetch analytics', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const stats = data?.summary
  const currency = currencyByCountry[user?.country || 'kenya'] || 'KES'

  const mainStats = [
    { label: 'Managed Groups', value: stats?.total_groups || 0, icon: Users, color: 'text-[#00ab00]', bg: 'bg-[#e9f3ed]' },
    { label: 'Active Loans', value: stats?.active_loans || 0, icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'KYC Pending', value: stats?.kyc_pending || 0, icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Contributions (MTD)', value: formatCurrency(stats?.total_contributions_this_month, currency), icon: Landmark, color: 'text-[#00ab00]', bg: 'bg-[#e9f3ed]' },
  ]

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-navy tracking-tight">Country Operations</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">Country-scoped oversight for groups, members, contributions, KYC, and loan approvals.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search groups or members..." 
              className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
            />
          </div>
          <button className="px-5 py-2.5 bg-navy text-white rounded-xl font-bold text-sm shadow-xl shadow-navy/10 hover:opacity-90 transition-all">
            Generate Audit
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-lg border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform`} />
            <div className="relative z-10 space-y-6">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color} bg-white shadow-sm border border-slate-50`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-navy tabular-nums h-9 flex items-center">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" />
                  ) : stat.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-lg border border-slate-100 p-10 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-bold text-navy tracking-tight">Contribution Volume</h3>
                <p className="text-sm text-slate-400 font-medium mt-1">Global collection trend across jurisdictional groups.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  +{data ? Math.round(((data.summary.total_contributions_this_month / (data.summary.total_contributions_last_month || 1)) - 1) * 100) : 0}% vs Last Month
                </span>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.monthly_contribution_trend || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ab00" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00ab00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="contributions" 
                    stroke="#00ab00" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-100 p-10 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <h3 className="text-xl font-bold text-navy tracking-tight mb-8">System Attention Required</h3>
            <div className="space-y-4">
              {stats && stats.pending_review > 0 && (
                <Link href="/dashboard/groups" className="flex items-center gap-6 p-6 bg-amber-50/30 border border-amber-100 hover:bg-white hover:shadow-xl rounded-lg group transition-all">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-amber-500 shadow-sm border border-amber-50">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-navy">{stats.pending_review} Groups Awaiting Verification</p>
                    <p className="text-xs text-slate-500 mt-0.5">Review onboarding documents for jurisdictional activation.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all" />
                </Link>
              )}
              {stats && stats.pending_admin_loans > 0 && (
                <Link href="/dashboard/loans" className="flex items-center gap-6 p-6 bg-[#e9f3ed]/50 border border-[#d6e4df] hover:bg-white hover:shadow-xl rounded-lg group transition-all">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[#00ab00] shadow-sm border border-[#d6e4df]">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-navy">{stats.pending_admin_loans} Loans Pending Approval</p>
                    <p className="text-xs text-slate-500 mt-0.5">Administrative authorization required for disbursement.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all" />
                </Link>
              )}
              {(!stats || (stats.pending_review === 0 && stats.pending_admin_loans === 0)) && (
                <div className="py-12 text-center">
                  <Target className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm text-slate-400 font-medium">All queues are clear. Performance is optimal.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-navy rounded-lg p-8 text-white shadow-2xl shadow-navy/20 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Compliance Score
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                    <span>KYC Completion</span>
                    <span>{stats ? Math.round((stats.kyc_verified / (stats.total_members || 1)) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${stats ? (stats.kyc_verified / (stats.total_members || 1)) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                    <span>Active Rotation</span>
                    <span>{stats ? Math.round((stats.active_groups / (stats.total_groups || 1)) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/40 transition-all duration-1000" 
                      style={{ width: `${stats ? (stats.active_groups / (stats.total_groups || 1)) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">A+</div>
                  <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                    System health is optimal. No critical anomalies detected in the last 24 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-100 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <h3 className="text-sm font-bold text-navy mb-6 uppercase tracking-widest">Recent Activity</h3>
            <div className="space-y-6">
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-slate-400">Recent activity will appear after audit events are connected.</p>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all">
              View Full Audit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
