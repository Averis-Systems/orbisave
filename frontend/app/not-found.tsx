"use client"

import { useEffect, useState } from "react"
import { useHydrated } from "@/hooks/useHydrated"

import { FullPageState } from "@/components/states/AppState"
import { useAuthStore } from "@/store/auth"

export default function NotFound() {
  const { isAuthenticated } = useAuthStore()
  const isHydrated = useHydrated()

  return (
    <FullPageState
      state={{
        title: "Page not found",
        description: "This page is unavailable or may have moved. Return to a trusted OrbiSave route to continue safely.",
        tone: "empty",
        icon: "home",
        eyebrow: "Error 404",
        code: "404",
        primaryAction: {
          label: isHydrated && isAuthenticated ? "Go to dashboard" : "Go home",
          href: isHydrated && isAuthenticated ? "/dashboard" : "/",
        },
        secondaryAction: { label: "Go back" },
      }}
      onSecondaryAction={() => window.history.back()}
    />
  )
}
