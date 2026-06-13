"use client"

import { useGroups } from "@/hooks/useGroups"
import { useRotations, useRotationSchedules } from "@/hooks/useRotations"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, Calendar, ArrowRight, User, TrendingUp, Loader2 } from "lucide-react"

const fmt = (v: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(v)
const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "MB"
const avatarColors = ["bg-[#0a2540]", "bg-[#016828]", "bg-[#0f3460]", "bg-[#00ab00]"]
const avatarColorClass = (name: string) => { 
  if (!name) return avatarColors[0]
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % avatarColors.length; return avatarColors[Math.abs(h)] 
}

export default function RotationsPage() {
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: cycles, isLoading: cyclesLoading } = useRotations(activeGroup?.id || null)
  const currentCycle = cycles?.find(c => c.is_current) || cycles?.[0]
  
  const { data: schedules, isLoading: schedulesLoading } = useRotationSchedules(currentCycle?.id || null)

  const upcomingSchedules = schedules?.filter(s => !s.is_paid_out) || []
  const completedSchedules = schedules?.filter(s => s.is_paid_out) || []
  const nextRecipient = upcomingSchedules[0] || null

  // Loading handled at component level

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Cycle Rotations</h1>
          <p className="text-gray-500 font-bold">Monitor payout schedules and track historical distributions.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-200">
           <Calendar size={14} className="text-gray-400" />
           <span className="text-[10px] font-black uppercase tracking-widest text-[#0a2540]">Active Cycle #{currentCycle?.cycle_number || 1}</span>
        </div>
      </div>

      {/* Hero Payout Card */}
      <div className="relative overflow-hidden bg-[#0a2540] rounded-lg p-10 text-white shadow-2xl shadow-[#0a2540]/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ab00]/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00ab00]/5 rounded-full blur-2xl -ml-10 -mb-10" />
        
        {nextRecipient ? (
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-[#00ab00] animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00ab00]">Next Up for Payout</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight">{nextRecipient.member_name}</h2>
              <div className="flex items-center gap-4 text-white/60 text-sm font-bold">
                 <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{new Date(nextRecipient.scheduled_payout_date).toLocaleDateString()}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    <span>Cycle Progress: {Math.round(((completedSchedules.length) / (schedules?.length || 1)) * 100)}%</span>
                 </div>
              </div>
            </div>
            
            <div className="lg:col-span-5 lg:text-right p-6 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Total Pool Payout</p>
              <p className="text-4xl font-black mb-2">{fmt(activeGroup?.contribution_amount || 0)}</p>
              <div className="flex flex-col gap-1">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Gross Amount (Incl. 3% platform reserve)</p>
                 <p className="text-[10px] font-bold text-[#00ab00] uppercase">Net Member Payout: {fmt((activeGroup?.contribution_amount || 0) * 0.97)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
             <p className="text-white/40 font-bold italic">No upcoming payouts scheduled for this cycle.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative min-h-[400px]">
        {(groupsLoading || cyclesLoading || schedulesLoading) && (
           <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
              <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
           </div>
        )}
        {/* Upcoming Queue */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-black text-[#0a2540]">Payout Queue</h3>
             <span className="px-3 py-1 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-[#0a2540] rounded-lg border border-gray-100">
               {upcomingSchedules.length} Pending
             </span>
          </div>

          <div className="space-y-4">
            {upcomingSchedules.length === 0 && !schedulesLoading ? (
               <div className="py-20 text-center border-2 border-dashed border-gray-50 rounded-lg">
                  <p className="text-gray-300 font-bold text-sm">All payouts completed for this cycle.</p>
               </div>
            ) : upcomingSchedules.map((r, i) => (
              <div 
                key={r.id} 
                className={`p-5 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                  i === 0 ? 'bg-[#e9f3ed] border-[#00ab00]/20' : 'bg-white border-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                     i === 0 ? 'bg-[#00ab00] text-white shadow-lg shadow-[#00ab00]/20' : 'bg-gray-100 text-gray-400'
                   }`}>
                      {i + 1}
                   </div>
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-xs ${avatarColorClass(r.member_name)}`}>
                      {initials(r.member_name)}
                   </div>
                   <div>
                      <p className="text-sm font-black text-[#0a2540]">{r.member_name}</p>
                      <p className="text-[10px] font-bold text-gray-400">{new Date(r.scheduled_payout_date).toLocaleDateString()}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className={`text-sm font-black ${i === 0 ? 'text-[#00ab00]' : 'text-[#0a2540]'}`}>
                      {fmt(activeGroup?.contribution_amount || 0)}
                   </p>
                   {i === 0 && (
                     <span className="text-[8px] font-black uppercase tracking-widest bg-white text-[#00ab00] px-2 py-0.5 rounded border border-[#00ab00]/20">Active</span>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Ledger */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-[#0a2540]">Historical Ledger</h3>
              <span className="px-3 py-1 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-[#0a2540] rounded-lg border border-gray-100">
                Verified Distributions
              </span>
           </div>

           <div className="space-y-4">
              {completedSchedules.length === 0 && !schedulesLoading ? (
                <div className="py-20 text-center border-2 border-dashed border-gray-50 rounded-lg">
                   <p className="text-gray-300 font-bold text-sm">No distributions recorded in this cycle.</p>
                </div>
              ) : completedSchedules.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#00ab00]">
                         <CheckCircle size={18} />
                      </div>
                      <div>
                         <p className="text-sm font-black text-[#0a2540] group-hover:text-[#00ab00] transition-colors">{p.member_name}</p>
                         <p className="text-[10px] font-bold text-gray-400">Dist. Cycle #{p.cycle_number} · {new Date(p.scheduled_payout_date).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-black text-[#00ab00]">{fmt(activeGroup?.contribution_amount || 0)}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-300">Success</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}
