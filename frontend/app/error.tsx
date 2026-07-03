"use client"

import { useEffect } from "react"

import { FullPageState } from "@/components/states/AppState"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <FullPageState stateKey="global.serverError" onPrimaryAction={reset} />
}
