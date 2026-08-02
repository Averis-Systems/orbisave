'use client'

import { useCallback, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { Handshake, Loader2, Mail, Phone } from 'lucide-react'
import {
  PageHeader,
  ServerDataTable,
  useServerTable,
  formatDateTime,
  type ServerColumn,
  type TableFetcher,
  type TablePage,
} from '@/components/ui'
import { toast } from 'sonner'

/**
 * Partnerships.
 *
 * Enquiries submitted from the public marketing site's partner form (banks,
 * distributors, investors). The super admin reviews them here and triages the
 * status. Read from /admin-portal/superadmin/partner-enquiries/.
 */

interface EnquiryRow {
  id: string
  organization: string
  contact_name: string
  email: string
  phone: string
  partner_type: string
  message: string
  status: string
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  bank: 'Bank',
  distributor: 'Distributor',
  investor: 'Investor',
  other: 'Other',
}

const TYPE_OPTIONS = [
  { value: 'bank', label: 'Bank' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'investor', label: 'Investor' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-amber-50 text-amber-700',
  contacted: 'bg-[#eff8ff] text-[#026aa2]',
  closed: 'bg-slate-100 text-slate-500',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status] || STATUS_STYLE.new}`}>
      {status}
    </span>
  )
}

export default function PartnershipsPage() {
  const fetcher = useCallback<TableFetcher<EnquiryRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/superadmin/partner-enquiries/', { params, signal })
    return data as TablePage<EnquiryRow>
  }, [])

  const table = useServerTable<EnquiryRow>(fetcher, {
    filterKeys: ['status', 'partner_type'],
  })

  const columns: ServerColumn<EnquiryRow>[] = useMemo(
    () => [
      {
        key: 'organization',
        header: 'Organization',
        render: (e) => (
          <div>
            <p className="font-medium text-navy">{e.organization}</p>
            <p className="text-xs text-slate-400">{TYPE_LABEL[e.partner_type] || e.partner_type}</p>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact',
        render: (e) => (
          <div>
            <p className="text-slate-700">{e.contact_name}</p>
            <p className="text-xs text-slate-400">{e.email}</p>
          </div>
        ),
      },
      { key: 'status', header: 'Status', render: (e) => <StatusPill status={e.status} /> },
      {
        key: 'submitted',
        header: 'Received',
        align: 'right',
        render: (e) => <span className="tabular-nums text-slate-500">{formatDateTime(e.created_at)}</span>,
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Partnerships"
        description="Partnership enquiries from the marketing site. Review each one and mark where it stands."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(e) => e.id}
        minWidth={860}
        renderExpanded={(e) => <EnquiryPanel enquiry={e} onChanged={() => table.refresh()} />}
        searchPlaceholder="Search organization, name or email"
        filters={[
          { key: 'status', label: 'Status', options: STATUS_OPTIONS },
          { key: 'partner_type', label: 'Type', options: TYPE_OPTIONS },
        ]}
        emptyIcon={Handshake}
        emptyTitle="No partnership enquiries yet"
        emptyDescription="Submissions from the marketing site's partner form appear here."
      />
    </div>
  )
}

function EnquiryPanel({ enquiry, onChanged }: { enquiry: EnquiryRow; onChanged: () => void }) {
  const [saving, setSaving] = useState<string | null>(null)

  const setStatus = async (status: string) => {
    if (status === enquiry.status) return
    setSaving(status)
    try {
      await api.patch(`/admin-portal/superadmin/partner-enquiries/${enquiry.id}/`, { status })
      toast.success(`Marked as ${status}.`)
      onChanged()
    } catch {
      toast.error('Could not update the status. Try again.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {enquiry.message || <span className="text-slate-400">No message provided.</span>}
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <a href={`mailto:${enquiry.email}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-[#009200]">
            <Mail className="h-3.5 w-3.5" /> {enquiry.email}
          </a>
          {enquiry.phone && (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> {enquiry.phone}
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Set status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => {
            const active = enquiry.status === s.value
            return (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                disabled={saving !== null || active}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                  active
                    ? 'border-primary bg-primary/[0.06] text-primary'
                    : 'border-slate-200 bg-white text-navy hover:bg-slate-50 disabled:opacity-50'
                }`}
              >
                {saving === s.value && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
