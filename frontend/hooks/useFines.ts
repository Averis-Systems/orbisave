import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Fine {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'waived'
  rule_type: string
  penalty_type: string
  paid_at: string | null
  member_name: string
}

export function useFines(groupId: string | null) {
  return useQuery<Fine[]>({
    queryKey: ['fines', groupId],
    queryFn: async () => {
      const { data } = await api.get('/contributions/fines/', { params: { group: groupId } })
      return data
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
