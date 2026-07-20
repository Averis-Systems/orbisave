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

type NavChild = { name: string; href: string }
type NavItem = { name: string; icon: ElementType; href?: string; children?: NavChild[] }
type NavSection = { label?: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    items: [{ name: ct('nav.overview'), icon: LayoutDashboard, href: '/dashboard' }],
  },
  {
    label: ct('sections.operations'),
    items: [
      { name: ct('nav.countries'), icon: Globe, href: '/dashboard/countries' },
      { name: ct('nav.groups'), icon: ShieldCheck, href: '/dashboard/groups' },
      { name: ct('nav.users'), icon: Users, href: '/dashboard/users' },
      { name: ct('nav.loans'), icon: Banknote, href: '/dashboard/loans' },
      { name: ct('nav.savings'), icon: PiggyBank, href: '/dashboard/savings' },
    ],
  },
  {
    label: ct('sections.oversight'),
    items: [
      { name: ct('nav.trustAccounts'), icon: Landmark, href: '/dashboard/trust' },
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

const ACTIVE = 'bg-[#e9f3ed] text-[#00ab00]'
const IDLE = 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  // A parent is "active" when any of its children matches the current route.
  const parentActive = (item: NavItem) => !!item.children?.some((c) => isActive(c.href))

  return (
    <aside className="dashboard-shell flex h-full w-[264px] flex-shrink-0 flex-col border-r border-gray-200 bg-white px-4">
      <div className="flex-shrink-0 px-1 py-6">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00ab00] text-sm font-bold text-white">
            OS
          </span>
          <span className="text-xl font-semibold tracking-tight text-gray-900">{ct('shell.title')}</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4 no-scrollbar">
        {sections.map((section, i) => (
          <div key={section.label || `top-${i}`} className={i === 0 ? '' : 'mt-6'}>
            {section.label && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{section.label}</p>
            )}
            <div className="space-y-1">
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
                  <Link
                    key={item.name}
                    href={item.href!}
                    onClick={onNavigate}
                    aria-current={isActive(item.href!) ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.href!) ? ACTIVE : IDLE
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        isActive(item.href!) ? 'text-[#00ab00]' : 'text-gray-500 group-hover:text-gray-900'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f3ed] text-xs font-semibold text-[#00ab00]">
            {user?.full_name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800">{user?.full_name || ct('shell.userFallback')}</p>
            <p className="truncate text-xs text-gray-400">{ct('shell.scope')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#d92d20] transition-colors hover:bg-[#fef3f2]"
        >
          <LogOut className="h-4 w-4" />
          {ct('shell.signOut')}
        </button>
      </div>
    </aside>
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
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          defaultOpen ? 'text-gray-900' : IDLE
        }`}
      >
        <Icon className={`h-5 w-5 flex-shrink-0 ${defaultOpen ? 'text-[#00ab00]' : 'text-gray-500 group-hover:text-gray-900'}`} />
        <span className="flex-1 truncate text-left">{item.name}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1 space-y-1 pl-4">
          {item.children!.map((child) => {
            const active = isActive(child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-sm font-medium transition-colors ${
                  active ? ACTIVE : IDLE
                }`}
              >
                {/* A short rail so children read as belonging to the parent. */}
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${active ? 'bg-[#00ab00]' : 'bg-gray-300'}`} />
                <span className="truncate">{child.name}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
