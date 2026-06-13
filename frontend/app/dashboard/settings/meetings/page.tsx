"use client"

import { useState } from "react"
import { Save, CheckCircle, Calendar, Vote, ShieldCheck, Info, ChevronLeft, Settings2, Clock } from "lucide-react"
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

export default function MeetingsSettingsPage() {
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
             <h1 className="text-3xl font-black text-[#0a2540]">Governance Protocols</h1>
          </div>
          <p className="text-gray-500 font-bold">Configure meeting frequency, consensus thresholds, and voting logic.</p>
        </div>
        <button 
          onClick={handleSave} 
          className={`flex items-center gap-2 px-8 py-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
            saved ? 'bg-green-50 text-[#00ab00] border border-green-100' : 'bg-[#0a2540] text-white shadow-xl shadow-[#0a2540]/10 hover:bg-[#0f3460]'
          }`}
        >
          {saved ? <><CheckCircle size={16} /> Governance Committed</> : <><Save size={16} /> Update Protocol</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Schedule & Cadence */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                <Calendar size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[#0a2540]">Session Cadence</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scheduling & Quorum</p>
             </div>
          </div>

          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Meeting Frequency" value="Monthly" hint="cadence level" />
                <Field label="Standard Recurrence" value="Second Sunday" hint="day of cycle" />
             </div>
             <div className="grid grid-cols-2 gap-6">
                <Field label="Execution Time" value="10:00 AM" type="time" />
                <Field label="Notice Window (Days)" value="7" type="number" />
             </div>
             <Field label="Primary Virtual Venue" value="WhatsApp / Zoom / OrbiMeet" />
             <Field label="Consensus Quorum (%)" value="60" type="number" hint="Min attendance for resolution validity." />
          </div>
        </div>

        {/* Digital Voting Logic */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-lg bg-[#00ab00]/10 flex items-center justify-center text-[#00ab00] border border-[#00ab00]/20 shadow-sm">
                <Vote size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[#0a2540]">Consensus Logic</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Digital Voting & Minutes</p>
             </div>
          </div>

          <div className="space-y-6 flex-1">
             <Toggle label="App-Native Voting" checked={true} hint="Authorized resolution voting within dashboard." />
             <Toggle label="Proxy Delegation" checked={false} hint="Allow members to assign voting weight to others." />
             <Toggle label="Quorum Interlock" checked={true} hint="Prevent voting if quorum threshold isn't met." />
             <Toggle label="Real-time Analytics" checked={true} hint="Display live vote progression to participants." />
             
             <div className="pt-6 border-t border-gray-50 space-y-4">
                <Field label="Ballot Validity (Hours)" value="48" type="number" hint="Window for asynchronous remote voting." />
                <div className="space-y-2">
                   <Toggle label="Automated Minutes" checked={true} hint="Auto-distribute minutes via PDF after adjournment." />
                   <Toggle label="Presence Tracking" checked={true} hint="Auto-record attendance based on session entry." />
                </div>
             </div>
          </div>

          {/* Compliance Banner */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
             <ShieldCheck size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
             <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                All digital votes are cryptographically signed and stored in the group archive for auditability. High-impact resolutions (bylaw changes) require 75% consensus.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
