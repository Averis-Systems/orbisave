"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import {
  LayoutDashboard, Users, CreditCard, Settings, LogOut,
  Bell, LineChart, Menu, AlertTriangle, User,
  Shield, Video, CheckCircle, ChevronDown, Plus, ShieldCheck,
  Building2, RefreshCw, Wallet, Settings2, UserCheck
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { KYCModal } from "@/components/dashboard/KYCModal"
import { GuidedOnboardingModal } from "@/components/dashboard/GuidedOnboardingModal"
import { useGroups } from "@/hooks/useGroups"
import { useNotifications } from "@/hooks/useNotifications"

// ─── Brand Colors ──────────────────────────────────────────────────────────
const B = {
  navy:        "#0a2540",
  navyLight:   "#0f3460",
  green:       "#00ab00",
  greenLight:  "#e9f3ed",
  greenMuted:  "#d6e4df",
  white:       "#ffffff",
  offWhite:    "#f7f9f8",
  textMuted:   "#4a5c6a",
  border:      "rgba(255,255,255,0.07)",
}

// ─── Sidebar state hook ─────────────────────────────────────────────────────
function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem("orbisave_sidebar_collapsed")
    if (stored !== null) setIsCollapsed(stored === "true")
  }, [])
  const toggle = () => setIsCollapsed(prev => {
    const next = !prev
    localStorage.setItem("orbisave_sidebar_collapsed", String(next))
    return next
  })
  return { isCollapsed, toggle, isMounted }
}

// ─── Navigation structure ───────────────────────────────────────────────────
const getNavigation = (role: string, hasLoanPool: boolean) => {
  const isAdmin = role === "chairperson" || role === "treasurer"

  return [
    {
      title: "Main",
      flat: true,
      items: [
        { name: "Overview",  href: "/dashboard",          icon: LayoutDashboard },
        { name: "My Group",  href: "/dashboard/my-group", icon: Building2 },
      ],
    },
    {
      title: "Financing",
      flat: true,
      items: [
        { name: "Contributions", href: "/dashboard/contributions", icon: Wallet },
        ...(hasLoanPool ? [
          { name: "My Loans", href: "/dashboard/my-loans", icon: CreditCard },
        ] : []),
      ],
    },
    ...(isAdmin ? [{
      title: "Management",
      flat: false,
      items: [
        { name: "Members",      href: "/dashboard/members",  icon: Users },
        { name: "Loan Approvals", href: "/dashboard/loan-approvals", icon: UserCheck, badge: 2 },
        { name: "Rotations",    href: "/dashboard/rotations", icon: RefreshCw },
        { name: "Meetings",     href: "/dashboard/meetings",  icon: Video },
      ],
    }] : []),
    {
      title: "System",
      flat: true,
      items: [
        { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: 3 },
        { name: "Personal Profile", href: "/dashboard/profile", icon: User },
        ...(isAdmin ? [
          { name: "Group Settings", href: "/dashboard/settings", icon: Settings },
        ] : []),
        ...(role === 'platform_admin' || role === 'super_admin' ? [
          { name: "Staff Portal", href: "/staff-portal", icon: Shield, badge: "Admin" }
        ] : []),
      ],
    },
  ]
}

// ─── NavItem ────────────────────────────────────────────────────────────────
function NavItem({ item, isCollapsed, sidebarMounted, pathname }: any) {
  const isActive = pathname === item.href ||
    (pathname.startsWith(item.href + "/") && item.href !== "/dashboard")
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={isCollapsed && sidebarMounted ? item.name : undefined}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${
        isActive ? 'bg-[#00ab00] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      } ${isCollapsed && sidebarMounted ? 'justify-center px-0' : ''}`}
    >
      <Icon size={18} className={`${isActive ? 'text-white' : 'text-[#00ab00]'} shrink-0`} />
      {!(isCollapsed && sidebarMounted) && (
        <span className={`text-sm font-bold truncate flex-1 ${isActive ? '' : 'group-hover:translate-x-1 transition-transform'}`}>
          {item.name}
        </span>
      )}
      {!(isCollapsed && sidebarMounted) && item.badge && (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
          item.badge === "Admin" ? 'bg-[#00ab00] text-white' : 'bg-red-500 text-white'
        }`}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

// ─── NavSection ─────────────────────────────────────────────────────────────
function NavSection({ section, isCollapsed, sidebarMounted, pathname }: any) {
  const [open, setOpen] = useState(true)

  if (isCollapsed && sidebarMounted) {
    return (
      <div className="mb-4 space-y-1">
        {section.items.map((item: any) => (
          <NavItem key={item.name} item={item} isCollapsed={isCollapsed} sidebarMounted={sidebarMounted} pathname={pathname} />
        ))}
      </div>
    )
  }

  if (section.flat) {
    return (
      <div className="mb-8">
        <div className="px-4 mb-2">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{section.title}</h3>
        </div>
        <div className="space-y-1">
          {section.items.map((item: any) => (
            <NavItem key={item.name} item={item} isCollapsed={isCollapsed} sidebarMounted={sidebarMounted} pathname={pathname} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 mb-2 group"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">{section.title}</span>
        <ChevronDown size={12} className={`text-white/20 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-1">
          {section.items.map((item: any) => (
            <NavItem key={item.name} item={item} isCollapsed={isCollapsed} sidebarMounted={sidebarMounted} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Layout ────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  const [isMounted, setIsMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [isKycModalOpen, setIsKycModalOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const { isCollapsed, toggle, isMounted: sidebarMounted } = useSidebarState()
  
  const { data: groups, isLoading: groupsLoading, isError: groupsError } = useGroups()
  const activeGroup = groups?.find(g => g.id === activeGroupId) || groups?.[0] || null

  const { data: notifications } = useNotifications(activeGroup?.id || null)
  const unreadCount = notifications?.filter(n => !n.read_at).length || 0

  useEffect(() => {
    setIsMounted(true)
    const handleClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (isMounted && !isAuthenticated) router.replace("/login")
  }, [isMounted, isAuthenticated, router])

  if (!isMounted) return null

  if (!isAuthenticated || !user) {
    return null
  }

  const navSections = activeGroup 
    ? getNavigation(user.role, (activeGroup.wallet?.loan_pool ?? 0) > 0)
    : getNavigation(user.role, false)

  const showKycBanner = user.kyc_status !== "verified"
  const sidebarW = isCollapsed && sidebarMounted ? 80 : 280

  return (
    <div className="min-h-screen bg-[#f7f9f8] flex">
      {/* Sidebar */}
      <aside 
        style={{ width: sidebarW }}
        className={`fixed top-0 left-0 bottom-0 z-40 bg-[#0a2540] flex flex-col transition-all duration-300 shadow-2xl border-r border-white/5 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`p-6 border-b border-white/5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
           {!isCollapsed && (
             <div className="flex flex-col">
                <span className="text-xl font-black text-white tracking-tight"><span className="text-[#00ab00]">Orbi</span>Save</span>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Chama Engine v2</span>
             </div>
           )}
           <button 
             onClick={toggle}
             className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
           >
              <Menu size={16} />
           </button>
        </div>

        {/* Group Switcher */}
        {!isCollapsed && activeGroup && (
          <div className="px-4 py-6" ref={switcherRef}>
             <button 
               onClick={() => setSwitcherOpen(!switcherOpen)}
               className="w-full bg-white/5 border border-white/5 rounded-lg p-4 text-left group hover:bg-white/10 transition-all relative"
             >
                <p className="text-[9px] font-black uppercase tracking-widest text-[#00ab00] mb-1">Active Pool</p>
                <div className="flex items-center justify-between">
                   <span className="text-sm font-bold text-white truncate pr-4">{activeGroup.name}</span>
                   <ChevronDown size={14} className={`text-white/30 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {switcherOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f3460] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                     <div className="p-2 space-y-1">
                        {groups?.map(g => (
                          <button 
                            key={g.id} 
                            onClick={() => { setActiveGroupId(g.id); setSwitcherOpen(false) }}
                            className={`w-full text-left p-3 rounded-md text-xs font-bold transition-colors flex items-center justify-between ${
                              activeGroup.id === g.id ? 'bg-[#00ab00] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {g.name}
                            {activeGroup.id === g.id && <CheckCircle size={12} />}
                          </button>
                        ))}
                        <button 
                          onClick={() => router.push("/dashboard/settings")}
                          className="w-full text-left p-3 rounded-md text-xs font-black text-[#00ab00] border-t border-white/5 mt-1 hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                           <Plus size={14} /> Create New Pool
                        </button>
                     </div>
                  </div>
                )}
             </button>
          </div>
        )}

        {/* Nav Content */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
           {navSections.map(section => (
             <NavSection
               key={section.title}
               section={section}
               isCollapsed={isCollapsed}
               sidebarMounted={sidebarMounted}
               pathname={pathname}
             />
           ))}
        </nav>

        {/* User Footer */}
        <div className={`p-6 border-t border-white/5 bg-black/10 flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
           <div className="w-10 h-10 rounded-lg bg-[#00ab00] flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-[#00ab00]/20">
              {user.full_name?.charAt(0).toUpperCase()}
           </div>
           {!isCollapsed && (
             <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{user.full_name}</p>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter truncate">{user.role}</p>
             </div>
           )}
           {!isCollapsed && (
             <button 
               onClick={() => { logout(); router.push("/login") }}
               className="text-white/20 hover:text-red-400 transition-colors"
             >
                <LogOut size={16} />
             </button>
           )}
        </div>
      </aside>

      {/* Main Container */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ paddingLeft: sidebarW }}
      >
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#d6e4df] flex items-center px-8 sticky top-0 z-30 justify-between">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-[#0a2540]"
              >
                <Menu size={20} />
              </button>
              <div>
                 <h2 className="text-lg font-black text-[#0a2540] capitalize tracking-tight">
                    {pathname === "/dashboard" ? "Overview" : pathname.split("/").pop()?.replace(/-/g, " ")}
                 </h2>
              </div>
           </div>

           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-[#e9f3ed] border border-[#d6e4df] rounded-lg">
                 <ShieldCheck size={14} className="text-[#00ab00]" />
                 <span className="text-[10px] font-black text-[#0a2540] uppercase tracking-widest">{activeGroup?.currency || 'KES'} Escrow Protected</span>
              </div>

              <button 
                onClick={() => router.push("/dashboard/notifications")}
                className="w-10 h-10 rounded-lg border border-[#d6e4df] flex items-center justify-center text-[#4a5c6a] hover:bg-gray-50 transition-all relative"
              >
                 <Bell size={18} />
                 {unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount}
                   </span>
                 )}
              </button>
           </div>
        </header>

        {/* KYC Alert */}
        {showKycBanner && (
          <div className="bg-[#0a2540] px-8 py-3 flex items-center justify-between border-b border-[#00ab00]/20 animate-in slide-in-from-top duration-500">
             <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#00ab00]/10 flex items-center justify-center">
                   {user.kyc_status === 'submitted' ? (
                      <div className="w-4 h-4 border-2 border-[#00ab00] border-t-transparent rounded-full animate-spin" />
                   ) : (
                      <AlertTriangle size={16} className="text-[#00ab00]" />
                   )}
                </div>
                <p className="text-xs font-bold text-white/80">
                   {user.kyc_status === 'submitted' 
                     ? "KYC in Review — Your account is being verified by regional compliance staff."
                     : "Identity Verification Required — Complete your KYC to unlock global pool services."}
                </p>
             </div>
             {user.kyc_status !== 'submitted' && (
               <button 
                 onClick={() => setIsKycModalOpen(true)}
                 className="px-6 py-2 bg-[#00ab00] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#008a00] transition-all shadow-lg shadow-[#00ab00]/20"
               >
                  Verify Now
               </button>
             )}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
           {children}
        </main>

        <KYCModal isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} />
        <GuidedOnboardingModal />
      </div>
    </div>
  )
}
