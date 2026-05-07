"use client"

import { useRouter } from "next/navigation"
import { Send, ArrowDown, ArrowUp, CheckCircle, AlertCircle } from "lucide-react"
import { MEMBERS, CONTRIBUTIONS_HISTORY, GROUP } from "@/lib/demo-data"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const fmt = (n: number) => "KES " + Number(n).toLocaleString()
const paidCount = MEMBERS.filter(m => m.paid && m.status === "active").length
const activeCount = MEMBERS.filter(m => m.status === "active").length

export default function ContributionsPage() {
  const router = useRouter()

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Contributions</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Track monthly savings and collection progress</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Collected (Oct)", value: fmt(paidCount * 5000), sub: `${paidCount} of ${activeCount} members`, color: "#00ab00", up: true },
          { label: "Outstanding",    value: fmt((activeCount - paidCount) * 5000), sub: `${activeCount - paidCount} pending`, color: "#e53e3e", up: false },
          { label: "Monthly Target", value: fmt(GROUP.totalMembers * GROUP.monthlyContribution), sub: `${GROUP.totalMembers} × KES 5,000`, color: "#0a2540", up: false },
          { label: "Collection Rate",value: `${Math.round((paidCount / activeCount) * 100)}%`, sub: "This month", color: "#00ab00", up: true },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: c.color, display: "flex", alignItems: "center", gap: 4 }}>
              {c.up ? <ArrowUp size={11} /> : null}{c.sub}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Member status list */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540" }}>October 2025 — Status</div>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "#00ab00", color: "#fff", border: "none", borderRadius: 7,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              <Send size={12} /> Bulk STK Push
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              <span>Collection progress</span><span>{paidCount}/{activeCount}</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "#00ab00", width: `${(paidCount / activeCount) * 100}%`, transition: "width 0.5s" }} />
            </div>
          </div>

          {/* Member rows */}
          <div>
            {MEMBERS.filter(m => m.status === "active").map(mem => (
              <div key={mem.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f9f9f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: mem.paid ? "#00ab00" : "#e5e7eb", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#0a2540" }}>{mem.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: mem.paid ? "#00ab00" : "#9ca3af" }}>
                    {mem.paid ? "KES 5,000" : "—"}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                    background: mem.paid ? "#e9f3ed" : "#f9fafb",
                    color: mem.paid ? "#016828" : "#9ca3af",
                  }}>{mem.paid ? "Paid" : "Pending"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Trend chart */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2540", marginBottom: 4 }}>Collection Trend</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Feb – Oct 2025</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={CONTRIBUTIONS_HISTORY} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ab00" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00ab00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => v / 1000 + "k"} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <Area type="monotone" dataKey="target" stroke="#e5e7eb" strokeDasharray="4 4" fill="none" strokeWidth={1} />
                <Area type="monotone" dataKey="collected" stroke="#00ab00" fill="url(#cgrad)" strokeWidth={2.5} dot={{ fill: "#00ab00", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Schedule */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2540", marginBottom: 4 }}>Schedule</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>STK push auto-triggers on the 5th of each month</div>
            {[
              { label: "Frequency",        val: "Monthly (5th)" },
              { label: "Amount / member",  val: "KES 5,000" },
              { label: "Payment method",   val: "M-Pesa STK Push" },
              { label: "Grace period",     val: "5 days" },
              { label: "Late penalty",     val: "KES 200" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f5f5f5", fontSize: 12 }}>
                <span style={{ color: "#6b7280" }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: "#0a2540" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
