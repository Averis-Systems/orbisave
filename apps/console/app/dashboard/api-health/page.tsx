'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, Server, Timer } from 'lucide-react'
import { PageHeader, SectionCard, EmptyState } from '@/components/ui'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

interface Check {
  status: string
  latency_ms?: number
  error?: string
}

interface ApiEventRow {
  method: string
  path: string
  status_code: number
  duration_ms: number
  kind: 'error' | 'slow'
  actor_email: string
  created_at: string
}

interface ApiHealth {
  checks: { database: Check; cache: Check }
  api: { errors_24h: number; slow_24h: number }
  recent: ApiEventRow[]
  slow_threshold_ms: number
  checked_at: string
}

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  ok: { dot: 'bg-[#12b76a]', text: 'text-[#027a48]', label: 'Healthy' },
  degraded: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Degraded' },
  error: { dot: 'bg-[#d92d20]', text: 'text-[#d92d20]', label: 'Down' },
}

function HealthTile({ label, icon: Icon, check }: { label: string; icon: typeof Database; check?: Check }) {
  const s = STATUS_STYLES[check?.status || 'error'] || STATUS_STYLES.error
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          <span className={`text-sm font-semibold ${s.text}`}>{s.label}</span>
          {typeof check?.latency_ms === 'number' && (
            <span className="text-sm tabular-nums text-slate-400">{check.latency_ms}ms</span>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, tone, icon: Icon }: { label: string; value: number; tone: 'amber' | 'red' | 'default'; icon: typeof Clock }) {
  const chip =
    value === 0 ? 'bg-slate-100 text-slate-400' : tone === 'red' ? 'bg-[#fef3f2] text-[#d92d20]' : 'bg-amber-50 text-amber-600'
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${chip}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-navy">{value}</p>
      </div>
    </div>
  )
}

export default function ApiHealthPage() {
  const [data, setData] = useState<ApiHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .get<ApiHealth>('/admin-portal/superadmin/api-health/')
        .then(({ data }) => {
          if (!cancelled) {
            setData(data)
            setError(null)
          }
        })
        .catch(() => {
          if (!cancelled) setError('Could not load API health. Refresh to try again.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    load()
    const interval = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-6 pb-10">
      <PageHeader
        title="API health"
        description="Live reachability, and the recent API failures and slow requests worth acting on. Peak-hour traffic and latency percentiles live in the APM."
      />

      {error && (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-5 py-4 text-sm text-[#b42318]">{error}</div>
      )}

      {/* Health + 24h anomaly counts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ))
        ) : (
          <>
            <HealthTile label="Database" icon={Database} check={data?.checks.database} />
            <HealthTile label="Cache" icon={Server} check={data?.checks.cache} />
            <StatTile label="Errors (24h)" value={data?.api.errors_24h ?? 0} tone="red" icon={AlertTriangle} />
            <StatTile label="Slow requests (24h)" value={data?.api.slow_24h ?? 0} tone="amber" icon={Timer} />
          </>
        )}
      </div>

      {/* Recent anomalies */}
      <SectionCard
        title="Recent API events"
        description={`Failed (5xx) or slow (over ${((data?.slow_threshold_ms ?? 2000) / 1000).toFixed(0)}s) requests, newest first. Healthy requests are not recorded.`}
        actions={
          data?.checked_at ? (
            <span className="text-xs text-slate-400">Checked {formatDateTime(data.checked_at)}</span>
          ) : undefined
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-50" />
            ))}
          </div>
        ) : data?.recent.length ? (
          <div className="thin-scrollbar max-w-full overflow-x-auto">
            <table className="w-full" style={{ minWidth: 720 }}>
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Endpoint</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Duration</th>
                  <th className="px-5 py-3">Who</th>
                  <th className="px-5 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent.map((e, i) => (
                  <tr key={`${e.created_at}-${i}`} className="text-sm">
                    <td className="px-5 py-3">
                      <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">{e.method}</span>
                      <span className="font-mono text-xs text-navy">{e.path}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                          e.kind === 'error' ? 'bg-[#fef3f2] text-[#d92d20]' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {e.kind === 'error' ? <AlertTriangle className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
                        {e.status_code || (e.kind === 'slow' ? 'slow' : 'error')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-600">{e.duration_ms}ms</td>
                    <td className="px-5 py-3 text-slate-500">{e.actor_email || 'anonymous'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-400">{formatDateTime(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={CheckCircle2}
              title="No failures or slow requests"
              description="Nothing has errored or run slow recently. Anomalies will appear here the moment they do."
            />
          </div>
        )}
      </SectionCard>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-sm text-slate-500">
          This page records only failures and slow requests, so the hot path stays clean. For peak-hour traffic volume,
          latency percentiles, and alerting, connect an APM such as Datadog.
        </p>
      </div>
    </div>
  )
}
