import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface RotationCycle {
  id: string
  cycle_number: number
  start_date: string
  end_date: string
  is_current: boolean
  status: 'open' | 'completed' | 'locked'
  total_contributions: number
  total_payouts: number
}

export interface RotationSchedule {
  id: string
  member: string
  member_name: string
  cycle_number: number
  scheduled_payout_date: string
  is_paid_out: boolean
}

export function useRotations(groupId: string | null) {
  return useQuery<RotationCycle[]>({
    queryKey: ['rotations', groupId],
    queryFn: async () => {
      const { data } = await api.get('/groups/rotations/', { params: { group: groupId } })
      return data.data
    },
    enabled: !!groupId,
  })
}

export function useRotationSchedules(cycleId: string | null) {
  return useQuery<RotationSchedule[]>({
    queryKey: ['rotation-schedules', cycleId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/rotations/${cycleId}/schedules/`)
      return data.data
    },
    enabled: !!cycleId,
  })
}

export function useInitializeRotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { data } = await api.post(`/groups/${groupId}/initialize_rotation/`)
      return data
    },
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['rotations', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  })
}

export function useStartNextCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { data } = await api.post(`/groups/${groupId}/next_cycle/`)
      return data
    },
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['rotations', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  })
}

export function useTriggerPayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cycleId, memberId, pin }: { cycleId: string, memberId: string, pin?: string }) => {
      const { data } = await api.post(`/groups/rotations/${cycleId}/trigger_payout/`, { member_id: memberId, pin })
      return data
    },
    onSuccess: (_, { cycleId }) => {
      queryClient.invalidateQueries({ queryKey: ['rotation-schedules', cycleId] })
      queryClient.invalidateQueries({ queryKey: ['rotations'] })
    }
  })
}
