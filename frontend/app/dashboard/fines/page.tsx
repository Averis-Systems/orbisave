"use client"

import { useState } from "react"
import { AlertTriangle, Plus, CheckCircle, XCircle } from "lucide-react"
import { MEMBERS } from "@/lib/demo-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()
const FINE_CATEGORIES = [
  { id: "absent", label: "Absent without apology",    amount: 500 },
  { id: "late",   label: "Late contribution",          amount: 200 },
  { id: "docs",   label: "Missing documentation",      amount: 300 },
  { id: "custom", label: "Custom fine",                amount: 0   },
]

const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
const avatarColors = ["#0a2540","#016828","#0f3460","#018a35"]
const avatarColor  = (name: string) => { let h = 0; for (const c of name) h = (h*31+c.charCodeAt(0))%avatarColors.length; return avatarColors[Math.abs(h)] }

const ISSUED_FINES = [
  { id: "F-001", member: "Esther Nyambura", category: "Absent without apology", amount: 500, date: "Oct 5, 2025", status: "unpaid" },
  { id: "F-002", member: "Peter Kamau",     category: "Late contribution",       amount: 200, date: "Oct 5, 2025", status: "unpaid" },
  { id: "F-003", member: "Caroline Muthoni",category: "Late contribution",       amount: 200, date: "Sep 5, 2025", status: "paid"   },
]

export default function FinesPage() {
  const [selectedMember, setSelectedMember] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [issued, setIssued] = useState(false)

  const category = FINE_CATEGORIES.find(c => c.id === selectedCategory)
  const amount = selectedCategory === "custom" ? Number(customAmount) : category?.amount ?? 0

  const handleIssue = () => {
    if (!selectedMember || !selectedCategory || amount <= 0) return
    setIssued(true)
    setTimeout(() => { setIssued(false); setSelectedMember(""); setSelectedCategory(""); setCustomAmount(""); setNotes("") }, 2000)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Fines & Penalties</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Issue and track member fines and penalty invoices</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Issue fine form */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} style={{ color: "#00ab00" }} /> Issue New Fine
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Select Member</label>
              <select
                value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }}
              >
                <option value="">— Choose member —</option>
                {MEMBERS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Fine Category</label>
              {FINE_CATEGORIES.map(cat => (
                <button
                  key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    marginBottom: 6, borderRadius: 8, cursor: "pointer", border: "1px solid",
                    borderColor: selectedCategory === cat.id ? "#00ab00" : "#e5e7eb",
                    background: selectedCategory === cat.id ? "#e9f3ed" : "#fff",
                    fontSize: 13, fontWeight: 500, color: "#0a2540",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{cat.label}</span>
                    {cat.amount > 0 && <span style={{ fontWeight: 700, color: "#00ab00" }}>{fmt(cat.amount)}</span>}
                  </div>
                </button>
              ))}
            </div>

            {selectedCategory === "custom" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Custom Amount (KES)</label>
                <input
                  type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="e.g. 1000"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Notes (optional)</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Add context for this fine..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
            </div>

            {selectedMember && selectedCategory && amount > 0 && (
              <div style={{ background: "#e9f3ed", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#016828" }}>
                Fine of <strong>{fmt(amount)}</strong> will be issued to <strong>{selectedMember}</strong> as an unpaid invoice on their dashboard.
              </div>
            )}

            <button onClick={handleIssue} style={{
              padding: "11px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
              background: issued ? "#e9f3ed" : "#00ab00", color: issued ? "#016828" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {issued ? <><CheckCircle size={14} /> Fine Issued!</> : <><AlertTriangle size={14} /> Issue Fine</>}
            </button>
          </div>
        </div>

        {/* Issued fines list */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 16 }}>Issued Fines</div>
          {ISSUED_FINES.map(f => (
            <div key={f.id} style={{ padding: "14px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0a2540" }}>{f.member}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{f.category} · {f.date} · {f.id}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0a2540" }}>{fmt(f.amount)}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: f.status === "paid" ? "#e9f3ed" : "#fff5f5",
                    color: f.status === "paid" ? "#016828" : "#e53e3e",
                  }}>{f.status === "paid" ? "Paid" : "Unpaid"}</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 0", borderTop: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#6b7280" }}>Total Outstanding Fines</span>
              <span style={{ fontWeight: 800, color: "#e53e3e" }}>{fmt(ISSUED_FINES.filter(f => f.status === "unpaid").reduce((s, f) => s + f.amount, 0))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
