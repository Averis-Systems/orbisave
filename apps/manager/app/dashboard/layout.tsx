'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/components/Sidebar'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (user?.role !== 'platform_admin') {
      router.push('/login')
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user, router])

  // Removed blocking loader to ensure sidebar visibility

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-widest">
              Operational Intelligence
            </h2>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">
              {user?.country}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification/Search could go here */}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
