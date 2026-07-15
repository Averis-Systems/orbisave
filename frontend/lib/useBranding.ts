import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type PlatformBranding = {
  logoUrl: string | null
  faviconUrl: string | null
}

const FALLBACK: PlatformBranding = { logoUrl: null, faviconUrl: null }

// Module-scoped so every usePlatformBranding() call across the app shares
// one request instead of firing a fetch per mounted Logo/favicon consumer.
let cached: Promise<PlatformBranding> | null = null

function fetchBranding(): Promise<PlatformBranding> {
  if (!cached) {
    cached = api
      .get('platform-branding/')
      .then((res) => ({ logoUrl: res.data.logo_url, faviconUrl: res.data.favicon_url }))
      .catch(() => FALLBACK)
  }
  return cached
}

/** Falls back to the app's built-in static branding when nothing is set. */
export function usePlatformBranding(): PlatformBranding {
  const [branding, setBranding] = useState<PlatformBranding>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    fetchBranding().then((result) => {
      if (!cancelled) setBranding(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return branding
}
