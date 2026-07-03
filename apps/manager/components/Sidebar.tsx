'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Banknote,
  FileText,
  HandCoins,
  Headphones,
  Landmark,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { mt } from '@/lib/terminology'

type NavItem = {
  name: string
  icon: ElementType
  href: string
}

const menuItems: NavItem[] = [
  { name: mt('nav.overview'), icon: LayoutDashboard, href: '/dashboard' },
  { name: mt('nav.groupVerification'), icon: ShieldCheck, href: '/dashboard/groups' },
  { name: mt('nav.kycReview'), icon: UserCheck, href: '/dashboard/kyc' },
  { name: mt('nav.members'), icon: Users, href: '/dashboard/members' },
  { name: mt('nav.loans'), icon: Banknote, href: '/dashboard/loans' },
  { name: mt('nav.contributions'), icon: HandCoins, href: '/dashboard/contributions' },
  { name: mt('nav.savings'), icon: PiggyBank, href: '/dashboard/savings' },
  { name: mt('nav.trustAccount'), icon: Landmark, href: '/dashboard/trust-account' },
  { name: mt('nav.auditLogs'), icon: FileText, href: '/dashboard/audit' },
  { name: mt('nav.support'), icon: Headphones, href: '/dashboard/support' },
  { name: mt('nav.settings'), icon: Settings, href: '/dashboard/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="dashboard-shell flex h-full w-[260px] flex-shrink-0 flex-col border-r border-gray-200 bg-white px-5 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
      <div className="flex-shrink-0 py-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00ab00] text-sm font-bold text-white">
            OS
          </span>
          <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{mt('shell.title')}</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4 no-scrollbar">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#e9f3ed] text-[#00ab00]'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-[#00ab00]' : 'text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="flex-shrink-0 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f3ed] text-xs font-semibold text-[#00ab00]">
            {user?.full_name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">{user?.full_name || mt('shell.userFallback')}</p>
            <p className="truncate text-xs text-gray-400">{user?.country ? `${user.country} operations` : mt('shell.scopeFallback')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#d92d20] transition-colors hover:bg-[#fef3f2]"
        >
          <LogOut className="h-4 w-4" />
          {mt('shell.signOut')}
        </button>
      </div>
    </aside>
  )
}
