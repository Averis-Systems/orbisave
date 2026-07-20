'use client'

/**
 * Shared Console UI primitives.
 *
 * Ported from the member app's components/dashboard/ui so all three OrbiSave
 * apps read as one product. Every Console page previously hand-rolled its own
 * cards, badges and tables, which is how the overview ended up with a 5xl
 * hero, four different shadow values and sub-12px micro-caps.
 *
 * Design rules, identical to the member dashboard:
 *   - Cards:    rounded-2xl (Tailwind config caps radii at 5px), border,
 *               bg-white, p-5. NO shadows.
 *   - Headings: font-semibold. Never font-black, never 5xl.
 *   - Text:     12px floor (text-xs). No uppercase tracking-widest micro-caps.
 *   - Numbers:  tabular-nums so figures do not jitter as they update.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

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
    <section className="rounded-2xl border border-slate-200 bg-white">
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            {title && <h3 className="text-base font-semibold text-navy">{title}</h3>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName || 'p-5 sm:p-6'}>{children}</div>
    </section>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  href?: string
}) {
  const body = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-9 tracking-tight tabular-nums text-navy">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )

  // Only wrap in a link when there is somewhere to go, so a card never looks
  // clickable without being clickable.
  return href ? <Link href={href}>{body}</Link> : body
}

type BadgeTone = 'green' | 'amber' | 'red' | 'gray' | 'blue'

const TONE: Record<BadgeTone, string> = {
  green: 'bg-[#ecfdf3] text-[#039855]',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-[#fef3f2] text-[#d92d20]',
  gray: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-700',
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'green',
  verified: 'green',
  approved: 'green',
  pending: 'amber',
  pending_review: 'amber',
  submitted: 'amber',
  rejected: 'red',
  suspended: 'red',
  failed: 'red',
  inactive: 'gray',
}

export function StatusBadge({ status, tone }: { status: string; tone?: BadgeTone }) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  const resolved = tone || STATUS_TONE[key] || 'gray'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TONE[resolved]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export type Column<T> = {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 720,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  minWidth?: number
  empty?: ReactNode
}) {
  const align = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    // Wide tables scroll horizontally rather than forcing the page to.
    <div className="max-w-full overflow-x-auto">
      <table className="w-full" style={{ minWidth }}>
        <thead className="border-y border-slate-100">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 text-xs font-medium text-slate-500 first:pl-6 last:pr-6 ${align(c.align)}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="transition-colors hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-4 text-sm text-slate-600 first:pl-6 last:pr-6 ${align(c.align)}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">
                {empty || 'No records yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
            className={`relative flex h-11 items-center gap-2 px-3 text-sm font-medium transition-colors ${
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
