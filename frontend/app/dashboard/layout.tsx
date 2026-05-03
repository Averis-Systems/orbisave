"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, Users, CreditCard, Settings, LogOut, 
  ArrowLeftRight, Bell, PiggyBank, LineChart,
  ChevronLeft, ChevronRight, Menu, X, AlertTriangle, UserCheck, User,
  Loader2
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// --- Custom Hook for Sidebar State ---
function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem("orbisave_sidebar_collapsed")
    if (stored !== null) {
      setIsCollapsed(stored === "true")
    }
  }, [])

  const toggle = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem("orbisave_sidebar_collapsed", String(next))
      return next
    })
  }

  return { isCollapsed, toggle, isMounted }
}

// --- Navigation Logic ---
const getNavigation = (role: string) => {
  const baseNav = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Group", href: "/dashboard/my-group", icon: Users },
    { name: "Personal Info", href: "/dashboard/profile", icon: User },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ]
  const memberNav = [
    { name: "Contributions", href: "/dashboard/contributions", icon: PiggyBank },
    { name: "My Loan", href: "/dashboard/loans", icon: CreditCard },
    { name: "Rotation", href: "/dashboard/rotation", icon: ArrowLeftRight },
  ]
  const treasurerNav = [
    { name: "Finance Overview", href: "/dashboard/finance", icon: LineChart },
    { name: "Contribution Mgmt", href: "/dashboard/contribution-mgmt", icon: PiggyBank },
  ]
  const chairpersonNav = [
    { name: "Group Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Member Mgmt", href: "/dashboard/members", icon: UserCheck },
    { name: "Rotation Control", href: "/dashboard/rotation-control", icon: ArrowLeftRight },
    { name: "Loan Approvals", href: "/dashboard/loan-approvals", icon: CreditCard },
  ]

  let nav = [...baseNav, ...memberNav]
  
  if (role === 'treasurer') {
    nav = [...nav, ...treasurerNav]
  } else if (role === 'chairperson') {
    // Note: The prompt doesn't explicitly say Chairperson gets Treasurer items, but often they do.
    // Following prompt strictly: Chairperson gets Member + specific items.
    nav = [...nav, ...chairpersonNav]
  }

  return nav
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  
  const [isMounted, setIsMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const { isCollapsed, toggle, isMounted: sidebarMounted } = useSidebarState()

  // 1. Mark as mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 2. Separate effect for auth redirect to avoid hook order issues during hydration
  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isMounted, isAuthenticated, router])

  // 3. Early return only for non-mounted state or unauthorized state
  // We use isMounted to avoid hydration mismatch, and isAuthenticated to protect content
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#f9faf6] p-8 space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          <Skeleton className="h-[80vh] w-full" />
          <div className="col-span-3 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // If not authenticated, we still show the skeleton while the redirect is happening
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#f9faf6] p-8 space-y-6">
        <Skeleton className="h-[90vh] w-full" />
      </div>
    )
  }

  const navItems = getNavigation(user.role || 'member')
  const showKycBanner = user.kyc_status !== 'verified' && (user.role === 'chairperson' || user.role === 'treasurer')

  return (
    <div className="min-h-screen bg-[#f9faf6] flex font-sans text-[#1a1c1a]">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Shell */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-black/5 flex flex-col transition-all duration-300
          ${isCollapsed && sidebarMounted ? 'w-20' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-black/5">
          <Link href="/dashboard" className={`text-xl font-bold tracking-tight text-[#012d1d] flex items-center gap-2 ${isCollapsed && sidebarMounted ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded bg-[#012d1d] flex items-center justify-center shrink-0">
              <span className="text-white text-sm">O</span>
            </div>
            {!(isCollapsed && sidebarMounted) && "OrbiSave"}
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed && sidebarMounted ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-[#012d1d] text-white" 
                    : "text-[#717973] hover:bg-[#f3f4f1] hover:text-[#012d1d]"
                } ${isCollapsed && sidebarMounted ? 'justify-center' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!(isCollapsed && sidebarMounted) && item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-black/5 flex flex-col gap-2">
          {/* Collapse Toggle Desktop */}
          <button 
            onClick={toggle}
            className={`hidden md:flex items-center justify-center p-2 text-[#717973] hover:bg-[#f3f4f1] hover:text-[#012d1d] rounded transition-colors w-full mb-2`}
          >
            {isCollapsed && sidebarMounted ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          <div className={`flex items-center gap-3 px-2 py-2 ${isCollapsed && sidebarMounted ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-[#012d1d]/10 flex items-center justify-center text-[#012d1d] font-bold text-xs uppercase shrink-0 border border-[#012d1d]/20">
              {user.full_name ? user.full_name.slice(0, 2) : "ME"}
            </div>
            {!(isCollapsed && sidebarMounted) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#1a1c1a] truncate">{user.full_name}</span>
                <span className="text-[10px] tracking-widest uppercase text-[#717973]">{user.role}</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              logout()
              router.push("/login")
            }}
            title={isCollapsed && sidebarMounted ? "Sign Out" : undefined}
            className={`w-full flex items-center gap-3 py-2.5 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-lg transition-colors font-bold ${isCollapsed && sidebarMounted ? 'justify-center' : 'px-3'}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!(isCollapsed && sidebarMounted) && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed && sidebarMounted ? 'md:pl-20' : 'md:pl-64'}`}>
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-black/5 bg-white flex items-center justify-between px-4 sticky top-0 z-20">
          <Link href="/dashboard" className="font-bold tracking-tight text-[#012d1d] flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#012d1d] flex items-center justify-center text-white text-xs">O</div>
            OrbiSave
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-[#012d1d]">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* KYC Banner */}
        {showKycBanner && (
          <div className="bg-[#ffeb3b]/20 border-b border-[#fbc02d]/30 px-6 py-3 flex items-center justify-between gap-4 sticky top-0 md:top-0 z-10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#f57f17] shrink-0" />
              <p className="text-sm font-medium text-[#f57f17] leading-tight">
                <strong>⚠️ Your KYC is pending.</strong> Complete identity verification to unlock group features.
              </p>
            </div>
            <Link href="/dashboard/settings/kyc" className="text-xs font-bold bg-[#f57f17] text-white px-3 py-1.5 rounded hover:bg-[#e65100] transition-colors whitespace-nowrap">
              Complete KYC →
            </Link>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-10 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
