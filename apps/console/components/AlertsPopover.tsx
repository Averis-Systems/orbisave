'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, Landmark, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Console notifications. Reads the same cheap /superadmin/nav-counts/ the
 * sidebar badges use, so the bell count can never disagree with them. Lists
 * the platform-wide queues waiting on a super admin, each linking to where the
 * work is done. Medium-sized to match the Console header.
 */

interface NavCounts {
  groups_pending: number
  kyc_pending: number
  trust_open: number
}

interface QueueRow {
  icon: LucideIcon
  label: string
  count: number
  href: string
  tone: 'amber' | 'red'
}

export function AlertsPopover() {
  const [counts, setCounts] = useState<NavCounts | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .get<NavCounts>('/admin-portal/superadmin/nav-counts/')
        .then((res) => !cancelled && setCounts(res.data))
        .catch(() => {})
    load()
    const interval = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const rows: QueueRow[] = [
    { icon: ShieldCheck, label: 'Groups awaiting verification', count: counts?.groups_pending ?? 0, href: '/dashboard/groups?verification_status=pending_review', tone: 'amber' },
    { icon: UserCheck, label: 'KYC submissions to review', count: counts?.kyc_pending ?? 0, href: '/dashboard/users?tab=members&kyc_status=submitted', tone: 'amber' },
    { icon: Landmark, label: 'Trust exceptions open', count: counts?.trust_open ?? 0, href: '/dashboard/trust', tone: 'red' },
  ]
  const active = rows.filter((r) => r.count > 0)
  const total = active.reduce((s, r) => s + r.count, 0)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d92d20] px-1 text-[10px] font-semibold text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[340px] rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(16,24,40,0.12)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-navy">Needs your attention</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {total > 0 ? `${total} item${total === 1 ? '' : 's'} waiting across the platform` : 'All clear'}
            </p>
          </div>

          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-[#12b76a]" />
              <p className="text-sm text-slate-500">No approvals or reviews are waiting.</p>
            </div>
          ) : (
            <div className="p-2">
              {active.map((row) => (
                <Link
                  key={row.label}
                  href={row.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-slate-50"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      row.tone === 'red' ? 'bg-[#fef3f2] text-[#d92d20]' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <row.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{row.label}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">{row.count}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-3">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-sm font-medium text-primary hover:underline">
              View platform overview
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
