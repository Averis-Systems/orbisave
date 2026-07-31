'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api'

/**
 * One shared read of GET /admin-portal/attention/, polled every 60s and
 * exposed via context so the overview page's exception strip/worklist and
 * the header's alerts popover always show the same numbers, they used to
 * each need their own fetch, which is how they could silently drift apart.
 */

export interface AttentionScale {
  total_groups: number
  total_members: number
  contributions_mtd: number
  currency: string
}

export interface AttentionQueueCount {
  count: number
  oldest_days: number
}

export interface AttentionLoanArrears {
  overdue_installments: number
  amount_overdue: number
  defaulted_count: number
}

export interface AttentionReconciliation {
  count: number
  amount_at_risk: number
  by_severity: { green: number; orange: number; red: number }
  oldest_days: number
}

export interface AttentionQueues {
  groups_pending_review: AttentionQueueCount
  kyc_pending: AttentionQueueCount
  loan_arrears: AttentionLoanArrears
  reconciliation: AttentionReconciliation
}

export type WorklistType = 'group_verification' | 'kyc' | 'reconciliation'

export interface AttentionWorklistItem {
  type: WorklistType
  id: string
  label: string
  detail: string
  age_days: number
  href: string
  severity?: 'green' | 'orange' | 'red'
}

export interface AttentionActivityItem {
  id: string
  action: string
  summary: string
  target_group_name: string | null
  created_at: string
}

export interface GrowthLogItem {
  type: 'signup' | 'group'
  id: string
  name: string
  detail: string
  created_at: string
}

export interface GenderDistributionItem {
  gender: string
  label: string
  count: number
}

export interface RegionDistributionItem {
  region: string
  count_all_time: number
  count_this_month: number
}

export interface AttentionData {
  country: string
  scale: AttentionScale
  queues: AttentionQueues
  worklist: AttentionWorklistItem[]
  monthly_contribution_trend: Array<{ month: string; contributions: number }>
  recent_activity: AttentionActivityItem[]
  growth_log: GrowthLogItem[]
  gender_distribution: GenderDistributionItem[]
  region_distribution: RegionDistributionItem[]
}

interface AttentionContextValue {
  data: AttentionData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

const AttentionContext = createContext<AttentionContextValue | null>(null)

const POLL_INTERVAL_MS = 60_000

export function AttentionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AttentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const load = useCallback(() => {
    if (inFlight.current) return
    inFlight.current = true
    api
      .get<AttentionData>('/admin-portal/attention/')
      .then((res) => {
        setData(res.data)
        setError(null)
      })
      .catch(() => {
        setError('Could not load operations data.')
      })
      .finally(() => {
        setLoading(false)
        inFlight.current = false
      })
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  return <AttentionContext.Provider value={{ data, loading, error, refresh: load }}>{children}</AttentionContext.Provider>
}

export function useAttention() {
  const ctx = useContext(AttentionContext)
  if (!ctx) {
    throw new Error('useAttention must be used within an AttentionProvider')
  }
  return ctx
}
