'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/components/Sidebar'
import { Loader2, Globe } from 'lucide-react'

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
    } else if (user?.role !== 'super_admin') {
      router.push('/login')
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user, router])

  // Removed blocking loader to ensure sidebar visibility

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-[10px] font-black text-navy uppercase tracking-[0.25em] opacity-40">
              Global Financial Infrastructure
            </h2>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2 text-navy/60">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold tracking-tight">Production Network</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {['KE', 'RW', 'GH'].map((c) => (
                <div key={c} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-navy shadow-sm">
                  {c}
                </div>
              ))}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-10 bg-[#fbfcfd]">
          {children}
        </div>
      </main>
    </div>
  )
}
