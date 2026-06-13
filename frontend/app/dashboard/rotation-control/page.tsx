"use client"

import { useState } from "react"
import { useGroups } from "@/hooks/useGroups"
import { useRotations, useRotationSchedules, useInitializeRotation, useStartNextCycle, useTriggerPayout } from "@/hooks/useRotations"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { RefreshCw, AlertTriangle, Clock, CheckCircle, ChevronRight, Play, Settings2, ShieldCheck, UserCheck } from "lucide-react"
import { fmt } from "@/lib/formatters"

const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "MB"
const AVATAR_COLORS = ["#0a2540", "#016828", "#0f3460", "#018a35", "#014d1b"]
const avatarBg = (name: string) => { let h = 0; for (const c of name || "") h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length; return AVATAR_COLORS[Math.abs(h)] }

export default function RotationControlPage() {
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: cycles, isLoading: cyclesLoading } = useRotations(activeGroup?.id || null)
  const currentCycle = cycles?.find(c => c.is_current) || cycles?.[0]
  
  const { data: schedules, isLoading: schedulesLoading } = useRotationSchedules(currentCycle?.id || null)
  
  const initialize = useInitializeRotation()
  const nextCycle = useStartNextCycle()
  const triggerPayout = useTriggerPayout()

  const [triggerConfirm, setTriggerConfirm] = useState<{ memberId: string, memberName: string } | null>(null)

  const upcomingSchedules = schedules?.filter(s => !s.is_paid_out) || []
  const nextRecipient = upcomingSchedules[0] || null

  const handleTriggerPayout = async () => {
    if (!triggerConfirm || !currentCycle) return
    try {
      await triggerPayout.mutateAsync({ cycleId: currentCycle.id, memberId: triggerConfirm.memberId })
      toast.success(`Payout successfully disbursed to ${triggerConfirm.memberName}`)
      setTriggerConfirm(null)
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to trigger payout")
    }
  }

  const handleNextCycle = async () => {
    if (!activeGroup) return
    try {
      await nextCycle.mutateAsync(activeGroup.id)
      toast.success("Advanced to next financial cycle")
    } catch (err: any) {
      toast.error("Failed to advance cycle")
    }
  }

  const handleInitialize = async () => {
    if (!activeGroup) return
    try {
      await initialize.mutateAsync(activeGroup.id)
      toast.success("Rotation schedule initialized successfully")
    } catch (err: any) {
      toast.error("Failed to initialize schedule")
    }
  }

  if (groupsLoading || cyclesLoading || schedulesLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[600px] rounded-lg" />
          <Skeleton className="h-[600px] rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Rotation Engine</h1>
          <p className="text-gray-500 font-bold">Automated payout sequencing and cycle management console.</p>
        </div>
        <div className="flex items-center gap-3">
          {!currentCycle && (
            <button 
              onClick={handleInitialize} 
              className="px-6 py-3 bg-[#0a2540] text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-xl shadow-[#0a2540]/10 hover:bg-[#0f3460] transition-all flex items-center gap-2"
            >
               <Play size={14} /> Initialize Rotation
            </button>
          )}
          <button 
            onClick={handleNextCycle} 
            className="px-6 py-3 bg-white border border-gray-100 text-[#0a2540] rounded-lg font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
          >
             <RefreshCw size={14} /> Advance Cycle
          </button>
        </div>
      </div>

      {/* Primary Status Card */}
      <div className="bg-[#0a2540] rounded-lg p-8 text-white relative overflow-hidden shadow-2xl shadow-[#0a2540]/20">
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Live Execution Window</p>
               <h2 className="text-4xl font-black mb-4">Cycle #{currentCycle?.cycle_number || "0"}</h2>
               <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-[#00ab00] rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">{currentCycle?.status || "Idle"}</span>
                  {nextRecipient && (
                     <div className="flex items-center gap-2 text-white/70 text-xs font-bold">
                        <UserCheck size={14} className="text-[#00ab00]" />
                        Recipient: <span className="text-white underline underline-offset-4 decoration-[#00ab00]">{nextRecipient.member_name}</span>
                     </div>
                  )}
               </div>
            </div>
            <div className="md:text-right md:border-l border-white/10 md:pl-12">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Individual Payout Amount</p>
               <p className="text-5xl font-black text-[#00ab00] mb-2">{fmt(activeGroup?.contribution_amount || 0)}</p>
               <p className="text-sm font-bold text-white/40">Aggregated Pool: {fmt((activeGroup?.contribution_amount || 0) * (activeGroup?.member_count || 0))}</p>
            </div>
         </div>
         {/* Decorative background element */}
         <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#00ab00]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Schedule Matrix */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest">Payout Sequence Matrix</h3>
            <span className="text-[10px] font-black text-gray-400">{upcomingSchedules.length} Pendencies Remaining</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-50">
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">#</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Participant</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Maturity Date</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schedules?.map((r, i) => (
                  <tr key={r.id} className={`group transition-all ${(!r.is_paid_out && i === 0) ? 'bg-[#00ab00]/5' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-5">
                       <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                          r.is_paid_out ? 'bg-gray-100 text-gray-400' : (i === 0 ? 'bg-[#00ab00] text-white' : 'bg-gray-100 text-[#0a2540]')
                       }`}>
                          {i + 1}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black" style={{ background: avatarBg(r.member_name) }}>
                             {initials(r.member_name)}
                          </div>
                          <p className="text-sm font-black text-[#0a2540]">{r.member_name}</p>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-500">
                       {new Date(r.scheduled_payout_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-[#0a2540]">
                       {fmt(activeGroup?.contribution_amount || 0)}
                    </td>
                    <td className="px-6 py-5">
                       {r.is_paid_out ? (
                          <div className="flex items-center gap-1.5 text-[#00ab00]">
                             <CheckCircle size={14} />
                             <span className="text-[10px] font-black uppercase tracking-widest">Settled</span>
                          </div>
                       ) : (
                          <button 
                             onClick={() => setTriggerConfirm({ memberId: r.member, memberName: r.member_name })}
                             className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                i === 0 ? 'bg-[#00ab00] text-white shadow-lg shadow-[#00ab00]/20' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-[#0a2540]'
                             }`}
                          >
                             Authorize Payout
                          </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Control Sidepanel */}
        <div className="space-y-8">
           {/* Authorizer Card */}
           <div className={`rounded-lg border p-8 transition-all duration-500 ${
              triggerConfirm ? 'bg-white border-[#00ab00] shadow-xl shadow-[#00ab00]/5 ring-2 ring-[#00ab00]/10' : 'bg-white border-gray-100'
           }`}>
              <div className="flex items-center gap-3 mb-6">
                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm ${
                    triggerConfirm ? 'bg-[#00ab00]/10 text-[#00ab00] border-[#00ab00]/20' : 'bg-gray-50 text-gray-400 border-gray-100'
                 }`}>
                    <ShieldCheck size={20} />
                 </div>
                 <h3 className="text-lg font-black text-[#0a2540]">Auth Console</h3>
              </div>

              {triggerConfirm ? (
                 <div className="animate-in slide-in-from-top-4 duration-500">
                    <p className="text-xs font-bold text-gray-500 leading-relaxed mb-6">
                       You are authorizing an immediate disbursement to <span className="text-[#0a2540] font-black">{triggerConfirm.memberName}</span>. This payload will be committed to the immutable group ledger.
                    </p>
                    <div className="space-y-3">
                       <button 
                          onClick={handleTriggerPayout}
                          disabled={triggerPayout.isPending}
                          className="w-full py-4 bg-[#00ab00] text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#00ab00]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                       >
                          {triggerPayout.isPending ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                          Confirm Disbursement
                       </button>
                       <button 
                          onClick={() => setTriggerConfirm(null)}
                          className="w-full py-4 bg-gray-50 text-gray-400 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                       >
                          Abort Action
                       </button>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-4">
                    <p className="text-[11px] font-bold text-gray-400 leading-relaxed italic">
                       Please select an eligible recipient from the schedule matrix to initiate the authorization sequence.
                    </p>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <span>Service Fee</span>
                          <span className="text-[#0a2540]">3.0%</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <span>M-Pesa Surcharge</span>
                          <span className="text-[#0a2540]">KES 22.00</span>
                       </div>
                    </div>
                 </div>
              )}
           </div>

           {/* Guidelines */}
           <div className="bg-white rounded-lg border border-gray-100 p-8">
              <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest mb-6">Execution Guidelines</h4>
              <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                       <Clock size={16} />
                    </div>
                    <div>
                       <p className="text-[11px] font-black text-[#0a2540] uppercase tracking-widest mb-1">Audit Check</p>
                       <p className="text-[10px] font-bold text-gray-400 leading-relaxed">Ensure 100% contribution compliance before triggering disbursement.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0">
                       <AlertTriangle size={16} />
                    </div>
                    <div>
                       <p className="text-[11px] font-black text-[#0a2540] uppercase tracking-widest mb-1">KYC Enforcement</p>
                       <p className="text-[10px] font-bold text-gray-400 leading-relaxed">System blocks payments to non-verified identities automatically.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
