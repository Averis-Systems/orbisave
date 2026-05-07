"use client"

import { useState } from "react"
import { RefreshCw, ArrowRight, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { ROTATION_SCHEDULE, MEMBERS, GROUP } from "@/lib/demo-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()
const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
const AVATAR_COLORS = ["#0a2540", "#016828", "#0f3460", "#018a35", "#014d1b"]
const avatarBg = (name: string) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length; return AVATAR_COLORS[Math.abs(h)] }

const FULL_SCHEDULE = [
  { position: 1,  member: "Grace Akinyi",    month: "Oct 2025", amount: 100000, status: "upcoming"  },
  { position: 2,  member: "David Omondi",    month: "Nov 2025", amount: 100000, status: "scheduled" },
  { position: 3,  member: "Faith Otieno",    month: "Dec 2025", amount: 100000, status: "scheduled" },
  { position: 4,  member: "James Mwangi",    month: "Jan 2026", amount: 100000, status: "scheduled" },
  { position: 5,  member: "Mary Wanjiku",    month: "Feb 2026", amount: 100000, status: "scheduled" },
  { position: 6,  member: "Ann Chebet",      month: "Mar 2026", amount: 100000, status: "scheduled" },
  { position: 7,  member: "John Kipchoge",   month: "Apr 2026", amount: 100000, status: "scheduled" },
  { position: 8,  member: "Peter Kamau",     month: "May 2026", amount: 100000, status: "scheduled" },
]

const COMPLETED_PAYOUTS = [
  { position: 8, member: "Charles Mutua",  date: "Sep 30, 2025", amount: 100000 },
  { position: 7, member: "Ann Chebet",     date: "Aug 31, 2025", amount: 100000 },
  { position: 6, member: "Peter Kamau",    date: "Jul 31, 2025", amount: 95000  },
  { position: 5, member: "Mary Wanjiku",   date: "Jun 30, 2025", amount: 100000 },
]

export default function RotationControlPage() {
  const [triggerConfirm, setTriggerConfirm] = useState(false)
  const [payoutTriggered, setPayoutTriggered] = useState(false)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Rotation Control</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Manage the payout cycle, reorder positions, and trigger disbursements</p>
      </div>

      {/* Status banner */}
      <div style={{
        background: "linear-gradient(135deg, #0a2540 0%, #0f3460 100%)",
        borderRadius: 14, padding: "24px 28px", marginBottom: 24, color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Current Cycle Status</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Month {GROUP.cycleMonth} of {GROUP.totalCycles}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Next: <strong>{GROUP.nextPayoutMember}</strong> · Due in {GROUP.nextPayoutDate}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 4 }}>Payout Amount</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{fmt(GROUP.nextPayoutAmount)}</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>Net after 3% fee: {fmt(GROUP.nextPayoutAmount * 0.97)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Full schedule table */}
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540" }}>Upcoming Schedule</div>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{FULL_SCHEDULE.length} remaining positions</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["#", "Member", "Payout Month", "Amount", "Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "left", borderBottom: "1px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FULL_SCHEDULE.map(r => (
                <tr key={r.position} style={{ borderBottom: "1px solid #f9f9f9", background: r.status === "upcoming" ? "#fafff9" : "#fff" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f9faf8"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = r.status === "upcoming" ? "#fafff9" : "#fff"}
                >
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: r.status === "upcoming" ? "#00ab00" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: r.status === "upcoming" ? "#fff" : "#9ca3af" }}>{r.position}</div>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg(r.member), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials(r.member)}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{r.member}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#6b7280" }}>{r.month}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#0a2540" }}>{fmt(r.amount)}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: r.status === "upcoming" ? "#e9f3ed" : "#f5f5f5", color: r.status === "upcoming" ? "#016828" : "#9ca3af" }}>
                      {r.status === "upcoming" ? "Next" : "Scheduled"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    {r.status === "upcoming" && (
                      <button onClick={() => setTriggerConfirm(true)} style={{ fontSize: 11, fontWeight: 700, color: "#00ab00", background: "#e9f3ed", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>
                        Trigger Payout
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Trigger payout */}
          <div style={{
            background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: triggerConfirm ? "1.5px solid #d6e4df" : "1px solid #f0f0f0",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2540", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={15} style={{ color: "#00ab00" }} /> Trigger Next Payout
            </div>
            {payoutTriggered ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircle size={36} style={{ color: "#00ab00", marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2540" }}>Payout Initiated!</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>KES 100,000 sent to {GROUP.nextPayoutMember} via M-Pesa</div>
              </div>
            ) : triggerConfirm ? (
              <div>
                <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "12px", marginBottom: 14, fontSize: 12, color: "#92400e" }}>
                  <div style={{ display: "flex", gap: 8 }}><AlertTriangle size={14} style={{ flexShrink: 0, color: "#d97706" }} />This will immediately disburse <strong>{fmt(GROUP.nextPayoutAmount)}</strong> to <strong>{GROUP.nextPayoutMember}</strong> via M-Pesa. This action cannot be undone.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPayoutTriggered(true)} style={{ flex: 1, padding: "9px", borderRadius: 7, background: "#00ab00", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirm & Disburse</button>
                  <button onClick={() => setTriggerConfirm(false)} style={{ flex: 1, padding: "9px", borderRadius: 7, background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                {[
                  { label: "Recipient",    val: GROUP.nextPayoutMember },
                  { label: "Gross Amount", val: fmt(GROUP.nextPayoutAmount) },
                  { label: "Platform Fee", val: "3% (KES 3,000)" },
                  { label: "Net to Member",val: fmt(GROUP.nextPayoutAmount * 0.97) },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ color: "#6b7280" }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: "#0a2540" }}>{r.val}</span>
                  </div>
                ))}
                <button onClick={() => setTriggerConfirm(true)} style={{ marginTop: 14, width: "100%", padding: "10px", borderRadius: 8, background: "#00ab00", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Initiate Payout
                </button>
              </div>
            )}
          </div>

          {/* Completed payouts */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2540", marginBottom: 14 }}>Completed Payouts</div>
            {COMPLETED_PAYOUTS.map(p => (
              <div key={p.position} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={14} style={{ color: "#00ab00", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0a2540" }}>{p.member}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{p.date}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#00ab00" }}>{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
