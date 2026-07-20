'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/components/Sidebar'
import { ChevronDown, LogOut, Menu, Settings, UserCircle, X } from 'lucide-react'

/**
 * Console shell.
 *
 * The header was carrying three controls that did nothing real: a 520px search
 * box wired to Ctrl-K that only focused itself (no search exists), a dark-mode
 * toggle over pages that have no dark styling, and a notification bell with no
 * feed behind it. All three are removed rather than left as decoration, the
 * same decision taken in the member app. The profile menu's "Edit profile" and
 * "Support" links pointed at routes that 404, so the menu is now just the two
 * destinations that exist.
 *
 * The hamburger now does something: on mobile it opens the sidebar as a drawer.
 * On desktop the sidebar is a permanent rail and the hamburger is hidden.
 */

function DashboardHeader({
  user,
  logout,
  onOpenSidebar,
}: {
  user: { full_name?: string; email?: string } | null
  logout: () => void
  onOpenSidebar: () => void
}) {
  const router = useRouter()
  const profileRef = useRef<HTMLDivElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Awaited: logout is a server round-trip now (only the server can clear the
  // httpOnly session cookies). Redirecting first would leave a live session
  // behind for anyone who navigated straight back.
  const signOut = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="z-10 flex w-full items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <button
        onClick={onOpenSidebar}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Pushes the profile menu to the right on desktop, where the hamburger
          is hidden. */}
      <div className="hidden flex-1 lg:block" />

      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setProfileOpen((open) => !open)}
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-gray-700 transition-colors hover:bg-gray-50"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f3ed] text-sm font-semibold text-[#00ab00]">
            {user?.full_name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <span className="hidden max-w-[160px] truncate text-sm font-semibold sm:block">{user?.full_name}</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
        </button>

        {profileOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+10px)] w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_20px_40px_rgba(16,24,40,0.12)]"
          >
            <div className="mb-3 px-1">
              <p className="truncate text-sm font-semibold text-gray-800">{user?.full_name}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{user?.email}</p>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              role="menuitem"
            >
              <Settings size={18} className="text-gray-500" />
              Platform settings
            </Link>
            <div className="my-2 h-px bg-gray-200" />
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#d92d20] hover:bg-[#fef3f2]"
              role="menuitem"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (user?.role !== 'super_admin') {
      router.push('/login')
    }
  }, [isAuthenticated, user, router])

  // Close the mobile drawer whenever the route changes, so a link tap never
  // leaves it hanging open over the new page.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900">
      {/* Desktop rail */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={user} logout={logout} onOpenSidebar={() => setDrawerOpen(true)} />
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
