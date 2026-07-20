"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useHydrated } from "@/hooks/useHydrated"
import {
  Bell,
  CheckCircle,
  ChevronDown,
  Info,
  LogOut,
  Menu,
  Plus,
  Settings as SettingsIcon,
  X,
  UserCircle,
} from "lucide-react"
import { KYCModal } from "@/components/dashboard/KYCModal"
import { GuidedOnboardingModal } from "@/components/dashboard/GuidedOnboardingModal"
import { AppStateNotice } from "@/components/states/AppState"
import { useActiveGroup } from "@/hooks/useGroups"
import { useNotifications } from "@/hooks/useNotifications"
import { getUserDashboardNavItems, type DashboardNavSection } from "@/lib/dashboard-reference"

function useDashboardSidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleSidebar: () => setIsExpanded((current) => !current),
    toggleMobileSidebar: () => setIsMobileOpen((current) => !current),
    closeMobileSidebar: () => setIsMobileOpen(false),
  }
}

/*
 * Dark mode is deliberately not offered yet.
 *
 * The toggle worked, but the dashboard is not dark-ready: the overview page
 * carries no dark: classes at all, so switching rendered it as a white slab
 * while the shell went dark. Shipping a control that visibly breaks the page
 * is worse than not shipping it.
 *
 * The dark: variants already present on the shared primitives and most pages
 * are kept, so re-enabling is a matter of finishing the remaining pages and
 * restoring this hook plus the header button. Do not restore the toggle until
 * every dashboard page renders correctly with the `dark` class applied.
 */

function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/overview"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarNav({
  sections,
  pathname,
  isExpanded,
  isHovered,
  isMobileOpen,
}: {
  sections: DashboardNavSection[]
  pathname: string
  isExpanded: boolean
  isHovered: boolean
  isMobileOpen: boolean
}) {
  const showText = isExpanded || isHovered || isMobileOpen
  const items = sections.flatMap((section) => section.items)

  return (
    <nav className="flex-1 overflow-y-auto pb-4 no-scrollbar">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isRouteActive(pathname, item.href)
          const Icon = item.icon

          return (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#e9f3ed] text-[#00ab00]"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                } ${showText ? "justify-start" : "lg:justify-center"}`}
                title={!showText ? item.name : undefined}
              >
                <Icon
                  size={20}
                  className={active ? "text-[#00ab00]" : "text-gray-500 group-hover:text-gray-700 dark:group-hover:text-white"}
                />
                {showText && <span className="truncate">{item.name}</span>}
                {showText && item.badge && (
                  <span
                    className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${
                      active ? "bg-[#d6e4df] text-[#00ab00]" : "bg-[#e9f3ed] text-[#00ab00]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function AppSidebar({
  sections,
  pathname,
  isExpanded,
  isMobileOpen,
  isHovered,
  setIsHovered,
  activeGroupName,
}: {
  sections: DashboardNavSection[]
  pathname: string
  isExpanded: boolean
  isMobileOpen: boolean
  isHovered: boolean
  setIsHovered: (value: boolean) => void
  activeGroupName?: string
}) {
  const showText = isExpanded || isHovered || isMobileOpen

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 dark:text-white lg:mt-0 ${
        showText ? "w-[260px]" : "w-[84px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex py-8 ${showText ? "justify-start" : "lg:justify-center"}`}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00ab00] text-sm font-bold text-white">
            OS
          </span>
          {showText && (
            <span className="leading-none">
              <span className="block text-xl font-semibold text-gray-900 dark:text-white">
                Orbi<span className="text-[#00ab00]">Save</span>
              </span>
            </span>
          )}
        </Link>
      </div>

      {showText && activeGroupName && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/70">
          <p className="mb-1 text-xs font-medium uppercase text-gray-400">Active Group</p>
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">{activeGroupName}</p>
            <CheckCircle size={16} className="text-[#12b76a]" />
          </div>
        </div>
      )}

      <SidebarNav
        sections={sections}
        pathname={pathname}
        isExpanded={isExpanded}
        isHovered={isHovered}
        isMobileOpen={isMobileOpen}
      />

      {showText && (
        <div className="mb-20 mt-auto py-3">
          {activeGroupName ? (
            // One active group per member is enforced server-side (a partial
            // unique constraint on GroupMember). Presenting a live "Create
            // Group" button here would only lead to a 409, so it becomes a
            // read-only explanation of why the action is unavailable.
            <div
              aria-disabled="true"
              title="You can belong to one savings group at a time"
              className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-xs font-medium leading-5 text-gray-400 dark:border-gray-800 dark:bg-gray-800/60"
            >
              One group at a time
            </div>
          ) : (
            <Link
              href="/dashboard/my-group"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00ab00] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#009200]"
            >
              <Plus size={18} />
              Create Group
            </Link>
          )}
        </div>
      )}
    </aside>
  )
}

function AppHeader({
  isMobileOpen,
  toggleSidebar,
  toggleMobileSidebar,
  unreadCount,
  userName,
  userEmail,
  role,
  logout,
}: {
  isMobileOpen: boolean
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  unreadCount: number
  userName: string
  userEmail?: string
  role: string
  logout: () => void
}) {
  const router = useRouter()
  const profileRef = useRef<HTMLDivElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  // The Ctrl-K listener was removed with the search box it focused. Restore it
  // alongside a real command palette, not before.

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar()
    } else {
      toggleMobileSidebar()
    }
  }

  return (
    <header className="sticky top-0 z-40 flex w-full border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="z-40 flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={24} />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00ab00] text-xs font-bold text-white">
              OS
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">OrbiSave</span>
          </Link>

          {/* The global search box was removed rather than restyled. It had no
              onChange, no submit handler and no results view: typing did
              nothing and pressing Enter reloaded the page, while the Ctrl-K
              badge looked like a shortcut affordance but had no handler.
              TODO(feature): reinstate as a real command palette (members,
              groups, contributions) once there is a search endpoint to back
              it. Do not restore the input before then. */}
        </div>

        <div className="flex w-full items-center justify-end gap-3 px-5 py-4 shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)] lg:w-auto lg:px-0 lg:shadow-none">
          <button
            onClick={() => router.push("/dashboard/notifications")}
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Notifications"
          >
            <Bell size={22} />
            {/* Unread dot uses brand green, not the one-off orange it had.
                Unread notifications are informational, not an error state. */}
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#00ab00] dark:border-gray-900" />
            )}
          </button>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-3 rounded-full pl-1 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f3ed] text-sm font-semibold text-[#00ab00]">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden max-w-[160px] truncate text-sm font-semibold sm:block">{userName}</span>
              <ChevronDown size={18} className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-[calc(100%+18px)] w-[360px] rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_40px_rgba(16,24,40,0.12)] dark:border-gray-800 dark:bg-gray-900"
                role="menu"
              >
                <div className="mb-5">
                  <p className="truncate text-base font-semibold text-gray-800 dark:text-white">{userName}</p>
                  <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{userEmail || role.replace(/_/g, " ")}</p>
                </div>
                <div className="space-y-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserCircle size={22} className="text-gray-500" />
                    Edit profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <SettingsIcon size={22} className="text-gray-500" />
                    Account settings
                  </Link>
                  {/* Pointed at /dashboard/support, which does not exist, so
                      this rendered the dashboard 404. /support is the real page
                      and carries the support phone numbers and FAQs.
                      TODO(feature): replace with the in-dashboard support and
                      feedback screen when that ships, so members do not leave
                      the dashboard shell to ask for help. */}
                  <Link
                    href="/support"
                    className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Info size={22} className="text-gray-500" />
                    Support
                  </Link>
                </div>
                <div className="my-4 h-px bg-gray-200 dark:bg-gray-800" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  role="menuitem"
                >
                  <LogOut size={22} className="text-gray-500" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isKycModalOpen, setIsKycModalOpen] = useState(false)
  const sidebar = useDashboardSidebar()

  const { activeGroup } = useActiveGroup()
  const isHydrated = useHydrated()
  // Notifications are addressed to the RECIPIENT, not to a group, so they must
  // load even before the user belongs to one (activation nudges arrive exactly
  // then). Passing the group id only keys the cache.
  const { data: notifications } = useNotifications(activeGroup?.id || null)
  const unreadCount = notifications?.filter((notification) => !notification.read_at).length || 0

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace("/login")
  }, [isHydrated, isAuthenticated, router])

  const navSections = useMemo(() => {
    if (!user) return []
    return getUserDashboardNavItems(user.role, (activeGroup?.wallet?.loan_pool ?? 0) > 0, unreadCount)
  }, [activeGroup?.wallet?.loan_pool, user, unreadCount])

  if (!isHydrated || !isAuthenticated || !user) return null

  const mainContentMargin = sidebar.isMobileOpen
    ? "ml-0"
    : sidebar.isExpanded || sidebar.isHovered
      ? "lg:ml-[260px]"
      : "lg:ml-[84px]"

  // KYC is a chairperson obligation, not a member one. It gates ACTIVATING a
  // group (compliance holds the group creator accountable for the pool), so a
  // plain member who only contributes and receives payouts must never be
  // nagged for identity documents. Treasurers co-sign money movement, so they
  // are held to the same bar as the chairperson.
  const kycRequiredForRole = user.role === "chairperson" || user.role === "treasurer"
  const showKycBanner = kycRequiredForRole && user.kyc_status !== "verified"

  return (
    <div className="dashboard-shell min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white xl:flex">
      <AppSidebar
        sections={navSections}
        pathname={pathname}
        isExpanded={sidebar.isExpanded}
        isMobileOpen={sidebar.isMobileOpen}
        isHovered={sidebar.isHovered}
        setIsHovered={sidebar.setIsHovered}
        activeGroupName={activeGroup?.name}
      />

      {sidebar.isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={sidebar.closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader
          isMobileOpen={sidebar.isMobileOpen}
          toggleSidebar={sidebar.toggleSidebar}
          toggleMobileSidebar={sidebar.toggleMobileSidebar}
          unreadCount={unreadCount}
          userName={user.full_name}
          userEmail={user.email}
          role={user.role}
          logout={() => {
            logout()
            router.push("/login")
          }}
        />

        {showKycBanner && (
          <div className="border-b border-[#d6e4df] bg-[#f7fbf8] px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:px-6">
            <div className="mx-auto max-w-[1536px]">
              <AppStateNotice
                stateKey={user.kyc_status === "submitted" ? "kyc.submitted" : "kyc.pending"}
                onAction={user.kyc_status === "submitted" ? undefined : () => setIsKycModalOpen(true)}
              />
            </div>
          </div>
        )}

        <main className="mx-auto max-w-[1536px] p-4 md:p-6">{children}</main>
      </div>

      <KYCModal isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} />
      <GuidedOnboardingModal />
    </div>
  )
}
