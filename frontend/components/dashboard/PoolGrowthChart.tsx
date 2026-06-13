"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { CONTRIBUTIONS_HISTORY, G } from "@/lib/landing-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString();

export function PoolGrowthChart() {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0d2416" }}>Monthly Collection Trend</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Feb – Oct 2025</div>
        </div>
        <div style={{ fontSize: 12, color: G[500], fontWeight: 600 }}>Target: KES 100,000</div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={CONTRIBUTIONS_HISTORY} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={G[500]} stopOpacity={0.18} />
              <stop offset="95%" stopColor={G[500]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => v / 1000 + "k"} />
          <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
          <Area type="monotone" dataKey="target" stroke="#e5e7eb" strokeDasharray="4 4" fill="none" strokeWidth={1} />
          <Area type="monotone" dataKey="collected" stroke={G[500]} fill="url(#cg)" strokeWidth={2.5} dot={{ fill: G[500], r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
