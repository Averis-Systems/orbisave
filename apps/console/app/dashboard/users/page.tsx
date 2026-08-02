'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { AlertCircle, Ban, CheckCircle2, Coins, Eye, Loader2, ShieldCheck, UserCheck, UserCog, X, XCircle } from 'lucide-react'
import {
  PageHeader,
  ServerDataTable,
  StatusBadge,
  Tabs,
  useServerTable,
  countryLabel,
  formatDateTime,
  type ServerColumn,
  type TableFetcher,
  type TablePage,
} from '@/components/ui'

/**
 * Users.
 *
 *   Staff       - platform admins, one per country, who run Manager. These are
 *                 Averis employees. Source: /admin-portal/platform-admins/.
 *   Members KYC - the global identity-review queue. Under OrbiSave's policy KYC
 *                 is not for everyone: only group management (chairperson,
 *                 treasurer, secretary) and members applying for a loan submit
 *                 it, so this queue is exactly those people, never the whole
 *                 member base. Source: /admin-portal/kyc/queue/, which is
 *                 country-scoped for a platform admin but global for the super
 *                 admin here (narrow with the country filter). Approve/reject
 *                 activates or blocks the account; suspend takes it offline.
 *
 * To browse the full membership by group, that lives under Groups. Both tabs
 * run on the shared ServerDataTable (server-side search/filter/sort/paging,
 * mirrored into the URL). Neither surface returns super admins.
 */

type Tab = 'staff' | 'members'

interface StaffRow {
  id: string
  email: string
  full_name: string
  phone: string
  country: string
  is_active: boolean
  email_verified: boolean
  last_login: string | null
  created_at: string
}

const COUNTRY_OPTIONS = [
  { value: 'kenya', label: 'Kenya' },
  { value: 'rwanda', label: 'Rwanda' },
  { value: 'ghana', label: 'Ghana' },
]

function NameCell({ name, email }: { name: string; email: string }) {
  return (
    <div>
      <p className="font-medium text-navy">{name || 'Unnamed'}</p>
      <p className="text-xs text-slate-400">{email}</p>
    </div>
  )
}

export default function ConsoleUsersPage() {
  // The tab lives in the URL so the overview's "KYC awaiting review" card can
  // deep-link straight into the members list. It is resolved AFTER mount
  // rather than in the initial state: the server has no URL to read, so a
  // lazy initialiser would render 'staff' on the server and 'members' on the
  // client for a deep-link, which is a hydration mismatch. Defaulting to
  // 'staff' on both and correcting in an effect keeps first render identical.
  const [tab, setTab] = useState<Tab>('staff')
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get('tab')
    if (urlTab === 'members') setTab('members')
    setResolved(true)
  }, [])

  const selectTab = (next: Tab) => {
    setTab(next)
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    // Switching tab abandons the other tab's filters, which do not apply.
    for (const key of ['tab', 'page', 'page_size', 'search', 'sort', 'role', 'kyc_status', 'country']) {
      params.delete(key)
    }
    if (next === 'members') params.set('tab', 'members')
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname)
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Users"
        description="Averis staff who operate the platform, and the members-KYC review queue. To browse members by group, use Groups."
      />

      <Tabs
        items={[
          { id: 'staff', label: 'Staff' },
          { id: 'members', label: 'Members KYC' },
        ]}
        active={tab}
        onChange={(id) => selectTab(id as Tab)}
      />

      {/* Rendered only once the tab is resolved from the URL, so a deep-link
          to members does not first mount the staff table and fire its fetch.
          Keyed so switching tabs mounts a fresh table: the two tabs have
          different filters and a different endpoint, and carrying one tab's
          query into the other would send a role filter to the staff list. */}
      {!resolved ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 motion-reduce:animate-none" />
      ) : tab === 'staff' ? (
        <StaffTable key="staff" />
      ) : (
        <MembersKycTable key="members" />
      )}
    </div>
  )
}

function StaffTable() {
  const fetcher = useCallback<TableFetcher<StaffRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/platform-admins/', { params, signal })
    return data as TablePage<StaffRow>
  }, [])

  const table = useServerTable<StaffRow>(fetcher, { filterKeys: ['country'] })

  const columns: ServerColumn<StaffRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortField: 'full_name',
        render: (r) => <NameCell name={r.full_name} email={r.email} />,
      },
      { key: 'country', header: 'Country', sortField: 'country', render: (r) => countryLabel(r.country) },
      {
        key: 'phone',
        header: 'Phone',
        render: (r) => <span className="tabular-nums">{r.phone || 'Not provided'}</span>,
      },
      {
        key: 'status',
        header: 'Access',
        render: (r) => <StatusBadge status={r.is_active ? 'active' : 'suspended'} />,
      },
      {
        key: 'last_login',
        header: 'Last signed in',
        render: (r) =>
          r.last_login ? (
            <span className="tabular-nums text-slate-500">{formatDateTime(r.last_login)}</span>
          ) : (
            <span className="text-slate-400">Never</span>
          ),
      },
      {
        key: 'created',
        header: 'Added',
        align: 'right',
        sortField: 'created_at',
        render: (r) => <span className="tabular-nums text-slate-500">{formatDateTime(r.created_at)}</span>,
      },
    ],
    [],
  )

  return (
    <ServerDataTable
      table={table}
      columns={columns}
      rowKey={(r) => r.id}
      minWidth={920}
      searchPlaceholder="Search staff"
      filters={[{ key: 'country', label: 'Country', options: COUNTRY_OPTIONS }]}
      emptyIcon={ShieldCheck}
      emptyTitle="No platform admins yet"
      emptyDescription="Nobody has been given Manager access yet. Invite a platform admin to start country operations."
    />
  )
}

// ── Members KYC (global review queue) ────────────────────────────────────────

/**
 * A KYC submission awaiting a super-admin decision, enriched by the backend
 * with WHY the person is verifying. Matches KYCDocumentSerializer + the queue
 * view's per-row additions.
 */
interface KycRow {
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
  kyc_reason: 'management' | 'loan' | 'member'
  group_role: string
  group_name: string | null
  group_offers_loans: boolean
  has_pending_loan: boolean
}

const KYC_STATUS_OPTIONS = [
  { value: 'submitted', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const KYC_GUIDELINES = [
  'Full name matches the document exactly.',
  'Document is valid and not expired.',
  'Photos are clear and not blurry.',
  'Selfie matches the document photo.',
]

/**
 * Names WHY someone is verifying so the reviewer checks the right thing.
 * Management (chairperson/treasurer/secretary) verify to run a group; a member
 * appears only because they are applying for a loan their group offers.
 */
function ReasonBadge({ row }: { row: KycRow }) {
  if (row.kyc_reason === 'management') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-xs font-medium capitalize text-[#3538cd]">
        <UserCog className="h-3.5 w-3.5" />
        {row.group_role || 'Management'}
      </span>
    )
  }
  if (row.kyc_reason === 'loan') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef6ee] px-2.5 py-0.5 text-xs font-medium text-[#b93815]">
        <Coins className="h-3.5 w-3.5" />
        Loan applicant
      </span>
    )
  }
  return <span className="text-xs text-slate-400">Member</span>
}

function MembersKycTable() {
  const [selected, setSelected] = useState<KycRow | null>(null)

  const fetcher = useCallback<TableFetcher<KycRow>>(async (params, signal) => {
    // Super admin: global by default; the country filter narrows it.
    const { data } = await api.get('/admin-portal/kyc/queue/', { params, signal })
    return data as TablePage<KycRow>
  }, [])

  const table = useServerTable<KycRow>(fetcher, { filterKeys: ['status', 'country'] })

  const columns: ServerColumn<KycRow>[] = useMemo(
    () => [
      {
        key: 'member',
        header: 'Member',
        render: (r) => <NameCell name={r.user_name} email={r.user_email} />,
      },
      { key: 'reason', header: 'Reason', render: (r) => <ReasonBadge row={r} /> },
      {
        key: 'group',
        header: 'Group',
        render: (r) => (r.group_name ? <span className="text-slate-700">{r.group_name}</span> : <span className="text-slate-300">No group</span>),
      },
      { key: 'country', header: 'Country', render: (r) => countryLabel(r.user_country) },
      {
        key: 'document',
        header: 'Document',
        render: (r) => <span className="capitalize">{r.document_type?.replace(/_/g, ' ')}</span>,
      },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      {
        key: 'submitted',
        header: 'Submitted',
        render: (r) => <span className="tabular-nums text-slate-500">{formatDateTime(r.created_at)}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (r) => (
          <button
            type="button"
            onClick={() => setSelected(r)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy transition hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Review
          </button>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(r) => r.id}
        minWidth={1040}
        searchPlaceholder="Search member name or email"
        filters={[
          { key: 'status', label: 'Status', options: KYC_STATUS_OPTIONS },
          { key: 'country', label: 'Country', options: COUNTRY_OPTIONS },
        ]}
        emptyIcon={UserCheck}
        emptyTitle="Nothing awaiting review"
        emptyDescription="Only group management and members applying for a loan submit KYC. Their submissions appear here for review."
      />

      {selected && (
        <KycReviewDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onReviewed={() => {
            setSelected(null)
            table.refresh()
          }}
        />
      )}
    </>
  )
}

function KycReviewDrawer({
  row,
  onClose,
  onReviewed,
}: {
  row: KycRow
  onClose: () => void
  onReviewed: () => void
}) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | 'suspend' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canReject = rejectionReason.trim().length > 0

  const review = async (action: 'approve' | 'reject') => {
    setError(null)
    setSubmitting(action)
    try {
      await api.post(`/admin-portal/kyc/${row.id}/review/`, { action, rejection_reason: rejectionReason.trim() })
      onReviewed()
      toast.success(action === 'approve' ? `${row.user_name} verified.` : `${row.user_name}'s submission rejected.`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      setError(detail?.error || detail?.message || 'That decision could not be saved. Try again.')
    } finally {
      setSubmitting(null)
    }
  }

  const suspend = async () => {
    if (!window.confirm(`Suspend ${row.user_name}? They will lose access until reactivated.`)) return
    setError(null)
    setSubmitting('suspend')
    try {
      await api.post(`/admin-portal/users/${row.user_id}/suspend/`, {
        action: 'suspend',
        reason: rejectionReason.trim() || 'Suspended during KYC review.',
      })
      onReviewed()
      toast.success(`${row.user_name} suspended.`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data
      setError(detail?.error || 'Could not suspend this member. Try again.')
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
              {row.user_name} · {row.user_email} · {countryLabel(row.user_country)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ReasonBadge row={row} />
              {row.group_name && <span className="text-xs text-slate-400">{row.group_name}</span>}
              {row.kyc_reason === 'loan' && (
                <span className="text-xs text-slate-400">
                  {row.group_offers_loans ? 'Applying for a group loan' : 'Loan requested'}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto p-6 lg:grid-cols-2">
          <div className="space-y-6">
            <DocumentImage label="Front of document" src={row.front_image_url} />
            {row.back_image_url && <DocumentImage label="Back of document" src={row.back_image_url} />}
            {row.selfie_image_url && <DocumentImage label="Identity selfie" src={row.selfie_image_url} square />}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <h3 className="text-sm font-semibold text-navy">Verification checklist</h3>
              <ul className="mt-3 space-y-2.5">
                {KYC_GUIDELINES.map((text) => (
                  <li key={text} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-navy">
                Reason
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Required to reject. The member sees this, so name what they need to fix.
              </p>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. The photo is too blurry to read the ID number."
                className="mt-2 h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-navy outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-[#fef3f2] px-3.5 py-2.5 text-sm text-[#d92d20]">
                {error}
              </p>
            )}

            <div className="mt-auto space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => review('reject')}
                  disabled={submitting !== null || !canReject}
                  title={canReject ? undefined : 'Enter a reason first'}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#fecdca] bg-white text-sm font-medium text-[#d92d20] transition-colors hover:bg-[#fef3f2] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => review('approve')}
                  disabled={submitting !== null}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-[#009200] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Approve
                </button>
              </div>
              <button
                type="button"
                onClick={suspend}
                disabled={submitting !== null}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting === 'suspend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Suspend member
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
          // eslint-disable-next-line @next/next/no-img-element
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
