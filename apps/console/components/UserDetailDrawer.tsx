'use client'

/**
 * Full per-member management drawer.
 *
 * This is the "pull every card to manage one user" surface reached from the
 * members table's row menu. It fetches /admin-portal/users/<id>/, which
 * returns the member's profile, KYC documents, group memberships and recent
 * audit trail, and renders each as its own card. Account actions
 * (suspend / reactivate) are wired to /users/<id>/suspend/ and refresh both
 * the drawer and the table underneath.
 *
 * Everything here is live: no card is shown that is not backed by real data,
 * and no action is offered that the backend cannot perform. Suspend requires a
 * reason because it is logged to the audit trail the member's own row links to.
 */

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Ban,
  BadgeCheck,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users2,
  X,
} from 'lucide-react'
import { StatusBadge, countryLabel, formatDateTime } from '@/components/ui'

interface KycDoc {
  id: string
  document_type: string
  status: string
  front_image_url: string | null
  back_image_url: string | null
  selfie_image_url: string | null
}

interface Membership {
  group_id: string
  group_name: string
  role: string
  status: string
  joined_at: string
}

interface AuditEntry {
  action: string
  actor: string
  country: string | null
  ip_address: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

interface UserDetail {
  id: string
  full_name: string
  email: string
  phone: string
  role: string
  country: string
  kyc_status: string
  phone_verified: boolean
  two_factor_enabled: boolean
  mobile_money_provider: string | null
  mobile_money_number: string | null
  last_login_ip: string | null
  is_active: boolean
  date_of_birth: string | null
  national_id: string | null
  created_at: string
  kyc_documents: KycDoc[]
  group_memberships: Membership[]
  recent_audit: AuditEntry[]
}

export function UserDetailDrawer({
  userId,
  summaryName,
  onClose,
  onChanged,
}: {
  userId: string
  /** Shown in the header until the full record loads, so there is no blank. */
  summaryName: string
  onClose: () => void
  /** Called after a suspend/reactivate so the table can refetch. */
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get(`/admin-portal/users/${userId}/`, { signal })
        setDetail(data as UserDetail)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'CanceledError') return
        setError('This member could not be loaded.')
      } finally {
        setLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  // Escape closes the drawer, matching the row menu and every other overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const runAction = async (action: 'suspend' | 'reinstate') => {
    setActing(true)
    setActionError(null)
    try {
      await api.post(`/admin-portal/users/${userId}/suspend/`, {
        action,
        reason: reason.trim(),
      })
      setSuspendOpen(false)
      setReason('')
      await load()
      onChanged()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      setActionError(detail?.error || detail?.message || 'That action could not be completed.')
    } finally {
      setActing(false)
    }
  }

  const copyEmail = async () => {
    if (!detail?.email) return
    try {
      await navigator.clipboard.writeText(detail.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; failing quietly is fine for a convenience.
    }
  }

  const suspended = detail ? !detail.is_active : false

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Manage ${summaryName}`}
      className="fixed inset-0 z-50 flex justify-end bg-navy/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-semibold text-primary">
              {(detail?.full_name || summaryName)?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-navy">{detail?.full_name || summaryName}</h2>
              <div className="mt-1 flex items-center gap-2">
                {detail && <StatusBadge status={detail.is_active ? 'active' : 'suspended'} />}
                {detail && <span className="text-xs capitalize text-slate-400">{detail.role?.replace(/_/g, ' ')}</span>}
              </div>
            </div>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 motion-reduce:animate-none" />
              ))}
            </div>
          ) : error || !detail ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-slate-500">{error || 'No detail available.'}</p>
              <button
                type="button"
                onClick={() => load()}
                className="h-9 cursor-pointer rounded-lg border border-slate-200 px-3.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-navy"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <Card title="Identity" icon={UserRound}>
                <Field label="Email" value={detail.email} action={
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                } />
                <Field label="Phone" value={detail.phone || 'Not provided'} badge={detail.phone_verified ? 'Verified' : undefined} />
                <Field label="Country" value={countryLabel(detail.country)} />
                <Field label="National ID" value={detail.national_id || 'Not provided'} />
                <Field label="Date of birth" value={detail.date_of_birth || 'Not provided'} />
                <Field label="Member since" value={formatDateTime(detail.created_at)} />
                <Field label="Last login IP" value={detail.last_login_ip || 'Never'} />
                <Field label="Two-factor" value={detail.two_factor_enabled ? 'Enabled' : 'Off'} />
              </Card>

              {(detail.mobile_money_provider || detail.mobile_money_number) && (
                <Card title="Mobile money" icon={Smartphone}>
                  <Field label="Provider" value={detail.mobile_money_provider || 'Not set'} />
                  <Field label="Number" value={detail.mobile_money_number || 'Not set'} />
                </Card>
              )}

              <Card title="KYC" icon={ShieldCheck} headerRight={<StatusBadge status={detail.kyc_status || 'pending'} />}>
                {detail.kyc_documents.length === 0 ? (
                  <p className="text-sm text-slate-400">No documents submitted.</p>
                ) : (
                  <div className="space-y-3">
                    {detail.kyc_documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm capitalize text-navy">{doc.document_type?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={doc.status} />
                          {doc.front_image_url && (
                            <a
                              href={doc.front_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Group membership" icon={Users2}>
                {detail.group_memberships.length === 0 ? (
                  <p className="text-sm text-slate-400">Not a member of any group.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.group_memberships.map((m) => (
                      <div key={m.group_id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-navy">{m.group_name}</p>
                          <p className="text-xs capitalize text-slate-400">
                            {m.role?.replace(/_/g, ' ')} · joined {formatDateTime(m.joined_at)}
                          </p>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Recent activity" icon={BadgeCheck}>
                {detail.recent_audit.length === 0 ? (
                  <p className="text-sm text-slate-400">No recorded activity.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.recent_audit.slice(0, 8).map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="capitalize text-navy">{a.action?.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-400">by {a.actor}</p>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">{formatDateTime(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Footer — account actions */}
        {detail && (
          <div className="border-t border-slate-100 p-4">
            {actionError && (
              <p role="alert" className="mb-3 rounded-lg bg-[#fef3f2] px-3.5 py-2.5 text-sm text-[#d92d20]">
                {actionError}
              </p>
            )}
            {suspended ? (
              <button
                type="button"
                onClick={() => runAction('reinstate')}
                disabled={acting}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-[#009200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="h-4 w-4" />}
                Reactivate account
              </button>
            ) : suspendOpen ? (
              <div className="space-y-2.5">
                <label htmlFor="suspend-reason" className="block text-sm font-medium text-navy">
                  Reason for suspension
                </label>
                <textarea
                  id="suspend-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Recorded to the audit trail and visible to other admins."
                  className="h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSuspendOpen(false)
                      setReason('')
                    }}
                    className="h-10 flex-1 cursor-pointer rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-navy"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction('suspend')}
                    disabled={acting || reason.trim().length === 0}
                    title={reason.trim().length === 0 ? 'Enter a reason first' : undefined}
                    className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d92d20] text-sm font-medium text-white transition-colors hover:bg-[#b42318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d92d20]/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {acting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Ban className="h-4 w-4" />}
                    Confirm suspend
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSuspendOpen(true)}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#fecdca] bg-white text-sm font-medium text-[#d92d20] transition-colors hover:bg-[#fef3f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d92d20]/30"
              >
                <Ban className="h-4 w-4" />
                Suspend account
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({
  title,
  icon: Icon,
  headerRight,
  children,
}: {
  title: string
  icon: typeof UserRound
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-navy">
          <Icon className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {headerRight}
      </div>
      <div className="space-y-2.5 p-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  badge,
  action,
}: {
  label: string
  value: string
  badge?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-slate-700">{value}</span>
        {badge && (
          <span className="shrink-0 rounded-full bg-[#ecfdf3] px-2 py-0.5 text-xs font-medium text-[#039855]">{badge}</span>
        )}
        {action}
      </span>
    </div>
  )
}
