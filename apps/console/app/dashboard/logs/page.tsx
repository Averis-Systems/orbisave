'use client'

import { useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { FileText } from 'lucide-react'
import {
  PageHeader,
  ServerDataTable,
  useServerTable,
  countryLabel,
  formatDateTime,
  type ServerColumn,
  type TableFetcher,
  type TablePage,
} from '@/components/ui'

/**
 * Audit logs.
 *
 * The immutable admin audit trail. Audit rows live on the shared `default`
 * database (not sharded), so this is one indexed query with no fan-out. The
 * super admin sees every country; ?country= narrows to one. Search matches the
 * actor's name or email, which is how an incident review starts.
 */

interface AuditRow {
  id: string
  action: string
  actor_name: string
  actor_email: string | null
  target_user: string | null
  country: string | null
  ip_address: string | null
  created_at: string
}

const COUNTRY_OPTIONS = [
  { value: 'kenya', label: 'Kenya' },
  { value: 'rwanda', label: 'Rwanda' },
  { value: 'ghana', label: 'Ghana' },
]

function humaniseAction(action: string) {
  return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export default function ConsoleAuditLogsPage() {
  const fetcher = useCallback<TableFetcher<AuditRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/audit/', { params, signal })
    return data as TablePage<AuditRow>
  }, [])

  const table = useServerTable<AuditRow>(fetcher, { filterKeys: ['country'] })

  const columns: ServerColumn<AuditRow>[] = useMemo(
    () => [
      {
        key: 'action',
        header: 'Action',
        render: (r) => <span className="font-medium text-navy">{humaniseAction(r.action)}</span>,
      },
      {
        key: 'actor',
        header: 'Actor',
        render: (r) => (
          <div>
            <p className="text-slate-600">{r.actor_name}</p>
            {r.actor_email && <p className="text-xs text-slate-400">{r.actor_email}</p>}
          </div>
        ),
      },
      {
        key: 'target',
        header: 'Target',
        render: (r) => (r.target_user ? <span className="text-slate-500">{r.target_user}</span> : <span className="text-slate-300">—</span>),
      },
      {
        key: 'country',
        header: 'Country',
        render: (r) => (r.country ? countryLabel(r.country) : <span className="text-slate-300">—</span>),
      },
      {
        key: 'ip',
        header: 'IP',
        render: (r) => <span className="tabular-nums text-slate-400">{r.ip_address || '—'}</span>,
      },
      {
        key: 'when',
        header: 'When',
        align: 'right',
        render: (r) => <span className="tabular-nums text-slate-500">{formatDateTime(r.created_at)}</span>,
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Audit logs"
        description="The immutable record of sensitive admin, KYC and financial actions across every country."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(r) => r.id}
        minWidth={980}
        searchPlaceholder="Search by actor name or email"
        filters={[{ key: 'country', label: 'Country', options: COUNTRY_OPTIONS }]}
        emptyIcon={FileText}
        emptyTitle="No audit entries"
        emptyDescription="Sensitive actions are recorded here as they happen."
      />
    </div>
  )
}
