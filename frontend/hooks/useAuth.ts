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

// ── Phone verification (SMS OTP) ─────────────────────────────────────────────

export function useRequestPhoneOtp() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/otp/request/')
      return data
    },
  })
}

export function useConfirmPhoneOtp() {
  return useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const { data } = await api.post('/auth/otp/confirm/', { code })
      return data
    },
  })
}

// ── Password reset (SMS OTP, enumeration-safe) ───────────────────────────────

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async ({ phone }: { phone: string }) => {
      const { data } = await api.post('/auth/password-reset/request/', { phone })
      return data
    },
  })
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async ({ phone, code, new_password }: { phone: string; code: string; new_password: string }) => {
      const { data } = await api.post('/auth/password-reset/confirm/', { phone, code, new_password })
      return data
    },
  })
}
