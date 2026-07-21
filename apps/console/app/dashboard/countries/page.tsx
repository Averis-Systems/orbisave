'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Globe, Users2, Banknote, ShieldAlert, TrendingUp } from 'lucide-react'
import { PageHeader, SectionCard, countryLabel, formatCount, formatMoney } from '@/components/ui'

/**
 * Countries.
 *
 * One panel per country, because the figures cannot be summed. Kenya, Rwanda
 * and Ghana settle in three currencies, so there is no platform-wide money
 * total; each country's revenue and loan book are shown in its own currency.
 * Counts (groups, members) are people, not money, and are shown per country
 * too so a manager can compare markets at a glance.
 *
 * Data comes from the super-admin overview endpoint, which reads each country
 * database with an explicit .using() rather than the thread-local, so a super
 * admin (country=None) gets real per-country figures instead of the zeros the
 * old default-routed query returned.
 */

interface CountryKpi {
  country: string
  total_groups: number
  active_groups: number
  pending_review: number
  total_members: number
  kyc_pending: number
  active_loans: number
  defaulted_loans: number
  contributions_confirmed: number
  loan_book_value: number
}

interface Revenue {
  country: string
  currency: string
  mtd: number
  total: number
}

interface Overview {
  by_country: CountryKpi[]
  revenue_by_country: Revenue[]
}

export default function ConsoleCountriesPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .get('/admin-portal/superadmin/overview/', { signal: controller.signal })
      .then(({ data }) => setData(data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'CanceledError') return
        setError('Country overview could not be loaded.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
        <PageHeader title="Countries" description="Per-country operations across every market." />
        <div className="grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
        <PageHeader title="Countries" description="Per-country operations across every market." />
        <SectionCard>
          <p className="py-8 text-center text-sm text-slate-500">{error || 'No country data available.'}</p>
        </SectionCard>
      </div>
    )
  }

  const revenueFor = (country: string) => data.revenue_by_country.find((r) => r.country === country)

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Countries"
        description="Each market on its own terms. Money is shown in local currency and never summed across countries, because KES, RWF and GHS are not the same unit."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {data.by_country.map((c) => (
          <CountryCard key={c.country} kpi={c} revenue={revenueFor(c.country)} />
        ))}
      </div>
    </div>
  )
}

function CountryCard({ kpi, revenue }: { kpi: CountryKpi; revenue?: Revenue }) {
  const needsAttention = kpi.pending_review + kpi.kyc_pending + kpi.defaulted_loans

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="h-4 w-4" />
          </span>
          <h3 className="text-base font-semibold text-navy">{countryLabel(kpi.country)}</h3>
        </div>
        {needsAttention > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <ShieldAlert className="h-3 w-3" />
            {formatCount(needsAttention)} to review
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={Users2} label="Members" value={formatCount(kpi.total_members)} />
          <Metric icon={Users2} label="Groups" value={`${formatCount(kpi.active_groups)} active`} />
          <Metric icon={Banknote} label="Active loans" value={formatCount(kpi.active_loans)} />
          <Metric icon={TrendingUp} label="KYC pending" value={formatCount(kpi.kyc_pending)} />
        </div>

        <div className="space-y-2.5 rounded-xl bg-slate-50/70 p-4">
          <Row label="Contributions confirmed" value={formatMoney(kpi.contributions_confirmed, kpi.country)} />
          <Row label="Loan book" value={formatMoney(kpi.loan_book_value, kpi.country)} />
          {revenue && (
            <>
              <Row label="Revenue (this month)" value={formatMoney(revenue.mtd, kpi.country)} />
              <Row label="Revenue (all time)" value={formatMoney(revenue.total, kpi.country)} strong />
            </>
          )}
        </div>

        {/* Revenue covers rotation payout service fees only. Loan and
            savings-withdrawal fees are not yet charged, so this understates
            true revenue; saying so beats a number that looks complete. */}
        <p className="text-xs text-slate-400">Revenue reflects rotation payout fees only.</p>
      </div>
    </section>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-navy">{value}</p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-navy' : 'font-medium text-slate-700'}`}>{value}</span>
    </div>
  )
}
