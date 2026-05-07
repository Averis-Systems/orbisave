"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, Users, ShieldCheck, Settings, 
  LogOut, Bell, Menu, Search, Globe, Filter,
  Building2, LineChart, Server, Database
} from "lucide-react"

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && (!isAuthenticated || user?.role !== 'super_admin')) {
      router.replace("/login")
    }
  }, [isMounted, isAuthenticated, user, router])

  if (!isMounted || !isAuthenticated || !user) return null

  const navItems = [
    { name: "Global Stats", href: "/super-admin", icon: LayoutDashboard },
    { name: "User Directory", href: "/super-admin/users", icon: Users },
    { name: "All Groups", href: "/super-admin/groups", icon: Building2 },
    { name: "Financial Audit", href: "/super-admin/audit", icon: Database },
    { name: "Platform Health", href: "/super-admin/health", icon: Server },
    { name: "Global Settings", href: "/super-admin/settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen flex bg-[#f7f9f8]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a2540] text-white flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#00ab00] font-black text-xl">Orbi</span>
            <span className="font-black text-xl">Save</span>
          </div>
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <ShieldCheck size={10} className="text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive ? 'bg-amber-500 text-[#0a2540]' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-[#0a2540] text-xs">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white">System Controller</p>
              <p className="text-[10px] text-amber-500 uppercase font-black tracking-tighter">Root Access</p>
            </div>
            <button onClick={() => { logout(); router.push('/login') }} className="text-white/30 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-[#0a2540] capitalize">
              {pathname === "/super-admin" ? "Global Overview" : pathname.split("/").pop()?.replace(/-/g, " ")}
            </h1>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <div className="flex items-center gap-4">
               {['kenya', 'rwanda', 'ghana'].map(c => (
                 <div key={c} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ab00]" />
                    <span className="text-[10px] font-black text-gray-500 uppercase">{c}</span>
                 </div>
               ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Global search..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-amber-500 transition-all w-64"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-[#0a2540] transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
