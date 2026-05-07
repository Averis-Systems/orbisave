"use client"

import { useAuthStore } from "@/store/auth"
import { User, Shield, Phone, Mail, MapPin, Edit2 } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuthStore()

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a2540", margin: 0 }}>Personal Info</h1>
        <p style={{ fontSize: 13, color: "#4a5c6a", margin: "4px 0 0" }}>Your account details and identity verification status</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Profile card */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%", background: "#0a2540",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>
              {user?.full_name?.slice(0, 2).toUpperCase() ?? "ME"}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0a2540" }}>{user?.full_name ?? "—"}</div>
              <div style={{ fontSize: 12, color: "#4a5c6a", marginTop: 2 }}>{user?.email ?? "—"}</div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, marginTop: 6, display: "inline-block",
                background: "#e9f3ed", color: "#016828",
              }}>Chairperson</span>
            </div>
          </div>

          {[
            { label: "Full Name",  val: user?.full_name ?? "—",  Icon: User    },
            { label: "Email",      val: user?.email ?? "—",      Icon: Mail    },
            { label: "Phone",      val: "0723 456 789",           Icon: Phone   },
            { label: "Location",   val: "Kisumu, Kenya",          Icon: MapPin  },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f7f9f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <r.Icon size={14} style={{ color: "#00ab00" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{r.val}</div>
              </div>
            </div>
          ))}

          <button style={{
            marginTop: 20, width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #d6e4df",
            background: "#fff", fontSize: 13, fontWeight: 700, color: "#0a2540", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Edit2 size={13} /> Edit Profile
          </button>
        </div>

        {/* KYC status */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a2540", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={16} style={{ color: "#00ab00" }} /> Identity Verification (KYC)
          </div>

          <div style={{
            background: user?.kyc_status === "verified" ? "#e9f3ed" : "#fefce8",
            border: `1px solid ${user?.kyc_status === "verified" ? "#d6e4df" : "#fde68a"}`,
            borderRadius: 10, padding: "16px 18px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <Shield size={20} style={{ color: user?.kyc_status === "verified" ? "#00ab00" : "#d97706", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2540" }}>
                {user?.kyc_status === "verified" ? "Identity Verified" : "Verification Pending"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {user?.kyc_status === "verified"
                  ? "Your identity has been confirmed. You have full access."
                  : "Submit your ID and selfie to unlock all features."}
              </div>
            </div>
          </div>

          {[
            { step: 1, label: "Personal Details",   done: true  },
            { step: 2, label: "National ID Upload",  done: user?.kyc_status === "verified" },
            { step: 3, label: "Selfie Verification", done: user?.kyc_status === "verified" },
            { step: 4, label: "Review & Approval",   done: user?.kyc_status === "verified" },
          ].map(s => (
            <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: s.done ? "#00ab00" : "#f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: s.done ? "#fff" : "#9ca3af",
              }}>{s.done ? "✓" : s.step}</div>
              <div style={{ fontSize: 13, color: s.done ? "#0a2540" : "#9ca3af", fontWeight: s.done ? 600 : 400 }}>{s.label}</div>
            </div>
          ))}

          {user?.kyc_status !== "verified" && (
            <button style={{
              marginTop: 20, width: "100%", padding: "11px", borderRadius: 8, border: "none",
              background: "#00ab00", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
            }}>
              Continue KYC Verification
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
