'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/components/Sidebar'
import {
  Bell,
  ChevronDown,
  Info,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  UserCircle,
} from 'lucide-react'

function useDashboardTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const storedTheme = localStorage.getItem('orbisave_dashboard_theme')
    const initialTheme = storedTheme === 'dark' ? 'dark' : 'light'
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    setTheme((current) => {
      const nextTheme = current === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', nextTheme === 'dark')
      localStorage.setItem('orbisave_dashboard_theme', nextTheme)
      return nextTheme
    })
  }

  return { theme, toggleTheme }
}

function DashboardHeader({ user, logout }: { user: any; logout: () => void }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const { theme, toggleTheme } = useDashboardTheme()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const signOut = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="z-10 flex w-full border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-300">
            <Menu size={24} />
          </button>
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search countries, admins, groups..."
              className="h-14 w-[520px] rounded-xl border border-gray-200 bg-transparent py-2.5 pl-12 pr-16 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#77cc77] focus:outline-none focus:ring-4 focus:ring-[#00ab00]/10 dark:border-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
              Ctrl K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
            <Bell size={22} />
          </button>
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-3 rounded-full pl-1 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f3ed] text-sm font-semibold text-[#00ab00]">
                {user?.full_name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <span className="hidden max-w-[170px] truncate text-sm font-semibold sm:block">{user?.full_name}</span>
              <ChevronDown size={18} className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+18px)] w-[360px] rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_40px_rgba(16,24,40,0.12)] dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5">
                  <p className="truncate text-base font-semibold text-gray-800 dark:text-white">{user?.full_name}</p>
                  <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
                <div className="space-y-1">
                  <Link href="/dashboard/profile" className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                    <UserCircle size={22} className="text-gray-500" />
                    Edit profile
                  </Link>
                  <Link href="/dashboard/settings" className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                    <Settings size={22} className="text-gray-500" />
                    Account settings
                  </Link>
                  <Link href="/dashboard/support" className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                    <Info size={22} className="text-gray-500" />
                    Support
                  </Link>
                </div>
                <div className="my-4 h-px bg-gray-200 dark:bg-gray-800" />
                <button onClick={signOut} className="flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, user, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (user?.role !== 'super_admin') {
      router.push('/login')
    }
  }, [isAuthenticated, user, router])

  return (
    <div className="dashboard-shell flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900 dark:bg-gray-950 dark:text-white">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={user} logout={logout} />
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
