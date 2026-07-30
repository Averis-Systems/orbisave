'use client'

/**
 * Dependency-free horizontal bar list for ranked counts (signups per country,
 * groups per region/sub-region). A plain flex/percentage bar rather than a
 * charting lib — it reads cleaner at this small scale, stays crisp, and keeps
 * long region names readable. Brand green by default.
 */

export interface HBarRow {
  label: string
  sublabel?: string
  value: number
  hint?: string
}

export function HBarChart({
  rows,
  color = '#00ab00',
  emptyText = 'No data yet.',
}: {
  rows: HBarRow[]
  color?: string
  emptyText?: string
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)

  if (rows.length === 0 || max === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{emptyText}</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map((row, i) => (
        <li key={`${row.label}-${i}`} className="min-w-0">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-slate-600">
              {row.label}
              {row.sublabel && <span className="text-slate-400"> · {row.sublabel}</span>}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">
              {row.value.toLocaleString()}
              {row.hint && <span className="ml-1 font-normal text-slate-400">{row.hint}</span>}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((row.value / max) * 100, 2)}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
