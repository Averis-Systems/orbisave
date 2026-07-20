"use client"

/**
 * Shared dashboard UI primitives: the single source of truth for the
 * member dashboard's visual language.
 *
 * Design language (the "calm flat-5px banking" system, taken from the
 * overview page: NOT the old font-black/uppercase/text-[9px] treatment
 * that had drifted into reports/loans/members):
 *   - Cards:     rounded-2xl (caps at 5px) border border-gray-200 bg-white
 *   - Headings:  font-semibold text-gray-800 (never font-black)
 *   - Labels:    text-sm text-gray-500 / eyebrows text-xs uppercase tracking-wide
 *   - Values:    tabular figures, font-semibold
 *   - Min text:  12px (text-xs): no text-[8/9/10px] micro-caps
 *
 * Import from "@/components/dashboard/ui".
 */

import Link from "next/link"
import type { ReactNode } from "react"
import { MoreHorizontal, type LucideIcon } from "lucide-react"

/* ─────────────────────────────────────────────────────────────────────────
   PageHeader: the top of every dashboard page.
   ───────────────────────────────────────────────────────────────────────── */
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
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00ab00]">{eyebrow}</p>
        )}
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SectionCard: bordered white surface with an optional titled header.
   ───────────────────────────────────────────────────────────────────────── */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>}
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName || "p-5 sm:p-6"}>{children}</div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   StatCard: a single KPI tile. Calm label + tabular value + optional trend.
   ───────────────────────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  tone = "neutral",
}: {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  trend?: { label: string; direction: "up" | "down" | "neutral" }
  tone?: "neutral" | "green" | "amber" | "red"
}) {
  const toneRing =
    tone === "green"
      ? "bg-[#ecfdf3] text-[#00ab00]"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : tone === "red"
          ? "bg-red-50 text-red-600"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-9 tracking-tight text-gray-900 tabular-nums dark:text-white">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneRing}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend?.label && (
        <div className="mt-4">
          <TrendBadge direction={trend.direction} label={trend.label} />
        </div>
      )}
    </div>
  )
}

export function TrendBadge({
  direction,
  label,
}: {
  direction: "up" | "down" | "neutral"
  label: string
}) {
  const cls =
    direction === "up"
      ? "bg-[#ecfdf3] text-[#039855]"
      : direction === "down"
        ? "bg-[#fef3f2] text-[#d92d20]"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Tabs: calm underline tab bar (replaces font-black uppercase tab rows).
   ───────────────────────────────────────────────────────────────────────── */
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
    <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative flex h-11 items-center gap-2 px-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-[#00ab00]"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {item.label}
            {item.count != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isActive ? "bg-[#e9f3ed] text-[#00ab00]" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {item.count}
              </span>
            )}
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#00ab00]" />}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   StatusBadge: one semantic mapping for every status pill in the dashboard.
   ───────────────────────────────────────────────────────────────────────── */
type BadgeTone = "green" | "amber" | "red" | "gray" | "blue"

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "green",
  confirmed: "green",
  disbursed: "green",
  approved: "green",
  verified: "green",
  repaid: "gray",
  completed: "gray",
  closed: "gray",
  pending: "amber",
  pending_activation: "amber",
  pending_approval: "amber",
  submitted: "amber",
  scheduled: "amber",
  rejected: "red",
  defaulted: "red",
  overdue: "red",
  failed: "red",
  suspended: "red",
}

const TONE_CLASS: Record<BadgeTone, string> = {
  green: "bg-[#ecfdf3] text-[#039855] dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  red: "bg-[#fef3f2] text-[#d92d20] dark:bg-red-500/10 dark:text-red-300",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
}

export function StatusBadge({ status, tone }: { status: string; tone?: BadgeTone }) {
  const key = status.toLowerCase().replace(/\s+/g, "_")
  const resolved = tone || STATUS_TONE[key] || (key.startsWith("pending") ? "amber" : "gray")
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TONE_CLASS[resolved]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   DataTable: consistent, scroll-safe table chrome. Pass columns + rows.
   ───────────────────────────────────────────────────────────────────────── */
export type Column<T> = {
  key: string
  header: string
  align?: "left" | "right" | "center"
  render: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 640,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  minWidth?: number
  empty?: ReactNode
}) {
  const alignClass = (align?: "left" | "right" | "center") =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full" style={{ minWidth }}>
        <thead className="border-y border-gray-100 dark:border-gray-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-medium text-gray-500 first:pl-0 last:pr-0 dark:text-gray-400 ${alignClass(col.align)}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-4 text-sm text-gray-600 first:pl-0 last:pr-0 dark:text-gray-300 ${alignClass(col.align)} ${col.className || ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-sm text-gray-400">
                {empty || "No records yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   EmptyState: inline empty message inside a card/section.
   ───────────────────────────────────────────────────────────────────────── */
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center dark:border-gray-800 dark:bg-gray-900/40">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e9f3ed] text-[#00ab00]">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="text-sm font-semibold text-gray-800 dark:text-white">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   LockedState: a feature that exists but is gated/not yet active.
   Distinct from EmptyState: this reads as "locked", with the unlock path.
   ───────────────────────────────────────────────────────────────────────── */
export function LockedState({
  icon: Icon,
  title,
  description,
  steps,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  steps?: { label: string; done?: boolean }[]
  action?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4 border-b border-gray-100 bg-gray-50/70 px-6 py-10 text-center dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <Icon className="h-6 w-6" />
        </div>
        <div className="max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        {action}
      </div>
      {steps && steps.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {steps.map((step, index) => (
            <li key={step.label} className="flex items-center gap-3 px-6 py-4">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done ? "bg-[#00ab00] text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span
                className={`text-sm ${step.done ? "text-gray-400 line-through" : "font-medium text-gray-700 dark:text-gray-200"}`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   CardMenu: the "⋯" affordance, but as a real link/button (no dead icons).
   ───────────────────────────────────────────────────────────────────────── */
export function CardMenuLink({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      {label}
    </Link>
  )
}

/* Barrel convenience: a plain icon button that actually does something. */
export function IconButton({
  icon: Icon = MoreHorizontal,
  label,
  onClick,
}: {
  icon?: LucideIcon
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      <Icon size={20} />
    </button>
  )
}
