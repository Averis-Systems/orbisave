"use client"

import { useGroups } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { useContributions } from "@/hooks/useContributions"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { fmt } from "@/lib/formatters"
import { ArrowUp, ArrowDown, Send, Activity, Calendar, Zap } from "lucide-react"

export default function ContributionsPage() {
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: members, isLoading: membersLoading } = useMembers(activeGroup?.id || null)
  const { data: contributions, isLoading: contribsLoading } = useContributions(activeGroup?.id || null)

  const activeMembers = members?.filter(m => m.status === 'active') || []
  const confirmedContribs = contributions?.filter(c => c.status === 'confirmed') || []
  
  const paidMemberIds = new Set(confirmedContribs.map(c => c.member_name))

  const paidCount = activeMembers.filter(m => paidMemberIds.has(m.member_name)).length
  const activeCount = activeMembers.length

  const handleBulkPush = async () => {
    toast.info("Triggering automated collection for pending members...")
  }

  if (groupsLoading || membersLoading || contribsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
           <Skeleton className="h-8 w-64" />
           <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[500px] rounded-lg" />
          <Skeleton className="h-[500px] rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0a2540] mb-2">Pool Collections</h1>
        <p className="text-gray-500 font-bold">Monitor cycle savings and real-time contribution progress.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Collected", value: fmt(confirmedContribs.reduce((acc, c) => acc + Number(c.amount), 0)), sub: `${paidCount} of ${activeCount} members paid`, color: "text-[#00ab00]", up: true, icon: Zap },
          { label: "Outstanding",    value: fmt((activeCount - paidCount) * (activeGroup?.contribution_amount || 0)), sub: `${activeCount - paidCount} pending`, color: "text-red-500", up: false, icon: ArrowDown },
          { label: "Cycle Target", value: fmt(activeCount * (activeGroup?.contribution_amount || 0)), sub: `${activeCount} × ${fmt(activeGroup?.contribution_amount || 0)}`, color: "text-[#0a2540]", up: false, icon: Activity },
          { label: "Collection Rate",value: `${activeCount > 0 ? Math.round((paidCount / activeCount) * 100) : 0}%`, sub: "Cycle Efficiency", color: "text-[#00ab00]", up: true, icon: ArrowUp },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-center">
              {c.label}
              <c.icon size={12} className={c.color} />
            </div>
            <div className="text-2xl font-black text-[#0a2540] mb-1">{c.value}</div>
            <div className={`text-[10px] font-bold ${c.color} flex items-center gap-1`}>
               {c.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Collection Tracker */}
        <div className="lg:col-span-7 bg-white rounded-lg p-8 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
               <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest mb-1">Cycle Tracking</h3>
               <p className="text-xs text-gray-400 font-bold">Real-time member payment status</p>
            </div>
            <button 
              onClick={handleBulkPush}
              className="flex items-center gap-2 px-6 py-3 bg-[#00ab00] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#008a00] transition-all"
            >
              <Send size={14} /> STK Push All
            </button>
          </div>

          <div className="mb-10 p-6 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between items-end mb-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</span>
              <span className="text-lg font-black text-[#0a2540]">{paidCount}<span className="text-gray-300 mx-1">/</span>{activeCount}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
              <div 
                className="h-full bg-[#00ab00] rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${activeCount > 0 ? (paidCount / activeCount) * 100 : 0}%` }} 
              />
            </div>
          </div>

          <div className="space-y-4 divide-y divide-gray-50">
            {activeMembers.map(mem => {
              const hasPaid = paidMemberIds.has(mem.member_name)
              return (
                <div key={mem.id} className="flex items-center justify-between pt-4 first:pt-0 group">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${hasPaid ? 'bg-[#00ab00] shadow-[0_0_8px_#00ab00]' : 'bg-gray-200'}`} />
                    <span className="text-sm font-black text-[#0a2540] group-hover:text-[#00ab00] transition-colors">{mem.member_name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`text-xs font-black ${hasPaid ? 'text-[#0a2540]' : 'text-gray-300'}`}>
                      {hasPaid ? fmt(activeGroup?.contribution_amount || 0) : "—"}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                      hasPaid ? 'bg-green-50 text-[#00ab00] border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>
                      {hasPaid ? "Confirmed" : "Pending"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-5 space-y-8">
          {/* Feed */}
          <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest mb-8 flex items-center gap-2">
               <Zap size={16} className="text-[#00ab00]" /> Live Feed
            </h3>
            <div className="space-y-6">
               {contributions?.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between group">
                     <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-[#00ab00] transition-all">
                           <Zap size={16} />
                        </div>
                        <div>
                           <p className="text-sm font-black text-[#0a2540]">{c.member_name}</p>
                           <p className="text-[10px] text-gray-400 font-bold">{new Date(c.confirmed_at || c.initiated_at || c.scheduled_date).toLocaleTimeString()}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-sm font-black ${c.status === 'confirmed' ? 'text-[#0a2540]' : 'text-gray-300'}`}>{fmt(c.amount)}</p>
                        <p className="text-[9px] uppercase font-black tracking-tighter opacity-40">{c.status}</p>
                     </div>
                  </div>
               ))}
               {contributions?.length === 0 && (
                  <div className="py-12 text-center text-gray-300 italic font-bold text-xs">No activity logged yet.</div>
               )}
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-[#0a2540] rounded-lg p-8 text-white shadow-xl">
             <div className="flex items-center gap-2 mb-8">
                <Calendar size={18} className="text-[#00ab00]" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Pool Configuration</h3>
             </div>
             <div className="space-y-4">
               {[
                 { label: "Frequency",        val: activeGroup?.contribution_frequency },
                 { label: "Amount",           val: fmt(activeGroup?.contribution_amount || 0) },
                 { label: "Currency",         val: activeGroup?.currency },
                 { label: "Interest",         val: "3.5% Mo." },
               ].map((r, i) => (
                 <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{r.label}</span>
                   <span className="text-xs font-black text-white capitalize">{r.val}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
