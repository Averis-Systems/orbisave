'use client'

import { useCallback, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
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
 * KYC review queue.
 *
 * Rebuilt from a card grid onto the shared server-driven table. A card grid is
 * the wrong primitive for queue work: it shows three records per row, cannot
 * be sorted, and the previous version fetched the whole queue at once behind a
 * search box that had no handler at all.
 *
 * The review step keeps a drawer, because approving an identity document means
 * looking at the images, and that does not fit in a table row.
 */

/**
 * Matches KYCDocumentSerializer, which returns FLAT fields (user_name,
 * front_image_url) rather than a nested user object. The previous version of
 * this page read doc.user.full_name against this same endpoint, so it threw a
 * TypeError the moment the queue contained a single row. It only ever appeared
 * to work because the queue was empty.
 */
interface KYCDocument {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_country: string
  document_type: string
  front_image_url: string | null
  back_image_url: string | null
  selfie_image_url: string | null
  status: string
  rejection_reason: string | null
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const GUIDELINES = [
  'Full name matches the document exactly.',
  'Document is valid and not expired.',
  'Photos are clear and not blurry.',
  'Selfie matches the document photo.',
]

export default function KYCReviewsPage() {
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null)

  const fetcher = useCallback<TableFetcher<KYCDocument>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/kyc/queue/', { params, signal })
    return data as TablePage<KYCDocument>
  }, [])

  const table = useServerTable<KYCDocument>(fetcher, {
    filterKeys: ['status'],
    // The queue defaults to what needs work, not to everything ever reviewed.
    staticParams: {},
  })

  const columns: ServerColumn<KYCDocument>[] = useMemo(
    () => [
      {
        key: 'member',
        header: 'Member',
        render: (doc) => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
              {doc.user_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-navy">{doc.user_name || 'Unnamed'}</p>
              <p className="truncate text-xs text-slate-400">{doc.user_email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'document_type',
        header: 'Document',
        render: (doc) => <span className="capitalize">{doc.document_type?.replace(/_/g, ' ')}</span>,
      },
      { key: 'status', header: 'Status', render: (doc) => <StatusBadge status={doc.status} /> },
      {
        key: 'created_at',
        header: 'Submitted',
        render: (doc) => <span className="tabular-nums text-slate-500">{formatDateTime(doc.created_at)}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (doc) => (
          <RowMenu
            label={`Actions for ${doc.user_name}`}
            actions={[
              { label: 'Review documents', icon: Eye, onSelect: () => setSelectedDoc(doc) },
            ]}
          />
        ),
      },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Identity verification"
        description="Review member KYC submissions for your country. Approving one activates the member's account."
      />

      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(doc) => doc.id}
        minWidth={880}
        searchPlaceholder="Search member name or email"
        filters={[{ key: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        emptyIcon={UserCheck}
        emptyTitle="Nothing awaiting review"
        emptyDescription="There are no KYC submissions in your country waiting on a decision."
      />

      {selectedDoc && (
        <ReviewDrawer
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onReviewed={() => {
            setSelectedDoc(null)
            table.refresh()
          }}
        />
      )}
    </div>
  )
}

function ReviewDrawer({
  doc,
  onClose,
  onReviewed,
}: {
  doc: KYCDocument
  onClose: () => void
  onReviewed: () => void
}) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canReject = rejectionReason.trim().length > 0

  const act = async (action: 'approve' | 'reject') => {
    setError(null)
    setSubmitting(action)
    try {
      await api.post(`/admin-portal/kyc/${doc.id}/review/`, {
        action,
        rejection_reason: rejectionReason.trim(),
      })
      onReviewed()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      // Replaces a browser alert(), which Manager used for every failure.
      setError(detail?.error || detail?.message || 'That decision could not be saved. Try again.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review identity document"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-navy">Review identity document</h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {doc.user_name} · {doc.user_email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto p-6 lg:grid-cols-2">
          <div className="space-y-6">
            <DocumentImage label="Front of document" src={doc.front_image_url} />
            {doc.back_image_url && <DocumentImage label="Back of document" src={doc.back_image_url} />}
            {doc.selfie_image_url && <DocumentImage label="Identity selfie" src={doc.selfie_image_url} square />}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <h3 className="text-sm font-semibold text-navy">Verification checklist</h3>
              <ul className="mt-3 space-y-2.5">
                {GUIDELINES.map((text) => (
                  <li key={text} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-navy">
                Rejection reason
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Required to reject. The member sees this, so name what they need to fix.
              </p>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. The photo is too blurry to read the ID number."
                className="mt-2 h-28 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-navy outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-[#fef3f2] px-3.5 py-2.5 text-sm text-[#d92d20]">
                {error}
              </p>
            )}

            <div className="mt-auto grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => act('reject')}
                disabled={submitting !== null || !canReject}
                title={canReject ? undefined : 'Enter a rejection reason first'}
                className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#fecdca] bg-white text-sm font-medium text-[#d92d20] transition-colors hover:bg-[#fef3f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d92d20]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting === 'reject' ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </button>
              <button
                type="button"
                onClick={() => act('approve')}
                disabled={submitting !== null}
                className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-[#009200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting === 'approve' ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentImage({ label, src, square }: { label: string; src: string | null; square?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-navy">{label}</h3>
      <div
        className={`mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${
          square ? 'aspect-square w-36' : 'aspect-[1.6/1]'
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- KYC media is
          // served from the backend's media host, not the Next image pipeline.
          <img src={src} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <AlertCircle className="h-6 w-6" />
            <span className="text-xs">Not supplied</span>
          </div>
        )}
      </div>
    </div>
  )
}
