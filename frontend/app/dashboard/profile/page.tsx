"use client"

import { useAuthStore } from "@/store/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  User, Mail, ShieldCheck, Globe, 
  MapPin, Calendar, Camera, Edit2,
  CheckCircle2, AlertCircle
} from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* 
        PLATFORM DESIGN RULE: All dashboard cards/containers must use rounded-lg (8px) 
        to maintain a consistent, professional fintech aesthetic.
      */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-8 rounded-lg border border-black/5 shadow-sm">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-[#012d1d] flex items-center justify-center text-white text-3xl font-black shadow-xl">
            {user.full_name.slice(0, 2).toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-black/5 text-[#012d1d] hover:bg-[#f3f4f1] transition-colors">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-1">
          <h1 className="text-3xl font-black text-[#012d1d] tracking-tight">{user.full_name}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[#717973] text-sm font-medium">
            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {user.email}</span>
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> {user.country}</span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#012d1d]/10 text-[#012d1d] text-[10px] font-bold uppercase tracking-widest">{user.role}</span>
          </div>
        </div>

        <Button className="bg-[#012d1d] text-white hover:bg-black font-bold px-6">
          <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Account Details */}
        <div className="md:col-span-2 space-y-8">
          <Card className="border-black/5 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#012d1d]">Account Information</CardTitle>
              <CardDescription>Primary details captured during your registration.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6">
              <InfoItem label="Full Name" value={user.full_name} icon={User} />
              <InfoItem label="Email Address" value={user.email} icon={Mail} />
              <InfoItem label="Regional Shard" value={user.country} icon={MapPin} />
              <InfoItem label="Member Since" value="May 2026" icon={Calendar} />
            </CardContent>
          </Card>

          <Card className="border-black/5 bg-white shadow-sm overflow-hidden">
            <CardHeader className="bg-[#ba1a1a]/5 border-b border-[#ba1a1a]/10 rounded-t-lg">
              <CardTitle className="text-lg font-bold text-[#ba1a1a] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> KYC & Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-lg ${user.kyc_status === 'verified' ? 'bg-[#00ab00]/10' : 'bg-[#f57f17]/10'}`}>
                  {user.kyc_status === 'verified' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#00ab00]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#f57f17]" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-[#1a1c1a]">Status: {user.kyc_status.toUpperCase()}</div>
                  <p className="text-xs text-[#717973] leading-relaxed">
                    {user.kyc_status === 'verified' 
                      ? "Your identity has been fully verified. You have unrestricted access to all financial features."
                      : "Your identity verification is currently pending. You must upload a valid national ID and a selfie to unlock group creation and loan requests."}
                  </p>
                </div>
              </div>

              {user.kyc_status !== 'verified' && (
                <Button className="w-full bg-[#012d1d] text-white hover:bg-black font-bold">
                  Start Verification Process
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Security & Preferences */}
        <div className="space-y-8">
          <Card className="border-black/5 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold tracking-widest uppercase text-[#717973]">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SecurityButton label="Change Password" />
              <SecurityButton label="Transaction PIN" />
              <SecurityButton label="2FA Settings" />
            </CardContent>
          </Card>

          <Card className="border-black/5 bg-white shadow-sm bg-[#f9faf6]">
            <CardHeader>
              <CardTitle className="text-sm font-bold tracking-widest uppercase text-[#717973]">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#717973] mb-4">Having issues with your account or verification?</p>
              <Button variant="outline" className="w-full border-black/10 text-xs font-bold">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#717973] flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="font-bold text-[#012d1d]">{value}</div>
    </div>
  )
}

function SecurityButton({ label }: { label: string }) {
  return (
    <button className="w-full text-left px-4 py-3 rounded-lg border border-black/5 hover:bg-[#f3f4f1] transition-colors text-sm font-bold text-[#1a1c1a] flex items-center justify-between group">
      {label}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
    </button>
  )
}
