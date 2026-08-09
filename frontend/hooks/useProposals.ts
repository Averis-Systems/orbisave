import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ProposalType =
  | 'activate_loan_pool'
  | 'deactivate_loan_pool'
  | 'change_loan_terms'
  | 'change_contribution'
  | 'change_savings'
  | 'remove_member'
  | 'dissolve_group'
  | 'custom'

export type VoteChoice = 'yes' | 'no' | 'abstain'
export type ProposalStatus = 'open' | 'passed' | 'rejected' | 'expired' | 'cancelled'

export interface ProposalTally {
  yes: number
  no: number
  abstain: number
  cast: number
  active_members: number
  quorum_needed: number
  quorum_met: boolean
  yes_needed: number
  closed: boolean
}

export interface Proposal {
  id: string
  group: string
  proposal_type: ProposalType
  title: string
  description: string
  payload: Record<string, string | number>
  created_by_name: string | null
  quorum_pct: string
  pass_pct: string
  status: ProposalStatus
  closes_at: string
  resolved_at: string | null
  outcome_note: string
  created_at: string
  tally: ProposalTally
  my_vote: VoteChoice | null
}

export function useProposals(groupId: string | null | undefined) {
  return useQuery<Proposal[]>({
    queryKey: ['proposals', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await api.get(`/governance/groups/${groupId}/proposals/`)
      return (data.results ?? data.data ?? data) as Proposal[]
    },
  })
}

export function useCreateProposal(groupId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.post(`/governance/groups/${groupId}/proposals/`, body)
      return data as Proposal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals', groupId] }),
  })
}

export function useVote(groupId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ proposalId, choice }: { proposalId: string; choice: VoteChoice }) => {
      const { data } = await api.post(`/governance/proposals/${proposalId}/vote/`, { choice })
      return data as Proposal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals', groupId] }),
  })
}
