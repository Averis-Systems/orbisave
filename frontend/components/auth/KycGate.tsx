"use client"

import { useAuthStore } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface KycGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Wraps content that requires a verified KYC status.
 * If the user is unverified, shows a blocking prompt or a custom fallback.
 */
export function KycGate({ children, fallback }: KycGateProps) {
  const { user } = useAuthStore()
  const router = useRouter()

  if (!user) return null

  if (user.kyc_status === 'verified') {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <Card className="border-secondary/40 bg-secondary/5 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-secondary">⚠️</span> Action Required
        </CardTitle>
        <CardDescription className="text-foreground/80">
          To comply with platform security and unlock this feature, you must complete your Identity Verification (KYC).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="text-sm border-l-2 border-primary pl-3 text-muted-foreground">
            Current Status: <strong className="uppercase text-foreground">{user.kyc_status}</strong>
          </div>
          <Button 
            className="w-fit mt-2 shadow-sm"
            onClick={() => router.push("/dashboard/settings?tab=kyc")}
          >
            Complete Verification Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
