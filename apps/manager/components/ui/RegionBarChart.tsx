'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Groups per region, horizontal bars so long county names stay readable
 * without blowing the card width. Labels truncate past ~14 chars.
 */

export interface RegionRow {
  region: string
  count_all_time: number
  count_this_month: number
}

function shortLabel(value: string) {
  if (!value) return ''
  return value.length > 14 ? `${value.slice(0, 13)}…` : value
}

export function RegionBarChart({ data, height = 260 }: { data: RegionRow[]; height?: number }) {
  return (
    <div className="min-w-0 w-full overflow-hidden" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="region"
            width={96}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#475569', fontSize: 11 }}
            tickFormatter={shortLabel}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <Bar dataKey="count_this_month" name="This month" fill="#00ab00" radius={[0, 4, 4, 0]} maxBarSize={12} />
          <Bar dataKey="count_all_time" name="All time" fill="#cbd5e1" radius={[0, 4, 4, 0]} maxBarSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
