"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { POOL_DATA } from "@/lib/landing-data"

const fmt = (n: number) => "KES " + Number(n).toLocaleString();

export function LoanAllocationChart() {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", height: "100%" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0d2416", marginBottom: 4 }}>Fund Allocation</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Current group wallet breakdown</div>
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie data={POOL_DATA} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" strokeWidth={0}>
            {POOL_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Pie>
          <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {POOL_DATA.map(d => (
          <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>{d.name}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0d2416" }}>{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
