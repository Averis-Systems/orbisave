import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Group {
  id: string
  name: string
  description: string
  country: string
  currency: string
  status: string
  max_members: number
  contribution_amount: number
  contribution_frequency: string
  contribution_day: number
  mandatory_savings_amount?: number
  savings_access_month?: number | null
  savings_access_day?: number | null
  verification_status?: string
  wallet: {
    total: number
    rotation_pool: number
    loan_pool: number
    mandatory_savings?: number
    currency: string
  }
  chairperson_name: string
  member_count: number
  payout_strategy?: string
  loan_interest_rate_monthly?: number
  created_at: string
}

export interface CreateGroupPayload {
  name: string
  description?: string
  country: string
  max_members: number
  contribution_amount: string
  contribution_frequency: string
  contribution_day: number
  rotation_savings_pct: string
  loan_pool_pct: string
  max_loan_multiplier: string
  loan_term_weeks: number
  loan_interest_rate_monthly: string
  mandatory_savings_amount: string
  savings_access_month: number
  savings_access_day: number
  rotation_method: string
}

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await api.get('/groups/')
      return data.data // Envelope: { success, data: [...], meta }
    },
    retry: 1,
    staleTime: 5000,
  })
}

/**
 * Single source of truth for the user's one active group.
 *
 * Production-beta rule: a user occupies at most one group slot at a time,
 * enforced server-side (one_active_group_per_member constraint + 409s from
 * create/join). The first — only — element of /groups/ is therefore THE
 * active group. When multi-group membership ships as a future update, the
 * group selector lives behind this hook and every consumer keeps working.
 */
export function useActiveGroup() {
  const query = useGroups()
  return {
    ...query,
    activeGroup: query.data?.[0] ?? null,
  }
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateGroupPayload) => {
      const { data } = await api.post('/groups/', payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useGroupDetail(groupId: string | null) {
  return useQuery<Group>({
    queryKey: ['groups', groupId],
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID is required')
      const { data } = await api.get(`/groups/${groupId}/`)
      return data.data // Envelope: { success, data: {...}, meta }
    },
    enabled: !!groupId,
  })
}

export function useActivateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { data } = await api.post(`/groups/${groupId}/activate/`)
      return data
    },
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
    },
  })
}
