"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import {
  LayoutDashboard, Users, CreditCard, Settings, LogOut,
  Bell, LineChart, Menu, AlertTriangle, User,
  Shield, Video, CheckCircle, ChevronDown, Plus,
  Building2, Vote, Wallet, RefreshCw, UserCheck, Settings2
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { KYCModal } from "@/components/dashboard/KYCModal"

// ─── Brand Colors (from homepage) ──────────────────────────────────────────
const B = {
  navy:        "#0a2540",   // sidebar bg, vault, navbar
  navyLight:   "#0f3460",   // hover bg
  green:       "#00ab00",   // primary CTA, active states
  greenLight:  "#e9f3ed",   // light green bg
  greenMuted:  "#d6e4df",   // borders
  white:       "#ffffff",
  offWhite:    "#f7f9f8",   // page background
  textMuted:   "#4a5c6a",   // body text
  textFaint:   "rgba(255,255,255,0.45)",
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

// ─── Mock groups ────────────────────────────────────────────────────────────
const MOCK_GROUPS = [
  { id: "KAC-2025-001", name: "Kisumu Agri Chama",   role: "chairperson", hasLoanPool: true  },
  { id: "TIR-2025-044", name: "Tech Innovators ROSCA", role: "member",     hasLoanPool: false },
]

// ─── Navigation structure ───────────────────────────────────────────────────
// Each section can have items, or items with children (nested dropdowns)
const getNavigation = (role: string, hasLoanPool: boolean) => {
  const isAdmin = role === "chairperson" || role === "treasurer"

  return [
    // ── MAIN ──────────────────────────────────────────────────────
    {
      title: "MAIN",
      flat: true,
      items: [
        { name: "Overview",  href: "/dashboard",          icon: LayoutDashboard },
        { name: "My Group",  href: "/dashboard/my-group", icon: Building2 },
      ],
    },

    // ── CONTRIBUTIONS ─────────────────────────────────────────────
    {
      title: "CONTRIBUTIONS",
      flat: true,
      items: [
        { name: "My Contributions", href: "/dashboard/contributions", icon: Wallet },
      ],
    },

    // ── LOANS ─────────────────────────────────────────────────────
    ...(hasLoanPool ? [{
      title: "LOANS",
      flat: false,
      items: [
        { name: "My Loans",      href: "/dashboard/my-loans",         icon: CreditCard },
        ...(isAdmin ? [
          { name: "Loan Approvals",     href: "/dashboard/loan-approvals",  icon: CheckCircle, badge: 2 },
          { name: "Group Loan Settings", href: "/dashboard/settings/loans",  icon: Settings2 },
        ] : []),
      ],
    }] : []),

    // ── GROUP ─────────────────────────────────────────────────────
    {
      title: "GROUP",
      flat: false,
      items: [
        { name: "Rotations",  href: "/dashboard/rotations", icon: RefreshCw },
        { name: "Meetings",   href: "/dashboard/meetings",  icon: Video },
        ...(isAdmin ? [
          { name: "Members",          href: "/dashboard/members",  icon: Users },
          { name: "Fines & Penalties",href: "/dashboard/fines",    icon: AlertTriangle },
          { name: "Group Reports",    href: "/dashboard/reports",  icon: LineChart },
        ] : []),
      ],
    },

    // ── SETTINGS (admin only) ─────────────────────────────────────
    ...(isAdmin ? [{
      title: "SETTINGS",
      flat: false,
      items: [
        { name: "Group Settings",    href: "/dashboard/settings",          icon: Settings },
        { name: "Rotation Settings", href: "/dashboard/settings/rotations",icon: RefreshCw },
        { name: "Meetings Config",   href: "/dashboard/settings/meetings", icon: Vote },
      ],
    }] : []),

    // ── SYSTEM ────────────────────────────────────────────────────
    {
      title: "SYSTEM",
      flat: true,
      items: [
        { name: "Notifications", href: "/dashboard/notifications", icon: Bell,        badge: 3 },
        { name: "Personal Info", href: "/dashboard/profile",       icon: User },
        ...(role === 'platform_admin' || role === 'super_admin' ? [
          { name: "Staff Portal", href: "/staff-portal", icon: Shield, badge: "Admin" }
        ] : []),
        ...(role === 'super_admin' ? [
          { name: "Super Admin",  href: "/super-admin",  icon: ShieldCheck, badge: "Root" }
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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isCollapsed && sidebarMounted ? "center" : "space-between",
        gap: 10,
        padding: isCollapsed && sidebarMounted ? "11px 0" : "10px 14px",
        borderRadius: 8,
        textDecoration: "none",
        transition: "background 0.15s, color 0.15s",
        background: isActive ? B.green : "transparent",
        color: "#ffffff",
        fontWeight: isActive ? 700 : 400,
        fontSize: 14,
        letterSpacing: "0.01em",
      }}
      onMouseEnter={e => { if (!isActive)(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)" }}
      onMouseLeave={e => { if (!isActive)(e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Icon size={17} style={{ flexShrink: 0, color: isActive ? "#fff" : B.green, opacity: isActive ? 1 : 0.85 }} />
        {!(isCollapsed && sidebarMounted) && <span style={{ opacity: isActive ? 1 : 0.9 }}>{item.name}</span>}
      </div>
      {!(isCollapsed && sidebarMounted) && item.badge && (
        <span style={{
          background: item.badge === "Admin" || item.badge === "Root" ? B.green : "#e53e3e", 
          color: "#fff", fontSize: 10, fontWeight: 700,
          borderRadius: 99, padding: "1px 7px", lineHeight: "16px",
        }}>{item.badge}</span>
      )}
    </Link>
  )
}

// ─── NavSection ─────────────────────────────────────────────────────────────
function NavSection({ section, isCollapsed, sidebarMounted, pathname }: any) {
  const [open, setOpen] = useState(true)

  if (isCollapsed && sidebarMounted) {
    return (
      <div style={{ marginBottom: 8 }}>
        {section.items.map((item: any) => (
          <NavItem key={item.name} item={item} isCollapsed={isCollapsed} sidebarMounted={sidebarMounted} pathname={pathname} />
        ))}
      </div>
    )
  }

  if (section.flat) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
          padding: "0 14px", marginBottom: 6,
        }}>{section.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {section.items.map((item: any) => (
            <NavItem key={item.name} item={item} isCollapsed={isCollapsed} sidebarMounted={sidebarMounted} pathname={pathname} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "0 14px", marginBottom: 6,
          background: "none", border: "none", cursor: "pointer",
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
        }}>{section.title}</span>
        <ChevronDown size={12} style={{
          color: "rgba(255,255,255,0.3)",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }} />
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
  const [activeGroup, setActiveGroup] = useState(MOCK_GROUPS[0])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [isKycModalOpen, setIsKycModalOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const { isCollapsed, toggle, isMounted: sidebarMounted } = useSidebarState()

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

  if (!isMounted) return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: B.offWhite }}>
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

  if (!isAuthenticated || !user) return (
    <div className="min-h-screen p-8" style={{ background: B.offWhite }}>
      <Skeleton className="h-[90vh] w-full" />
    </div>
  )

  const navSections = getNavigation(user.role, activeGroup.hasLoanPool)
  const showKycBanner = user.kyc_status !== "verified"

  const sidebarW = isCollapsed && sidebarMounted ? 68 : 272

  return (
    <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", fontFamily: "inherit" }}>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 30 }}
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40,
        width: sidebarW,
        background: B.navy,
        display: "flex", flexDirection: "column",
        transition: "width 0.3s",
        transform: mobileMenuOpen ? "translateX(0)" : undefined,
        boxShadow: "4px 0 24px rgba(10,37,64,0.18)",
        overflowX: "hidden",
      }}>

        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: isCollapsed && sidebarMounted ? "center" : "space-between",
          padding: isCollapsed && sidebarMounted ? "20px 0" : "20px 20px",
          borderBottom: `1px solid ${B.border}`,
          flexShrink: 0,
        }}>
          {!(isCollapsed && sidebarMounted) && (
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
                <span style={{ color: B.green }}>Orbi</span>Save
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2, fontWeight: 600 }}>
                Financial Platform
              </div>
            </div>
          )}
          <button
            onClick={toggle}
            style={{
              background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer",
              borderRadius: 6, width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.45)", flexShrink: 0,
            }}
          >
            <Menu size={15} />
          </button>
        </div>

        {/* Group Switcher */}
        {!(isCollapsed && sidebarMounted) && (
          <div style={{ padding: "12px 12px 0", flexShrink: 0 }} ref={switcherRef}>
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: `1px solid ${B.border}`, borderRadius: 10,
                padding: "12px 14px", cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: B.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Active Group</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeGroup.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, textTransform: "capitalize" }}>{activeGroup.role}</div>
              </div>
              <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.4)", transform: switcherOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
            </button>

            {switcherOpen && (
              <div style={{
                background: "#0f3460", border: `1px solid ${B.border}`,
                borderRadius: 10, marginTop: 6, overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 14px 6px" }}>My Groups</div>
                {MOCK_GROUPS.map(g => (
                  <button key={g.id} onClick={() => { setActiveGroup(g); setSwitcherOpen(false) }}
                    style={{
                      width: "100%", textAlign: "left", padding: "10px 14px",
                      background: activeGroup.id === g.id ? "rgba(0,171,0,0.12)" : "none",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{g.role}</div>
                    </div>
                    {activeGroup.id === g.id && <CheckCircle size={14} style={{ color: B.green }} />}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${B.border}`, padding: "6px 8px" }}>
                  <button style={{
                    width: "100%", textAlign: "left", padding: "9px 10px",
                    background: "none", border: "none", cursor: "pointer", borderRadius: 6,
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, fontWeight: 700, color: B.green,
                  }}>
                    <Plus size={14} /> Create New Group
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: isCollapsed && sidebarMounted ? "12px 8px" : "16px 10px", overflowY: "auto" }}>
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

        {/* User footer */}
        <div style={{
          borderTop: `1px solid ${B.border}`,
          padding: isCollapsed && sidebarMounted ? "14px 0" : "14px 14px",
          display: "flex", alignItems: "center",
          justifyContent: isCollapsed && sidebarMounted ? "center" : "flex-start",
          gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: B.green, display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontSize: 13,
            fontWeight: 800, flexShrink: 0,
          }}>
            {user.full_name?.slice(0, 2).toUpperCase() ?? "ME"}
          </div>
          {!(isCollapsed && sidebarMounted) && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</div>
                <div style={{ fontSize: 11, color: B.green, fontWeight: 600 }}>View Profile</div>
              </div>
              <button
                onClick={() => { logout(); router.push("/login") }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4, borderRadius: 6 }}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        paddingLeft: sidebarW,
        display: "flex", flexDirection: "column", minHeight: "100vh",
        transition: "padding-left 0.3s",
      }}>

        {/* Topbar */}
        <header style={{
          height: 64, background: "#fff",
          borderBottom: `1px solid ${B.greenMuted}`,
          display: "flex", alignItems: "center",
          padding: "0 32px", gap: 16, flexShrink: 0,
          position: "sticky", top: 0, zIndex: 20,
        }}>
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "none" }}
            className="md:hidden"
          >
            <Menu size={20} />
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: B.navy, letterSpacing: "-0.01em", textTransform: "capitalize" }}>
              {pathname === "/dashboard" ? "Overview" : pathname.split("/").pop()?.replace(/-/g, " ")}
            </div>
            <div style={{ fontSize: 11, color: B.textMuted, fontWeight: 500, marginTop: 1 }}>{activeGroup.name}</div>
          </div>

          {/* KCB Trust badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", borderRadius: 6,
            background: B.greenLight, border: `1px solid ${B.greenMuted}`,
          }}>
            <Shield size={13} style={{ color: B.green }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: B.navy, letterSpacing: "0.05em", textTransform: "uppercase" }}>KCB Trust A/C</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: B.green, display: "inline-block" }} />
          </div>

          {/* Notifications */}
          <button
            onClick={() => router.push("/dashboard/notifications")}
            style={{
              position: "relative", width: 38, height: 38, borderRadius: 8,
              background: B.offWhite, border: `1px solid ${B.greenMuted}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Bell size={16} style={{ color: B.textMuted }} />
            <span style={{
              position: "absolute", top: -4, right: -4,
              width: 17, height: 17, borderRadius: "50%",
              background: "#e53e3e", color: "#fff",
              fontSize: 9, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #fff",
            }}>3</span>
          </button>
        </header>

        {/* KYC Banner */}
        {showKycBanner && (
          <div style={{
            background: B.navy,
            borderBottom: `1px solid rgba(0,171,0,0.25)`,
            padding: "12px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,171,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {user.kyc_status === 'submitted' ? (
                   <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-[#00ab00] animate-spin" />
                ) : (
                  <AlertTriangle size={15} style={{ color: B.green }} />
                )}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>
                {user.kyc_status === 'submitted' ? (
                  <><strong style={{ color: "#fff" }}>KYC Verification Pending.</strong> Your documents are under manual review by our staff.</>
                ) : user.kyc_status === 'rejected' ? (
                  <><strong style={{ color: "#fff" }}>KYC Rejected.</strong> Please resubmit valid documents to unlock your account.</>
                ) : (
                  <><strong style={{ color: "#fff" }}>KYC Verification Required.</strong> Complete your identity verification to unlock full features.</>
                )}
              </p>
            </div>
            {user.kyc_status !== 'submitted' && (
              <button 
                onClick={() => setIsKycModalOpen(true)}
                style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  background: B.green, color: "#fff", border: "none", borderRadius: 6,
                  padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {user.kyc_status === 'rejected' ? 'Resubmit KYC' : 'Complete KYC'}
              </button>
            )}
          </div>
        )}

        {/* KYC Modal */}
        <KYCModal isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} />

        {/* Page content */}
        <main style={{
          flex: 1, padding: "32px", overflowY: "auto",
          background: B.offWhite, maxWidth: 1280, width: "100%", margin: "0 auto",
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
