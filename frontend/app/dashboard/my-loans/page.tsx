"use client"

import { useState } from "react"
import { CreditCard, CheckCircle, Clock, AlertCircle, ArrowDown, Send } from "lucide-react"
import { LOANS, GROUP } from "@/lib/demo-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()

// My active loan — member perspective
const MY_LOAN = LOANS.find(l => l.member === "John Kipchoge" && l.status === "active")
const ELIGIBILITY_AMOUNT = Math.floor(GROUP.totalPool * 0.3) // 30% of pool

export default function MyLoansPage() {
  const [tab, setTab] = useState<"overview" | "request">("overview")
  const [loanAmount, setLoanAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [term, setTerm] = useState("1")
  const [submitted, setSubmitted] = useState(false)

  const requestedAmount = Number(loanAmount) || 0
  const interest = Math.round(requestedAmount * 0.1 * Number(term))
  const totalRepay = requestedAmount + interest
  const monthlyPayment = Number(term) > 0 ? Math.round(totalRepay / Number(term)) : 0

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>My Loans</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>View active loans and request new financing</p>
      </div>

      {/* Eligibility card */}
      <div style={{
        background: "linear-gradient(135deg, #0a2540 0%, #0f3460 100%)",
        borderRadius: 14, padding: "24px 28px", marginBottom: 24, color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Your Loan Eligibility</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{fmt(ELIGIBILITY_AMOUNT)}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Based on 30% of group pool · 10% interest · Max 3 months</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>Pool balance: <strong>{fmt(GROUP.totalPool)}</strong></div>
          <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>Loan pool: <strong>{fmt(GROUP.loanPoolBalance)}</strong></div>
          <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(0,171,0,0.25)", padding: "3px 10px", borderRadius: 99, textAlign: "center", color: "#7fffb2" }}>
            Eligible
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#fff", borderRadius: 10, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {[{ id: "overview", label: "My Loans" }, { id: "request", label: "Request a Loan" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: "8px 22px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
            background: tab === t.id ? "#00ab00" : "transparent",
            color: tab === t.id ? "#fff" : "#6b7280",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Active loan */}
          {MY_LOAN && (
            <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e9f3ed", color: "#016828" }}>ACTIVE</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{MY_LOAN.id}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0a2540" }}>{MY_LOAN.purpose}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Disbursed {(MY_LOAN as any).disbursed} · Due {(MY_LOAN as any).due}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0a2540" }}>{fmt(MY_LOAN.amount)}</div>
                  <div style={{ fontSize: 12, color: "#00ab00" }}>{fmt((MY_LOAN as any).repaid)} repaid</div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  <span>Repayment progress</span>
                  <span>{Math.round(((MY_LOAN as any).repaid / MY_LOAN.amount) * 100)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "#f0f0f0" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "#00ab00", width: `${Math.round(((MY_LOAN as any).repaid / MY_LOAN.amount) * 100)}%` }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Loan Amount",   val: fmt(MY_LOAN.amount) },
                  { label: "Amount Repaid", val: fmt((MY_LOAN as any).repaid) },
                  { label: "Balance",       val: fmt(MY_LOAN.amount - (MY_LOAN as any).repaid) },
                  { label: "Interest Rate", val: `${MY_LOAN.interest}%` },
                  { label: "Term",          val: MY_LOAN.term },
                  { label: "Due Date",      val: (MY_LOAN as any).due },
                ].map(r => (
                  <div key={r.label} style={{ background: "#f7f9f8", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0a2540" }}>{r.val}</div>
                  </div>
                ))}
              </div>

              <button style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "none",
                background: "#00ab00", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Send size={14} /> Make Repayment via M-Pesa
              </button>
            </div>
          )}

          {!MY_LOAN && (
            <div style={{ background: "#fff", borderRadius: 14, padding: "40px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <CreditCard size={40} style={{ color: "#d6e4df", marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 6 }}>No Active Loans</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>You are eligible to request up to {fmt(ELIGIBILITY_AMOUNT)}</div>
              <button onClick={() => setTab("request")} style={{
                padding: "10px 24px", borderRadius: 8, background: "#00ab00", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Request a Loan</button>
            </div>
          )}
        </div>
      )}

      {tab === "request" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", maxWidth: 560 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0a2540", marginBottom: 20 }}>New Loan Request</div>

          {submitted ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <CheckCircle size={48} style={{ color: "#00ab00", marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0a2540", marginBottom: 6 }}>Request Submitted!</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Your loan request has been sent to the Chairperson and Treasurer for approval.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Loan Amount (KES)</label>
                <input
                  type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)}
                  placeholder="e.g. 10000" max={ELIGIBILITY_AMOUNT}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Maximum: {fmt(ELIGIBILITY_AMOUNT)}</div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Purpose</label>
                <input
                  value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. School fees, Medical, Business stock"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Repayment Term</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["1", "2", "3"].map(t => (
                    <button key={t} onClick={() => setTerm(t)} style={{
                      flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", border: "1px solid",
                      borderColor: term === t ? "#00ab00" : "#e5e7eb",
                      background: term === t ? "#e9f3ed" : "#fff",
                      fontSize: 13, fontWeight: 600, color: term === t ? "#016828" : "#6b7280",
                    }}>{t} {t === "1" ? "month" : "months"}</button>
                  ))}
                </div>
              </div>

              {requestedAmount > 0 && (
                <div style={{ background: "#e9f3ed", borderRadius: 10, padding: "16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#016828", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Loan Summary</div>
                  {[
                    { label: "Principal",        val: fmt(requestedAmount) },
                    { label: "Interest (10%)",   val: fmt(interest) },
                    { label: "Total Repayment",  val: fmt(totalRepay) },
                    { label: "Monthly Payment",  val: fmt(monthlyPayment) },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ color: "#4a5c6a" }}>{r.label}</span>
                      <span style={{ fontWeight: 700, color: "#0a2540" }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { if (loanAmount && purpose) setSubmitted(true) }}
                style={{
                  padding: "12px", borderRadius: 8, border: "none",
                  background: loanAmount && purpose ? "#00ab00" : "#e5e7eb",
                  color: loanAmount && purpose ? "#fff" : "#9ca3af",
                  fontSize: 13, fontWeight: 700, cursor: loanAmount && purpose ? "pointer" : "not-allowed",
                }}>
                Submit Loan Request
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
