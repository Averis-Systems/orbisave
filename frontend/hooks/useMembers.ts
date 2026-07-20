import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrapList } from '@/lib/api'

export interface Member {
  id: string
  member: string
  member_name: string
  member_email: string
  role: 'member' | 'chairperson' | 'treasurer' | 'secretary'
  status: 'pending_approval' | 'pending_session_refresh' | 'active' | 'suspended' | 'exited' | 'deceased'
  joined_at: string
  rotation_position: number
}

export interface CreateInvitePayload {
  groupId: string
  email?: string
  phone?: string
}

export function useMembers(groupId: string | null) {
  return useQuery<Member[]>({
    queryKey: ['members', groupId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/members/`)
      return unwrapList<Member>(data)
    },
    enabled: !!groupId,
  })
}

export function useSuspendMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string, memberId: string }) => {
      const { data } = await api.post(`/groups/${groupId}/members/${memberId}/suspend/`)
      return data
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] })
    }
  })
}

export function useReinstateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string, memberId: string }) => {
      const { data } = await api.post(`/groups/${groupId}/members/${memberId}/reinstate/`)
      return data
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] })
    }
  })
}

export function useCreateGroupInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, email, phone }: CreateInvitePayload) => {
      const { data } = await api.post(`/groups/${groupId}/invites/`, { email, phone })
      return data
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string, memberId: string }) => {
      const { data } = await api.post(`/groups/${groupId}/members/${memberId}/remove/`)
      return data
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] })
    }
  })
}

export interface ExitSettlement {
  total_contributed: string
  total_payouts_received: string
  outstanding_loan_obligations: string
  net_settlement: string
  currency: string
}

/**
 * Voluntary self-exit. Frees the user's single group slot so they can join
 * or create another group. Blocked server-side while the member has
 * outstanding loan obligations; chairpersons must transfer their role first.
 */
export function useExitGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, membershipId }: { groupId: string, membershipId: string }) => {
      const { data } = await api.post(`/groups/${groupId}/members/${membershipId}/exit/`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    }
  })
}
