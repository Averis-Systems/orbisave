'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  FileText, 
  Search, 
  Filter, 
  ArrowUpRight, 
  User, 
  Activity,
  Calendar,
  Download,
  Terminal,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'

const formatAuditDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))

interface AuditLog {
  id: string
  action: string
  actor_name: string
  target_group_name: string | null
  target_user_name: string | null
  ip_address: string
  metadata: any
  created_at: string
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data } = await api.get('/admin-portal/audit/')
        setLogs(data.results)
      } catch (err) {
        console.error('Failed to fetch audit logs', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
    (log.target_group_name && log.target_group_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-3">
            <Terminal className="w-3 h-3 fill-current" />
            Immutable Integrity Logs
          </div>
          <h1 className="text-4xl font-bold text-navy tracking-tight">Audit Trail</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">Monitoring jurisdictional administrative mutations and member governance events.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-navy hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by action, admin or group..." 
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:text-navy transition-colors flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              Advanced Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Code</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actor (Authority)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity / Group</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Origin</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-8 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium">No audit entries found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-navy font-bold text-xs tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      {formatAuditDateTime(log.created_at)}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center text-[10px] font-bold">
                        {log.actor_name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-navy">{log.actor_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {log.target_group_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-xs font-bold text-slate-600">{log.target_group_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-sans text-slate-400">{log.ip_address || 'Internal'}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-300 hover:text-primary transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
