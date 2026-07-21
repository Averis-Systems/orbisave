'use client'

import { useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { Users2 } from 'lucide-react'
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
