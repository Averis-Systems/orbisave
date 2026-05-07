"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, MoreVertical, Phone, CheckCircle, XCircle, ChevronDown, Send, UserCheck } from "lucide-react"
import { MEMBERS, G } from "@/lib/demo-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()
const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
const avatarColors = ["#0a2540","#016828","#0f3460","#018a35","#014d1b","#026632"]
const avatarColor = (name: string) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % avatarColors.length; return avatarColors[Math.abs(h)] }

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: avatarColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>{initials(name)}</div>
  )
}

export default function MembersPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<number | null>(null)

  const filtered = MEMBERS.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === "all" ? true :
      filter === "unpaid" ? !m.paid :
      filter === "loans" ? m.loanActive : true
    return matchSearch && matchFilter
  })

  const selectedMember = selected ? MEMBERS.find(m => m.id === selected) : null

  const stats = [
    { label: "Total",     v: MEMBERS.length,                                         c: "#0a2540" },
    { label: "Active",    v: MEMBERS.filter(m => m.status === "active").length,      c: "#00ab00" },
    { label: "Paid",      v: MEMBERS.filter(m => m.paid).length,                     c: "#00ab00" },
    { label: "Unpaid",    v: MEMBERS.filter(m => !m.paid && m.status === "active").length, c: "#e53e3e" },
    { label: "KYC Pending",v: MEMBERS.filter(m => m.kyc === "pending").length,       c: "#d97706" },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Members</h1>
          <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Manage your chama membership and contributions</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
          background: "#00ab00", color: "#fff", border: "none", borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={15} /> Invite Member
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedMember ? "1fr 320px" : "1fr", gap: 16 }}>
        {/* Main table */}
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search members..."
                style={{ width: "100%", paddingLeft: 34, paddingRight: 10, height: 36, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {(["all", "unpaid", "loans"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: filter === f ? "#0a2540" : "#f5f5f5",
                color: filter === f ? "#fff" : "#6b7280", border: "none",
              }}>{f === "all" ? "All" : f === "unpaid" ? "Unpaid" : "Has Loan"}</button>
            ))}
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
            {stats.map(s => (
              <div key={s.label} style={{ flex: 1, padding: "10px 16px", textAlign: "center", borderRight: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Member", "Phone", "Status", "Oct 2025", "Contributions", "Rotation", "KYC", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "left", borderBottom: "1px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(mem => (
                <tr
                  key={mem.id}
                  onClick={() => setSelected(selected === mem.id ? null : mem.id)}
                  style={{ cursor: "pointer", background: selected === mem.id ? "#e9f3ed" : "#fff", borderBottom: "1px solid #f9f9f9" }}
                  onMouseEnter={e => { if (selected !== mem.id)(e.currentTarget as HTMLElement).style.background = "#f9faf8" }}
                  onMouseLeave={e => { if (selected !== mem.id)(e.currentTarget as HTMLElement).style.background = "#fff" }}
                >
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={mem.name} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{mem.name}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>
                          {(mem as any).isChair && "Chair · "}{(mem as any).isTreasurer && "Treasurer · "}{(mem as any).isSecretary && "Secretary · "}#{mem.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#6b7280" }}>{mem.phone}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: mem.status === "active" ? "#e9f3ed" : "#fff5f5",
                      color: mem.status === "active" ? "#016828" : "#e53e3e",
                    }}>{mem.status}</span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: mem.paid ? "#00ab00" : "#e53e3e" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: mem.paid ? "#00ab00" : "#e53e3e" }}>{mem.paid ? "Paid" : "Unpaid"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ fontSize: 12, color: "#0a2540" }}>{mem.contributions}/9</div>
                    {mem.missed > 0 && <div style={{ fontSize: 10, color: "#e53e3e" }}>{mem.missed} missed</div>}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#6b7280" }}>#{mem.rotation}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                      background: mem.kyc === "verified" ? "#e9f3ed" : "#fefce8",
                      color: mem.kyc === "verified" ? "#016828" : "#d97706",
                    }}>{mem.kyc === "verified" ? "Verified" : "Pending"}</span>
                  </td>
                  <td style={{ padding: "10px 16px" }}><MoreVertical size={14} color="#9ca3af" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selectedMember && (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 24, overflowY: "auto", maxHeight: 680 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Avatar name={selectedMember.name} size={56} />
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0a2540", marginTop: 10 }}>{selectedMember.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{selectedMember.phone}</div>
              {((selectedMember as any).isChair || (selectedMember as any).isTreasurer || (selectedMember as any).isSecretary) && (
                <span style={{ fontSize: 11, fontWeight: 700, background: "#00ab00", color: "#fff", padding: "2px 10px", borderRadius: 99, marginTop: 6, display: "inline-block" }}>
                  {(selectedMember as any).isChair ? "Chairperson" : (selectedMember as any).isTreasurer ? "Treasurer" : "Secretary"}
                </span>
              )}
            </div>

            {[
              { label: "Member ID", val: `#${selectedMember.id}` },
              { label: "Join Date", val: selectedMember.joinDate },
              { label: "KYC Status", val: selectedMember.kyc },
              { label: "Rotation #", val: `#${selectedMember.rotation}` },
              { label: "Status", val: selectedMember.status },
              { label: "Contributions", val: `${selectedMember.contributions}/9 months` },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: "#0a2540" }}>{r.val}</span>
              </div>
            ))}

            <div style={{ marginTop: 16, marginBottom: 8, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment History</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} style={{
                  width: 30, height: 30, borderRadius: 6, fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < selectedMember.contributions ? "#00ab00" : "#f0f0f0",
                  color: i < selectedMember.contributions ? "#fff" : "#bbb",
                }}>M{i + 1}</div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <button style={{ width: "100%", padding: "9px", borderRadius: 8, background: "#00ab00", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Send size={13} /> Send Reminder
              </button>
              {selectedMember.status === "inactive" && (
                <button style={{ width: "100%", padding: "9px", borderRadius: 8, background: "#fff", color: "#e53e3e", border: "1px solid #e53e3e", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Remove Member
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
