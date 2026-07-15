'use client'

import { useEffect } from 'react'
import { usePlatformBranding } from '@/lib/useBranding'

/**
 * Next.js's static favicon.ico/icon.png convention resolves at build time,
 * so a super-admin-uploaded favicon needs a runtime swap instead — this
 * renders nothing, just points the <link rel="icon"> at the uploaded file
 * once it's fetched. No-op (keeps the static favicon) when unset.
 */
export function BrandingFaviconInjector() {
  const { faviconUrl } = usePlatformBranding()

  useEffect(() => {
    if (!faviconUrl) return
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [faviconUrl])

  return null
}
