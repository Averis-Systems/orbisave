'use client'

import type { ElementType } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Banknote,
  ChevronDown,
  FileText,
  Globe,
  Landmark,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Plug,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useNavCounts, type NavCounts } from '@/hooks/useNavCounts'
import { ct } from '@/lib/terminology'

/**
 * Console sidebar.
 *
 * Rebuilt from a flat twelve-item list into grouped sections with one
 * expandable parent, so the navigation reads as an operations console rather
 * than an undifferentiated menu:
 *
 *   (top)        Overview
 *   Operations   Countries, Groups, Users, Loans, Savings
 *   Oversight    Trust Accounts, Analytics, Audit Logs
 *   Platform     Providers & Config (Payment Providers, API & Integrations,
 *                Platform Settings)
 *
 * Only Providers & Config expands, because it is the only place with real
 * sibling subpages today. Every child href resolves to a page that exists; the
 * pattern is here to be reused as more configuration surfaces are built, not to
 * gesture at routes that 404.
 *
 * On desktop the rail is always visible. On mobile the parent layout renders it
 * as a drawer and passes onNavigate so tapping a link closes the drawer.
 */

/** A nav item may key a live badge to one of the nav-count fields. */
type BadgeKey = keyof NavCounts
type NavChild = { name: string; href: string }
type NavItem = { name: string; icon: ElementType; href?: string; children?: NavChild[]; badge?: BadgeKey }
type NavSection = { label?: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    items: [{ name: ct('nav.overview'), icon: LayoutDashboard, href: '/dashboard' }],
  },
  {
    label: ct('sections.operations'),
    items: [
      { name: ct('nav.countries'), icon: Globe, href: '/dashboard/countries' },
      // Badges surface where work is waiting, so the nav itself reads as a
      // to-do list: groups awaiting verification, members awaiting KYC review.
      { name: ct('nav.groups'), icon: ShieldCheck, href: '/dashboard/groups', badge: 'groups_pending' },
      { name: ct('nav.users'), icon: Users, href: '/dashboard/users', badge: 'kyc_pending' },
      { name: ct('nav.loans'), icon: Banknote, href: '/dashboard/loans' },
      { name: ct('nav.savings'), icon: PiggyBank, href: '/dashboard/savings' },
    ],
  },
  {
    label: ct('sections.oversight'),
    items: [
      { name: ct('nav.trustAccounts'), icon: Landmark, href: '/dashboard/trust', badge: 'trust_open' },
      { name: ct('nav.analytics'), icon: BarChart3, href: '/dashboard/analytics' },
      { name: ct('nav.auditLogs'), icon: FileText, href: '/dashboard/logs' },
    ],
  },
  {
    label: ct('sections.platform'),
    items: [
      {
        name: ct('nav.providersConfig'),
        icon: Plug,
        children: [
          { name: ct('nav.paymentProviders'), href: '/dashboard/payments' },
          { name: ct('nav.apiIntegrations'), href: '/dashboard/settings/apis' },
          { name: ct('nav.platformSettings'), href: '/dashboard/settings' },
        ],
      },
    ],
  },
]

/** Amber attention pill for a waiting count. Hidden at zero (calm by default). */
function NavBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-50 px-1.5 text-xs font-semibold tabular-nums text-amber-700">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const counts = useNavCounts()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  // A parent is "active" when any of its children matches the current route.
  const parentActive = (item: NavItem) => !!item.children?.some((c) => isActive(c.href))

  return (
    <aside className="dashboard-shell flex h-full w-[260px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex-shrink-0 border-b border-slate-100 px-5 py-[18px]">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ab00] text-[13px] font-bold text-white">
            OS
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-navy">{ct('shell.title')}</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {sections.map((section, i) => (
          <div key={section.label || `top-${i}`} className={i === 0 ? '' : 'mt-6'}>
            {section.label && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.children ? (
                  <NavParent
                    key={item.name}
                    item={item}
                    isActive={isActive}
                    defaultOpen={parentActive(item)}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavLink
                    key={item.name}
                    item={item}
                    active={isActive(item.href!)}
                    count={item.badge ? counts[item.badge] : 0}
                    onNavigate={onNavigate}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 border-t border-slate-100 p-3">
        <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f3ed] text-xs font-semibold text-[#027a48]">
            {user?.full_name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-navy">{user?.full_name || ct('shell.userFallback')}</p>
            <p className="truncate text-xs text-slate-400">{ct('shell.scope')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#b42318] transition-colors hover:bg-[#fef3f2]"
        >
          <LogOut className="h-4 w-4" />
          {ct('shell.signOut')}
        </button>
      </div>
    </aside>
  )
}

/**
 * One leaf nav row. Active state is a faint green tint plus a rounded left
 * accent bar — depth from structure, not shadow. An amber count badge rides
 * on the right when work is waiting.
 */
function NavLink({
  item,
  active,
  count,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  count: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href!}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active ? 'bg-[#e9f3ed] text-[#027a48]' : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
      }`}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#00ab00]" aria-hidden="true" />}
      <Icon
        className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-[#00ab00]' : 'text-slate-400 group-hover:text-slate-600'}`}
      />
      <span className="truncate">{item.name}</span>
      <NavBadge count={count} />
    </Link>
  )
}

function NavParent({
  item,
  isActive,
  defaultOpen,
  onNavigate,
}: {
  item: NavItem
  isActive: (href: string) => boolean
  defaultOpen: boolean
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  // Keep the group open whenever navigation lands on one of its children, so a
  // deep link or a browser back does not leave the active child hidden.
  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  const Icon = item.icon

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`group flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          defaultOpen ? 'text-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
        }`}
      >
        <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${defaultOpen ? 'text-[#00ab00]' : 'text-slate-400 group-hover:text-slate-600'}`} />
        <span className="flex-1 truncate text-left">{item.name}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 pl-[22px]">
          {item.children!.map((child) => {
            const active = isActive(child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2.5 rounded-lg py-1.5 pl-3 pr-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  active ? 'bg-[#e9f3ed] text-[#027a48]' : 'text-slate-500 hover:bg-slate-50 hover:text-navy'
                }`}
              >
                {/* A short rail so children read as belonging to the parent. */}
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${active ? 'bg-[#00ab00]' : 'bg-slate-300'}`} />
                <span className="truncate">{child.name}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
