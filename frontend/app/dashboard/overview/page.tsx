"use client"

import { useRouter } from "next/navigation"
import { 
  Users, ArrowUp, ArrowDown, AlertCircle, Banknote, 
  RefreshCw, CreditCard, Calendar, Activity 
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { useGroups } from "@/hooks/useGroups"
import { useMeetings } from "@/hooks/useMeetings"
import { useLoans } from "@/hooks/useLoans"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"
import { fmt } from "@/lib/formatters"

import { PoolGrowthChart } from "@/components/dashboard/PoolGrowthChart"
import { LoanAllocationChart } from "@/components/dashboard/LoanAllocationChart"

// ─── COMPONENT: Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, trend, isLoading, wide = false }: any) {
  return (
    <div className={`bg-white rounded-lg p-6 border border-gray-100 shadow-sm relative overflow-hidden ${wide ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
          <Icon size={16} className="text-[#00ab00]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-8 flex items-center mb-2">
          <Loader2 size={20} className="animate-spin text-[#00ab00] opacity-20" />
        </div>
      ) : (
        <div className="text-2xl font-black text-[#0a2540] mb-1">{value}</div>
      )}
      {sub && (
        <div className={`text-[10px] font-bold flex items-center gap-1 ${trend === "up" ? 'text-[#00ab00]' : trend === "down" ? 'text-red-500' : 'text-gray-400'}`}>
          {trend === "up" && <ArrowUp size={10} />}{trend === "down" && <ArrowDown size={10} />}{sub}
        </div>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const { data: groups, isLoading: groupsLoading, isError: groupsError } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: meetings, isLoading: meetingsLoading } = useMeetings(activeGroup?.id || null)
  const { data: loans, isLoading: loansLoading } = useLoans(activeGroup?.id || null)

  const pendingLoans = loans?.filter(l => l.status.startsWith('pending')) || []
  const upcomingMeeting = meetings?.find(m => m.status === 'scheduled')

  // Content-level loading is now handled inside cards

  if (!activeGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-lg border border-dashed border-gray-200">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4 text-[#00ab00]">
          <Users size={32} />
        </div>
        <h2 className="text-2xl font-black text-[#0a2540]">No Collectives Found</h2>
        <p className="text-gray-500 mt-2 max-w-sm font-bold">You haven't joined or created any groups yet. Start by creating your first pool!</p>
        <button 
          onClick={() => router.push("/dashboard/my-group")}
          className="mt-8 px-8 py-4 bg-[#00ab00] text-white rounded-xl font-black text-sm hover:bg-[#008a00] transition-all shadow-md"
        >
          Create New Group
        </button>
      </div>
    )
  }

  const wallet = activeGroup.wallet
  const currency = activeGroup.currency

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Alert Banner */}
      <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-4">
        <AlertCircle size={18} className="text-[#00ab00] shrink-0" />
        <span className="text-xs font-bold text-[#0a2540] flex-1">
          Hello <strong>{user?.full_name}</strong>. {activeGroup.name} status is <span className="uppercase text-[10px] bg-green-100 px-2 py-0.5 rounded-md ml-1">{activeGroup.status}</span>.
          {upcomingMeeting && <> Next meeting scheduled for <strong>{new Date(upcomingMeeting.scheduled_at).toLocaleDateString()}</strong>.</>}
        </span>
        <button 
          onClick={() => router.push("/dashboard/my-group")}
          className="text-[10px] font-black uppercase tracking-widest text-[#00ab00] hover:underline"
        >
          Manage Group
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Pool" value={fmt(wallet?.total)} sub={`Trust A/C: ${currency}`} icon={Banknote} isLoading={groupsLoading} />
        <StatCard label="Rotation Pool" value={fmt(wallet?.rotation_pool)} sub="Available for payouts" icon={RefreshCw} isLoading={groupsLoading} />
        <StatCard label="Loan Pool" value={fmt(wallet?.loan_pool)} sub="Available for credit" icon={CreditCard} trend="up" isLoading={groupsLoading} />
        <StatCard label="Active Members" value={`${activeGroup?.member_count || 0}/${activeGroup?.max_members || 0}`} sub="Pool capacity" icon={Users} isLoading={groupsLoading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest">Pool Growth</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                 <span className="w-2 h-2 rounded-full bg-[#00ab00]" /> Real-time
              </div>
           </div>
           <div className="h-[300px]">
              <PoolGrowthChart />
           </div>
        </div>
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
           <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest mb-6">Asset Allocation</h3>
           <div className="h-[300px]">
              <LoanAllocationChart />
           </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Notifications */}
        <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest">Notifications</h3>
            <button 
              onClick={() => router.push("/dashboard/notifications")}
              className="text-[10px] font-black uppercase tracking-widest text-[#00ab00] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
             <Activity size={32} className="mb-4 opacity-20" />
             <p className="text-xs font-bold">Activity feed will sync as members contribute.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest mb-6">Critical Actions</h3>
          
          <div className="space-y-4">
            {pendingLoans.length > 0 ? (
              pendingLoans.map(loan => (
                <div key={loan.id} className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-black text-[#0a2540]">{loan.borrower_name}</p>
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Loan Request · {loan.id.slice(0, 8)}</p>
                    </div>
                    <span className="text-lg font-black text-[#0a2540]">{fmt(loan.amount)}</span>
                  </div>
                  <button 
                    onClick={() => router.push("/dashboard/loan-approvals")}
                    className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                  >
                    Review Request
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 border border-dashed border-gray-100 rounded-lg text-center text-gray-300 text-[10px] font-black uppercase tracking-widest">
                No pending loan approvals
              </div>
            )}
            
            {upcomingMeeting ? (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Upcoming Meeting</span>
                </div>
                <p className="text-sm font-black text-[#0a2540]">{upcomingMeeting.title}</p>
                <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-tighter">
                  {new Date(upcomingMeeting.scheduled_at).toLocaleString()}
                </p>
                <button 
                  onClick={() => router.push("/dashboard/meetings")}
                  className="w-full mt-4 py-2 bg-[#0a2540] text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-[#0f3460] transition-all"
                >
                  View Agenda
                </button>
              </div>
            ) : (
              <div className="py-6 border border-dashed border-gray-100 rounded-lg text-center text-gray-300 text-[10px] font-black uppercase tracking-widest">
                No meetings scheduled
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
