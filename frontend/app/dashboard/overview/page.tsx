"use client"

import { useAuthStore } from "@/store/auth"
import { useGroups } from "@/hooks/useDashboardData"
import { ContributionTracker } from "@/components/dashboard/ContributionTracker"
import { RotationTimeline } from "@/components/dashboard/RotationTimeline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, ArrowRight, ShieldCheck, Wallet } from "lucide-react"
import { KycGate } from "@/components/auth/KycGate"

export default function OverviewPage() {
  const { user } = useAuthStore()
  const { data: groups, isLoading } = useGroups()

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  // Dashboard Empty State
  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user?.full_name.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">You aren&apos;t part of any collectives yet.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <KycGate fallback={
            <Card className="border-secondary/40 bg-secondary/5 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="w-5 h-5 text-secondary" /> Verify Identity (KYC)</CardTitle>
                <CardDescription>You must verify your identity before creating a new collective.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">Start KYC Process</Button>
              </CardContent>
            </Card>
          }>
            <Card className="border-primary/20 bg-primary/5 hover:border-primary/50 transition-colors shadow-sm cursor-pointer border-dashed">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Create New Collective</CardTitle>
                <CardDescription>Start a new group, set rotation rules, and invite members.</CardDescription>
              </CardHeader>
            </Card>
          </KycGate>

          <Card className="hover:border-foreground/30 transition-colors shadow-sm cursor-pointer border-dashed">
            <CardHeader>
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-4">
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Join via Invite</CardTitle>
              <CardDescription>Enter a secure invite code from an existing group chairman.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Active User Dashboard (Role Based Views rendered within the same interface)
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Your collective financial summary</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-lg col-span-1 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <CardHeader>
            <CardTitle className="text-primary-foreground/90 font-medium">Total Liquidity Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight">KSh 1,250,000</div>
            <div className="mt-6 flex gap-4 text-sm font-medium">
              <div className="bg-white/20 px-3 py-1.5 rounded-md backdrop-blur-md">
                Next Payout: <span className="font-bold">2 days</span>
              </div>
              <div className="bg-white/20 px-3 py-1.5 rounded-md backdrop-blur-md">
                Active Loans: <span className="font-bold">4</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Action Panel based on Role */}
        <Card className="shadow-md border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-secondary" /> 
              {user?.role === 'chairperson' ? 'Admin Actions' : user?.role === 'treasurer' ? 'Treasury' : 'My Next Action'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {user?.role === 'chairperson' && (
              <>
                <Button className="w-full justify-start" variant="outline">Approve Loan Requests <span className="ml-auto bg-destructive text-destructive-foreground px-2 rounded-full text-xs">2</span></Button>
                <Button className="w-full justify-start" variant="outline">Manage Group Settings</Button>
                <Button className="w-full justify-start" variant="secondary">Invite Members</Button>
              </>
            )}
            {user?.role === 'treasurer' && (
              <>
                <Button className="w-full justify-start" variant="outline">Verify Repayments <span className="ml-auto bg-secondary text-secondary-foreground px-2 rounded-full text-xs">1</span></Button>
                <Button className="w-full justify-start" variant="default">Execute Next Payout</Button>
              </>
            )}
            {user?.role === 'member' && (
              <>
                <Button className="w-full justify-between shadow-sm">
                  Make Contribution <span>KSh 5,000</span>
                </Button>
                <Button className="w-full justify-start" variant="outline">Request Group Loan</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Lower Dashboard Area: Trackers & Timelines */}
      <div className="grid md:grid-cols-2 gap-6 items-start mt-4">
        <ContributionTracker groupId={groups[0].id} />
        <RotationTimeline groupId={groups[0].id} />
      </div>
    </div>
  )
}

