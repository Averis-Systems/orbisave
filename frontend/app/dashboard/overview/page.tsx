"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  AlertCircle, ArrowDownToLine, RefreshCw, CreditCard, 
  Users, ClipboardList, Activity, Banknote, ArrowUp, Calendar, ArrowDown
} from "lucide-react"
import { 
  GROUP, MEMBERS, LOANS, MEETINGS, TRANSACTIONS, G 
} from "@/lib/demo-data"
import { PoolGrowthChart } from "@/components/dashboard/PoolGrowthChart"
import { LoanAllocationChart } from "@/components/dashboard/LoanAllocationChart"

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n: number | string) => "KES " + Number(n).toLocaleString();

// ─── COMPONENT: Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, trend, wide = false }: any) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "20px 24px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,154,68,0.04)",
      gridColumn: wide ? "span 2" : "span 1",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: G[50], display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Icon size={16} color={G[500]} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0d2416", letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: trend === "up" ? G[500] : trend === "down" ? "#e53e3e" : "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
        {trend === "up" && <ArrowUp size={11} />}{trend === "down" && <ArrowDown size={11} />}{sub}
      </div>}
    </div>
  );
}

export default function OverviewPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const paidCount = MEMBERS.filter(m => m.paid && m.status === "active").length;
  const activeMembers = MEMBERS.filter(m => m.status === "active").length;
  const collectedThisMonth = paidCount * GROUP.monthlyContribution;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Alert Banner */}
      <div style={{
        background: G[50], border: `1px solid ${G[200]}`, borderRadius: 10,
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 12
      }}>
        <AlertCircle size={16} color={G[600]} />
        <span style={{ fontSize: 13, color: G[800], flex: 1 }}>
          <strong>{activeMembers - paidCount} members</strong> have not contributed this month. STK push sent. Next meeting: <strong>Oct 12, 2025</strong>.
        </span>
        <button onClick={() => router.push("/dashboard/members")} style={{
          fontSize: 12, fontWeight: 600, color: G[600], background: "none", border: "none", cursor: "pointer",
          textDecoration: "underline"
        }}>View Members</button>
      </div>

      {/* Key Metrics - Single Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Pool Balance" value={fmt(GROUP.totalPool)} sub="Trust A/C: KCB" icon={Banknote} />
        <StatCard label="This Month's Collection" value={fmt(collectedThisMonth)} sub={`${paidCount}/${activeMembers} paid`} icon={ArrowDownToLine} trend="up" />
        <StatCard label="Next Payout" value={fmt(GROUP.nextPayoutAmount)} sub={`${GROUP.nextPayoutMember} · ${GROUP.nextPayoutDate}`} icon={RefreshCw} />
        <StatCard label="Active Members" value={`${GROUP.activeMembers}/${GROUP.totalMembers}`} sub="2 inactive members" icon={Users} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PoolGrowthChart />
        </div>
        <div className="lg:col-span-1">
          <LoanAllocationChart />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Recent Transactions */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0d2416" }}>Recent Transactions</div>
            <button onClick={() => router.push("/dashboard/ledger")} style={{ fontSize: 12, color: G[500], fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>View All</button>
          </div>
          {TRANSACTIONS.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: t.direction === "in" ? G[50] : "#fff5f5",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {t.direction === "in"
                    ? <ArrowDownToLine size={14} color={G[500]} />
                    : <ArrowUp size={14} color="#e53e3e" />
                  }
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0d2416" }}>{t.member}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>{t.type.replace("_", " ")}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.direction === "in" ? G[500] : "#e53e3e" }}>
                  {t.direction === "in" ? "+" : "-"}{fmt(t.amount).replace("KES ", "")}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Actions */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0d2416", marginBottom: 16 }}>Pending Chairperson Actions</div>
          {LOANS.filter(l => l.status === "pending").map(loan => (
            <div key={loan.id} style={{
              border: `1px solid #fee2e2`, borderRadius: 10, padding: "12px 14px", marginBottom: 12, background: "#fff5f5"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0d2416" }}>{loan.member}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{loan.purpose} · {loan.id}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: G[600] }}>{fmt(loan.amount)}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => router.push("/dashboard/loan-approvals")} style={{
                  flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: G[500], color: "#fff", border: "none", cursor: "pointer"
                }}>Review</button>
                <button style={{
                  flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", cursor: "pointer"
                }}>Defer</button>
              </div>
            </div>
          ))}
          
          {/* Upcoming meeting */}
          <div style={{ border: `1px solid ${G[100]}`, borderRadius: 10, padding: "12px 14px", background: G[50] }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Calendar size={13} color={G[600]} />
              <span style={{ fontSize: 11, fontWeight: 700, color: G[700], textTransform: "uppercase", letterSpacing: "0.04em" }}>Upcoming Meeting</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0d2416" }}>Monthly Chama Meeting</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Oct 12, 2025 · 10:00 AM · {MEETINGS[0].agenda.length} agenda items</div>
            <button onClick={() => router.push("/dashboard/meetings")} style={{
              marginTop: 8, padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: G[500], color: "#fff", border: "none", cursor: "pointer"
            }}>View Agenda</button>
          </div>
        </div>

      </div>
    </div>
  )
}
