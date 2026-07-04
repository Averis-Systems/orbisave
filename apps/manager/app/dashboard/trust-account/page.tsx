'use client'

/**
 * Trust Account & Reconciliation Queue (country-scoped).
 *
 * The human half of OrbiSave's fail-closed money design: statement imports
 * and webhook mismatches open reconciliation items; this page is where a
 * country admin sees them and resolves/escalates with a mandatory note.
 * Resolution never edits the ledger — corrections are posted as compensating
 * entries through the ledger service.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react'

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))

interface ReconRun {
  id: string
  country: string
  provider_code: string
  account_number: string
  business_date: string
  status: string
  observed_closing_balance: string | null
  open_items: number
}

interface ReconItem {
  id: string
  issue_type: string
  status: string
  severity: string
  account_stream: string
  reference: string
  bank_reference: string
  expected_amount: string | null
  observed_amount: string | null
  currency: string
  group_name: string | null
  business_date: string | null
  created_at: string
}

const SEVERITY_STYLES: Record<string, string> = {
  red: 'bg-red-50 text-red-700 border-red-200',
  orange: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function TrustAccountReconciliationPage() {
  const [runs, setRuns] = useState<ReconRun[]>([])
  const [items, setItems] = useState<ReconItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<ReconItem | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [runsRes, itemsRes] = await Promise.all([
        api.get('/admin-portal/reconciliation/runs/'),
        api.get('/admin-portal/reconciliation/items/?status=open'),
      ])
      setRuns(runsRes.data.results)
      setItems(itemsRes.data.results)
    } catch (err) {
      console.error('Failed to fetch reconciliation data', err)
      setError('Reconciliation data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  const submitAction = async (action: 'resolved' | 'escalated' | 'investigating') => {
    if (!actioning) return
    if ((action === 'resolved' || action === 'escalated') && note.trim().length < 5) {
      setError('A short note explaining the resolution is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.post(`/admin-portal/reconciliation/items/${actioning.id}/action/`, {
        action, note: note.trim(),
      })
      setActioning(null)
      setNote('')
      await fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.error || 'The action could not be applied.')
    } finally {
      setSubmitting(false)
    }
  }

  const openCount = items.length
  const redCount = items.filter((item) => item.severity === 'red').length

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-3">
            <Landmark className="w-3 h-3" />
            Trust Account Integrity
          </div>
          <h1 className="text-4xl font-bold text-navy tracking-tight">Reconciliation Queue</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">
            Bank-statement runs and open exceptions between the ledger and the trust account.
          </p>
        </div>
        <button
          onClick={() => void fetchAll()}
          className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-navy hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Open Exceptions" value={String(openCount)} tone={openCount ? 'red' : 'green'} />
        <SummaryCard label="Red Severity" value={String(redCount)} tone={redCount ? 'red' : 'green'} />
        <SummaryCard label="Statement Runs" value={String(runs.length)} tone="neutral" />
      </div>

      {/* ── Open exception queue ─────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-navy">Open Exceptions</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Every row is money the bank and the ledger disagree on. Resolve with a note or escalate.
          </p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-navy">No open exceptions — ledger and bank agree.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Issue</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Amounts (exp / obs)</th>
                  <th className="px-6 py-3">Group</th>
                  <th className="px-6 py-3">Raised</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.orange}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-navy">{item.issue_type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.reference}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600">
                      {item.expected_amount ?? '—'} / {item.observed_amount ?? '—'} {item.currency}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{item.group_name ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDateTime(item.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setActioning(item); setNote(''); setError(null) }}
                        className="px-4 py-2 rounded-lg bg-navy text-white text-xs font-bold hover:bg-navy-mid transition-all"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Statement runs ───────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-navy">Daily Statement Runs</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            One row per trust account per business day, imported from the bank.
          </p>
        </div>
        {runs.length === 0 && !loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-400">
            No statement imports yet — the daily job populates this after the first bank pull.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-3">Business Date</th>
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Closing Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Open Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-6 py-4 font-bold text-navy">{run.business_date}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{run.provider_code}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{run.account_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{run.observed_closing_balance ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${run.status === 'matched' ? SEVERITY_STYLES.green : SEVERITY_STYLES.orange}`}>
                        {run.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-navy">{run.open_items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Review dialog ────────────────────────────────────────────────── */}
      {actioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest mb-2">
                  <ShieldAlert className="w-4 h-4" />
                  {actioning.issue_type.replace(/_/g, ' ')}
                </div>
                <h3 className="text-xl font-bold text-navy">Resolve Exception</h3>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Ref <span className="font-mono">{actioning.reference}</span> — expected{' '}
                  {actioning.expected_amount ?? '—'}, observed {actioning.observed_amount ?? '—'} {actioning.currency}.
                </p>
              </div>
              <button onClick={() => setActioning(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Resolution note (mandatory — lands on the audit trail)
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="e.g. Matched to manual deposit slip #12; compensating entry posted."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-navy outline-none focus:border-primary"
              />
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => void submitAction('investigating')}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy hover:bg-slate-50 disabled:opacity-50"
              >
                Mark Investigating
              </button>
              <button
                onClick={() => void submitAction('escalated')}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                Escalate
              </button>
              <button
                onClick={() => void submitAction('resolved')}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-primary text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'red' | 'green' | 'neutral' }) {
  const toneClass =
    tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-emerald-600' : 'text-navy'
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}
