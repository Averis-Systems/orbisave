"use client"

import { Settings, RefreshCw, CreditCard, Users, Calendar } from "lucide-react"
import Link from "next/link"

const SETTING_CARDS = [
  {
    icon: Settings,
    title: "Group Settings",
    desc: "Group name, rules, contribution amount, grace period and penalty settings.",
    href: "/dashboard/settings",
    color: "#0a2540",
  },
  {
    icon: RefreshCw,
    title: "Rotation Settings",
    desc: "Manage the payout cycle, reorder positions, and configure payout rules.",
    href: "/dashboard/settings/rotations",
    color: "#016828",
  },
  {
    icon: CreditCard,
    title: "Loan Pool Settings",
    desc: "Enable or disable the loan pool, set interest rates, eligibility, and repayment terms.",
    href: "/dashboard/settings/loans",
    color: "#014d1b",
  },
  {
    icon: Calendar,
    title: "Meetings Configuration",
    desc: "Set meeting schedules, quorum requirements, and digital voting rules.",
    href: "/dashboard/settings/meetings",
    color: "#0f3460",
  },
]

export default function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Group Settings</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Configure group rules, rotations, loans, and meeting settings</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 24 }}>
        {SETTING_CARDS.map(card => (
          <Link key={card.title} href={card.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s", display: "block",
              borderLeft: `4px solid ${card.color}`,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.transform = "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e9f3ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <card.icon size={18} style={{ color: "#00ab00" }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540" }}>{card.title}</div>
              </div>
              <div style={{ fontSize: 13, color: "#4a5c6a", lineHeight: 1.5 }}>{card.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick config panel */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20 }}>Quick Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
          {[
            { label: "Group Name",           val: "Kisumu Agri Chama" },
            { label: "Monthly Contribution", val: "KES 5,000" },
            { label: "Contribution Day",     val: "5th of each month" },
            { label: "Grace Period",         val: "5 days" },
            { label: "Late Penalty",         val: "KES 200" },
            { label: "Loan Pool",            val: "Enabled — KES 45,000" },
            { label: "Loan Interest",        val: "10% flat" },
            { label: "Max Loan Term",        val: "3 months" },
            { label: "Payout Cycle",         val: "Monthly" },
            { label: "Meeting Quorum",       val: "60% attendance" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{r.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0a2540" }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
