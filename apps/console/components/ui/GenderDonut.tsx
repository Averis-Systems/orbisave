'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

/**
 * Gender split donut with a legend, matching the Manager overview's treatment
 * so both admin portals read as one product. Zero-count slices are dropped by
 * the caller. Renders an empty-state message when there is nothing to show.
 */

const COLORS: Record<string, string> = {
  female: '#ee46bc',
  male: '#2e90fa',
  other: '#f59e0b',
  prefer_not_to_say: '#94a3b8',
  '': '#cbd5e1',
}

export interface GenderSlice {
  gender: string
  label: string
  count: number
}

export function GenderDonut({ data }: { data: GenderSlice[] }) {
  const slices = data.filter((d) => d.count > 0)
  const total = slices.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No gender data on file yet.</p>
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius="58%"
              outerRadius="94%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
            >
              {slices.map((s) => (
                <Cell key={s.gender} fill={COLORS[s.gender] ?? '#cbd5e1'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(0)}%)`, name]}
              contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {slices
          .slice()
          .sort((a, b) => b.count - a.count)
          .map((s) => (
            <li key={s.gender} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-slate-600">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[s.gender] ?? '#cbd5e1' }}
                  aria-hidden="true"
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="shrink-0 tabular-nums font-medium text-navy">
                {s.count} <span className="font-normal text-slate-400">({((s.count / total) * 100).toFixed(0)}%)</span>
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}
