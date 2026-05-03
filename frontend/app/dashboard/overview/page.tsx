"use client"

import { useAuthStore } from "@/store/auth"
import { useGroups } from "@/hooks/useDashboardData"
import { ContributionTracker } from "@/components/dashboard/ContributionTracker"
import { RotationTimeline } from "@/components/dashboard/RotationTimeline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ArrowRight, ShieldCheck, Wallet, Bell, AlertTriangle, Users } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function OverviewPage() {
  const { user } = useAuthStore()
  const { data: groups, isLoading } = useGroups()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl">
        <Skeleton className="h-24 w-full" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // Common Welcome Card
  const WelcomeCard = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-black/5 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#012d1d]">Welcome back, {user?.full_name?.split(' ')[0] || "User"}</h1>
        <p className="text-[#717973] text-sm mt-1">Here is what's happening with your accounts today.</p>
      </div>
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#f3f4f1] rounded-lg border border-black/5">
        <div className="w-2 h-2 rounded-full bg-[#012d1d]"></div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#012d1d]">{user?.role}</span>
      </div>
    </div>
  )

  // Empty State
  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl">
        <WelcomeCard />

        <div className="grid md:grid-cols-2 gap-6">
          {/* KYC Status Card for Empty State */}
          <Card className="border-black/5 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-[#012d1d]"><ShieldCheck className="w-5 h-5 text-[#1a5f8a]" /> Identity Verification</CardTitle>
              <CardDescription className="text-sm">
                {user?.kyc_status === 'verified' 
                  ? "Your identity is verified. You have full access to create or join groups."
                  : "You must verify your identity before creating a new collective."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.kyc_status !== 'verified' ? (
                <Link href="/dashboard/settings/kyc">
                  <Button className="w-full bg-[#012d1d] text-white hover:bg-black font-bold">Start KYC Process →</Button>
                </Link>
              ) : (
                <div className="w-full text-center py-2 text-sm font-bold text-[#1a5f8a] bg-[#eaf4fb] rounded">Verified ✓</div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-4">
            <Link href="/chama-onboarding" className="block">
              <Card className="border-[#012d1d]/20 bg-[#f9faf6] hover:border-[#012d1d]/50 transition-colors shadow-sm cursor-pointer border-dashed h-full">
                <CardHeader>
                  <div className="w-10 h-10 bg-[#012d1d]/10 rounded-lg flex items-center justify-center mb-3">
                    <Plus className="w-5 h-5 text-[#012d1d]" />
                  </div>
                  <CardTitle className="text-lg text-[#012d1d]">Create New Chama</CardTitle>
                  <CardDescription className="text-sm">Start a new group, set rotation rules, and invite members.</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Active Group State
  const activeGroup = groups[0]

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <WelcomeCard />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Group Status Card */}
        <div className="lg:col-span-2">
          <Card className="bg-[#012d1d] text-white shadow-lg relative overflow-hidden border-none h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <CardHeader>
              <CardTitle className="text-white/90 font-medium text-sm tracking-widest uppercase">{activeGroup.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-white/70 mb-1">Total Liquidity Pool</div>
              <div className="text-5xl font-bold tracking-tight mb-8">KSh 1,250,000</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-white/60 mb-1">Next Payout</div>
                  <div className="font-bold text-lg">In 2 days</div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-white/60 mb-1">Active Loans</div>
                  <div className="font-bold text-lg">4 Outstanding</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: KYC & Notifications */}
        <div className="flex flex-col gap-6">
          {/* KYC Status Card */}
          <Card className="border-black/5 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold tracking-widest uppercase text-[#717973] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> KYC Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user?.kyc_status === 'verified' ? (
                <div className="flex items-center gap-3 text-sm font-bold text-[#1a5f8a]">
                  <div className="w-8 h-8 rounded-full bg-[#eaf4fb] flex items-center justify-center">✓</div>
                  Identity Verified
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-[#93000a]">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Verification pending. Some features are restricted.</span>
                  </div>
                  <Link href="/dashboard/settings/kyc" className="block text-center text-xs font-bold bg-[#f3f4f1] hover:bg-[#e9eae7] text-[#012d1d] py-2 rounded transition-colors">
                    Complete Now
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications Feed */}
          <Card className="border-black/5 shadow-sm flex-1">
            <CardHeader className="pb-3 border-b border-black/5">
              <CardTitle className="text-sm font-bold tracking-widest uppercase text-[#717973] flex items-center justify-between">
                <div className="flex items-center gap-2"><Bell className="w-4 h-4" /> Activity Feed</div>
                <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-0">
              <div className="space-y-0">
                <div className="px-6 py-3 hover:bg-[#f9faf6] transition-colors border-l-2 border-[#ba1a1a]">
                  <div className="text-xs font-bold text-[#012d1d] mb-0.5">Contribution Reminder</div>
                  <div className="text-[11px] text-[#717973]">Your KES 5,000 contribution is due tomorrow.</div>
                </div>
                <div className="px-6 py-3 hover:bg-[#f9faf6] transition-colors">
                  <div className="text-xs font-bold text-[#012d1d] mb-0.5">Loan Approved</div>
                  <div className="text-[11px] text-[#717973]">David O. received a KES 15,000 loan.</div>
                </div>
              </div>
              <div className="px-6 pt-3 mt-2 text-center">
                <button className="text-[10px] font-bold uppercase tracking-widest text-[#717973] hover:text-[#012d1d]">View All</button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Lower Dashboard Area: Trackers & Timelines */}
      <div className="grid lg:grid-cols-2 gap-6 mt-2">
        <Card className="border-black/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-widest uppercase text-[#717973] flex items-center gap-2">
              <Wallet className="w-4 h-4" /> My Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
             <ContributionTracker groupId={activeGroup.id} />
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-widest uppercase text-[#717973] flex items-center gap-2">
              <ArrowRight className="w-4 h-4" /> Rotation Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
             <RotationTimeline groupId={activeGroup.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
