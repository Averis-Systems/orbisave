'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Users as UsersIcon,
  MessageSquare,
  X,
  Loader2,
  Target
} from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string
  verification_status: 'pending_review' | 'verified' | 'rejected'
  verification_note?: string
  chairperson_name: string
  chairperson_email: string
  created_at: string
  contribution_amount: string
  currency: string
  max_members: number
}

export default function GroupVerificationPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending_review')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [note, setNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/admin-portal/groups/?verification_status=${filter}`)
      setGroups(data.results || [])
    } catch (err) {
      console.error('Failed to fetch groups', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [filter])

  const handleVerify = async (groupId: string, action: 'verify' | 'reject') => {
    if (action === 'reject' && !note.trim()) {
      alert('Please provide a reason for rejection.')
      return
    }

    setActionLoading(true)
    try {
      await api.post(`/admin-portal/groups/${groupId}/verify/`, { action, note })
      setSelectedGroup(null)
      setNote('')
      fetchGroups()
    } catch (err) {
      console.error('Action failed', err)
      alert('Verification action failed. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-navy tracking-tight">Group Verification</h1>
          <p className="text-slate-400 text-lg mt-2 font-medium">Review and authorize community savings groups.</p>
        </div>

        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
          {['pending_review', 'verified', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === s ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search groups..." 
              className="w-full bg-white border border-slate-200 rounded-lg py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>
          <button className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-navy px-5 py-3 hover:bg-white hover:shadow-md rounded-lg transition-all border border-transparent hover:border-slate-100">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Group Identity</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Chairperson</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Financials</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20">
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="font-bold text-[10px] uppercase tracking-widest">Hydrating Records...</p>
                    </div>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <Target className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-medium">No records matching your current filter.</p>
                  </td>
                </tr>
              ) : groups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-lg">
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-navy mb-0.5">{group.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{group.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-navy mb-0.5">{group.chairperson_name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{group.chairperson_email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-navy mb-0.5">{group.currency} {parseFloat(group.contribution_amount).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{group.max_members} Maximum Slots</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      group.verification_status === 'verified' ? 'bg-primary/10 text-primary' :
                      group.verification_status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {group.verification_status.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {filter === 'pending_review' ? (
                      <button 
                        onClick={() => setSelectedGroup(group)}
                        className="bg-navy text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-navy/90 transition-all active:scale-[0.98] shadow-lg shadow-navy/10"
                      >
                        Review Profile
                      </button>
                    ) : (
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-navy/20 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95">
            <button 
              onClick={() => setSelectedGroup(null)} 
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-navy z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-10 border-b border-slate-50">
              <h3 className="text-2xl font-bold text-navy tracking-tight">Review Application</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Assessing <span className="text-navy font-bold">{selectedGroup.name}</span> &bull; {selectedGroup.chairperson_name}
              </p>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50/50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Contribution</p>
                  <p className="text-xl font-bold text-navy tracking-tight">{selectedGroup.currency} {selectedGroup.contribution_amount}</p>
                </div>
                <div className="p-6 bg-slate-50/50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Member Threshold</p>
                  <p className="text-xl font-bold text-navy tracking-tight">{selectedGroup.max_members} Active Slots</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Administrative Review Note
                </label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Provide context for approval or specific reasons for rejection..."
                  className="w-full h-40 bg-slate-50/30 border border-slate-200 rounded-lg p-5 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleVerify(selectedGroup.id, 'reject')}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  Reject Application
                </button>
                <button 
                  onClick={() => handleVerify(selectedGroup.id, 'verify')}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Authorize Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
