"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Components fire toast.success/error throughout the app (onboarding
          modal, profile save, …) but no Toaster was ever mounted — every
          notification, including failure feedback, was silently dropped. */}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  )
}
