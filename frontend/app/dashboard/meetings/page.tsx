"use client"

import { useState } from "react"
import { Calendar, Users, CheckCircle, Clock, FileText, Video, Plus } from "lucide-react"
import { MEETINGS } from "@/lib/demo-data"

export default function MeetingsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const upcoming = MEETINGS.filter(m => m.status === "upcoming")
  const past = MEETINGS.filter(m => m.status === "completed")
  const shown = tab === "upcoming" ? upcoming : past

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Meetings</h1>
          <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Chama meeting schedule and agenda</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
          background: "#00ab00", color: "#fff", border: "none", borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={15} /> Schedule Meeting
        </button>
      </div>

      {/* Next meeting highlight */}
      {upcoming[0] && (
        <div style={{
          background: "linear-gradient(135deg, #0a2540 0%, #0f3460 100%)",
          borderRadius: 14, padding: "24px 28px", marginBottom: 24, color: "#fff",
        }}>
          <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Next Meeting</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Monthly Chama Meeting</div>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 16 }}>
            <Calendar size={13} style={{ display: "inline", marginRight: 6 }} />
            {upcoming[0].date} · {upcoming[0].time}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agenda ({upcoming[0].agenda.length} items)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {upcoming[0].agenda.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#fff", borderRadius: 10, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {(["upcoming", "past"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
            background: tab === t ? "#00ab00" : "transparent",
            color: tab === t ? "#fff" : "#6b7280",
          }}>{t === "upcoming" ? "Upcoming" : "Past Meetings"}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.map(m => (
          <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "2px 8px", borderRadius: 99,
                    background: m.type === "emergency" ? "#fff5f5" : "#e9f3ed",
                    color: m.type === "emergency" ? "#e53e3e" : "#016828",
                  }}>{m.type}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "2px 8px", borderRadius: 99,
                    background: m.status === "upcoming" ? "#fefce8" : "#f0f0f0",
                    color: m.status === "upcoming" ? "#d97706" : "#6b7280",
                  }}>{m.status}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540" }}>Monthly Chama Meeting</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{m.date} · {m.time} · {m.id}</div>
              </div>
              {m.attendance && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#00ab00" }}>{m.attendance}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>attended</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {m.agenda.length} Agenda Items
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {m.agenda.map((a, i) => (
                <span key={i} style={{ fontSize: 12, color: "#4a5c6a", background: "#f7f9f8", padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb" }}>{a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
