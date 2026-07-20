import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Invite acceptance for an ALREADY REGISTERED member.
 *
 * The signup path accepts invites too (see app/verify-email/page.tsx), but an
 * existing member with no group previously had no way in at all: the dashboard
 * only ever offered "Create group" while six screens told them they could
 * "accept an invitation". This hook backs the in-app join flow.
 *
 * Endpoint is the existing POST /invites/<token>/ ; no new backend surface.
 */

export interface InvitePreview {
  group_name: string
  chairperson_name: string
  contribution_amount: number
  contribution_frequency?: string
  currency?: string
  country?: string
  member_count?: number
  max_members?: number
}

/**
 * Members are sent a full link on WhatsApp, not a bare token. Accept either,
 * so nobody has to hand-edit a URL before pasting it.
 *
 * Handles: https://app.orbisave.com/register?invite=TOKEN
 *          https://app.orbisave.com/invite/TOKEN
 *          TOKEN
 */
export function extractInviteToken(raw: string): string {
  const value = raw.trim()
  if (!value) return ''

  // Query-param form, the shape the chairperson invite card actually generates.
  const queryMatch = value.match(/[?&]invite=([^&\s]+)/i)
  if (queryMatch) return decodeURIComponent(queryMatch[1])

  // Path form, the shape documented in docs/integration_advisory.md.
  const pathMatch = value.match(/\/invite\/([^/?#\s]+)/i)
  if (pathMatch) return decodeURIComponent(pathMatch[1])

  // Otherwise assume the member pasted the token itself. Strip any stray
  // trailing punctuation picked up from a chat message.
  return value.replace(/[.,;)\]]+$/, '')
}

export function useInvitePreview(token: string | null) {
  return useQuery<InvitePreview>({
    queryKey: ['invite-preview', token],
    queryFn: async () => {
      const { data } = await api.get(`/invites/${token}/`)
      return data
    },
    enabled: !!token,
    retry: false,
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await api.post(`/invites/${token}/`)
      return data
    },
    onSuccess: () => {
      // Membership changes the whole dashboard shell (nav, wallet, gates).
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

/**
 * The accept endpoint rejects for several distinct reasons and a single
 * "could not join" message would leave the member stuck with no idea what to
 * do. Map each to something actionable. `needsProfile` drives a link to the
 * profile page, since next of kin is mandatory before joining and most new
 * members will not have set it.
 */
export function describeInviteError(err: unknown): { message: string; needsProfile: boolean } {
  const response = (err as { response?: { status?: number; data?: { error?: string; code?: string } } })?.response
  const status = response?.status
  const raw = response?.data?.error || ''

  if (status === 404) {
    return { message: 'That invite could not be found. It may have already been used. Ask your chairperson for a new one.', needsProfile: false }
  }
  if (/expired/i.test(raw)) {
    return { message: 'This invite has expired. Invites are valid for 7 days, so ask your chairperson to send a fresh one.', needsProfile: false }
  }
  if (/maximum capacity/i.test(raw)) {
    return { message: 'This group is already full. Your chairperson will need to free a seat before you can join.', needsProfile: false }
  }
  if (/not active until the group is activated/i.test(raw)) {
    return { message: 'This group is not active yet. The chairperson still needs to complete verification and the first contribution.', needsProfile: false }
  }
  if (/already linked/i.test(raw)) {
    return { message: 'You are already a member of this group.', needsProfile: false }
  }
  if (/next of kin/i.test(raw)) {
    return { message: 'Add your next of kin name and phone number before joining a group.', needsProfile: true }
  }
  if (/different country/i.test(raw)) {
    return { message: 'This group operates in a different country to your account, so you cannot join it.', needsProfile: false }
  }
  if (status === 409) {
    return { message: 'You already belong to a savings group. You can be in one group at a time.', needsProfile: false }
  }
  return { message: raw || 'That invite could not be accepted. Check the code and try again.', needsProfile: false }
}
