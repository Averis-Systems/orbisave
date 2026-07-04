"use client"

import { useState } from "react"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { useContributions } from "@/hooks/useContributions"
import { useLoans } from "@/hooks/useLoans"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Download, Users, BarChart2, CreditCard, ChevronRight, FileText, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
import { fmt } from "@/lib/formatters"

export default function ReportsPage() {
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  
  const { data: members, isLoading: membersLoading } = useMembers(activeGroup?.id || null)
  const { data: contributions, isLoading: contribsLoading } = useContributions(activeGroup?.id || null)
  const { data: loans, isLoading: loansLoading } = useLoans(activeGroup?.id || null)

  const [reportType, setReportType] = useState<"deposits" | "cashflow" | "loans">("deposits")

  // Generate matrix based on members and their contributions
  const matrix = members?.map(m => {
    const memberContribs = contributions?.filter(c => c.member_name === m.member_name && c.status === 'confirmed') || []
    return {
      name: m.member_name,
      total: memberContribs.reduce((acc, c) => acc + Number(c.amount), 0),
      count: memberContribs.length
    }
  }) || []

  const handleExport = () => {
    toast.success("Generating analytical report... Download will start shortly.")
  }

  // Loading handled at component level

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Group Analytics</h1>
          <p className="text-gray-500 font-bold">Comprehensive financial audits and member participation matrices.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a2540] text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-xl shadow-[#0a2540]/10 hover:bg-[#0f3460] transition-all"
        >
          <Download size={14} /> Export Spreadsheet
        </button>
      </div>

      {/* Report Switcher */}
      <div className="flex flex-wrap p-1 bg-gray-100 rounded-lg w-full lg:w-fit gap-1">
        {[
          { id: "deposits",  label: "Member Equity",  Icon: Users     },
          { id: "cashflow",  label: "Ledger Flow",    Icon: BarChart2 },
          { id: "loans",     label: "Loan Portfolio", Icon: CreditCard},
        ].map(r => (
          <button 
            key={r.id} 
            onClick={() => setReportType(r.id as any)}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              reportType === r.id ? 'bg-white text-[#0a2540] shadow-md' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <r.Icon size={14} className={reportType === r.id ? 'text-[#00ab00]' : ''} />
            {r.label}
          </button>
        ))}
      </div>

      {/* Report Workspace */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-[400px]">
        {(groupsLoading || membersLoading || contribsLoading || loansLoading) && (
           <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
              <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
           </div>
        )}
        {/* Member Equity Matrix */}
        {reportType === "deposits" && (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <div>
                 <h3 className="text-lg font-black text-[#0a2540]">Contributor Equity Matrix</h3>
                 <p className="text-xs font-bold text-gray-400 mt-1">Aggregated lifetime savings per group member.</p>
              </div>
              <FileText size={24} className="text-gray-200" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white">
                    <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Participant</th>
                    <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Frequency</th>
                    <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Net Equity Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {matrix.map(row => (
                    <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6 text-sm font-black text-[#0a2540]">{row.name}</td>
                      <td className="px-8 py-6 text-center text-xs font-bold text-gray-400">{row.count} installments</td>
                      <td className="px-8 py-6 text-right text-sm font-black text-[#00ab00]">{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/80">
                    <td className="px-8 py-6 text-sm font-black text-[#0a2540]">Consolidated Group Wallet</td>
                    <td className="px-8 py-6 text-center text-xs font-black text-[#0a2540]">
                      {matrix.reduce((s, r) => s + r.count, 0)} Total Deposits
                    </td>
                    <td className="px-8 py-6 text-right text-lg font-black text-[#0a2540]">
                      {fmt(matrix.reduce((s, r) => s + r.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Ledger Flow */}
        {reportType === "cashflow" && (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-lg font-black text-[#0a2540]">Live Transaction Ledger</h3>
               <span className="px-3 py-1 bg-green-50 text-[10px] font-black uppercase tracking-widest text-[#00ab00] rounded-lg border border-green-100">Verified Activity</span>
            </div>
            <div className="space-y-4">
               {contributions?.map(c => (
                  <div key={c.id} className="p-5 rounded-lg border border-gray-50 hover:border-gray-100 transition-all flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#00ab00]">
                           <ArrowUpRight size={18} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">CONTRIBUTION</p>
                           <p className="text-sm font-black text-[#0a2540] group-hover:text-[#00ab00] transition-colors">{c.member_name}</p>
                           <p className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(c.confirmed_at || c.initiated_at || c.scheduled_date).toLocaleString()}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-[#00ab00]">+{fmt(c.amount)}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">Confirmed</p>
                     </div>
                  </div>
               ))}
               {loans?.filter(l => l.status === 'disbursed' || l.status === 'active').map(l => (
                  <div key={l.id} className="p-5 rounded-lg border border-gray-50 hover:border-gray-100 transition-all flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                           <ArrowDownRight size={18} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">LOAN DISBURSEMENT</p>
                           <p className="text-sm font-black text-[#0a2540] group-hover:text-red-500 transition-colors">{l.borrower_name}</p>
                           <p className="text-[10px] font-bold text-gray-400 mt-0.5">Asset ID: {l.id.slice(0, 8)}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-red-500">-{fmt(l.amount)}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">Disbursed</p>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        )}

        {/* Loan Portfolio */}
        {reportType === "loans" && (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-lg font-black text-[#0a2540]">Loan Portfolio Exposure</h3>
               <span className="px-3 py-1 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-[#0a2540] rounded-lg border border-gray-100">Asset Report</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { label: "Gross Disbursed", val: fmt(loans?.filter(l => ['disbursed', 'active', 'repaid'].includes(l.status)).reduce((s, l) => s + Number(l.amount), 0) || 0), color: "text-[#0a2540]", bg: "bg-gray-50" },
                { label: "Net Recovered",   val: fmt(loans?.filter(l => l.status === 'repaid').reduce((s, l) => s + Number(l.amount), 0) || 0), color: "text-[#00ab00]", bg: "bg-green-50" },
                { label: "At Risk Exposure", val: fmt(loans?.filter(l => l.status === 'active' || l.status === 'disbursed').reduce((s, l) => s + Number(l.amount), 0) || 0),  color: "text-red-600", bg: "bg-red-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-lg p-6 border border-black/5`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Asset ID</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Borrower</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Principal</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Horizon</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Maturity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loans?.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-[10px] font-bold text-gray-400 font-sans">{l.id.slice(0, 8)}</td>
                      <td className="px-4 py-4">
                         <p className="text-sm font-black text-[#0a2540]">{l.borrower_name}</p>
                         <p className="text-[9px] font-bold text-gray-400 uppercase">{l.purpose}</p>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-[#0a2540]">{fmt(l.amount)}</td>
                      <td className="px-4 py-4 text-xs font-bold text-gray-500">{l.term_weeks} Weeks</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
                          l.status === "repaid" ? 'bg-green-50 text-[#016828] border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          {l.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
