'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield,
  Globe,
  Users,
  BarChart3,
  Database,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  FileText,
  Activity,
  Banknote,
  UserCheck,
  ShieldCheck,
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
  { name: 'Console Home', icon: Shield, href: '/dashboard' },
  {
    name: 'Countries',
    icon: Globe,
    children: [
      { name: 'Kenya Overview',   href: '/dashboard/countries/kenya' },
      { name: 'Rwanda Overview',  href: '/dashboard/countries/rwanda' },
      { name: 'Ghana Overview',   href: '/dashboard/countries/ghana' },
      { name: 'All Countries',    href: '/dashboard/countries' },
    ],
  },
  {
    name: 'Regional Admins',
    icon: Users,
    children: [
      { name: 'All Admins',      href: '/dashboard/admins' },
      { name: 'Provision Admin', href: '/dashboard/admins/new' },
    ],
  },
  {
    name: 'Groups',
    icon: ShieldCheck,
    children: [
      { name: 'Pending Review', href: '/dashboard/groups?verification_status=pending_review' },
      { name: 'All Groups',     href: '/dashboard/groups' },
    ],
  },
  {
    name: 'Members & KYC',
    icon: UserCheck,
    children: [
      { name: 'All Users',   href: '/dashboard/users' },
      { name: 'KYC Queue',   href: '/dashboard/kyc' },
      { name: 'Suspended',   href: '/dashboard/users?filter=suspended' },
    ],
  },
  {
    name: 'Loans',
    icon: Banknote,
    children: [
      { name: 'Pending Admin',  href: '/dashboard/loans?status=pending_admin' },
      { name: 'Active Loans',   href: '/dashboard/loans?status=active' },
      { name: 'All Loans',      href: '/dashboard/loans' },
    ],
  },
  {
    name: 'Provider Hub',
    icon: Database,
    children: [
      { name: 'All Providers',    href: '/dashboard/payments' },
      { name: 'Add Provider',     href: '/dashboard/payments/new' },
      { name: 'System Health',    href: '/dashboard/health' },
    ],
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    children: [
      { name: 'Platform Overview', href: '/dashboard/analytics' },
      { name: 'Kenya',             href: '/dashboard/analytics?country=kenya' },
      { name: 'Rwanda',            href: '/dashboard/analytics?country=rwanda' },
      { name: 'Ghana',             href: '/dashboard/analytics?country=ghana' },
    ],
  },
  {
    name: 'Logs & Audit',
    icon: FileText,
    children: [
      { name: 'Global Audit Trail', href: '/dashboard/logs' },
      { name: 'API Logs',           href: '/dashboard/logs?tab=api' },
      { name: 'System Events',      href: '/dashboard/logs?tab=system' },
    ],
  },
  { name: 'Trust Accounts', icon: Landmark,  href: '/dashboard/trust' },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Platform Settings', href: '/dashboard/settings' },
      { name: 'API Configuration', href: '/dashboard/settings/apis' },
      { name: 'Regional Defaults', href: '/dashboard/settings/regions' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const logout   = useAuthStore((s) => s.logout)
  const user     = useAuthStore((s) => s.user)

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
    <div className="w-64 h-full bg-[#0a2540] flex flex-col border-r border-white/5 overflow-y-auto">
      {/* Logo */}
      <div className="px-6 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-primary/20">O</div>
          <span className="font-bold text-white text-lg tracking-tight">Console</span>
        </div>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Global Oversight</p>
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
                    ? 'bg-primary text-white shadow-xl shadow-primary/20'
                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-white/20 group-hover:text-white'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-30" />}
              </Link>
            )
          }

          const parentActive = item.children?.some((c) => isActive(c.href))
          const isOpen = open[item.name]

          return (
            <div key={item.name}>
              <button
                onClick={() => toggle(item.name)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                  parentActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${parentActive ? 'text-primary' : 'text-white/20 group-hover:text-white'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 opacity-30" />
                  : <ChevronRight className="w-3.5 h-3.5 opacity-30" />}
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
                            : 'text-white/30 hover:bg-white/5 hover:text-white'
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
        <div className="bg-white/5 rounded-lg p-3 mb-3 border border-white/5">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-0.5">Authenticated As</p>
          <p className="text-sm font-bold text-white truncate">{user?.full_name}</p>
          <div className="inline-flex items-center gap-1 mt-1 bg-primary/20 text-primary text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
            Super Admin
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium text-sm"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </button>
      </div>
    </div>
  )
}
