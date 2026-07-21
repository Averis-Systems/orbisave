'use client'

import { useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { PiggyBank } from 'lucide-react'
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
 * Savings.
 *
 * Every contribution flowing into the groups, across all countries. A
 * contribution is the member's savings deposit, so this is the savings inflow
 * ledger. Contributions are sharded per country, so the endpoint fans out and
 * merges; the member name is resolved from the shared database because members
 * and their contributions live in different databases.
 *
 * This covers savings IN. The savings-withdrawal flow does not exist yet, so
 * there is deliberately nothing here that claims to show withdrawals.
 */

interface ContributionRow {
  id: string
  member_name: string
  group_name: string
  group_country: string
  amount: string
  currency: string
  method: string
  status: string
  confirmed_at: string | null
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'initiated', label: 'Initiated' },
  { value: 'failed', label: 'Failed' },
]

export default function ConsoleSavingsPage() {
  const fetcher = useCallback<TableFetcher<ContributionRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/contributions/', { params, signal })
    return data as TablePage<ContributionRow>
  }, [])

  const table = useServerTable<ContributionRow>(fetcher, { filterKeys: ['status'] })

  const columns: ServerColumn<ContributionRow>[] = useMemo(
    () => [
      {
        key: 'member',
        header: 'Member',
        render: (c) => (
          <div>
            <p className="font-medium text-navy">{c.member_name}</p>
            <p className="text-xs text-slate-400">{c.group_name}</p>
          </div>
        ),
      },
      { key: 'country', header: 'Country', render: (c) => countryLabel(c.group_country) },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortField: 'amount',
        render: (c) => <span className="tabular-nums">{formatMoney(Number(c.amount), c.group_country)}</span>,
      },
      {
        key: 'method',
        header: 'Method',
        render: (c) => <span className="uppercase text-slate-500">{c.method || '—'}</span>,
      },
      { key: 'status', header: 'Status', sortField: 'status', render: (c) => <StatusBadge status={c.status} /> },
      {
        key: 'when',
        header: 'Date',
        align: 'right',
        sortField: 'created_at',
        render: (c) => (
          <span className="tabular-nums text-slate-500">{formatDateTime(c.confirmed_at || c.created_at)}</span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Savings"
        description="Every contribution paid into a group across all countries. This is the savings inflow; withdrawals are a separate flow that is not yet built."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(c) => c.id}
        minWidth={980}
        searchPlaceholder="Search member or reference"
        filters={[{ key: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        emptyIcon={PiggyBank}
        emptyTitle="No contributions yet"
        emptyDescription="Member savings deposits appear here as soon as contributions start."
      />
    </div>
  )
}
