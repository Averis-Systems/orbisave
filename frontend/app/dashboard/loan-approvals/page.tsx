"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Clock, CreditCard, AlertCircle } from "lucide-react"
import { LOANS, MEMBERS } from "@/lib/demo-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()

export default function LoanApprovalsPage() {
  const [approved, setApproved] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])

  const pending = LOANS.filter(l => l.status === "pending")
  const active  = LOANS.filter(l => l.status === "active")
  const repaid  = LOANS.filter(l => l.status === "repaid")

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Loan Approvals</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Review and approve member loan requests</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Pending Review", value: pending.length, color: "#d97706", bg: "#fefce8" },
          { label: "Active Loans",   value: active.length,  color: "#00ab00", bg: "#e9f3ed" },
          { label: "Repaid",         value: repaid.length,  color: "#6b7280", bg: "#f9fafb" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pending loans */}
      {pending.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} style={{ color: "#d97706" }} /> Pending Approval
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map(loan => {
              const isApproved = approved.includes(loan.id)
              const isRejected = rejected.includes(loan.id)
              return (
                <div key={loan.id} style={{
                  border: `1px solid ${isApproved ? "#d6e4df" : isRejected ? "#fee2e2" : "#f0f0f0"}`,
                  borderRadius: 10, padding: "16px 18px",
                  background: isApproved ? "#e9f3ed" : isRejected ? "#fff5f5" : "#fafafa",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540" }}>{loan.member}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{loan.purpose} · {loan.id} · Requested {loan.requested}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#0a2540" }}>{fmt(loan.amount)}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{loan.term} · {loan.interest}% interest</div>
                    </div>
                  </div>
                  {(loan as any).collateral && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Collateral: {(loan as any).collateral}</div>
                  )}
                  {!isApproved && !isRejected ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setApproved(a => [...a, loan.id])} style={{
                        flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 13, fontWeight: 700,
                        background: "#00ab00", color: "#fff", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => setRejected(r => [...r, loan.id])} style={{
                        flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 13, fontWeight: 700,
                        background: "#fff", color: "#e53e3e", border: "1px solid #e53e3e", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                        <XCircle size={14} /> Decline
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 700, color: isApproved ? "#00ab00" : "#e53e3e" }}>
                      {isApproved ? "✓ Approved — awaiting treasurer co-sign" : "✗ Declined"}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active loans */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <CreditCard size={16} style={{ color: "#00ab00" }} /> Active Loans
        </div>
        {active.map(loan => {
          const repaidPct = Math.round(((loan as any).repaid / loan.amount) * 100)
          return (
            <div key={loan.id} style={{ padding: "14px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0a2540" }}>{loan.member}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{loan.purpose} · Due {(loan as any).due}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0a2540" }}>{fmt(loan.amount)}</div>
                  <div style={{ fontSize: 11, color: "#00ab00" }}>{fmt((loan as any).repaid)} repaid</div>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "#00ab00", width: `${repaidPct}%` }} />
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{repaidPct}% repaid</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
