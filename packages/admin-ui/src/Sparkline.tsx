/**
 * Dependency-free inline sparkline.
 *
 * A KPI tile should show its recent shape, not just a single number, so the
 * eye reads "growing / flat / falling" before it reads the value. This is a
 * plain SVG polyline with a faint area fill, no chart library, no axes, no
 * interactivity, so it stays cheap enough to sit inside every stat card.
 *
 * It is decoration ONLY in the sense that the real value is always shown as
 * text beside it (per the accessibility rule that data must never live in
 * colour or a hover alone); the sparkline adds shape, it never replaces the
 * number.
 */

export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = '#00ab00',
  className = '',
  strokeWidth = 1.5,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
  strokeWidth?: number
}) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  // Inset so the stroke is never clipped at the top or bottom edge.
  const pad = strokeWidth
  const stepX = (width - pad * 2) / (data.length - 1)

  const points = data.map((v, i) => {
    const x = pad + i * stepX
    const y = pad + (height - pad * 2) * (1 - (v - min) / range)
    return [x, y] as const
  })

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area =
    `${pad.toFixed(1)},${(height - pad).toFixed(1)} ` +
    line +
    ` ${(width - pad).toFixed(1)},${(height - pad).toFixed(1)}`
  const gradId = `spark-${color.replace('#', '')}-${data.length}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.16} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} stroke="none" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
