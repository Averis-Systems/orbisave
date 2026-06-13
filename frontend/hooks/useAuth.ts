import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface KYCStatus {
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected'
  submitted_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  document_type: string | null
}

export function useKYCStatus() {
  return useQuery<KYCStatus>({
    queryKey: ['kyc-status'],
    queryFn: async () => {
      const { data } = await api.get('/auth/kyc/status/')
      return data.data // Envelope: { success, data, message }
    },
  })
}

export function useSetTransactionPin() {
  return useMutation({
    mutationFn: async ({ pin, password }: { pin: string; password: string }) => {
      const { data } = await api.post('/auth/transaction-pin/', { pin, password })
      return data
    },
  })
}
