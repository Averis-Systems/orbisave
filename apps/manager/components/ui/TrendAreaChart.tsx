'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Small area chart for a monthly series, styled to match the Console design
 * language so both admin portals read as one product. Kept as a page-level
 * sibling (not in @orbisave/admin-ui) for the same reason Console's copy is:
 * one series, narrow scope, Phase 3 work to fully generalise.
 */

type Point = Record<string, string | number>

export function TrendAreaChart({
  data,
  xKey,
  yKey,
  color = '#00ab00',
  height = 240,
  formatValue = (v: number) => v.toLocaleString(),
  formatAxis,
  formatTooltipLabel = (label: string) => label,
}: {
  data: Point[]
  xKey: string
  yKey: string
  color?: string
  height?: number
  formatValue?: (value: number) => string
  /** Compact tick labels for narrow cards; tooltip still uses formatValue. */
  formatAxis?: (value: number) => string
  formatTooltipLabel?: (label: string) => string
}) {
  const gradientId = `fill-${yKey}`
  const axisFmt = formatAxis || formatValue

  return (
    <div className="min-w-0 w-full overflow-hidden" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => axisFmt(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">{formatTooltipLabel(String(label))}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-navy">
                    {formatValue(Number(payload[0].value))}
                  </p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
