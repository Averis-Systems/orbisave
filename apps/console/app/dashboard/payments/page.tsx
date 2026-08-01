'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, Globe2, Landmark, Loader2, MapPin, Plus, Power, RefreshCcw, Search, Zap } from 'lucide-react'

import { api } from '@/lib/api'
import {
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  EmptyState,
  countryLabel,
  formatDateTime,
} from '@/components/ui'

/**
 * Payment providers.
 *
 * The list of bank and mobile-money rails OrbiSave settles through, per
 * country. This is the health-and-status view: check a connection, switch a
 * rail on or off, and see coverage at a glance. Full credential and account
 * setup lives in the add-bank wizard under Integrations.
 */

interface Provider {
  id: string
  name: string
  provider_code: string
  country: string
  region?: string
  environment: 'sandbox' | 'live'
  status: 'active' | 'inactive' | 'testing' | 'error'
  last_tested_at: string | null
  last_test_status: string | null
  supports_collections?: boolean
  supports_disbursements?: boolean
  supports_mobile_money?: boolean
}

const COUNTRY_OPTIONS = [
  { value: '', label: 'All countries' },
  { value: 'kenya', label: 'Kenya' },
  { value: 'rwanda', label: 'Rwanda' },
  { value: 'ghana', label: 'Ghana' },
]

/** testing/error are not in the shared status map, so tone them explicitly. */
const STATUS_TONE: Record<string, 'amber' | 'red' | undefined> = {
  testing: 'amber',
  error: 'red',
}

export default function PaymentProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin-portal/superadmin/payment-providers/')
      setProviders(data.results || [])
    } catch {
      toast.error('Payment providers could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const handleToggle = async (id: string) => {
    try {
      await api.post(`/admin-portal/superadmin/payment-providers/${id}/toggle/`)
      toast.success('Rail status updated.')
      fetchProviders()
    } catch {
      toast.error('Status could not be changed.')
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const { data } = await api.post(`/admin-portal/superadmin/payment-providers/${id}/test/`)
      if (data.success) {
        toast.success(`Connection healthy${data.latency_ms ? `, ${data.latency_ms}ms` : ''}.`)
      } else {
        toast.error(data.message || 'Connection test failed.')
      }
      fetchProviders()
    } catch {
      toast.error('Connection test could not run. Please try again.')
    } finally {
      setTestingId(null)
    }
  }

  const stats = useMemo(() => {
    const active = providers.filter((p) => p.status === 'active').length
    const live = providers.filter((p) => p.environment === 'live').length
    const countries = new Set(providers.map((p) => p.country)).size
    return { total: providers.length, active, live, countries }
  }, [providers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return providers.filter((p) => {
      if (country && p.country !== country) return false
      if (!q) return true
      return [p.name, p.provider_code, p.country, p.region]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    })
  }, [providers, search, country])

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Payment providers"
        description="Bank and mobile-money rails OrbiSave settles through, per country. Check a connection, switch environments, or take a rail offline instantly."
        actions={
          <>
            <button
              onClick={fetchProviders}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-navy shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
            <Link
              href="/dashboard/settings/apis"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus size={16} />
              Onboard bank
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total rails" value={stats.total} icon={Landmark} />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} tone="positive" />
        <StatCard label="Live environment" value={stats.live} icon={Zap} tone={stats.live ? 'positive' : 'default'} />
        <StatCard label="Countries covered" value={stats.countries} icon={Globe2} />
      </div>

      <SectionCard bodyClassName="p-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bank, code or country"
              aria-label="Search payment providers"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="sm:ml-auto">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Filter by country"
              className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="thin-scrollbar max-w-full overflow-x-auto">
          <table className="w-full" style={{ minWidth: 860 }}>
            <thead className="border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3 first:pl-6">Bank / rail</th>
                <th className="px-4 py-3">Coverage</th>
                <th className="px-4 py-3">Environment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last health check</th>
                <th className="px-4 py-3 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10">
                    <EmptyState
                      icon={Landmark}
                      title={providers.length === 0 ? 'No payment providers yet' : 'Nothing matches these filters'}
                      description={
                        providers.length === 0
                          ? 'Onboard a partner bank to start settling contributions and disbursements.'
                          : 'Adjust the search or country filter to see more.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="text-sm transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 first:pl-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#039855]">
                          <Landmark size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-navy">{p.name}</p>
                          <p className="truncate text-xs text-slate-400">{p.provider_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={13} className="text-slate-400" />
                        <span>
                          {countryLabel(p.country)}
                          <span className="text-slate-400">{p.region ? ` · ${p.region}` : ' · Country-wide'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          p.environment === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.environment}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={p.status} tone={STATUS_TONE[p.status]} />
                    </td>
                    <td className="px-4 py-3.5">
                      {p.last_tested_at ? (
                        <div>
                          <p className={`text-xs font-medium ${p.last_test_status === 'ok' ? 'text-[#027a48]' : 'text-[#b42318]'}`}>
                            {p.last_test_status === 'ok' ? 'Successful' : 'Failed'}
                          </p>
                          <p className="text-xs tabular-nums text-slate-400">{formatDateTime(p.last_tested_at)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Never tested</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTest(p.id)}
                          disabled={testingId === p.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {testingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                          Test
                        </button>
                        <button
                          onClick={() => handleToggle(p.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy transition hover:bg-slate-50"
                        >
                          <Power size={13} />
                          {p.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: 6 }, (_, c) => (
            <td key={c} className="px-4 py-4 first:pl-6 last:pr-6">
              <div
                className="h-4 animate-pulse rounded bg-slate-100 motion-reduce:animate-none"
                style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
