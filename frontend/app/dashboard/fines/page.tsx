"use client"

import { useState } from "react"
import { useGroups } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { useFines, useIssueFine } from "@/hooks/useFines"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, AlertTriangle, Search, Info, ChevronRight, Loader2 } from "lucide-react"
import { fmt } from "@/lib/formatters"

const FINE_CATEGORIES = [
  { id: "absent_without_apology", label: "Absent without apology",    amount: 500 },
  { id: "late_contribution",      label: "Late contribution",          amount: 200 },
  { id: "missing_documentation",  label: "Missing documentation",      amount: 300 },
  { id: "custom",                 label: "Custom penalty",             amount: 0   },
]

export default function FinesPage() {
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null
  
  const { data: members, isLoading: membersLoading } = useMembers(activeGroup?.id || null)
  const { data: fines, isLoading: finesLoading } = useFines(activeGroup?.id || null)
  const issueFine = useIssueFine()

  const [selectedMember, setSelectedMember] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [notes, setNotes] = useState("")

  const category = FINE_CATEGORIES.find(c => c.id === selectedCategory)
  const amount = selectedCategory === "custom" ? Number(customAmount) : category?.amount ?? 0

  const handleIssue = async () => {
    if (!selectedMember || !selectedCategory || amount <= 0) {
      toast.error("Required fields missing")
      return
    }
    try {
      await issueFine.mutateAsync({
        groupId: activeGroup!.id,
        memberId: selectedMember,
        amount: amount,
        ruleType: selectedCategory
      })
      toast.success("Fine recorded successfully")
      setSelectedMember("")
      setSelectedCategory("")
      setCustomAmount("")
      setNotes("")
    } catch (err: any) {
      toast.error("Failed to issue fine")
    }
  }

  // Loading handled at content level

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Penalties Ledger</h1>
          <p className="text-gray-500 font-bold">Document and manage group rule infractions and financial penalties.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Issue Fine Module */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 shadow-sm">
               <Plus size={20} />
            </div>
            <h2 className="text-xl font-black text-[#0a2540]">New Penalty Invoice</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Pool Contributor</label>
              <select
                value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm font-black text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all"
              >
                <option value="">Select pool member</option>
                {members?.map(m => <option key={m.id} value={m.id}>{m.member_name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Violation Category</label>
              <div className="grid grid-cols-1 gap-2">
                 {FINE_CATEGORIES.map(cat => (
                   <button
                     key={cat.id} 
                     onClick={() => setSelectedCategory(cat.id)}
                     className={`w-full text-left p-4 rounded-lg border transition-all flex items-center justify-between ${
                       selectedCategory === cat.id 
                       ? 'bg-[#00ab00] border-[#00ab00] text-white shadow-lg shadow-[#00ab00]/20' 
                       : 'bg-white border-gray-100 text-[#0a2540] hover:border-[#00ab00]/30'
                     }`}
                   >
                     <span className="text-sm font-black">{cat.label}</span>
                     {cat.amount > 0 && (
                        <span className={`text-xs font-black ${selectedCategory === cat.id ? 'text-white' : 'text-[#00ab00]'}`}>
                           {fmt(cat.amount)}
                        </span>
                     )}
                   </button>
                 ))}
              </div>
            </div>

            {selectedCategory === "custom" && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Custom Value (KES)</label>
                <input
                  type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="0.00"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm font-black text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Session Context (Notes)</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Briefly describe the violation context..."
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm font-black text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all resize-none"
              />
            </div>

            {selectedMember && selectedCategory && amount > 0 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-700 animate-in fade-in duration-300">
                 <Info size={16} className="mt-0.5 flex-shrink-0" />
                 <p className="text-[11px] font-bold leading-relaxed">
                    A penalty of <span className="font-black underline underline-offset-2">{fmt(amount)}</span> will be invoiced to the member. This will impact their internal credit score until settled.
                 </p>
              </div>
            )}

            <button 
              onClick={handleIssue} 
              disabled={issueFine.isPending}
              className={`w-full py-5 rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                 issueFine.isPending ? 'bg-gray-100 text-gray-400' : 'bg-[#0a2540] text-white hover:bg-[#0f3460] shadow-xl shadow-[#0a2540]/10'
              }`}
            >
              <AlertTriangle size={16} /> 
              {issueFine.isPending ? 'Recording Infraction...' : 'Commit Penalty Invoice'}
            </button>
          </div>
        </div>

        {/* Issued Fines Registry */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-black text-[#0a2540]">Registry of Infractions</h2>
             <span className="px-3 py-1 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-[#0a2540] rounded-lg border border-gray-100">
               {fines?.length || 0} Records
             </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar relative min-h-[200px]">
            {finesLoading && (
               <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
               </div>
            )}
            {fines?.length === 0 ? (
               <div className="py-20 text-center border-2 border-dashed border-gray-50 rounded-lg">
                  <p className="text-gray-300 font-bold italic text-sm">No infractions documented in the current cycle.</p>
               </div>
            ) : fines?.map(f => (
              <div key={f.id} className="p-5 bg-gray-50/50 rounded-lg border border-gray-50 group hover:border-gray-200 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${f.status === 'paid' ? 'bg-green-50 text-[#00ab00]' : 'bg-orange-50 text-orange-500'}`}>
                      <AlertTriangle size={18} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-[#0a2540]">{f.member_name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{f.rule_type.replace('_', ' ')}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-[#0a2540] mb-1">{fmt(f.amount)}</p>
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                     f.status === "paid" ? 'bg-green-50 text-[#00ab00] border-green-100' : 'bg-red-50 text-red-500 border-red-100'
                   }`}>
                     {f.status}
                   </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
             <div className="flex justify-between items-center px-4 py-4 bg-red-50 rounded-lg border border-red-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Total Uncollected Penalties</span>
                <span className="text-lg font-black text-red-600">
                   {fmt(fines?.filter(f => f.status === "pending").reduce((s, f) => s + Number(f.amount), 0) || 0)}
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
