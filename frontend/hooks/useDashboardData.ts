import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Fetch Groups where the user is a member
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/groups/')
      return res.data
    },
    staleTime: 30 * 1000,
  })
}

// Fetch Group Details
export function useGroupDetail(groupId?: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const res = await api.get(`/groups/${groupId}/`)
      return res.data
    },
    enabled: !!groupId,
  })
}

// Fetch member's contribution history/status for a group
export function useContributions(groupId?: string) {
  return useQuery({
    queryKey: ['contributions', groupId],
    queryFn: async () => {
      // Stubbing endpoint based on standard DRF nested router or query params
      const res = await api.get(`/contributions/?group=${groupId}`)
      return res.data
    },
    enabled: !!groupId,
    refetchInterval: (query) => {
      // Aggressive polling if any contribution is "pending/initiated"
      // If we had WebSockets this wouldn't be necessary, but serves as fallback
      const hasPending = Array.isArray(query.state.data) && query.state.data.some((c: any) => c.status === 'initiated' || c.status === 'pending')
      return hasPending ? 3000 : false
    }
  })
}
