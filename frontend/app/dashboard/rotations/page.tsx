"use client"

import { useRouter } from "next/navigation"
import { CheckCircle, Clock, Calendar, AlertCircle } from "lucide-react"
import { ROTATION_SCHEDULE, GROUP } from "@/lib/demo-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()
const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
const avatarColors = ["#0a2540","#016828","#0f3460","#018a35"]
const avatarColor = (name: string) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % avatarColors.length; return avatarColors[Math.abs(h)] }

const completedPayouts = [
  { pos: 8, member: "Charles Mutua",  date: "Sep 30, 2025", amount: 100000 },
  { pos: 7, member: "Ann Chebet",     date: "Aug 31, 2025", amount: 100000 },
  { pos: 6, member: "Peter Kamau",    date: "Jul 31, 2025", amount: 95000  },
  { pos: 5, member: "Mary Wanjiku",   date: "Jun 30, 2025", amount: 100000 },
  { pos: 4, member: "John Kipchoge",  date: "May 31, 2025", amount: 90000  },
]

export default function RotationsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Rotations</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Monthly payout cycle schedule and history</p>
      </div>

      {/* Next payout hero */}
      <div style={{
        background: "linear-gradient(135deg, #0a2540 0%, #0f3460 100%)",
        borderRadius: 14, padding: "28px 32px", marginBottom: 24, color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Next Payout · Rotation #9</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em" }}>{GROUP.nextPayoutMember}</div>
          <div style={{ fontSize: 14, opacity: 0.75, marginTop: 4 }}>Due in {GROUP.nextPayoutDate} · {GROUP.cycleMonth} of {GROUP.totalCycles} cycles</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{fmt(GROUP.nextPayoutAmount)}</div>
          <div style={{ fontSize: 13, opacity: 0.65 }}>Gross · 3% platform fee</div>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>Net: {fmt(GROUP.nextPayoutAmount * 0.97)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Upcoming schedule */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 16 }}>Upcoming Schedule</div>
          {ROTATION_SCHEDULE.map(r => (
            <div key={r.position} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              borderRadius: 10, marginBottom: 6,
              background: r.status === "upcoming" ? "#e9f3ed" : "#fafafa",
              border: r.status === "upcoming" ? "1.5px solid #d6e4df" : "1px solid #f0f0f0",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: r.status === "upcoming" ? "#00ab00" : "#e5e7eb",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: r.status === "upcoming" ? "#fff" : "#9ca3af",
              }}>{r.position}</div>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: avatarColor(r.member),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>{initials(r.member)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{r.member}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.month}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.status === "upcoming" ? "#00ab00" : "#9ca3af" }}>{fmt(r.amount)}</div>
                {r.status === "upcoming" && <span style={{ fontSize: 10, fontWeight: 700, color: "#00ab00", background: "#e9f3ed", padding: "1px 6px", borderRadius: 99 }}>NEXT</span>}
              </div>
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#9ca3af" }}>+12 more · Full cycle ends Dec 2026</div>
        </div>

        {/* Completed payouts */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 16 }}>Completed Payouts</div>
          {completedPayouts.map(p => (
            <div key={p.pos} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={16} style={{ color: "#00ab00", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{p.member}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Rotation #{p.pos} · {p.date}</div>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#00ab00" }}>{fmt(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
