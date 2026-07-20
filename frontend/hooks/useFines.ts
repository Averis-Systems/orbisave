import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrapList } from '@/lib/api'

export interface Fine {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'waived' | 'applied'
  rule_type: string
  penalty_type: string
  paid_at: string | null
  member_name?: string
}

export function useFines(groupId: string | null) {
  return useQuery<Fine[]>({
    queryKey: ['fines', groupId],
    queryFn: async () => {
      // PenaltyViewSet is a plain ModelViewSet, so this returns DRF's
      // { count, results } envelope, not an array. Returning it raw crashed
      // the page on fines.filter(...).
      const { data } = await api.get('/contributions/fines/', { params: { group: groupId } })
      return unwrapList<Fine>(data)
    },
    enabled: !!groupId,
  })
}

export function useIssueFine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, memberId, amount, ruleType }: { groupId: string, memberId: string, amount: number, ruleType: string }) => {
      const { data } = await api.post('/contributions/fines/issue/', { group: groupId, member: memberId, amount, rule_type: ruleType })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] })
    }
  })
}
