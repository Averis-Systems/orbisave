'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  Users, 
  ShieldCheck, 
  Banknote, 
  History, 
  Landmark, 
  ShieldAlert,
  ChevronLeft,
  Mail,
  Phone,
  User,
  Activity,
  ArrowUpRight,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface GroupDetail {
  id: string
  name: string
  description: string
  country: string
  currency: string
  status: string
  verification_status: string
  verification_note: string
  verified_at: string | null
  verified_by: string | null
  chairperson: {
    id: string
    name: string
    email: string
    phone: string
    kyc_status: string
  }
  contribution_amount: string
  contribution_frequency: string
  max_members: number
  rotation_savings_pct: string
  loan_pool_pct: string
  wallet: {
    total_contributions: string
    total_payouts: string
    total_loans_disbursed: string
    total_loan_repayments: string
  }
  loan_summary: {
    total: number
    pending_admin: number
    active: number
    defaulted: number
  }
}

export default function GroupDetailPage() {
  const { id } = useParams()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function fetchGroup() {
      try {
        const { data } = await api.get(`/admin-portal/groups/${id}/`)
        setGroup(data)
      } catch (err) {
        console.error('Failed to fetch group detail', err)
      } finally {
        setLoading(false)
      }
    }
    fetchGroup()
  }, [id])

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-300">Synchronizing Group Data...</div>
  if (!group) return <div className="p-20 text-center">Group not found.</div>

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ShieldCheck },
    { id: 'members', name: 'Members', icon: Users },
    { id: 'contributions', name: 'Contributions', icon: Landmark },
    { id: 'loans', name: 'Loans', icon: Banknote },
    { id: 'ledger', name: 'Ledger', icon: History },
  ]

  return (
    <div className="max-w-[1400px] mx-auto pb-20 space-y-10">
      {/* Breadcrumb & Top Actions */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/groups" className="flex items-center gap-2 text-slate-400 hover:text-navy font-bold text-sm transition-all group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Groups
        </Link>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-navy hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Report
          </button>
          {group.verification_status === 'pending_review' && (
             <Link href={`/dashboard/groups?id=${group.id}`} className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
               Complete Verification
             </Link>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-navy text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl">
                {group.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-black text-navy tracking-tight">{group.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${group.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {group.verification_status}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm font-bold text-slate-400">{group.country.toUpperCase()} SHARD</span>
                </div>
              </div>
            </div>
            <p className="max-w-2xl text-slate-500 font-medium leading-relaxed">
              {group.description || 'No description provided for this group.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:w-96">
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rotation Value</p>
              <p className="text-xl font-bold text-navy">{group.currency} {parseFloat(group.contribution_amount).toLocaleString()}</p>
            </div>
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Members</p>
              <p className="text-xl font-bold text-navy">{group.max_members}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Wallet Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Landmark className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Group Savings</p>
                    <h4 className="text-2xl font-bold text-navy tabular-nums">
                      {group.currency} {parseFloat(group.wallet.total_contributions).toLocaleString()}
                    </h4>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
                  <div className="w-14 h-14 bg-[#ecfdf3] rounded-2xl flex items-center justify-center text-[#00ab00]">
                    <Banknote className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Loan Book</p>
                    <h4 className="text-2xl font-bold text-navy tabular-nums">
                      {group.currency} {parseFloat(group.wallet.total_loans_disbursed).toLocaleString()}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Group Configuration */}
              <div className="bg-white rounded-2xl border border-slate-100 p-10 shadow-sm">
                <h3 className="text-xl font-bold text-navy mb-8">Financial Engine Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rotation Frequency</p>
                    <p className="text-base font-bold text-navy flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {group.contribution_frequency.toUpperCase()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Savings Reserve</p>
                    <p className="text-base font-bold text-navy">{group.rotation_savings_pct}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Fund Access</p>
                    <p className="text-base font-bold text-navy">{group.loan_pool_pct}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-20 shadow-sm text-center">
              <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Sub-data view for {activeTab} is being synchronized...</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Chairperson Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Primary Authority</h3>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy">{group.chairperson?.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${group.chairperson?.kyc_status === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">KYC {group.chairperson?.kyc_status}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-500 hover:text-navy transition-colors">
                <Mail className="w-4 h-4" />
                <span className="text-xs font-medium">{group.chairperson?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 hover:text-navy transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-xs font-medium">{group.chairperson?.phone}</span>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all">
              Message Authority
            </button>
          </div>

          {/* Group Status */}
          <div className="bg-navy rounded-2xl p-8 text-white shadow-xl shadow-navy/10">
            <h3 className="text-lg font-bold mb-6">Security & Lifecycle</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Engine Status</span>
                <span className="text-xs font-bold text-primary uppercase">{group.status}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Audit Score</span>
                <span className="text-xs font-bold text-emerald-400 uppercase">98 / 100</span>
              </div>
            </div>
            <div className="mt-8 space-y-3">
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all">
                Pause Financial Engine
              </button>
              <button className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all">
                Close Group Permanently
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
