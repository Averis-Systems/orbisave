import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Meeting {
  id: string
  group: string
  title: string
  agenda: string
  scheduled_at: string
  started_at: string | null
  ended_at: string | null
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  livekit_room: string | null
  created_by: string
  minutes: string
  attendees_count: number
  attendance_count?: number
  agenda_items?: { title: string; duration?: number }[]
}

export function useMeetings(groupId: string | null) {
  return useQuery<Meeting[]>({
    queryKey: ['meetings', groupId],
    queryFn: async () => {
      const { data } = await api.get('/meetings/', { params: { group: groupId } })
      return data.data
    },
    enabled: !!groupId,
    retry: 1,
  })
}
