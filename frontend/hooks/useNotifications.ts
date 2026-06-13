import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Notification {
  id: string
  type: 'alert' | 'info' | 'payout' | 'loan' | 'meeting'
  title: string
  body: string
  metadata: any
  read_at: string | null
  created_at: string
}

export function useNotifications(groupId: string | null) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', groupId],
    queryFn: async () => {
      // In a real app, we might filter by group if the backend supports it, 
      // but current backend NotificationViewSet filters by recipient only.
      const { data } = await api.get('/notifications/')
      // Handle the envelope: { success, data: [...], meta }
      return data.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/mark_as_read/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark_all_as_read/')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
