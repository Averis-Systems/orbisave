'use client'

import { useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { Banknote } from 'lucide-react'
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
 * Loans.
 *
 * Platform-wide loan oversight. Loans are sharded per country like groups, so
 * the endpoint fans out across shards and merges. Amounts are shown in each
 * loan's own currency; there is no platform-wide total, because summing KES,
 * RWF and GHS would be meaningless.
 */

interface LoanRow {
  id: string
  borrower_name: string
  borrower_phone: string
  group_name: string
  group_country: string
  amount: string
  currency: string
  purpose: string
  status: string
  created_at: string
  chair_approved_at: string | null
  treasurer_approved_at: string | null
}

const STATUS_OPTIONS = [
  { value: 'pending_admin', label: 'Pending admin' },
  { value: 'active', label: 'Active' },
  { value: 'repaid', label: 'Repaid' },
  { value: 'defaulted', label: 'Defaulted' },
]

export default function ConsoleLoansPage() {
  const fetcher = useCallback<TableFetcher<LoanRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/loans/', { params, signal })
    return data as TablePage<LoanRow>
  }, [])

  const table = useServerTable<LoanRow>(fetcher, { filterKeys: ['status'] })

  const columns: ServerColumn<LoanRow>[] = useMemo(
    () => [
      {
        key: 'borrower',
        header: 'Borrower',
        render: (l) => (
          <div>
            <p className="font-medium text-navy">{l.borrower_name}</p>
            <p className="text-xs text-slate-400">{l.group_name}</p>
          </div>
        ),
      },
      { key: 'country', header: 'Country', render: (l) => countryLabel(l.group_country) },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortField: 'amount',
        render: (l) => <span className="tabular-nums">{formatMoney(Number(l.amount), l.group_country)}</span>,
      },
      {
        key: 'purpose',
        header: 'Purpose',
        render: (l) => <span className="text-slate-500">{l.purpose || 'Not stated'}</span>,
      },
      { key: 'status', header: 'Status', sortField: 'status', render: (l) => <StatusBadge status={l.status} /> },
      {
        key: 'created',
        header: 'Requested',
        align: 'right',
        sortField: 'created_at',
        render: (l) => <span className="tabular-nums text-slate-500">{formatDateTime(l.created_at)}</span>,
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Loans"
        description="Every loan across all countries, from request through repayment. Filter by status to focus on approvals or arrears."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(l) => l.id}
        minWidth={980}
        searchPlaceholder="Search borrower or group"
        filters={[{ key: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        emptyIcon={Banknote}
        emptyTitle="No loans yet"
        emptyDescription="Loans appear here once members start borrowing from their group pools."
      />
    </div>
  )
}
