"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Loader2, ArrowDownCircle } from "lucide-react"

interface RotationTimelineProps {
  groupId: string
}

export function RotationTimeline({ groupId }: RotationTimelineProps) {
  // Fetch the rotation schedule for this group
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['rotation', groupId],
    queryFn: async () => {
      const res = await api.get(`/groups/${groupId}/rotation/`)
      return res.data
    },
    enabled: !!groupId
  })

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Assuming `schedule` returns an array of objects: { position: 1, member_name: 'Alice', date: '2026-04-01', status: 'pending'|'completed' }
  const upcoming = schedule?.filter((s: any) => s.status === 'pending') || []
  const currentReceiver = upcoming[0]

  return (
    <Card className="shadow-sm border-border h-full">
      <CardHeader>
        <CardTitle>Rotation Timeline</CardTitle>
        <CardDescription>The strictly deterministic payout queue.</CardDescription>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="p-4 bg-muted/30 rounded-lg text-center border border-dashed">
            <p className="text-sm text-muted-foreground">No active rotation cycle.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* Highlight current receiver */}
            <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-secondary/5">
                <ArrowDownCircle className="w-24 h-24" />
              </div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Next Payout</p>
              <h4 className="text-lg font-bold text-foreground">{currentReceiver.member_name}</h4>
              <p className="text-sm text-muted-foreground mt-1">Expected: {new Date(currentReceiver.date).toLocaleDateString()}</p>
            </div>

            {/* Queue visualization */}
            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {upcoming.slice(1, 4).map((slot: any, index: number) => (
                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <span className="text-xs font-bold">{slot.position}</span>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] py-3 px-4 rounded-lg bg-card border shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-semibold text-foreground text-sm">{slot.member_name}</h5>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(slot.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        )}
      </CardContent>
    </Card>
  )
}
