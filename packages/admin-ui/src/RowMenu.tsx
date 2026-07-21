'use client'

/**
 * Row action menu for tables.
 *
 * Both portals were full of inert MoreHorizontal icons: kebabs with no
 * popover, rendered because tables "should have one". A menu only exists here
 * when the page declares actions, so an icon never appears without doing
 * something, per the standing functional-before-decorative rule.
 */

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type RowAction = {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  /** Renders in the danger colour and separated from ordinary actions. */
  destructive?: boolean
  disabled?: boolean
  /** Shown as a title tooltip; use to say WHY something is disabled. */
  disabledReason?: string
}

export function RowMenu({ actions, label = 'Row actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        // Focus returns to the trigger so keyboard users are not dropped.
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!actions.length) return null

  const ordinary = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1.5"
        >
          {ordinary.map((action) => (
            <MenuItem key={action.label} action={action} close={() => setOpen(false)} />
          ))}
          {ordinary.length > 0 && destructive.length > 0 && (
            <div className="my-1.5 border-t border-slate-100" />
          )}
          {destructive.map((action) => (
            <MenuItem key={action.label} action={action} close={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  )
}

function MenuItem({ action, close }: { action: RowAction; close: () => void }) {
  const Icon = action.icon
  return (
    <button
      type="button"
      role="menuitem"
      disabled={action.disabled}
      title={action.disabled ? action.disabledReason : undefined}
      onClick={() => {
        close()
        action.onSelect()
      }}
      className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        action.destructive
          ? 'text-[#d92d20] hover:bg-[#fef3f2]'
          : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {action.label}
    </button>
  )
}
