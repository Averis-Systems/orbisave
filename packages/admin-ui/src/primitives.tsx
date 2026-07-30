'use client'

/**
 * Shared admin UI primitives for Console and Manager.
 *
 * Ported from the member app's components/dashboard/ui so all three OrbiSave
 * apps read as one product. Both portals previously hand-rolled cards, badges
 * and tables per page, which is how one overview ended up with a 5xl hero,
 * four different shadow values and sub-12px micro-caps.
 *
 * Design rules, identical to the member dashboard:
 *   - Cards:    rounded-2xl (each app's Tailwind config caps radii at 5px),
 *               border, bg-white, p-5. NO shadows.
 *   - Headings: font-semibold. Never font-black, never 5xl.
 *   - Text:     12px floor (text-xs). No uppercase tracking-widest micro-caps.
 *   - Numbers:  tabular-nums so figures do not jitter as they update.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Sparkline } from './Sparkline'

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>}
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  bodyClassName = '',
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold text-navy">{title}</h3>}
            {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName || 'p-5 sm:p-6'}>{children}</div>
    </section>
  )
}

/**
 * Semantic tone for a stat card. Kept deliberately restrained: it tints only
 * the small icon chip, never the card border or background. No accent bars, no
 * coloured fills. Colour is always paired with the number and label, never the
 * only signal (accessibility, and Emanuel's no-colour-only rule).
 */
export type StatTone = 'default' | 'positive' | 'attention' | 'risk'

const STAT_TONE: Record<StatTone, { chip: string; value: string }> = {
  default: { chip: 'bg-slate-100 text-slate-500', value: 'text-navy' },
  positive: { chip: 'bg-[#ecfdf3] text-[#039855]', value: 'text-navy' },
  attention: { chip: 'bg-amber-50 text-amber-600', value: 'text-navy' },
  risk: { chip: 'bg-[#fef3f2] text-[#d92d20]', value: 'text-navy' },
}

export type StatDelta = {
  /** Rendered verbatim, e.g. "+12" or "3.2%". The caller formats it. */
  label: string
  /** up = green, down = red, flat = slate. Direction, not raw sign. */
  direction: 'up' | 'down' | 'flat'
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  tone = 'default',
  delta,
  spark,
  sparkColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  href?: string
  tone?: StatTone
  /** Small period-over-period change shown under the value. */
  delta?: StatDelta
  /** Recent series for an inline sparkline; the value stays the headline. */
  spark?: number[]
  sparkColor?: string
}) {
  const t = STAT_TONE[tone]

  const body = (
    <div
      className="group flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>

      <div className="mt-3 flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-[30px] font-semibold leading-none tracking-tight tabular-nums ${t.value}`}>{value}</p>
          {(delta || sub) && (
            <div className="mt-2 flex min-w-0 items-center gap-1.5">
              {delta && <Delta {...delta} />}
              {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
            </div>
          )}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} color={sparkColor || (tone === 'risk' ? '#d92d20' : '#00ab00')} className="shrink-0" />
        )}
      </div>
    </div>
  )

  // Only wrap in a link when there is somewhere to go, so a card never looks
  // clickable without being clickable.
  return href ? (
    <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  )
}

/** Directional change chip. The value text carries the meaning; colour reinforces. */
export function Delta({ label, direction }: StatDelta) {
  const tone =
    direction === 'up'
      ? 'text-[#039855]'
      : direction === 'down'
        ? 'text-[#d92d20]'
        : 'text-slate-400'
  const Arrow = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${tone}`}>
      <Arrow className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

export type BadgeTone = 'green' | 'amber' | 'red' | 'gray' | 'blue'

const TONE: Record<BadgeTone, { chip: string; dot: string }> = {
  green: { chip: 'bg-[#ecfdf3] text-[#027a48]', dot: 'bg-[#12b76a]' },
  amber: { chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  red: { chip: 'bg-[#fef3f2] text-[#b42318]', dot: 'bg-[#f04438]' },
  gray: { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  blue: { chip: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'green',
  verified: 'green',
  approved: 'green',
  confirmed: 'green',
  repaid: 'green',
  resolved: 'green',
  pending: 'amber',
  pending_review: 'amber',
  pending_admin: 'amber',
  pending_activation: 'amber',
  submitted: 'amber',
  investigating: 'amber',
  open: 'amber',
  paused: 'amber',
  rejected: 'red',
  suspended: 'red',
  failed: 'red',
  defaulted: 'red',
  escalated: 'red',
  inactive: 'gray',
  closed: 'gray',
}

export function StatusBadge({ status, tone, dot = true }: { status: string; tone?: BadgeTone; dot?: boolean }) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  const resolved = tone || STATUS_TONE[key] || 'gray'
  const t = TONE[resolved]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${t.chip}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />}
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="text-sm font-semibold text-navy">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export type TabItem = { id: string; label: string; count?: number | null }

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200">
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative flex h-11 cursor-pointer items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isActive ? 'text-primary' : 'text-slate-500 hover:text-navy'
            }`}
          >
            {item.label}
            {item.count != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.count}
              </span>
            )}
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
