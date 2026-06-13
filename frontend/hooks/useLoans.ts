import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Loan {
  id: string
  borrower_name: string
  amount: number
  currency: string
  interest_rate_monthly: number
  status: 'pending_chair' | 'pending_treasurer' | 'pending_admin' | 'approved' | 'disbursed' | 'active' | 'repaid' | 'defaulted' | 'rejected'
  disbursed_at: string | null
  purpose: string
  term_weeks: number
}

export function useLoans(groupId: string | null) {
  return useQuery<Loan[]>({
    queryKey: ['loans', groupId],
    queryFn: async () => {
      const { data } = await api.get('/loans/', { params: { group: groupId } })
      return data.data
    },
    enabled: !!groupId,
    retry: 1,
  })
}

export function useRequestLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { group: string, amount: number, purpose: string, term_weeks: number }) => {
      const { data } = await api.post('/loans/', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    }
  })
}

export function useApproveLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pin }: { id: string, pin: string }) => {
      const { data } = await api.post(`/loans/${id}/approve/`, { pin })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    }
  })
}

export function useRejectLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason?: string }) => {
      const { data } = await api.post(`/loans/${id}/reject/`, { reason })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    }
  })
}
