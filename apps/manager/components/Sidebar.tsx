'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Banknote,
  FileText,
  BarChart3,
  AlertTriangle,
  MessagesSquare,
  Landmark,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

type NavItem = {
  name: string
  icon: React.ElementType
  href?: string
  children?: { name: string; href: string }[]
}

const menuItems: NavItem[] = [
  { name: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  {
    name: 'Groups',
    icon: ShieldCheck,
    children: [
      { name: 'Verification Queue', href: '/dashboard/groups' },
      { name: 'All Groups',         href: '/dashboard/groups/all' },
    ],
  },
  {
    name: 'KYC',
    icon: UserCheck,
    children: [
      { name: 'Review Queue', href: '/dashboard/kyc' },
      { name: 'Approved',     href: '/dashboard/kyc?status=approved' },
      { name: 'Rejected',     href: '/dashboard/kyc?status=rejected' },
    ],
  },
  {
    name: 'Members',
    icon: Users,
    children: [
      { name: 'All Members',   href: '/dashboard/members' },
      { name: 'Suspended',     href: '/dashboard/members?filter=suspended' },
    ],
  },
  {
    name: 'Loans',
    icon: Banknote,
    children: [
      { name: 'Pending Approval', href: '/dashboard/loans?status=pending_admin' },
      { name: 'Active Loans',     href: '/dashboard/loans?status=active' },
      { name: 'Defaulted',        href: '/dashboard/loans?status=defaulted' },
      { name: 'All Loans',        href: '/dashboard/loans' },
    ],
  },
  {
    name: 'Contributions',
    icon: Landmark,
    children: [
      { name: 'All',      href: '/dashboard/contributions' },
      { name: 'Failed',   href: '/dashboard/contributions?status=failed' },
      { name: 'Pending',  href: '/dashboard/contributions?status=pending' },
    ],
  },
  { name: 'Analytics',     icon: BarChart3,      href: '/dashboard/analytics' },
  { name: 'Audit Trail',   icon: FileText,       href: '/dashboard/audit' },
  { name: 'Trust Account', icon: AlertTriangle,  href: '/dashboard/trust-account' },
  { name: 'Support',       icon: MessagesSquare, href: '/dashboard/support' },
  { name: 'Settings',      icon: Settings,       href: '/dashboard/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const logout = useAuthStore((s) => s.logout)
  const user   = useAuthStore((s) => s.user)

  // Track which parent menus are open
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    menuItems.forEach((item) => {
      if (item.children?.some((c) => pathname.startsWith(c.href.split('?')[0]))) {
        init[item.name] = true
      }
    })
    return init
  })

  const toggle = (name: string) =>
    setOpen((prev) => ({ ...prev, [name]: !prev[name] }))

  const isActive = (href: string) => {
    const base = href.split('?')[0]
    if (base === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(base)
  }

  return (
    <div className="w-64 h-full bg-navy flex flex-col border-r border-white/5 overflow-y-auto">
      {/* Logo */}
      <div className="px-6 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-sm">O</div>
          <span className="font-bold text-white text-lg tracking-tight">Manager</span>
        </div>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
          {user?.country ? user.country.charAt(0).toUpperCase() + user.country.slice(1) : 'Region'} Portal
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {menuItems.map((item) => {
          if (item.href && !item.children) {
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                  active
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-white/40 group-hover:text-white'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </Link>
            )
          }

          // Parent with children
          const parentActive = item.children?.some((c) => isActive(c.href))
          const isOpen = open[item.name]

          return (
            <div key={item.name}>
              <button
                onClick={() => toggle(item.name)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                  parentActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${parentActive ? 'text-primary' : 'text-white/40 group-hover:text-white'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                  : <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                  {item.children!.map((child) => {
                    const childActive = isActive(child.href)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center px-3 py-2 rounded-md text-xs font-medium transition-all ${
                          childActive
                            ? 'bg-primary/20 text-primary'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        <div className="bg-white/5 rounded-lg p-3 mb-3">
          <p className="text-[10px] text-white/30 mb-0.5">Logged in as</p>
          <p className="text-sm font-bold text-white truncate">{user?.full_name}</p>
          <p className="text-[10px] text-white/20 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all font-medium text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
