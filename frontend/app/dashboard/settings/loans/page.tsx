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
        style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
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

export default function LoanSettingsPage() {
  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Group Loan Settings</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Configure the group loan pool, interest, eligibility and repayment rules</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 6 }}>Loan Pool</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>Current balance: <strong>KES 45,000</strong></div>

          <Toggle label="Enable Loan Pool" checked={true} hint="Allow members to request loans from the group" />
          <Toggle label="Require both Chair & Treasurer approval" checked={true} hint="Dual sign-off before disbursement" />

          <div style={{ marginTop: 20 }}>
            <Field label="Pool Contribution Rate" value="10" type="number" hint="% of each member's monthly contribution added to loan pool" />
            <Field label="Maximum Loan Amount (% of pool)" value="30" type="number" hint="Maximum a single member can borrow" />
            <Field label="Interest Rate (%)" value="10" type="number" hint="Flat interest charged on loan principal" />
            <Field label="Maximum Repayment Term (months)" value="3" type="number" />
            <Field label="Loan Processing Period (days)" value="3" type="number" hint="Days from approval to disbursement" />
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20 }}>Eligibility & Penalties</div>

          <Field label="Minimum Months Before Eligible" value="3" type="number" hint="Member must have contributed for at least N months" />
          <Field label="Maximum Active Loans Per Member" value="1" type="number" />
          <Field label="Late Repayment Penalty (%)" value="5" type="number" hint="% added per month of late repayment" />
          <Field label="Default After (months)" value="2" type="number" hint="Loan declared default after N months of non-payment" />

          <div style={{ marginTop: 8 }}>
            <Toggle label="Allow members to see loan pool balance" checked={true} />
            <Toggle label="Notify members when loan is approved" checked={true} />
            <Toggle label="Notify all members of new loan disbursements" checked={false} hint="Privacy — off by default" />
            <Toggle label="Block future loan requests if loan defaulted" checked={true} />
          </div>

          <button onClick={handleSave} style={{
            marginTop: 24, width: "100%", padding: "12px", borderRadius: 8, border: "none",
            background: saved ? "#e9f3ed" : "#0a2540", color: saved ? "#016828" : "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Loan Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
