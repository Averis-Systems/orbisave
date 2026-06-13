"use client"

import { useState } from "react"
import { Plus, Calendar, Video, Users, Clock, ChevronRight } from "lucide-react"
import { useGroups } from "@/hooks/useGroups"
import { useMeetings } from "@/hooks/useMeetings"
import { Skeleton } from "@/components/ui/skeleton"

export default function MeetingsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: meetings, isLoading: meetingsLoading } = useMeetings(activeGroup?.id || null)

  const upcoming = meetings?.filter(m => m.status === 'scheduled' || m.status === 'live') || []
  const past = meetings?.filter(m => m.status === 'ended') || []
  const shown = tab === "upcoming" ? upcoming : past

  if (groupsLoading || meetingsLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Chama Sessions</h1>
          <p className="text-gray-500 font-bold">Synchronize with your pool members and discuss pool growth.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-[#00ab00] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#00ab00]/20 hover:bg-[#008a00] transition-all">
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* Featured Next Meeting */}
      {upcoming[0] && (
        <div className="relative overflow-hidden bg-[#0a2540] rounded-lg p-10 text-white shadow-2xl shadow-[#0a2540]/20">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ab00]/10 rounded-full blur-3xl -mr-20 -mt-20" />
           
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                 <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${upcoming[0].status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-[#00ab00]'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${upcoming[0].status === 'live' ? 'text-red-400' : 'text-[#00ab00]'}`}>
                       {upcoming[0].status === 'live' ? 'Session In Progress' : 'Featured Session'}
                    </span>
                 </div>
                 <h2 className="text-4xl font-black tracking-tight">{upcoming[0].title}</h2>
                 <div className="flex items-center gap-6 text-white/60 text-sm font-bold">
                    <div className="flex items-center gap-2">
                       <Calendar size={18} className="text-[#00ab00]" />
                       <span>{new Date(upcoming[0].scheduled_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Clock size={18} className="text-[#00ab00]" />
                       <span>{new Date(upcoming[0].scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                 </div>
                 
                 {upcoming[0].status === 'live' ? (
                    <button className="flex items-center gap-2 px-8 py-4 bg-[#00ab00] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#008a00] transition-all shadow-xl shadow-[#00ab00]/30">
                       <Video size={18} /> Join Live Room
                    </button>
                 ) : (
                    <div className="space-y-3">
                       <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Priority Agenda</p>
                       <div className="flex flex-col gap-2">
                          {upcoming[0].agenda_items?.slice(0, 3).map((item: any, i: number) => (
                             <div key={i} className="flex items-center gap-3 text-sm font-bold text-white/80">
                                <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] font-black text-[#00ab00]">{i+1}</span>
                                {item.title}
                             </div>
                          ))}
                          {upcoming[0].agenda_items && upcoming[0].agenda_items.length > 3 && (
                             <p className="text-[10px] font-black text-[#00ab00] uppercase tracking-widest">+{upcoming[0].agenda_items.length - 3} more items</p>
                          )}
                       </div>
                    </div>
                 )}
              </div>
              
              <div className="lg:col-span-5 bg-white/5 rounded-lg border border-white/5 p-8 backdrop-blur-md">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-[#00ab00] flex items-center justify-center text-white shadow-lg">
                       <Users size={24} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Expected Quorum</p>
                       <p className="text-xl font-black">{upcoming[0].attendance_count || 12} Pool Members</p>
                    </div>
                 </div>
                 <div className="pt-6 border-t border-white/10">
                    <p className="text-xs font-bold text-white/60 leading-relaxed italic">
                       "All members are required to attend. Punctuality is essential for group credit scoring."
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {(["upcoming", "past"] as const).map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t)}
            className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              tab === t ? 'bg-white text-[#0a2540] shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === "upcoming" ? "Scheduled" : "Archived"}
          </button>
        ))}
      </div>

      {/* Meeting Ledger */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shown.map(m => (
          <div key={m.id} className="group bg-white rounded-lg border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all hover:border-[#00ab00]/20">
             <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                  m.status === 'live' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                   {m.status}
                </span>
                <div className="flex items-center gap-1 text-[#00ab00]">
                   <Users size={12} />
                   <span className="text-xs font-black">{m.attendance_count || 0}</span>
                </div>
             </div>
             
             <h4 className="text-lg font-black text-[#0a2540] mb-2 group-hover:text-[#00ab00] transition-colors">{m.title}</h4>
             
             <div className="flex items-center gap-4 text-gray-400 text-[11px] font-bold mb-6">
                <div className="flex items-center gap-1">
                   <Calendar size={12} />
                   <span>{new Date(m.scheduled_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                   <Clock size={12} />
                   <span>{new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
             </div>

             {m.agenda_items && m.agenda_items.length > 0 && (
                <div className="space-y-2 mb-6">
                   <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">Agenda Preview</p>
                   <div className="flex flex-wrap gap-2">
                      {m.agenda_items.slice(0, 2).map((a: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-500 rounded border border-gray-100 truncate max-w-[100px]">
                           {a.title}
                        </span>
                      ))}
                      {m.agenda_items.length > 2 && <span className="text-[10px] font-black text-[#00ab00]">+{m.agenda_items.length - 2}</span>}
                   </div>
                </div>
             )}

             <button className="w-full py-3 bg-gray-50 text-[#0a2540] rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0a2540] hover:text-white transition-all group-hover:bg-[#0a2540] group-hover:text-white">
                View Minutes <ChevronRight size={12} />
             </button>
          </div>
        ))}
        
        {shown.length === 0 && (
           <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-50 rounded-lg">
              <p className="text-gray-300 font-bold italic text-sm">No {tab} sessions documented in the registry.</p>
           </div>
        )}
      </div>
    </div>
  )
}
