"use client"

import { ShieldCheck, Zap, Lock, CheckCircle2 } from "lucide-react"

const NETWORKS = [
  { label: "M-Pesa",        detail: "Kenya",          dot: "#00a651" },
  { label: "MTN MoMo",      detail: "Rwanda · Ghana", dot: "#ffc000" },
  { label: "Airtel Money",  detail: "Kenya · Rwanda", dot: "#e40000" },
  { label: "Bank Transfer", detail: "All markets",    dot: "#00ab00" },
]

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    iconCls: "icon-pulse-soft",
    title: "Bank-Backed Custody",
    body: "Funds held in licensed bank trust accounts. OrbiSave never holds your money independently.",
  },
  {
    icon: Zap,
    iconCls: "icon-flash",
    title: "SHA-256 Ledger",
    body: "Every transaction is hash-chained and cryptographically tamper-evident.",
  },
  {
    icon: Lock,
    iconCls: "icon-pulse-soft",
    title: "Multi-Party Governance",
    body: "Strict multi-party loan authorizations governed by required administrative PIN approvals.",
  },
  {
    icon: CheckCircle2,
    iconCls: "",
    title: "GDPR & Data Compliant",
    body: "All personal and financial data encrypted at rest and in transit. Full data rights supported.",
  },
]

export function TrustBelt() {
  return (
    <section
      className="relative"
      style={{ background: "#ffffff", borderTop: "1px solid #d6e4df", borderBottom: "1px solid #d6e4df" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Supported networks */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-10">
          <span
            className="text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{ color: "#4a5c6a" }}
          >
            Supported Networks
          </span>
          {NETWORKS.map(n => (
            <div key={n.label} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: n.dot }}
              />
              <span className="text-sm font-bold" style={{ color: "#0f1924" }}>{n.label}</span>
              <span className="text-xs font-medium" style={{ color: "#4a5c6a" }}>{n.detail}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#d6e4df", marginBottom: "2.5rem" }} />

        {/* Trust points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_POINTS.map(({ icon: Icon, iconCls, title, body }, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 p-5"
              style={{
                border: "1px solid #d6e4df",
                borderRadius: "8px",
                background: "#f7faf8",
              }}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${iconCls}`}
                style={{ color: "#00ab00" }}
              />
              <div>
                <div className="text-sm font-bold mb-1" style={{ color: "#0a2540" }}>{title}</div>
                <p className="text-xs font-medium leading-relaxed" style={{ color: "#4a5c6a" }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
