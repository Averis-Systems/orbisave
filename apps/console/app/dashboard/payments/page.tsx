'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe2,
  KeyRound,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Search,
  Trash2,
  Zap,
} from 'lucide-react'

import { api } from '@/lib/api'
import { PageHeader, SectionCard, StatCard, StatusBadge, EmptyState, countryLabel, formatDateTime } from '@/components/ui'
import {
  BankWizard,
  bankFormToPayload,
  buildEmptyBankForm,
  providerToBankForm,
  maskAccount,
  CORE_ACCOUNTS,
  type BankWizardForm,
  type Provider,
} from '@/components/BankOnboardWizard'

/**
 * Payment providers.
 *
 * The single home for partner banks and mobile-money rails OrbiSave settles
 * through. List, health-check, switch on/off, and onboard/edit banks with the
 * step-by-step wizard right here, no page hop. Deep credential and account
 * setup happens inside the wizard.
 */

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [showWizard, setShowWizard] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [bankForm, setBankForm] = useState<BankWizardForm>(buildEmptyBankForm)

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

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const openWizard = (provider?: Provider) => {
    setBankForm(provider ? providerToBankForm(provider) : buildEmptyBankForm())
    setShowWizard(true)
  }

  const saveBank = async (form: BankWizardForm) => {
    setSavingBank(true)
    try {
      const payload = bankFormToPayload(form)
      if (form.id) {
        await api.patch(`/admin-portal/superadmin/payment-providers/${form.id}/`, payload)
      } else {
        await api.post('/admin-portal/superadmin/payment-providers/', payload)
      }
      toast.success(`${form.name} saved.`)
      setShowWizard(false)
      await fetchProviders()
    } catch (error: any) {
      const detail = error.response?.data
      const message =
        typeof detail === 'object' && detail ? Object.values(detail).flat().join(' ') : 'Bank could not be saved.'
      toast.error(message || 'Bank could not be saved.')
    } finally {
      setSavingBank(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin-portal/superadmin/payment-providers/${id}/`)
      toast.success(`${name} removed.`)
      await fetchProviders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Bank could not be removed.')
    }
  }

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
        description="Partner banks and mobile-money rails OrbiSave settles through, per country. Onboard a bank, check a connection, switch environments, or take a rail offline."
        actions={
          <>
            <button
              onClick={fetchProviders}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-navy shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
            <button
              onClick={() => openWizard()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus size={16} />
              Onboard bank
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total rails" value={stats.total} icon={Landmark} />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} tone="positive" />
        <StatCard label="Live environment" value={stats.live} icon={Zap} tone={stats.live ? 'positive' : 'default'} />
        <StatCard label="Countries covered" value={stats.countries} icon={Globe2} />
      </div>

      <div className="rounded-2xl shadow-[0_1px_2px_rgba(10,37,64,0.04),0_1px_3px_rgba(10,37,64,0.06)]">
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
            <table className="w-full" style={{ minWidth: 900 }}>
              <thead className="border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-500">
                  <th className="w-10 py-3 pl-6" aria-hidden="true" />
                  <th className="px-4 py-3">Bank / rail</th>
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
                    <td colSpan={7} className="px-6 py-10">
                      <EmptyState
                        icon={Landmark}
                        title={providers.length === 0 ? 'No payment providers yet' : 'Nothing matches these filters'}
                        description={
                          providers.length === 0
                            ? 'Onboard a partner bank to start settling contributions and disbursements.'
                            : 'Adjust the search or country filter to see more.'
                        }
                        action={
                          providers.length === 0 ? (
                            <button
                              onClick={() => openWizard()}
                              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                            >
                              <Plus size={16} /> Onboard bank
                            </button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const isOpen = expanded.has(p.id)
                    return (
                      <Fragment key={p.id}>
                        <tr className={`text-sm transition-colors hover:bg-slate-50/70 ${isOpen ? 'bg-slate-50/70' : ''}`}>
                          <td className="w-10 py-3.5 pl-6">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(p.id)}
                              aria-label={isOpen ? 'Hide accounts' : 'Show accounts'}
                              aria-expanded={isOpen}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy"
                            >
                              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
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
                            <div className="flex items-center justify-end gap-1.5">
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
                                aria-label={p.status === 'active' ? 'Disable' : 'Enable'}
                                title={p.status === 'active' ? 'Disable' : 'Enable'}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-navy"
                              >
                                <Power size={14} />
                              </button>
                              <button
                                onClick={() => openWizard(p)}
                                aria-label="Edit bank"
                                title="Edit"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-navy"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                aria-label="Remove bank"
                                title="Remove"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={7} className="border-t border-slate-100 px-6 py-4">
                              <BankDetails provider={p} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {showWizard && (
        <BankWizard
          form={bankForm}
          saving={savingBank}
          onChange={setBankForm}
          onClose={() => setShowWizard(false)}
          onSubmit={saveBank}
        />
      )}
    </div>
  )
}

function BankDetails({ provider }: { provider: Provider }) {
  const activeAccounts = (provider.accounts || []).filter((a) => a.is_active !== false)
  const capabilities = [
    provider.supports_collections && 'Collections',
    provider.supports_disbursements && 'Disbursements',
    provider.supports_mobile_money && 'Mobile money',
  ].filter(Boolean) as string[]

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      {/* Accounts */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Accounts</p>
        {activeAccounts.length === 0 ? (
          <p className="text-sm text-slate-400">No accounts recorded. Use Edit to add them.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CORE_ACCOUNTS.map((core) => {
              const acc = activeAccounts.find((a) => a.account_type === core.key)
              if (!acc) return null
              const Icon = core.icon
              return (
                <div key={core.key} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#039855]">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">{core.label}</p>
                    <p className="truncate text-xs tabular-nums text-slate-400">
                      {maskAccount(acc.account_number)} · {acc.currency}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Capabilities + credentials */}
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {capabilities.length ? (
              capabilities.map((c) => (
                <span key={c} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  {c}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">None enabled</span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Credentials</p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              provider.has_api_key ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <KeyRound size={11} />
            {provider.has_api_key ? 'Set · encrypted' : 'Not set'}
          </span>
        </div>
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: 7 }, (_, c) => (
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
