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

export default function MeetingsSettingsPage() {
  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Meetings Configuration</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Configure meeting schedules, quorum, and digital voting rules</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20 }}>Schedule & Quorum</div>

          <Field label="Meeting Frequency" value="Monthly" hint="Options: Weekly, Monthly, Quarterly" />
          <Field label="Default Meeting Day" value="Second Sunday" hint="e.g. 'Second Sunday', '15th', 'Last Friday'" />
          <Field label="Default Time" value="10:00 AM" type="time" />
          <Field label="Default Venue" value="Online — WhatsApp / Zoom" />
          <Field label="Notice Period (days)" value="7" type="number" hint="Days before meeting to send invitations" />
          <Field label="Quorum Threshold (%)" value="60" type="number" hint="Minimum % of members required for valid meeting" />
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20 }}>Digital Voting</div>

          <Toggle label="Enable in-app digital voting" checked={true} hint="Members vote on resolutions through the dashboard" />
          <Toggle label="Allow proxy voting" checked={false} hint="Members can authorize another to vote on their behalf" />
          <Toggle label="Require quorum before opening vote" checked={true} />
          <Toggle label="Show live vote results during meeting" checked={true} />
          <Toggle label="Send meeting minutes automatically" checked={true} hint="Minutes sent to all members after meeting closes" />
          <Toggle label="Record attendance automatically" checked={true} hint="Tracks who opened the meeting in-app" />
          <Toggle label="Allow agenda items from members" checked={false} hint="Members can submit topics for chairperson review" />

          <div style={{ marginTop: 24 }}>
            <Field label="Vote Validity Window (hours)" value="48" type="number" hint="How long a vote stays open for online members" />
          </div>

          <button onClick={handleSave} style={{
            marginTop: 8, width: "100%", padding: "12px", borderRadius: 8, border: "none",
            background: saved ? "#e9f3ed" : "#0a2540", color: saved ? "#016828" : "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Meeting Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
