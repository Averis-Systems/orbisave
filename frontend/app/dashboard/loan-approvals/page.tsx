"use client"

import { useState } from "react"
import { Clock, CheckCircle, XCircle, CreditCard, ShieldAlert, Loader2 } from "lucide-react"
import { useGroups } from "@/hooks/useGroups"
import { useLoans, useApproveLoan, useRejectLoan } from "@/hooks/useLoans"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { fmt } from "@/lib/formatters"

export default function LoanApprovalsPage() {
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: loans, isLoading: loansLoading } = useLoans(activeGroup?.id || null)
  const approveLoan = useApproveLoan()
  const rejectLoan = useRejectLoan()

  const [pin, setPin] = useState("")

  const pending = loans?.filter(l => l.status.startsWith('pending')) || []
  const active  = loans?.filter(l => l.status === 'active' || l.status === 'disbursed') || []
  const repaid  = loans?.filter(l => l.status === 'repaid') || []

  const handleApprove = async (id: string) => {
    if (!pin) {
      toast.error("Please enter your authorization PIN")
      return
    }
    try {
      await approveLoan.mutateAsync({ id, pin })
      toast.success("Loan approved successfully")
      setPin("")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to approve loan")
    }
  }

  const handleReject = async (id: string) => {
    const reason = window.prompt("Reason for rejection:")
    if (reason === null) return
    try {
      await rejectLoan.mutateAsync({ id, reason })
      toast.success("Loan rejected")
    } catch (err: any) {
      toast.error("Failed to reject loan")
    }
  }

  // Loading handled at content level

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0a2540] mb-2">Loan Approvals</h1>
        <p className="text-gray-500 font-bold">Review and authorize member loan requests within your collective.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Pending Review", value: pending.length, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Active Portfolio",   value: active.length,  color: "text-[#00ab00]", bg: "bg-green-50" },
          { label: "Fully Repaid",         value: repaid.length,  color: "text-gray-400", bg: "bg-gray-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{s.label}</div>
            <div className={`text-4xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* PIN Input */}
      {pending.length > 0 && (
         <div className="bg-[#0a2540] p-8 rounded-lg border border-navy-mid text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#00ab00]">
                  <ShieldAlert size={24} />
               </div>
               <div>
                  <h3 className="font-black text-lg text-white">Authorization Required</h3>
                  <p className="text-sm text-white/50 font-bold">Enter your leader PIN to authorize these approvals.</p>
               </div>
            </div>
            <input 
              type="password" 
              placeholder="PIN"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center text-2xl font-black tracking-[0.5em] focus:ring-2 focus:ring-[#00ab00] outline-none w-full md:w-48 placeholder:text-white/20"
            />
         </div>
      )}

      {/* Pending loans */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
           <Clock size={18} className="text-orange-500" />
           <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest">Pending Requests</h3>
        </div>

        {pending.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {pending.map(loan => (
              <div key={loan.id} className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                  <div>
                    <h4 className="text-xl font-black text-[#0a2540] mb-1">{loan.borrower_name}</h4>
                    <p className="text-sm text-gray-400 font-bold">{loan.purpose} · <span className="text-[#0a2540]">{loan.term_weeks} weeks</span></p>
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-tighter mt-2">ID: {loan.id}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-2xl font-black text-[#0a2540]">{fmt(loan.amount)}</p>
                    <p className="text-xs font-bold text-[#00ab00] uppercase tracking-widest">{loan.interest_rate_monthly}% Monthly Interest</p>
                  </div>
                </div>
                
                <div className="flex gap-4 border-t border-gray-50 pt-8">
                  <button 
                    onClick={() => handleApprove(loan.id)}
                    disabled={approveLoan.isPending}
                    className="flex-1 py-4 bg-[#00ab00] text-white rounded-xl font-black text-sm hover:bg-[#008a00] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={16} /> {approveLoan.isPending ? 'Processing...' : 'Authorize Approval'}
                  </button>
                  <button 
                    onClick={() => handleReject(loan.id)}
                    disabled={rejectLoan.isPending}
                    className="flex-1 py-4 bg-white border border-red-200 text-red-500 rounded-xl font-black text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="py-20 text-center bg-white rounded-lg border border-dashed border-gray-100 text-gray-300">
              <p className="font-bold text-sm">No pending loan requests to review.</p>
           </div>
        )}
      </div>

      {/* Portfolio */}
      <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm relative min-h-[200px]">
        {loansLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
              <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
           </div>
        )}
        <div className="flex items-center gap-2 mb-8">
           <CreditCard size={18} className="text-[#0a2540]" />
           <h3 className="text-sm font-black text-[#0a2540] uppercase tracking-widest">Active Portfolio</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {active.length > 0 ? active.map(loan => (
            <div key={loan.id} className="py-6 flex justify-between items-center group">
              <div>
                <p className="font-black text-[#0a2540] group-hover:text-[#00ab00] transition-colors">{loan.borrower_name}</p>
                <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tighter">{loan.status} · {loan.purpose}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#0a2540]">{fmt(loan.amount)}</p>
                <p className="text-[10px] font-black text-[#00ab00] uppercase tracking-widest">{loan.term_weeks} Weeks</p>
              </div>
            </div>
          )) : !loansLoading && <div className="text-center py-12 text-gray-300 italic text-sm font-bold">No active loans in the group portfolio.</div>}
        </div>
      </div>
    </div>
  )
}
