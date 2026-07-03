import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export interface CreateMeetingPayload {
  group: string
  title: string
  agenda?: string
  scheduled_at: string
}

export type MeetingFrequency = 'weekly' | 'monthly' | 'quarterly' | 'as_needed'
export type MeetingProviderMode = 'daily'

export interface MeetingSettings {
  id: string
  group: string
  frequency: MeetingFrequency
  notice_days: number
  quorum_percent: number
  majority_percent: number
  provider_mode: MeetingProviderMode
  attendance_tracking: boolean
  minutes_required: boolean
  updated_by: string | null
  updated_at: string
}

export interface JoinMeetingResult {
  id: string
  meeting: string
  member: string
  video_provider?: 'daily'
  video_room_name?: string
  video_room_url?: string
}

export type UpdateMeetingSettingsPayload = Partial<
  Pick<
    MeetingSettings,
    | 'frequency'
    | 'notice_days'
    | 'quorum_percent'
    | 'majority_percent'
    | 'provider_mode'
    | 'attendance_tracking'
    | 'minutes_required'
  >
>

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

export function useMeetingSettings(groupId: string | null) {
  return useQuery<MeetingSettings>({
    queryKey: ['meetings', 'settings', groupId],
    queryFn: async () => {
      const { data } = await api.get('/meetings/settings/', { params: { group: groupId } })
      return data.data
    },
    enabled: !!groupId,
    retry: 1,
  })
}

export function useUpdateMeetingSettings(groupId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateMeetingSettingsPayload) => {
      if (!groupId) throw new Error('Group ID is required')
      const { data } = await api.patch('/meetings/settings/', payload, { params: { group: groupId } })
      return data?.data ?? data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'settings', groupId] })
    },
  })
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMeetingPayload) => {
      const { data } = await api.post('/meetings/', payload)
      return data?.data ?? data
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', payload.group] })
    },
  })
}

export function useStartMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ meetingId, groupId }: { meetingId: string; groupId: string }) => {
      const { data } = await api.post(`/meetings/${meetingId}/start/`)
      return { data: data?.data ?? data, groupId }
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', groupId] })
    },
  })
}

export function useEndMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ meetingId, groupId }: { meetingId: string; groupId: string }) => {
      const { data } = await api.post(`/meetings/${meetingId}/end/`)
      return { data: data?.data ?? data, groupId }
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', groupId] })
    },
  })
}

export function useJoinMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ meetingId, groupId }: { meetingId: string; groupId: string }) => {
      const { data } = await api.post(`/meetings/${meetingId}/join/`)
      return { data: (data?.data ?? data) as JoinMeetingResult, groupId }
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', groupId] })
    },
  })
}
