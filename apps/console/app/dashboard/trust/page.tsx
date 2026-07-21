'use client'

import { useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { Landmark } from 'lucide-react'
import {
  PageHeader,
  ServerDataTable,
  StatusBadge,
  useServerTable,
  countryLabel,
  formatDateTime,
  type BadgeTone,
  type ServerColumn,
  type TableFetcher,
  type TablePage,
} from '@/components/ui'

/**
 * Trust and reconciliation.
 *
 * The exception queue where the bank and the ledger disagree. Reconciliation
 * items are opened by the statement-import and webhook flows and worked by
 * country admins; the super admin sees every country's queue at once. The
 * endpoint already fans out across the country databases and merges.
 *
 * Amounts are shown in each item's own currency. Expected vs observed is the
 * whole point of a reconciliation row, so both are shown side by side.
 */

interface ReconItem {
  id: string
  issue_type: string
  status: string
  severity: string
  account_stream: string
  reference: string | null
  expected_amount: string | null
  observed_amount: string | null
  currency: string
  group_name: string | null
  business_date: string | null
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'all', label: 'All' },
]

const SEVERITY_TONE: Record<string, BadgeTone> = {
  critical: 'red',
  high: 'red',
  medium: 'amber',
  low: 'gray',
}

function amount(value: string | null, currency: string) {
  if (value === null) return <span className="text-slate-300">—</span>
  const n = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(Number(value))
  return <span className="tabular-nums">{currency} {n}</span>
}

export default function ConsoleTrustAccountsPage() {
  const fetcher = useCallback<TableFetcher<ReconItem>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/reconciliation/items/', { params, signal })
    return data as TablePage<ReconItem>
  }, [])

  // The queue defaults to open items; the status filter includes an explicit
  // "all" so a reviewer can see resolved history too.
  const table = useServerTable<ReconItem>(fetcher, { filterKeys: ['status'] })

  const columns: ServerColumn<ReconItem>[] = useMemo(
    () => [
      {
        key: 'issue',
        header: 'Issue',
        render: (i) => (
          <div>
            <p className="font-medium capitalize text-navy">{i.issue_type?.replace(/_/g, ' ')}</p>
            {i.group_name && <p className="text-xs text-slate-400">{i.group_name}</p>}
          </div>
        ),
      },
      {
        key: 'stream',
        header: 'Stream',
        render: (i) => <span className="capitalize text-slate-500">{i.account_stream?.replace(/_/g, ' ')}</span>,
      },
      {
        key: 'severity',
        header: 'Severity',
        render: (i) => <StatusBadge status={i.severity} tone={SEVERITY_TONE[i.severity?.toLowerCase()] || 'gray'} />,
      },
      { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
      { key: 'expected', header: 'Expected', align: 'right', render: (i) => amount(i.expected_amount, i.currency) },
      { key: 'observed', header: 'Observed', align: 'right', render: (i) => amount(i.observed_amount, i.currency) },
      {
        key: 'date',
        header: 'Opened',
        align: 'right',
        render: (i) => <span className="tabular-nums text-slate-500">{formatDateTime(i.created_at)}</span>,
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Trust reconciliation"
        description="Where a country's bank statement and the ledger disagree. Every open exception across all countries, worked to resolution."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(i) => i.id}
        minWidth={1040}
        searchPlaceholder="Search reference"
        filters={[{ key: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        emptyIcon={Landmark}
        emptyTitle="Nothing to reconcile"
        emptyDescription="The ledger and the bank statements agree. Exceptions appear here when a discrepancy is detected."
      />
    </div>
  )
}
