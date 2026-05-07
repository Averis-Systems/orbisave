"use client"

import { useState } from "react"
import { Download, BarChart2, Users, CreditCard } from "lucide-react"
import { MEMBERS, CONTRIBUTIONS_HISTORY } from "@/lib/demo-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()

const MONTHS = ["Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"]

// Build matrix: member × month
const buildMatrix = () =>
  MEMBERS.map(m => ({
    name: m.name,
    data: MONTHS.map((_, i) => (i < m.contributions ? 5000 : 0)),
    total: m.contributions * 5000,
  }))

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"deposits" | "cashflow" | "loans">("deposits")
  const matrix = buildMatrix()

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Group Reports</h1>
          <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Financial summaries and export statements</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
          background: "#0a2540", color: "#fff", border: "none", borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          <Download size={14} /> Export Excel
        </button>
      </div>

      {/* Report type selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { id: "deposits",  label: "Member Deposits",  Icon: Users     },
          { id: "cashflow",  label: "Cash Flow",         Icon: BarChart2 },
          { id: "loans",     label: "Loan Summary",      Icon: CreditCard},
        ].map(r => (
          <button key={r.id} onClick={() => setReportType(r.id as any)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: reportType === r.id ? "#00ab00" : "#fff",
            color: reportType === r.id ? "#fff" : "#6b7280",
            border: `1px solid ${reportType === r.id ? "#00ab00" : "#e5e7eb"}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <r.Icon size={14} /> {r.label}
          </button>
        ))}
      </div>

      {/* Member Deposits Matrix */}
      {reportType === "deposits" && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540" }}>Member Deposit Matrix — 2025</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Monthly contribution status per member · KES 5,000 per month</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ padding: "10px 20px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "left", borderBottom: "1px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", minWidth: 160 }}>Member</th>
                  {MONTHS.map(m => (
                    <th key={m} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "center", borderBottom: "1px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.04em" }}>{m}</th>
                  ))}
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "right", borderBottom: "1px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => (
                  <tr key={row.name} style={{ borderBottom: "1px solid #f9f9f9" }}>
                    <td style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#0a2540", whiteSpace: "nowrap" }}>{row.name}</td>
                    {row.data.map((val, i) => (
                      <td key={i} style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, margin: "0 auto",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: val > 0 ? "#e9f3ed" : "#f9fafb",
                          fontSize: 11, fontWeight: 700,
                          color: val > 0 ? "#016828" : "#d1d5db",
                        }}>
                          {val > 0 ? "✓" : "—"}
                        </div>
                      </td>
                    ))}
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 800, color: "#00ab00", textAlign: "right" }}>{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f7f9f8" }}>
                  <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 800, color: "#0a2540" }}>Monthly Total</td>
                  {MONTHS.map((_, i) => {
                    const total = matrix.reduce((s, r) => s + r.data[i], 0)
                    return (
                      <td key={i} style={{ padding: "12px 12px", fontSize: 12, fontWeight: 700, color: "#0a2540", textAlign: "center" }}>
                        {fmt(total).replace("KES ", "")}
                      </td>
                    )
                  })}
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#0a2540", textAlign: "right" }}>
                    {fmt(matrix.reduce((s, r) => s + r.total, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Cash Flow */}
      {reportType === "cashflow" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 16 }}>Cash Flow Summary — 2025</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Month", "Contributions", "Payouts", "Loans Out", "Repayments", "Net"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: h === "Month" ? "left" : "right", borderBottom: "1px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONTRIBUTIONS_HISTORY.map(h => {
                const payout = h.month === "Sep" ? 100000 : 0
                const loanOut = h.month === "Oct" ? 8000 : 0
                const repay = h.month === "Oct" ? 3200 : 0
                const net = h.collected - payout - loanOut + repay
                return (
                  <tr key={h.month} style={{ borderBottom: "1px solid #f9f9f9" }}>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{h.month} 2025</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", color: "#00ab00", fontWeight: 600 }}>{fmt(h.collected)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", color: payout ? "#e53e3e" : "#9ca3af" }}>{payout ? fmt(payout) : "—"}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", color: loanOut ? "#e53e3e" : "#9ca3af" }}>{loanOut ? fmt(loanOut) : "—"}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", color: repay ? "#00ab00" : "#9ca3af" }}>{repay ? fmt(repay) : "—"}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", fontWeight: 800, color: net >= 0 ? "#00ab00" : "#e53e3e" }}>{fmt(Math.abs(net))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Loan Summary */}
      {reportType === "loans" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 16 }}>Loan Report</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Disbursed", val: "KES 23,000", color: "#0a2540" },
              { label: "Total Repaid",    val: "KES 15,200", color: "#00ab00" },
              { label: "Outstanding",     val: "KES 7,800",  color: "#e53e3e" },
            ].map(s => (
              <div key={s.label} style={{ background: "#f7f9f8", borderRadius: 10, padding: "16px" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["ID", "Member", "Amount", "Purpose", "Term", "Status", "Repaid"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "left", borderBottom: "1px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: "LN-001", member: "James Mwangi",    amount: 15000, purpose: "Fertilizer", term: "3 months", status: "pending", repaid: 0 },
                { id: "LN-002", member: "John Kipchoge",   amount: 8000,  purpose: "Medical",     term: "2 months", status: "active",  repaid: 3200 },
                { id: "LN-003", member: "Mary Wanjiku",    amount: 12000, purpose: "School fees", term: "2 months", status: "repaid",  repaid: 12000 },
                { id: "LN-004", member: "Esther Nyambura", amount: 5000,  purpose: "Business",    term: "1 month",  status: "pending", repaid: 0 },
              ].map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f9f9f9" }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>{l.id}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{l.member}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#0a2540" }}>{fmt(l.amount)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>{l.purpose}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>{l.term}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: l.status === "repaid" ? "#e9f3ed" : l.status === "active" ? "#e9f3ed" : "#fefce8",
                      color: l.status === "repaid" ? "#016828" : l.status === "active" ? "#00ab00" : "#d97706",
                    }}>{l.status}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: l.repaid ? "#00ab00" : "#9ca3af" }}>
                    {l.repaid ? fmt(l.repaid) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
