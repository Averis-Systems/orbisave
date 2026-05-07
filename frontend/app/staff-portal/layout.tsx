"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, Users, ShieldCheck, Settings, 
  LogOut, Bell, Menu, Search, Globe, Filter
} from "lucide-react"

const B = {
  navy: "#0a2540",
  green: "#00ab00",
  offWhite: "#f7f9f8",
  border: "rgba(255,255,255,0.1)",
}

export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && (!isAuthenticated || (user?.role !== 'platform_admin' && user?.role !== 'super_admin'))) {
      router.replace("/login")
    }
  }, [isMounted, isAuthenticated, user, router])

  if (!isMounted || !isAuthenticated || !user) return null

  const navItems = [
    { name: "Dashboard", href: "/staff-portal", icon: LayoutDashboard },
    { name: "KYC Queue", href: "/staff-portal/kyc", icon: ShieldCheck },
    { name: "Users", href: "/staff-portal/users", icon: Users },
    { name: "Settings", href: "/staff-portal/settings", icon: Settings },
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
          <div className="text-[10px] font-bold text-[#00ab00] tracking-widest uppercase opacity-80">
            Staff Portal · {user.country}
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
                  isActive ? 'bg-[#00ab00] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#00ab00] flex items-center justify-center font-bold text-xs">
              {user.full_name?.slice(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.full_name}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-tighter">{user.role.replace('_', ' ')}</p>
            </div>
            <button onClick={() => { logout(); router.push('/login') }} className="text-white/30 hover:text-white">
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
              {pathname === "/staff-portal" ? "Overview" : pathname.split("/").pop()?.replace(/-/g, " ")}
            </h1>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
              <Globe size={14} />
              <span>{user.country?.toUpperCase()} OPERATIONS</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search users, docs..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-[#00ab00] transition-all w-64"
              />
            </div>
            <button className="relative p-2 text-gray-400 hover:text-[#0a2540] transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00ab00] rounded-full border-2 border-white" />
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
