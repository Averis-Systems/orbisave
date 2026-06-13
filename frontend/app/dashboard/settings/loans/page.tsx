"use client"

import { useState } from "react"
import { Save, CheckCircle, ShieldCheck, PieChart, AlertCircle, Info, ChevronLeft, Settings2 } from "lucide-react"
import Link from "next/link"

function Field({ label, value, type = "text", hint }: { label: string; value: string; type?: string; hint?: string }) {
  const [val, setVal] = useState(value)
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">{label}</label>
      <input
        type={type} value={val} onChange={e => setVal(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm font-black text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all"
      />
      {hint && <p className="text-[10px] font-bold text-gray-400 italic">{hint}</p>}
    </div>
  )
}

function Toggle({ label, checked, hint }: { label: string; checked: boolean; hint?: string }) {
  const [on, setOn] = useState(checked)
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
      <div className="pr-4">
        <p className="text-sm font-black text-[#0a2540]">{label}</p>
        {hint && <p className="text-[10px] font-bold text-gray-400 mt-1">{hint}</p>}
      </div>
      <button 
        onClick={() => setOn(!on)} 
        className={`w-12 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0 ${on ? 'bg-[#00ab00]' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${on ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}

export default function LoanSettingsPage() {
  const [saved, setSaved] = useState(false)
  const handleSave = () => { 
    setSaved(true)
    setTimeout(() => setSaved(false), 2000) 
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <Link href="/dashboard/settings" className="text-gray-400 hover:text-[#00ab00] transition-colors">
                <ChevronLeft size={16} />
             </Link>
             <h1 className="text-3xl font-black text-[#0a2540]">Liquidity Pool Protocol</h1>
          </div>
          <p className="text-gray-500 font-bold">Configure internal lending rules, interest yields, and risk parameters.</p>
        </div>
        <button 
          onClick={handleSave} 
          className={`flex items-center gap-2 px-8 py-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
            saved ? 'bg-green-50 text-[#00ab00] border border-green-100' : 'bg-[#0a2540] text-white shadow-xl shadow-[#0a2540]/10 hover:bg-[#0f3460]'
          }`}
        >
          {saved ? <><CheckCircle size={16} /> Strategy Committed</> : <><Save size={16} /> Update Protocol</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Core Mechanics */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#00ab00] border border-green-100 shadow-sm">
                <PieChart size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[#0a2540]">Yield Mechanics</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Available Capital: <span className="text-[#00ab00]">KES 45,000</span></p>
             </div>
          </div>

          <div className="space-y-6">
             <Toggle label="Enable Liquidity Pool" checked={true} hint="Authorize members to draw from the collective pool." />
             <Toggle label="Multi-Sig Authorization" checked={true} hint="Require digital signatures from both Chair & Treasurer." />

             <div className="pt-6 grid grid-cols-1 gap-6 border-t border-gray-50">
                <Field label="Portfolio Allocation Rate" value="10" type="number" hint="% of monthly contributions diverted to the loan pool." />
                <Field label="Exposure Limit (% of pool)" value="30" type="number" hint="Maximum principal allowed per individual participant." />
                <Field label="Target Yield (Interest %)" value="10" type="number" hint="Standard flat interest rate applied to principal." />
                <div className="grid grid-cols-2 gap-4">
                   <Field label="Max Maturity (Weeks)" value="12" type="number" />
                   <Field label="Processing Lag (Days)" value="3" type="number" />
                </div>
             </div>
          </div>
        </div>

        {/* Governance & Risk */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 shadow-sm">
                <ShieldCheck size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[#0a2540]">Risk Governance</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Eligibility & Default Protections</p>
             </div>
          </div>

          <div className="space-y-6 flex-1">
             <Field label="Vesting Period (Months)" value="3" type="number" hint="Minimum membership duration before credit eligibility." />
             <Field label="Active Asset Cap" value="1" type="number" hint="Max simultaneous active loans allowed per member." />
             
             <div className="grid grid-cols-2 gap-4">
                <Field label="Arrears Penalty (%)" value="5" type="number" />
                <Field label="Default Threshold (Days)" value="60" type="number" />
             </div>

             <div className="pt-6 border-t border-gray-50 space-y-2">
                <Toggle label="Transparency Mode" checked={true} hint="Allow all members to view total pool liquidity." />
                <Toggle label="Approval Alerts" checked={true} hint="Push notifications on disbursement authorization." />
                <Toggle label="Anonymized Activity" checked={false} hint="Mask borrower identities in general group feed." />
                <Toggle label="Default Interdiction" checked={true} hint="Auto-block participants with unsettled defaults." />
             </div>
          </div>

          {/* Warning Banner */}
          <div className="mt-8 p-4 bg-orange-50 rounded-lg border border-orange-100 flex items-start gap-3">
             <AlertCircle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
             <p className="text-[10px] font-bold text-orange-800 leading-relaxed">
                Modification of yield parameters during an active cycle may affect existing amortization schedules. Ensure all members are notified of protocol shifts.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
