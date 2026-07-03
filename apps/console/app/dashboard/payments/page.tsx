'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { 
  Plus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Database, 
  Activity, 
  Zap,
  MoreVertical,
  RefreshCw,
  ExternalLink,
  Power,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

const formatShortDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

interface Provider {
  id: string
  name: string
  provider_code: string
  country: string
  environment: string
  status: 'active' | 'inactive' | 'testing' | 'error'
  last_tested_at: string | null
  last_test_status: string | null
}

export default function ProviderHub() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)

  useEffect(() => {
    fetchProviders()
  }, [])

  async function fetchProviders() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin-portal/superadmin/payment-providers/')
      setProviders(data.results)
    } catch (err) {
      console.error('Failed to fetch providers', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await api.post(`/admin-portal/superadmin/payment-providers/${id}/toggle/`)
      fetchProviders()
    } catch (err) {
      console.error('Toggle failed', err)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const { data } = await api.post(`/admin-portal/superadmin/payment-providers/${id}/test/`)
      alert(data.success ? `Success! Latency: ${data.latency_ms}ms` : `Failed: ${data.message}`)
      fetchProviders()
    } catch (err) {
      console.error('Test failed', err)
      alert('Test failed. Check console.')
    } finally {
      setTestingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-500 bg-emerald-500/10'
      case 'error':  return 'text-red-500 bg-red-500/10'
      case 'testing': return 'text-amber-500 bg-amber-500/10'
      default:       return 'text-slate-400 bg-slate-500/10'
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-3">
            <Database className="w-3 h-3 fill-current" />
            Infrastructure Gateway
          </div>
          <h1 className="text-5xl font-bold text-navy tracking-tight">Payment Providers</h1>
          <p className="text-slate-500 text-lg mt-3 max-w-xl font-medium">Manage jurisdictional banking rails and mobile money integrations globally.</p>
        </div>
        <Link 
          href="/dashboard/payments/new" 
          className="flex items-center gap-2 px-6 py-3 bg-navy text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-xl shadow-navy/10 h-fit"
        >
          <Plus className="w-4 h-4" />
          Onboard New Bank
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <div className="bg-white rounded-lg border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, country or method..." 
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-primary/20">
                  <option>All Countries</option>
                  <option>Kenya</option>
                  <option>Rwanda</option>
                  <option>Ghana</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank / Provider</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jurisdiction</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Health Check</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex justify-center">
                          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                        </div>
                      </td>
                    </tr>
                  ) : providers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="max-w-xs mx-auto">
                          <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-medium">No payment providers configured. Start by onboarding a bank integration.</p>
                        </div>
                      </td>
                    </tr>
                  ) : providers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-sm ${p.provider_code === 'jenga_ke' ? 'bg-primary' : 'bg-navy'}`}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-navy">{p.name}</p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{p.provider_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">{p.country}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${p.environment === 'live' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {p.environment}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(p.status)}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-current opacity-50'}`} />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {p.last_tested_at ? (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-navy">
                              {p.last_test_status === 'ok' ? 'Successful' : 'Failed'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {formatShortDateTime(p.last_tested_at)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Never tested</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleTest(p.id)}
                            disabled={testingId === p.id}
                            className={`p-2 text-slate-400 hover:text-primary transition-colors disabled:opacity-50 ${testingId === p.id ? 'animate-spin' : ''}`}
                            title="Test Connection"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleToggle(p.id)}
                            className={`p-2 transition-colors ${p.status === 'active' ? 'text-red-400 hover:text-red-600' : 'text-emerald-400 hover:text-emerald-600'}`}
                            title={p.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-navy transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
