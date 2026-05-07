"use client"

import { useState } from "react"
import { Save, CheckCircle } from "lucide-react"

function Field({ label, value, type = "text", hint }: { label: string; value: string; type?: string; hint?: string }) {
  const [val, setVal] = useState(value)
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={val} onChange={e => setVal(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }}
        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = "#00ab00"}
        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"}
      />
      {hint && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Toggle({ label, checked, hint }: { label: string; checked: boolean; hint?: string }) {
  const [on, setOn] = useState(checked)
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{hint}</div>}
      </div>
      <button onClick={() => setOn(!on)} style={{
        width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", position: "relative",
        background: on ? "#00ab00" : "#d1d5db", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  )
}

export default function RotationSettingsPage() {
  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Rotation Settings</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Configure payout cycle rules and schedule options</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20 }}>Payout Configuration</div>
          <Field label="Payout Frequency" value="Monthly" />
          <Field label="Payout Day of Month" value="Last day" hint="e.g. '30', 'Last day', or a specific date" />
          <Field label="Payout Amount Per Member" value="100000" type="number" hint="KES — based on group pool size" />
          <Field label="Platform Fee (%)" value="3" type="number" hint="Deducted from payout before disbursement" />
          <Field label="Total Cycle Length (months)" value="20" type="number" />

          <div style={{ fontSize: 13, fontWeight: 700, color: "#0a2540", marginBottom: 12, marginTop: 8 }}>Payout Rules</div>
          <Toggle label="Allow early payout requests" checked={false} hint="Members can request to move their payout date earlier" />
          <Toggle label="Require quorum before triggering payout" checked={true} hint="Minimum 60% member attendance required" />
          <Toggle label="Send M-Pesa STK push to recipient" checked={true} hint="Automatic mobile money disbursement" />
          <Toggle label="Send payout notification to all members" checked={true} />
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20 }}>Position Management</div>
          <div style={{ background: "#e9f3ed", borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 12, color: "#016828" }}>
            The rotation order is currently locked. You can change positions during the next meeting approval cycle.
          </div>
          <Field label="Position Assignment Method" value="First come, first served" hint="Options: First come first served, Draw/Lottery, Manual" />
          <Field label="Skip Policy" value="Reschedule to end" hint="What happens when a member is skipped" />
          <Toggle label="Allow members to swap positions" checked={true} hint="With chairperson approval" />
          <Toggle label="Lock positions after cycle starts" checked={true} hint="Prevents unauthorized reordering" />
          <Toggle label="Notify member 7 days before payout" checked={true} />

          <button onClick={handleSave} style={{
            marginTop: 24, width: "100%", padding: "12px", borderRadius: 8, border: "none",
            background: saved ? "#e9f3ed" : "#0a2540", color: saved ? "#016828" : "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Rotation Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
