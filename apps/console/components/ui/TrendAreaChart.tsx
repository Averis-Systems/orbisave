'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Small area chart for a monthly series, styled to the Console design language.
 *
 * Deliberately narrow in scope: one series, month on the x-axis, a count or
 * amount on the y-axis. Gridlines are low-contrast so the data reads first,
 * numbers are tabular, and the tooltip is a plain card rather than Recharts'
 * default. Animation is disabled so the values are readable immediately and the
 * chart honours reduced-motion by default.
 *
 * This is the page-level chart used on the overview. The shared, fully generic
 * chart component is Phase 3 work; this stays small until then.
 */

type Point = Record<string, string | number>

export function TrendAreaChart({
  data,
  xKey,
  yKey,
  color = '#00ab00',
  height = 240,
  formatValue = (v: number) => v.toLocaleString(),
  formatTooltipLabel = (label: string) => label,
}: {
  data: Point[]
  xKey: string
  yKey: string
  color?: string
  height?: number
  formatValue?: (value: number) => string
  formatTooltipLabel?: (label: string) => string
}) {
  const gradientId = `fill-${yKey}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          dy={8}
        />
        <YAxis
          allowDecimals={false}
          width={44}
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={(v) => formatValue(Number(v))}
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
  )
}
