"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useContributions } from "@/hooks/useDashboardData"
import { useWebSocket } from "@/hooks/useWebSocket" 
import { Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { useAuthStore } from "@/store/auth"

interface ContributionTrackerProps {
  groupId: string
}

export function ContributionTracker({ groupId }: ContributionTrackerProps) {
  // Activate WebSocket listener for this specific group's events
  // (We'll assume useWebSocket is imported properly; for now we just call it)
  // useWebSocket(groupId) 
  
  const { data: contributions, isLoading } = useContributions(groupId)
  const { user } = useAuthStore()

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Filter for the current user's contributions if we're a standard member,
  // or show group-wide stats if we are the Treasurer.
  const myContributions = contributions?.filter((c: any) => c.member_id === user?.id) || []
  
  const totalPaid = myContributions.filter((c: any) => c.status === 'confirmed').reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0)
  const pendingCount = myContributions.filter((c: any) => c.status === 'initiated' || c.status === 'pending').length

  return (
    <Card className="shadow-sm border-border">
      <CardHeader>
        <CardTitle>My Contributions</CardTitle>
        <CardDescription>Track your commitments to the collective pool.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Confirmed</p>
              <h3 className="text-2xl font-bold text-foreground">KSh {totalPaid.toLocaleString()}</h3>
            </div>
            {pendingCount > 0 && (
              <div className="text-right">
                <p className="text-sm font-medium text-secondary mb-1 flex items-center gap-1 justify-end">
                  <Loader2 className="w-3 h-3 animate-spin" /> Processing
                </p>
                <h3 className="text-lg font-bold text-secondary">{pendingCount} pending</h3>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Recent Activity</h4>
            {myContributions.length === 0 ? (
              <p className="text-sm text-muted-foreground border-l-2 pl-3 py-1">No contributions made yet.</p>
            ) : (
              // Show last 3
              myContributions.slice(0, 3).map((contrib: any) => (
                <div key={contrib.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {contrib.status === 'confirmed' ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : contrib.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Clock className="w-4 h-4 text-secondary" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">KSh {parseFloat(contrib.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground uppercase">{contrib.method}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      contrib.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                      contrib.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                      'bg-secondary/10 text-secondary'
                    }`}>
                      {contrib.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
