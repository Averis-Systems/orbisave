"use client"

import { useAuthStore } from "@/store/auth"
import { useGroups } from "@/hooks/useDashboardData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, Users, ShieldCheck, MapPin, 
  Calendar, Info, UserPlus, MoreVertical,
  CheckCircle2, Clock
} from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function MyGroupPage() {
  const { user } = useAuthStore()
  const { data: groups, isLoading } = useGroups()

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-32 w-full" />
        <div className="grid lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    )
  }

  const group = groups?.[0]

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6">
        <div className="w-20 h-20 bg-[#012d1d]/5 rounded-full flex items-center justify-center mx-auto">
          <Users className="w-10 h-10 text-[#012d1d]/40" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#012d1d] tracking-tight">No Group Found</h1>
          <p className="text-[#717973] max-w-sm mx-auto">
            You are not currently a member of any savings collective. Create one or join with an invite code.
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Link href="/chama-onboarding">
            <Button className="bg-[#012d1d] text-white hover:bg-black font-bold px-8">
              Create Group
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isPendingKYC = user?.kyc_status !== 'verified'

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Group Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#012d1d]/10 text-[#012d1d] text-[10px] font-bold uppercase tracking-widest">
              {group.status}
            </span>
            <span className="text-[#717973] text-xs font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {group.country}
            </span>
          </div>
          <h1 className="text-4xl font-black text-[#012d1d] tracking-tighter">{group.name}</h1>
          <p className="text-[#717973] max-w-2xl text-sm leading-relaxed">
            {group.description || "A rotational savings and credit association dedicated to mutual growth and financial security."}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-black/10 text-[#1a1c1a] font-bold">
            <Info className="w-4 h-4 mr-2" /> Details
          </Button>
          <Button className="bg-[#012d1d] text-white hover:bg-black font-bold shadow-lg shadow-[#012d1d]/20">
            <UserPlus className="w-4 h-4 mr-2" /> Invite Member
          </Button>
        </div>
      </div>

      {/* KYC Warning Banner if pending */}
      {isPendingKYC && (
        <div className="bg-[#ba1a1a]/5 border border-[#ba1a1a]/10 rounded-lg p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-[#ba1a1a]/10 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#ba1a1a]" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-bold text-[#ba1a1a] text-lg leading-tight">Identity Verification Required</h3>
            <p className="text-sm text-[#ba1a1a]/70 max-w-2xl">
              Your group is currently in a <strong>pending state</strong>. To activate financial operations like contributions and loan payouts, the chairperson must complete the KYC verification process.
            </p>
            <div className="pt-3">
              <Link href="/dashboard/settings/kyc">
                <Button size="sm" className="bg-[#ba1a1a] text-white hover:bg-[#930002] font-bold px-6">
                  Complete Verification Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Group Metrics */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-black/5 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-[#717973]">Group Contribution</CardDescription>
                <CardTitle className="text-2xl font-black text-[#012d1d]">KES {group.contribution_amount.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs font-medium text-[#717973]">
                  <Calendar className="w-3.5 h-3.5" /> {group.contribution_frequency} cycle
                </div>
              </CardContent>
            </Card>

            <Card className="border-black/5 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-[#717973]">Membership</CardDescription>
                <CardTitle className="text-2xl font-black text-[#012d1d]">1 / {group.max_members}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs font-medium text-[#717973]">
                  <Users className="w-3.5 h-3.5" /> {group.max_members - 1} slots remaining
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members List */}
          <Card className="border-black/5 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b border-black/5 pb-4">
              <CardTitle className="text-lg font-bold text-[#012d1d]">Member Directory</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-black/5">
                <div className="flex items-center justify-between p-6 hover:bg-[#f9faf6] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#012d1d]/10 flex items-center justify-center font-bold text-[#012d1d] text-sm">
                      {user?.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[#1a1c1a]">{user?.full_name}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#717973]">{user?.role} · Pos 1</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-[#00ab00]/10 text-[#00ab00] text-[10px] font-bold">Active</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#717973]"><MoreVertical className="w-4 h-4" /></Button>
                  </div>
                </div>

                {/* Placeholder for joined members */}
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-white/50 opacity-40 grayscale">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/20">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-3 w-32 bg-black/10 rounded" />
                        <div className="h-2 w-20 bg-black/5 rounded" />
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Awaiting Member</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Group Setup Checklist */}
        <div className="space-y-8">
          <Card className="border-black/5 bg-white shadow-sm overflow-hidden sticky top-8">
            <CardHeader className="bg-[#f3f4f1] border-b border-black/5">
              <CardTitle className="text-sm font-bold tracking-widest uppercase text-[#012d1d]">Setup Checklist</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-black/5">
                <ChecklistItem 
                  title="Group Creation" 
                  desc="Fundamental group parameters set." 
                  status="completed" 
                />
                <ChecklistItem 
                  title="Identity Verification" 
                  desc="Chairperson KYC verification." 
                  status={user?.kyc_status === 'verified' ? 'completed' : 'pending'} 
                />
                <ChecklistItem 
                  title="Minimum Members" 
                  desc="At least 5 members required." 
                  status="pending" 
                />
                <ChecklistItem 
                  title="Wallet Activation" 
                  desc="Official trust account assignment." 
                  status="pending" 
                />
                <ChecklistItem 
                  title="Cycle Commencement" 
                  desc="First rotation cycle start." 
                  status="locked" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({ title, desc, status }: { title: string, desc: string, status: 'completed' | 'pending' | 'locked' }) {
  const isCompleted = status === 'completed'
  const isPending = status === 'pending'
  
  return (
    <div className={`p-5 flex items-start gap-4 transition-colors ${isCompleted ? 'bg-[#f9faf6]/30' : ''}`}>
      <div className="mt-1">
        {isCompleted && <CheckCircle2 className="w-5 h-5 text-[#00ab00]" />}
        {isPending && <Clock className="w-5 h-5 text-[#f57f17]" />}
        {status === 'locked' && <div className="w-5 h-5 border-2 border-black/5 rounded-full" />}
      </div>
      <div>
        <div className={`text-sm font-bold ${isCompleted ? 'text-[#012d1d]' : isPending ? 'text-[#1a1c1a]' : 'text-[#717973]'}`}>
          {title}
        </div>
        <div className="text-[11px] text-[#717973] mt-0.5 leading-snug">{desc}</div>
      </div>
    </div>
  )
}
