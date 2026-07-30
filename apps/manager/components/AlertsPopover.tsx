'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, Landmark, ShieldCheck, UserCheck } from 'lucide-react'
import { useAttention } from '@/hooks/useAttention'

/**
 * Notification bell — was a decorative icon with no popover at all. Now a
 * second view onto the same attention data the overview page renders, so the
 * badge count and the overview's exception strip can never disagree.
 */
export function AlertsPopover() {
  const { data } = useAttention()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const queues = data?.queues
  const total =
    (queues?.groups_pending_review.count ?? 0) +
    (queues?.kyc_pending.count ?? 0) +
    (queues?.reconciliation.count ?? 0)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        aria-label="Alerts"
      >
        <Bell size={22} />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#d92d20] px-1 text-[11px] font-semibold text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+18px)] w-[380px] rounded-2xl border border-gray-200 bg-white shadow-[0_20px_40px_rgba(16,24,40,0.12)] dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Needs your attention</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {total > 0 ? `${total} item${total === 1 ? '' : 's'} waiting` : 'All clear'}
            </p>
          </div>

          {total === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-[#12b76a]" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No approvals or reviews are waiting.</p>
            </div>
          ) : (
            <div className="thin-scrollbar max-h-[360px] overflow-y-auto p-2">
              {(data?.worklist ?? []).slice(0, 6).map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      item.type === 'reconciliation' ? 'bg-[#fef3f2] text-[#d92d20]' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {item.type === 'group_verification' ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : item.type === 'kyc' ? (
                      <UserCheck className="h-4 w-4" />
                    ) : (
                      <Landmark className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-800 dark:text-gray-200">{item.label}</span>
                    <span className="block truncate text-xs text-gray-400">
                      {item.detail} · {item.age_days}d old
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[#00ab00] hover:underline"
            >
              View operations overview
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
