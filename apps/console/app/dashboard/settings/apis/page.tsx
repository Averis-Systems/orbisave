'use client'

import { useState, useEffect } from 'react'
import { 
  Key, 
  Shield, 
  ExternalLink, 
  Loader2, 
  RefreshCcw, 
  Plus, 
  Eye, 
  EyeOff,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Activity,
  Terminal,
  Clock,
  ChevronDown,
  Globe,
  Database,
  Lock,
  ChevronRight,
  Settings,
  Zap,
  MoreVertical,
  X,
  CreditCard,
  Languages
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface Config {
  id: string
  key: string
  value: string
  category: string
  description: string
  is_encrypted: boolean
  updated_at: string
}

interface Provider {
  id: string
  name: string
  provider_code: string
  country: string
  environment: string
  status: string
  api_key: string
  base_url: string
  updated_at: string
}

interface LogEntry {
  id: string
  provider_name: string
  direction: string
  endpoint: string
  method: string
  response_code: number
  success: boolean
  duration_ms: number
  created_at: string
}

export default function ApiOperationsPage() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'platform' | 'external'>('platform')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [configRes, providerRes, logRes, metricRes] = await Promise.all([
        api.get('/superadmin/settings/?category=api_data'),
        api.get('/superadmin/payment-providers/'),
        api.get('/superadmin/monitoring/logs/'),
        api.get('/superadmin/monitoring/metrics/')
      ])
      setConfigs(configRes.data)
      setProviders(providerRes.data.results || [])
      setLogs(logRes.data)
      setMetrics(metricRes.data)
    } catch (err) {
      toast.error('System: Real-time telemetry feed interrupted.')
    } finally {
      setLoading(false)
    }
  }

  const toggleVisibility = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10 animate-in fade-in duration-700">
      
      {/* 1. Natural Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Production Infrastructure Active</span>
          </div>
          <h1 className="text-5xl font-black text-navy tracking-tight leading-none">API Gateway</h1>
          <p className="text-base font-medium text-slate-500 max-w-xl">Centralized authorization and telemetry for regional financial clusters and external providers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 rounded-lg text-[11px] font-black uppercase tracking-widest text-navy hover:shadow-lg transition-all active:scale-95">
            <RefreshCcw size={14} /> Global Sync
          </button>
          <button 
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-navy text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-navy/90 transition-all shadow-xl shadow-navy/20 active:scale-95"
          >
            <Plus size={16} /> Configure External Provider
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cluster (Simplified & Natural) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricItem label="Network Health" value={`${metrics?.summary?.success_rate?.toFixed(1) || 0}%`} icon={<Globe size={18} className="text-blue-500" />} />
        <MetricItem label="Vault Capacity" value={configs.length + providers.length} icon={<Database size={18} className="text-emerald-500" />} />
        <MetricItem label="Avg Latency" value={`${metrics?.summary?.avg_latency?.toFixed(0) || 0}ms`} icon={<Clock size={18} className="text-orange-500" />} />
        <MetricItem label="Active Logs" value={logs.length} icon={<Terminal size={18} className="text-slate-500" />} />
      </div>

      {/* 3. Usage Analytics (Clean Line Graph) */}
      <div className="bg-white border border-slate-200 rounded-lg p-10 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h3 className="text-2xl font-black text-navy tracking-tight">Transmission Flow</h3>
            <p className="text-sm font-medium text-slate-400 mt-1">Global packet throughput across Kenyan, Rwandan, and Ghanaian clusters.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-black text-navy cursor-pointer hover:bg-slate-100 transition-all">
            Filter: Live Traffic <ChevronDown size={14} />
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics?.history || []}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066FF" stopOpacity={0.08}/>
                  <stop offset="95%" stopColor="#0066FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(s) => new Date(s).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
              <Tooltip contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="total_calls" stroke="#0066FF" strokeWidth={3} fill="url(#colorCalls)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Tabbed API Management (Platform vs External) */}
      <div className="space-y-6">
        <div className="flex items-center gap-8 border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('platform')}
             className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'platform' ? 'text-navy' : 'text-slate-400 hover:text-slate-600'}`}
           >
              Platform Core APIs
              {activeTab === 'platform' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0066FF]" />}
           </button>
           <button 
             onClick={() => setActiveTab('external')}
             className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'external' ? 'text-navy' : 'text-slate-400 hover:text-slate-600'}`}
           >
              External Providers
              {activeTab === 'external' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0066FF]" />}
           </button>
        </div>

        {activeTab === 'platform' ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Service Interface</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Global Secret</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Synchronization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configs.map(config => (
                  <tr key={config.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-navy shadow-sm">
                            <Settings size={18} />
                         </div>
                         <div>
                            <p className="text-sm font-black text-navy uppercase tracking-wider">{config.key.replace(/_/g, ' ')}</p>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">{config.description}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 focus-within:border-primary transition-all">
                          <input 
                            type={showValues[config.id] ? "text" : "password"} 
                            defaultValue={config.value} 
                            className="bg-transparent border-none text-xs font-sans font-bold text-navy outline-none w-48" 
                          />
                          <button onClick={() => toggleVisibility(config.id)} className="text-slate-300 hover:text-navy transition-colors">
                             {showValues[config.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button className="p-2.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-all">
                          <RefreshCcw size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {providers.map(provider => (
              <div key={provider.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-navy text-white flex items-center justify-center shadow-lg shadow-navy/10">
                         <Globe size={24} />
                      </div>
                      <div>
                         <h4 className="text-lg font-black text-navy">{provider.name}</h4>
                         <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{provider.country} • {provider.environment}</p>
                      </div>
                   </div>
                   <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     provider.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                   }`}>
                      {provider.status}
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-400">Endpoint URL</span>
                      <span className="text-xs font-sans font-bold text-navy truncate max-w-[200px]">{provider.base_url || 'N/A'}</span>
                   </div>
                   <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-400">Provider Code</span>
                      <span className="text-xs font-black text-navy uppercase tracking-widest">{provider.provider_code}</span>
                   </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                   <button className="flex-1 py-3 bg-slate-50 text-navy text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all">Test Connection</button>
                   <button className="p-3 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-navy hover:shadow-sm transition-all"><Settings size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Natural Real-time Logs (Industry Standard) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="text-xl font-black text-navy tracking-tight">Packet Telemetry Logs</h3>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Feed</span>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service / Provider</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method / Endpoint</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-bold text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td className="px-8 py-5 text-sm font-black text-navy">{log.provider_name}</td>
                  <td className="px-8 py-5">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">{log.method}</span>
                     <span className="text-xs font-sans font-bold text-slate-500">{log.endpoint}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      log.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {log.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      {log.response_code}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Configuration Modal (Dialogue Module) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setShowConfigModal(false)} />
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-navy text-white rounded-lg"><Globe size={20} /></div>
                    <div>
                       <h3 className="text-xl font-black text-navy">External Provider Config</h3>
                       <p className="text-xs font-bold text-slate-400">Register a new regional financial endpoint.</p>
                    </div>
                 </div>
                 <button onClick={() => setShowConfigModal(false)} className="p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-full transition-all">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-8 grid grid-cols-2 gap-6">
                 <ModalInput label="Provider Name" placeholder="e.g. Equity Bank Kenya" icon={<Globe size={16} />} />
                 <ModalSelect label="Country Scope" options={['Kenya', 'Rwanda', 'Ghana']} icon={<Globe size={16} />} />
                 <ModalSelect label="Integration Code" options={['jenga_ke', 'jenga_rw', 'ecobank_gh', 'mtn_momo', 'mpesa']} icon={<Zap size={16} />} />
                 <ModalSelect label="Environment" options={['Sandbox', 'Live']} icon={<Activity size={16} />} />
                 <div className="col-span-2">
                    <ModalInput label="Base Endpoint URL" placeholder="https://api.provider.com/v1" icon={<ExternalLink size={16} />} />
                 </div>
                 <ModalInput label="API Key / Client ID" placeholder="••••••••••••" icon={<Key size={16} />} type="password" />
                 <ModalInput label="API Secret" placeholder="••••••••••••" icon={<Lock size={16} />} type="password" />
              </div>
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                 <button onClick={() => setShowConfigModal(false)} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-navy transition-all">Cancel</button>
                 <button className="px-8 py-2.5 bg-navy text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-navy/20 hover:bg-navy/90 transition-all active:scale-95">Verify & Save Endpoint</button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

function MetricItem({ label, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm flex items-center justify-between hover:border-slate-300 transition-all">
       <div className="space-y-1">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <h4 className="text-3xl font-black text-navy tracking-tight">{value}</h4>
       </div>
       <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
          {icon}
       </div>
    </div>
  )
}

function ModalInput({ label, placeholder, icon, type = "text" }: any) {
  return (
    <div className="space-y-2">
       <label className="text-[11px] font-black text-navy uppercase tracking-widest">{label}</label>
       <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
          <input type={type} placeholder={placeholder} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
       </div>
    </div>
  )
}

function ModalSelect({ label, options, icon }: any) {
  return (
    <div className="space-y-2">
       <label className="text-[11px] font-black text-navy uppercase tracking-widest">{label}</label>
       <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
          <select className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-navy appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
             {options.map((opt: string) => <option key={opt}>{opt}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
       </div>
    </div>
  )
}
