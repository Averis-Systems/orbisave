"use client"

import { useAuthStore } from "@/store/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LayoutDashboard, Users, CreditCard, Settings, LogOut, Loader2, ArrowLeftRight } from "lucide-react"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Rotation", href: "/dashboard/rotation", icon: ArrowLeftRight },
  { name: "Loans", href: "/dashboard/loans", icon: CreditCard },
  { name: "Members", href: "/dashboard/members", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch & unauthorized access
  useEffect(() => {
    setIsMounted(true)
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  if (!isMounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar Shell */}
      <aside className="w-64 bg-background border-r flex flex-col hidden md:flex fixed h-full z-20">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/dashboard" className="text-xl font-bold tracking-tighter text-foreground flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xs">O</span>
            </div>
            OrbiSave
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs uppercase">
              {user.full_name.slice(0, 2)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground truncate max-w-[130px]">{user.full_name}</span>
              <span className="text-xs text-muted-foreground uppercase">{user.role}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              logout()
              router.push("/login")
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors font-medium border border-transparent"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="font-bold tracking-tighter text-foreground flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">O</div>
            OrbiSave
          </div>
          {/* A mobile menu sheet would go here */}
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
