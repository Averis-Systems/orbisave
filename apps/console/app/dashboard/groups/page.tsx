'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { Check, Copy, KeyRound, Loader2, ShieldCheck, UserCheck, Users2 } from 'lucide-react'
import {
  PageHeader,
  ServerDataTable,
  StatusBadge,
  useServerTable,
  countryLabel,
  formatDateTime,
  formatMoney,
  type ServerColumn,
  type TableFetcher,
  type TablePage,
} from '@/components/ui'

/**
 * Groups.
 *
 * Global group oversight for the super admin. Groups are sharded per country,
 * so the list endpoint fans out across every country database and merges the
 * result; a super_admin sees all three countries, and ?country= narrows to
 * one. Money is shown against each group's own currency and never summed
 * across countries.
 */

interface GroupRow {
  id: string
  name: string
  country: string
  status: string
  verification_status: string
  chairperson_name: string | null
  contribution_amount: string
  currency: string
  max_members: number
  created_at: string
}

const COUNTRY_OPTIONS = [
  { value: 'kenya', label: 'Kenya' },
  { value: 'rwanda', label: 'Rwanda' },
  { value: 'ghana', label: 'Ghana' },
]

const VERIFICATION_OPTIONS = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
]

export default function ConsoleGroupsPage() {
  const fetcher = useCallback<TableFetcher<GroupRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/groups/', { params, signal })
    return data as TablePage<GroupRow>
  }, [])

  const table = useServerTable<GroupRow>(fetcher, {
    filterKeys: ['country', 'verification_status', 'status'],
  })

  const columns: ServerColumn<GroupRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Group',
        sortField: 'name',
        render: (g) => (
          <div>
            <p className="font-medium text-navy">{g.name}</p>
            {g.chairperson_name && <p className="text-xs text-slate-400">Chair: {g.chairperson_name}</p>}
          </div>
        ),
      },
      { key: 'country', header: 'Country', sortField: 'country', render: (g) => countryLabel(g.country) },
      {
        key: 'verification',
        header: 'Verification',
        sortField: 'verification_status',
        render: (g) => <StatusBadge status={g.verification_status} />,
      },
      { key: 'status', header: 'Status', sortField: 'status', render: (g) => <StatusBadge status={g.status} /> },
      {
        key: 'contribution',
        header: 'Contribution',
        align: 'right',
        render: (g) => (
          <span className="tabular-nums">{formatMoney(Number(g.contribution_amount), g.country)}</span>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        align: 'right',
        sortField: 'created_at',
        render: (g) => <span className="tabular-nums text-slate-500">{formatDateTime(g.created_at)}</span>,
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Groups"
        description="Every savings group across Kenya, Rwanda and Ghana. Filter by country, verification state or status to work a queue."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(g) => g.id}
        minWidth={980}
        renderExpanded={(g) => <GroupMembersPanel groupId={g.id} />}
        searchPlaceholder="Search group name"
        filters={[
          { key: 'country', label: 'Country', options: COUNTRY_OPTIONS },
          { key: 'verification_status', label: 'Verification', options: VERIFICATION_OPTIONS },
          { key: 'status', label: 'Status', options: STATUS_OPTIONS },
        ]}
        emptyIcon={Users2}
        emptyTitle="No groups yet"
        emptyDescription="Groups appear here as soon as a chairperson creates one in any country."
      />
    </div>
  )
}

interface GroupMemberRow {
  membership_id: string
  full_name: string
  email: string
  phone: string
  kyc_status: string
  gender: string
  role: string
  status: string
  rotation_position: number | null
  joined_at: string | null
  contributions_confirmed: number
  has_first_contribution: boolean
}

interface GroupMembersResponse {
  group: {
    id: string
    name: string
    invite_code: string
    max_members: number
    member_count: number
  }
  members: GroupMemberRow[]
}

const ROLE_STYLE: Record<string, string> = {
  chairperson: 'bg-[#ecfdf3] text-[#027a48]',
  treasurer: 'bg-blue-50 text-blue-700',
  secretary: 'bg-violet-50 text-violet-700',
  member: 'bg-slate-100 text-slate-500',
}

const KYC_STYLE: Record<string, string> = {
  verified: 'bg-[#ecfdf3] text-[#027a48]',
  submitted: 'bg-amber-50 text-amber-600',
  pending: 'bg-slate-100 text-slate-500',
  rejected: 'bg-[#fef3f2] text-[#d92d20]',
}

/**
 * A group's roster, lazy-loaded only when the row is expanded. Because this is
 * mounted on expand and fetched from a super-admin-only endpoint, member PII is
 * never in the page (or the DOM) for a collapsed row and can never reach an
 * unauthorised viewer.
 */
function GroupMembersPanel({ groupId }: { groupId: string }) {
  const [data, setData] = useState<GroupMembersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<GroupMembersResponse>(`/admin-portal/superadmin/groups/${groupId}/members/`)
      .then(({ data }) => {
        if (!cancelled) {
          setData(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this group's members. Try again.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  const copyInvite = async () => {
    if (!data?.group.invite_code) return
    try {
      await navigator.clipboard.writeText(data.group.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; the code is still visible to copy manually */
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
      </div>
    )
  }

  if (error) {
    return <p className="py-4 text-sm text-[#b42318]">{error}</p>
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Invite code: the id a chairperson shares to add members. */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#039855]">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">Invite code</p>
            <p className="text-xs text-slate-500">
              The chairperson shares this to add members. Join order and first contribution set the payout position.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <code className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm text-navy">
            {data.group.invite_code}
          </code>
          <button
            onClick={copyInvite}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-navy transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Roster */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-navy">
          Members <span className="font-normal text-slate-400">({data.group.member_count} of {data.group.max_members})</span>
        </p>
      </div>

      {data.members.length === 0 ? (
        <p className="py-4 text-sm text-slate-400">No members have joined this group yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="thin-scrollbar max-w-full overflow-x-auto">
            <table className="w-full" style={{ minWidth: 720 }}>
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5">Payout #</th>
                  <th className="px-4 py-2.5">Member</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">KYC</th>
                  <th className="px-4 py-2.5">First contribution</th>
                  <th className="px-4 py-2.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.members.map((m) => (
                  <tr key={m.membership_id} className="text-sm">
                    <td className="px-4 py-3 tabular-nums text-slate-500">{m.rotation_position ?? '-'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{m.full_name}</p>
                      <p className="text-xs text-slate-400">{m.email || m.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLE[m.role] || ROLE_STYLE.member}`}>
                        {m.role === 'chairperson' && <ShieldCheck className="h-3 w-3" />}
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${KYC_STYLE[m.kyc_status] || KYC_STYLE.pending}`}>
                        {m.kyc_status === 'verified' && <UserCheck className="h-3 w-3" />}
                        {m.kyc_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.has_first_contribution ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#027a48]">
                          <Check className="h-3.5 w-3.5" /> Done
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">
                      {m.joined_at ? formatDateTime(m.joined_at) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
