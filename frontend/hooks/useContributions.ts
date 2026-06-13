import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Contribution {
  id: string
  platform_reference: string
  amount: number
  actual_amount: number | null
  currency: string
  method: string
  status: 'scheduled' | 'initiated' | 'pending' | 'confirmed' | 'failed'
  scheduled_date: string
  initiated_at: string | null
  confirmed_at: string | null
  member_name: string
  group_name: string
}

export function useContributions(groupId: string | null) {
  return useQuery<Contribution[]>({
    queryKey: ['contributions', groupId],
    queryFn: async () => {
      const { data } = await api.get('/contributions/history/', { params: { group: groupId } })
      return data.data // Envelope: { success, data: [...], meta }
    },
    enabled: !!groupId,
  })
}

export function useInitiateContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, amount, phone, method }: { groupId: string, amount: number, phone: string, method: string }) => {
      const { data } = await api.post(`/contributions/${groupId}/initiate/`, { amount, phone, method })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
    }
  })
}
