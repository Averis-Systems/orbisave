"use client"

import { Bell, CheckCircle, AlertCircle, Info, Vote, TrendingUp, Users } from "lucide-react"
import { NOTIFICATIONS } from "@/lib/demo-data"

const ALL_NOTIFICATIONS = [
  { id: 1, type: "alert",    title: "3 members have not paid this month",             time: "2 hours ago",  read: false, action: "View Members" },
  { id: 2, type: "approval", title: "Loan request LN-001 awaiting your approval",    time: "4 hours ago",  read: false, action: "Review Loan"  },
  { id: 3, type: "approval", title: "Loan request LN-004 awaiting your approval",    time: "1 day ago",    read: false, action: "Review Loan"  },
  { id: 4, type: "info",     title: "Grace Akinyi payout due in 12 days",            time: "1 day ago",    read: true,  action: "View Rotation"},
  { id: 5, type: "warning",  title: "Esther Nyambura KYC verification pending",      time: "2 days ago",   read: true,  action: "View Member" },
  { id: 6, type: "meeting",  title: "Monthly meeting scheduled for Oct 12, 10:00 AM",time: "3 days ago",  read: true,  action: "View Meeting" },
  { id: 7, type: "success",  title: "STK push batch sent to 20 members",             time: "5 days ago",   read: true,  action: null           },
  { id: 8, type: "success",  title: "Charles Mutua payout KES 100,000 confirmed",    time: "7 days ago",   read: true,  action: "View Ledger"  },
]

const iconMap: Record<string, any> = {
  alert:    { Icon: AlertCircle, color: "#e53e3e", bg: "#fff5f5" },
  approval: { Icon: Vote,        color: "#d97706", bg: "#fefce8" },
  info:     { Icon: Info,        color: "#0a2540", bg: "#f0f4f8" },
  warning:  { Icon: AlertCircle, color: "#d97706", bg: "#fefce8" },
  meeting:  { Icon: Users,       color: "#016828", bg: "#e9f3ed" },
  success:  { Icon: CheckCircle, color: "#00ab00", bg: "#e9f3ed" },
}

export default function NotificationsPage() {
  const unread = ALL_NOTIFICATIONS.filter(n => !n.read)

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Notifications</h1>
          <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>{unread.length} unread notifications</p>
        </div>
        <button style={{ fontSize: 13, fontWeight: 600, color: "#00ab00", background: "none", border: "none", cursor: "pointer" }}>
          Mark all as read
        </button>
      </div>

      {unread.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Unread — {unread.length}
          </div>
          {unread.map(n => {
            const { Icon, color, bg } = iconMap[n.type] ?? iconMap.info
            return (
              <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px", borderBottom: "1px solid #f9f9f9", background: "#fafff9" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2540", marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{n.time}</div>
                </div>
                {n.action && (
                  <button style={{ fontSize: 12, fontWeight: 700, color: "#00ab00", background: "#e9f3ed", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {n.action}
                  </button>
                )}
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ab00", marginTop: 4, flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Earlier
        </div>
        {ALL_NOTIFICATIONS.filter(n => n.read).map(n => {
          const { Icon, color, bg } = iconMap[n.type] ?? iconMap.info
          return (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 20px", borderBottom: "1px solid #f9f9f9" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} style={{ color: "#9ca3af" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#4a5c6a", marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{n.time}</div>
              </div>
              {n.action && (
                <button style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {n.action}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
