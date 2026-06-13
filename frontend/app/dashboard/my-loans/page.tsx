"use client"

import { useState } from "react"
import { Send, CreditCard, CheckCircle, Info, Loader2 } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { useGroups } from "@/hooks/useGroups"
import { useLoans, useRequestLoan } from "@/hooks/useLoans"
import { Skeleton } from "@/components/ui/skeleton"
import { fmt } from "@/lib/formatters"

const LOAN_PURPOSES = [
  { value: 'business', label: 'Business' },
  { value: 'education', label: 'Education' },
  { value: 'medical', label: 'Medical' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'home_improvement', label: 'Home Improvement' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

export default function MyLoansPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<"overview" | "request">("overview")
  const [loanAmount, setLoanAmount] = useState("")
  const [purpose, setPurpose] = useState("personal")
  const [term, setTerm] = useState("4") // weeks
  
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: loans, isLoading: loansLoading } = useLoans(activeGroup?.id || null)
  const requestLoan = useRequestLoan()

  const myActiveLoan = loans?.find(l => 
    (l.status === 'active' || l.status === 'disbursed') && 
    l.borrower_name === user?.full_name
  )

  const ELIGIBILITY_AMOUNT = activeGroup ? Math.floor(activeGroup.wallet.total * 0.3) : 0
  const requestedAmount = Number(loanAmount) || 0
  
  const interestRate = (activeGroup?.loan_interest_rate_monthly || 0) / 100
  const weeksPerMonth = 4
  const interest = Math.round(requestedAmount * interestRate * (Number(term) / weeksPerMonth))
  const totalRepay = requestedAmount + interest
  const weeklyPayment = Number(term) > 0 ? Math.round(totalRepay / Number(term)) : 0

  const handleRequest = async () => {
    if (!activeGroup) return
    try {
      await requestLoan.mutateAsync({
        group: activeGroup.id,
        amount: requestedAmount,
        purpose: purpose,
        term_weeks: Number(term)
      })
      setTab("overview")
      setLoanAmount("")
    } catch (err) {
      console.error(err)
    }
  }

  // Loading handled at component level

  if (!activeGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-lg border border-dashed border-gray-200">
         <Info size={32} className="text-gray-300 mb-4" />
         <p className="text-sm font-bold text-gray-400">Please join a group to access loan services.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0a2540] mb-2">My Financing</h1>
        <p className="text-gray-500 font-bold">Manage your active loans and request new credit lines.</p>
      </div>

      {/* Eligibility Card */}
      <div className="bg-[#0a2540] rounded-lg p-8 text-white relative overflow-hidden shadow-xl min-h-[160px]">
        {groupsLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
              <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-40" />
           </div>
        )}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00ab00] mb-2">Max Eligibility</p>
            <h2 className="text-4xl font-black">{groupsLoading ? "..." : fmt(ELIGIBILITY_AMOUNT)}</h2>
            <p className="text-xs font-bold opacity-50 mt-2">
              {activeGroup ? `Based on 30% of ${activeGroup.name} liquidity · ${activeGroup.loan_interest_rate_monthly}% monthly interest` : "Calculate based on group liquidity"}
            </p>
          </div>
          {activeGroup && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 min-w-[200px]">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  <span>Group Pool</span>
                  <span className="text-white">{fmt(activeGroup.wallet.total)}</span>
               </div>
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                  <span>Loan Pool</span>
                  <span className="text-white">{fmt(activeGroup.wallet.loan_pool)}</span>
               </div>
            </div>
          )}
        </div>
        <CreditCard className="absolute -bottom-8 -right-8 w-48 h-48 text-white/5" />
      </div>

      {/* Navigation */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "overview", label: "Overview" },
          { id: "request", label: "Request Loan" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              tab === t.id ? 'bg-white text-[#0a2540] shadow-sm' : 'text-gray-400 hover:text-[#0a2540]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-[300px]">
          {loansLoading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
                <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
             </div>
          )}
          {myActiveLoan ? (
            <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-green-50 text-[#00ab00] text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-100">
                      {myActiveLoan.status}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">ID: {myActiveLoan.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-2xl font-black text-[#0a2540] capitalize">{myActiveLoan.purpose} Loan</h3>
                  <p className="text-sm text-gray-500 font-bold mt-1">
                    Disbursed {myActiveLoan.disbursed_at ? new Date(myActiveLoan.disbursed_at).toLocaleDateString() : 'Pending'}
                  </p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-3xl font-black text-[#0a2540]">{fmt(myActiveLoan.amount)}</p>
                  <p className="text-xs font-bold text-[#00ab00] uppercase tracking-widest">Active Balance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Principal",     val: fmt(myActiveLoan.amount) },
                  { label: "Interest", val: `${myActiveLoan.interest_rate_monthly}% Mo.` },
                  { label: "Tenure",          val: `${myActiveLoan.term_weeks} weeks` },
                ].map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{r.label}</p>
                    <p className="text-sm font-black text-[#0a2540]">{r.val}</p>
                  </div>
                ))}
              </div>

              <button className="w-full py-4 bg-[#0a2540] text-white rounded-xl font-black text-sm hover:bg-[#0f3460] transition-all flex items-center justify-center gap-2 shadow-lg">
                <Send size={16} /> Repay Loan via Mobile Money
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-16 border border-gray-100 shadow-sm text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gray-300">
                 <CreditCard size={32} />
              </div>
              <h3 className="text-xl font-black text-[#0a2540] mb-2">No Active Loans</h3>
              <p className="text-gray-500 font-bold mb-8">You haven't requested any financing from this pool yet.</p>
              <button 
                onClick={() => setTab("request")}
                className="px-8 py-4 bg-[#00ab00] text-white rounded-xl font-black text-sm hover:bg-[#008a00] transition-all shadow-md"
              >
                Apply for Loan
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "request" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
          <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm">
            {requestLoan.isSuccess ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-[#00ab00]">
                   <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-[#0a2540] mb-2">Request Submitted</h3>
                <p className="text-gray-500 font-bold mb-8">Your application has been sent to group leaders for review.</p>
                <button 
                  onClick={() => { setTab("overview"); requestLoan.reset() }}
                  className="px-6 py-3 bg-gray-100 text-[#0a2540] rounded-xl font-black text-xs uppercase tracking-widest"
                >
                  Back to Overview
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-black text-[#0a2540] mb-6">New Loan Application</h3>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Requested Amount ({activeGroup.currency})</label>
                  <input
                    type="number" 
                    value={loanAmount} 
                    onChange={e => setLoanAmount(e.target.value)}
                    placeholder="Enter amount..." 
                    max={ELIGIBILITY_AMOUNT}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-black text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all"
                  />
                  <p className="text-[10px] font-bold text-[#00ab00] uppercase tracking-tighter">Your limit: {fmt(ELIGIBILITY_AMOUNT)}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loan Purpose</label>
                  <select 
                    value={purpose} 
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-black text-[#0a2540] outline-none appearance-none"
                  >
                    {LOAN_PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Repayment Period</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["4", "8", "12"].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setTerm(t)} 
                        className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${
                          term === t ? 'bg-green-50 border-[#00ab00] text-[#00ab00]' : 'bg-gray-50 border-gray-100 text-gray-400'
                        }`}
                      >
                        {t} Weeks
                      </button>
                    ))}
                  </div>
                </div>

                {requestedAmount > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0a2540]">Repayment Summary</h4>
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-bold text-gray-500">
                          <span>Principal</span>
                          <span className="text-[#0a2540]">{fmt(requestedAmount)}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold text-gray-500">
                          <span>Interest</span>
                          <span className="text-[#0a2540]">{fmt(interest)}</span>
                       </div>
                       <div className="flex justify-between text-sm font-black text-[#0a2540] pt-2 border-t border-gray-200">
                          <span>Total Obligation</span>
                          <span className="text-[#00ab00]">{fmt(totalRepay)}</span>
                       </div>
                    </div>
                  </div>
                )}

                <button
                  disabled={!loanAmount || requestedAmount <= 0 || requestLoan.isPending}
                  onClick={handleRequest}
                  className="w-full py-4 bg-[#00ab00] text-white rounded-xl font-black text-sm hover:bg-[#008a00] transition-all shadow-lg disabled:opacity-50"
                >
                  {requestLoan.isPending ? "Syncing..." : "Submit Application"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
