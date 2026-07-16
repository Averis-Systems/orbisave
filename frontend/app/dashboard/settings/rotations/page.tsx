"use client"

import { useState } from "react"
import { Save, CheckCircle, RefreshCw, Layers, ChevronLeft, Smartphone, Lock } from "lucide-react"
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

export default function RotationSettingsPage() {
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
             <h1 className="text-3xl font-black text-[#0a2540]">Rotation Payout Rules</h1>
          </div>
          <p className="text-gray-500 font-bold">Configure sequencing rules, disbursement triggers, and position governance.</p>
        </div>
        <button 
          onClick={handleSave} 
          className={`flex items-center gap-2 px-8 py-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
            saved ? 'bg-green-50 text-[#00ab00] border border-green-100' : 'bg-[#0a2540] text-white hover:bg-[#0f3460]'
          }`}
        >
          {saved ? <><CheckCircle size={16} /> Rules Saved</> : <><Save size={16} /> Update Sequence</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Sequence Mechanics */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-lg bg-[#00ab00]/10 flex items-center justify-center text-[#00ab00] border border-[#00ab00]/20 shadow-sm">
                <RefreshCw size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[#0a2540]">Disbursement Logic</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cycles & Settlement</p>
             </div>
          </div>

          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Payout Frequency" value="Monthly" />
                <Field label="Settlement Day" value="Last Day" hint="cycle boundary" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Individual Payout" value="100000" type="number" />
                <Field label="Platform Utility Fee (%)" value="3" type="number" />
             </div>
             <Field label="Total Rotation Horizon (Months)" value="20" type="number" />

             <div className="pt-6 border-t border-gray-50 space-y-2">
                <Toggle label="Accelerated Payouts" checked={false} hint="Allow members to request sequence advancement." />
                <Toggle label="Quorum Interlock" checked={true} hint="Prevent payout trigger without valid meeting quorum." />
                <Toggle label="Automated M-Pesa STK" checked={true} hint="Initiate instant push to recipient wallet." />
                <Toggle label="Global Transparency" checked={true} hint="Broadcast disbursement status to all participants." />
             </div>
          </div>
        </div>

        {/* Position Management */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-lg bg-[#e9f3ed] flex items-center justify-center text-[#00ab00] border border-[#bfe8c4] shadow-sm">
                <Layers size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[#0a2540]">Position Governance</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Queue Management</p>
             </div>
          </div>

          <div className="space-y-6 flex-1">
             <div className="p-5 bg-[#00ab00]/5 rounded-lg border border-[#00ab00]/10 flex items-start gap-4 mb-4">
                <Lock size={16} className="text-[#00ab00] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] font-bold text-[#016828] leading-relaxed">
                   The rotation matrix is currently <span className="font-black uppercase">Immutable</span>. Sequencing changes can only be initiated during the next governance session.
                </p>
             </div>

             <Field label="Assignment Method" value="Chronological Entry" hint="Options: Draw, Manual, Chronological." />
             <Field label="Skipped Payout Rule" value="Append to End" hint="Action on skipped or non-compliant cycles." />
             
             <div className="pt-6 border-t border-gray-50 space-y-2">
                <Toggle label="Swap Authorization" checked={true} hint="Allow peer-to-peer sequence exchanges." />
                <Toggle label="Positional Freeze" checked={true} hint="Auto-lock sequence once cycle execution starts." />
                <Toggle label="Proactive Alerts" checked={true} hint="7-day maturity countdown notification." />
             </div>
          </div>

          {/* Compliance Banner */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
             <Smartphone size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
             <p className="text-[10px] font-bold text-gray-400 leading-relaxed">
                Mobile money disbursements are subject to regional carrier limits. Recipient identity must match KYC documentation for automated payout success.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
