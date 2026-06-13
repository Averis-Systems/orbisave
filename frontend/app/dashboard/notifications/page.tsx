"use client"

import { AlertCircle, Vote, Info, Users, CheckCircle, Bell, CheckSquare, Loader2 } from "lucide-react"
import { useGroups } from "@/hooks/useGroups"
import { useNotifications } from "@/hooks/useNotifications"
import { Skeleton } from "@/components/ui/skeleton"

const iconMap: Record<string, any> = {
  alert:    { Icon: AlertCircle, color: "text-red-500",    bg: "bg-red-50" },
  loan:     { Icon: Vote,        color: "text-orange-500", bg: "bg-orange-50" },
  info:     { Icon: Info,        color: "text-[#0a2540]",  bg: "bg-gray-50" },
  warning:  { Icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50" },
  meeting:  { Icon: Users,       color: "text-[#00ab00]",  bg: "bg-green-50" },
  success:  { Icon: CheckCircle, color: "text-[#00ab00]",  bg: "bg-green-50" },
}

export default function NotificationsPage() {
  const { data: groups } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: notifications, isLoading } = useNotifications(activeGroup?.id || null)
  
  const unread = notifications?.filter(n => !n.read_at) || []
  const read = notifications?.filter(n => n.read_at) || []

  // Loading handled at content level

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Notifications</h1>
          <p className="text-gray-500 font-bold">Stay updated with your pool activity and alerts.</p>
        </div>
        {unread.length > 0 && (
          <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#00ab00] hover:bg-green-50 px-4 py-2 rounded-lg transition-all">
            <CheckSquare size={16} /> Mark all read
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Unread Section */}
        {unread.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
               <Bell size={16} className="text-[#00ab00]" />
               <h3 className="text-[10px] font-black text-[#0a2540] uppercase tracking-[0.2em]">New Alerts</h3>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              {unread.map(n => {
                const { Icon, color, bg } = iconMap[n.type] ?? iconMap.info
                return (
                  <div key={n.id} className="flex items-start gap-4 p-6 hover:bg-gray-50 transition-colors relative">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4 mb-1">
                         <h4 className="text-sm font-black text-[#0a2540] truncate">{n.title}</h4>
                         <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-bold leading-relaxed mb-3">{n.body}</p>
                      <div className="flex items-center gap-4">
                         <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">{new Date(n.created_at).toLocaleDateString()}</span>
                         {n.metadata?.action_url && (
                           <button className="text-[10px] font-black text-[#00ab00] uppercase tracking-widest hover:underline underline-offset-4 transition-all">
                             Take Action
                           </button>
                         )}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[#00ab00] shadow-[0_0_8px_#00ab00] mt-1 shrink-0" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Read Section */}
        <div className="space-y-4 relative min-h-[200px]">
          {isLoading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
                <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
             </div>
          )}
          <div className="flex items-center gap-2 px-2">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Earlier</h3>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50 opacity-60">
            {read.length > 0 ? read.map(n => {
              const { Icon } = iconMap[n.type] ?? iconMap.info
              return (
                <div key={n.id} className="flex items-start gap-4 p-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-1">
                       <h4 className="text-sm font-black text-gray-400 truncate">{n.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400 font-bold leading-relaxed">{n.body}</p>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter mt-3">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )
            }) : !isLoading && (
               <div className="py-20 text-center text-gray-300 font-bold text-sm">
                  No previous notifications.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
