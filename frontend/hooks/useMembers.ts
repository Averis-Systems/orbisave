import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

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
      return data.data
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
