'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Inbox,
  Loader2,
  X,
} from 'lucide-react'
import {
  PageHeader,
  RowMenu,
  ServerDataTable,
  StatusBadge,
  useServerTable,
  formatDateTime,
  type ServerColumn,
  type TableFetcher,
  type TablePage,
} from '@orbisave/admin-ui'

/**
 * Platform feedback queue (super admin).
 *
 * The super admin sees feedback from every country. Serious items escalated by
 * a member or a country manager surface here for a final decision; the super
 * admin can resolve any item with a note (which notifies the reporter).
 */

interface Feedback {
  id: string
  reporter_name: string | null
  reporter_email: string | null
  country: string
  category: string
  subject: string
  message: string
  screenshot_url: string | null
  page_url: string
  severity: 'normal' | 'serious'
  status: string
  resolution_note: string
  resolved_by_name: string | null
  resolved_at: string | null
  escalated_at: string | null
  created_at: string
}

const CATEGORY_LABEL: Record<string, string> = {
  bug: 'Something broken',
  payment: 'Payment / money',
  account: 'Account / login',
  question: 'Question',
  suggestion: 'Suggestion',
  other: 'Other',
}

const STATUS_OPTIONS = [
  { value: 'escalated', label: 'Escalated' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'serious') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef6ee] px-2.5 py-0.5 text-xs font-medium text-[#b93815]">
        <AlertTriangle className="h-3.5 w-3.5" />
        Serious
      </span>
    )
  }
  return <span className="text-xs text-slate-400">Normal</span>
}

export default function ConsoleFeedbackPage() {
  const [selected, setSelected] = useState<Feedback | null>(null)

  const fetcher = useCallback<TableFetcher<Feedback>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/feedback/', { params, signal })
    return data as TablePage<Feedback>
  }, [])

  const table = useServerTable<Feedback>(fetcher, { filterKeys: ['status'], staticParams: {} })

  const columns: ServerColumn<Feedback>[] = useMemo(
    () => [
      {
        key: 'reporter',
        header: 'Member',
        render: (f) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-navy">{f.reporter_name || 'Unknown'}</p>
            <p className="truncate text-xs text-slate-400">{f.reporter_email}</p>
          </div>
        ),
      },
      {
        key: 'country',
        header: 'Country',
        render: (f) => <span className="capitalize text-slate-600">{f.country || '—'}</span>,
      },
      {
        key: 'subject',
        header: 'Issue',
        render: (f) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-navy">{f.subject}</p>
            <p className="truncate text-xs text-slate-400">{CATEGORY_LABEL[f.category] || f.category}</p>
          </div>
        ),
      },
      { key: 'severity', header: 'Priority', render: (f) => <SeverityBadge severity={f.severity} /> },
      { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
      {
        key: 'created_at',
        header: 'Raised',
        render: (f) => <span className="tabular-nums text-slate-500">{formatDateTime(f.created_at)}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (f) => (
          <RowMenu
            label={`Actions for ${f.subject}`}
            actions={[{ label: 'View & resolve', icon: Eye, onSelect: () => setSelected(f) }]}
          />
        ),
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Feedback"
        description="Member feedback across every country. Serious items escalated by members or country managers surface here for a final decision."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(f) => f.id}
        minWidth={980}
        searchPlaceholder="Search subject or member"
        filters={[{ key: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        emptyIcon={Inbox}
        emptyTitle="No feedback"
        emptyDescription="Feedback raised by members across all countries will appear here."
      />

      {selected && (
        <ResolveDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onActioned={() => {
            setSelected(null)
            table.refresh()
          }}
        />
      )}
    </div>
  )
}

function ResolveDrawer({
  item,
  onClose,
  onActioned,
}: {
  item: Feedback
  onClose: () => void
  onActioned: () => void
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = async () => {
    setError(null)
    setBusy(true)
    try {
      await api.post(`/admin-portal/feedback/${item.id}/resolve/`, { resolution_note: note.trim() })
      onActioned()
      toast.success('Resolved. The member has been notified.')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      setError(detail?.error || detail?.message || 'Could not resolve. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const done = item.status === 'resolved'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resolve feedback"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-navy">{item.subject}</h2>
              <SeverityBadge severity={item.severity} />
              <StatusBadge status={item.status} />
              <span className="text-xs capitalize text-slate-400">{item.country}</span>
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">
              {item.reporter_name} · {item.reporter_email} · {formatDateTime(item.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</h3>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-navy">{item.message}</p>
          </div>

          {item.page_url && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reported from</h3>
              <p className="mt-1.5 font-mono text-xs text-slate-500">{item.page_url}</p>
            </div>
          )}

          {item.screenshot_url && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Screenshot</h3>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- served from the backend media host */}
                <img src={item.screenshot_url} alt="Reported screenshot" className="max-h-80 w-full object-contain" />
              </div>
            </div>
          )}

          {done && item.resolution_note && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resolution</h3>
              <p className="mt-1.5 text-sm text-emerald-800">{item.resolution_note}</p>
              {item.resolved_by_name && (
                <p className="mt-1 text-xs text-emerald-600">Resolved by {item.resolved_by_name}</p>
              )}
            </div>
          )}

          {!done && (
            <div>
              <label htmlFor="resolution-note" className="block text-sm font-medium text-navy">
                Resolution note
              </label>
              <p className="mt-1 text-xs text-slate-500">Shared with the member when you resolve this.</p>
              <textarea
                id="resolution-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was decided or done."
                className="mt-2 h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-navy outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-[#fef3f2] px-3.5 py-2.5 text-sm text-[#d92d20]">
              {error}
            </p>
          )}
        </div>

        {!done && (
          <div className="border-t border-slate-100 p-5">
            <button
              type="button"
              onClick={resolve}
              disabled={busy}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-[#009200] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="h-4 w-4" />}
              Resolve
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
