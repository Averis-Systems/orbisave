'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/**
 * The "something is waiting for you" counts the sidebar shows as badges.
 *
 * Backed by the cheap COUNT-only /superadmin/nav-counts/ endpoint, refreshed
 * on mount and on a slow interval so the badges track reality without the
 * sidebar polling the heavy overview call. Failures are swallowed: a broken
 * badge must never break navigation, so counts simply stay at their last
 * known values (or zero) and the nav still works.
 */
export interface NavCounts {
  groups_pending: number
  kyc_pending: number
  trust_open: number
}

const ZERO: NavCounts = { groups_pending: 0, kyc_pending: 0, trust_open: 0 }
const REFRESH_MS = 60_000

export function useNavCounts(): NavCounts {
  const [counts, setCounts] = useState<NavCounts>(ZERO)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/admin-portal/superadmin/nav-counts/')
        if (!cancelled) setCounts({ ...ZERO, ...data })
      } catch {
        // Keep the last good values; never surface a nav error.
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return counts
}
