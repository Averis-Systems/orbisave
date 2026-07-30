'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users2, MapPin, Info } from 'lucide-react'
import { PageHeader, SectionCard, StatCard } from '@/components/ui'
import { GenderDonut, type GenderSlice } from '@/components/ui/GenderDonut'
import { HBarChart } from '@/components/ui/HBarChart'
import { api } from '@/lib/api'
import { countryLabel, formatCount } from '@/lib/format'

const COUNTRIES = ['kenya', 'rwanda', 'ghana'] as const
type Country = (typeof COUNTRIES)[number]

interface Demographics {
  signups_by_country: { country: string; total: number; this_month: number }[]
  gender_global: GenderSlice[]
  gender_by_country: Record<string, GenderSlice[]>
  regions_by_country: Record<
    string,
    {
      regions: { region: string; groups: number }[]
      sub_regions: { region: string; sub_region: string; groups: number }[]
    }
  >
}

/**
 * Console demographics: the platform-wide view of who is signing up and
 * where, which the Manager only ever sees for its own country. Signups and
 * gender come live from the accounts table; regions/sub-regions from the
 * group records fanned across every country DB. Deeper financial trends
 * (on-time contribution ratio, activation funnel, loan arrears over time)
 * still wait on the nightly rollup and are called out as such, not faked.
 */
export default function ConsoleAnalyticsPage() {
  const [data, setData] = useState<Demographics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [country, setCountry] = useState<Country>('kenya')

  useEffect(() => {
    let cancelled = false
    api
      .get('/admin-portal/superadmin/demographics/')
      .then(({ data }) => !cancelled && setData(data))
      .catch(() => !cancelled && setError('Could not load demographics. Refresh to try again.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const totalSignups = useMemo(
    () => (data?.signups_by_country || []).reduce((s, c) => s + c.total, 0),
    [data],
  )
  const signupsThisMonth = useMemo(
    () => (data?.signups_by_country || []).reduce((s, c) => s + c.this_month, 0),
    [data],
  )

  const signupRows = useMemo(
    () =>
      (data?.signups_by_country || []).map((c) => ({
        label: countryLabel(c.country),
        value: c.total,
        hint: c.this_month > 0 ? `+${formatCount(c.this_month)} this mo` : undefined,
      })),
    [data],
  )

  const countryData = data?.regions_by_country[country]
  const regionRows = (countryData?.regions || []).map((r) => ({ label: r.region, value: r.groups }))
  const subRegionRows = (countryData?.sub_regions || []).map((r) => ({
    label: r.sub_region,
    sublabel: r.region,
    value: r.groups,
  }))
  const countryGender = data?.gender_by_country[country] || []

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        <PageHeader title="Analytics" description="Platform demographics and growth." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[128px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ))}
        </div>
        <div className="h-[300px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-5 pb-10">
      <PageHeader title="Analytics" description="Who is signing up across the platform, and where. Live from accounts and group records." />

      {error && (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-5 py-4 text-sm text-[#b42318]">{error}</div>
      )}

      {/* 1. Platform scale */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Members, all countries" value={formatCount(totalSignups)} icon={Users2} />
        <StatCard
          label="New this month"
          value={formatCount(signupsThisMonth)}
          icon={Users2}
          tone={signupsThisMonth > 0 ? 'positive' : 'default'}
        />
        <StatCard label="Countries live" value={formatCount(COUNTRIES.length)} icon={MapPin} />
      </div>

      {/* 2. Global demographics */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <SectionCard title="Signups by country" description="Members registered, with this month's gain alongside.">
          <HBarChart rows={signupRows} emptyText="No signups yet." />
        </SectionCard>
        <SectionCard title="Gender split" description="Platform-wide, members with a gender on file.">
          <GenderDonut data={data?.gender_global || []} />
        </SectionCard>
      </div>

      {/* 3. Country drill-down */}
      <SectionCard
        title="Country drill-down"
        description="Where groups are forming inside a country, the recruitment picture behind the totals."
        actions={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {COUNTRIES.map((c) => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  country === c ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy'
                }`}
              >
                {countryLabel(c)}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h4 className="mb-3 text-sm font-semibold text-navy">Top counties / regions</h4>
            <HBarChart rows={regionRows} emptyText="No groups with a region recorded yet." />
          </div>
          <div className="min-w-0">
            <h4 className="mb-3 text-sm font-semibold text-navy">Top sub-counties / districts</h4>
            <HBarChart rows={subRegionRows} color="#2e90fa" emptyText="No sub-region recorded yet." />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <h4 className="mb-3 text-sm font-semibold text-navy">{countryLabel(country)} gender split</h4>
            <GenderDonut data={countryGender} />
          </div>
        </div>
      </SectionCard>

      {/* 4. Honest deferral for the heavier trends */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-sm text-slate-500">
          On-time contribution ratios, the activation funnel, and loan-arrears trends need the nightly rollup across
          every country database, so they&apos;ll land here once that job is built rather than be estimated live.
        </p>
      </div>
    </div>
  )
}
