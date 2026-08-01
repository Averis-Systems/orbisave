'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  FileText,
  Globe,
  Landmark,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { SectionCard, StatCard, DataTable, EmptyState, type Column } from '@/components/ui'
import { TrendAreaChart } from '@/components/ui/TrendAreaChart'
import { GenderDonut, type GenderSlice } from '@/components/ui/GenderDonut'
import { HBarChart } from '@/components/ui/HBarChart'
import { countryLabel, formatCount, formatMoney, formatDateTime } from '@/lib/format'

/**
 * Console overview: the single-source-of-truth front door for a super admin.
 *
 * Structured as an operations landing (per the ui-ux-pro-max "Real-Time /
 * Operations" pattern): scale first, then what needs a decision, then the
 * per-country detail, then recent activity. Data-dense but scannable; status
 * carried in green/amber/red, always beside a number and a label, never colour
 * alone.
 *
 *   1. Scale               KPI row (counts, safe to aggregate; money is not)
 *   2. Growth + action     signup trend, and the queue of things awaiting you
 *   3. By country          the real per-country figures, money in local units
 *   4. Recent activity     rejections and admin actions from the audit trail
 *
 * Every figure is real. Counts aggregate because people are not currency;
 * money is shown per country and never summed across Kenya, Rwanda and Ghana.
 */

interface CountryKpis {
  country: string
  total_groups: number
  active_groups: number
  pending_review: number
  total_members: number
  kyc_verified: number
  kyc_pending: number
  active_loans: number
  defaulted_loans: number
  pending_admin_loans: number
  contributions_confirmed: number
  loan_book_value: number
}

interface CountryRevenue {
  country: string
  currency: string
  today: number
  mtd: number
  ytd: number
  total: number
}

interface Overview {
  totals: {
    total_groups: number
    total_members: number
    active_loans: number
    pending_review: number
    kyc_pending: number
    platform_admins: number
  }
  by_country: CountryKpis[]
  signups_trend: Array<{ month: string; key: string; signups: number }>
  revenue_by_country: CountryRevenue[]
  recent_alerts: Array<{
    action: string
    country: string | null
    created_at: string
    metadata: Record<string, unknown> | null
  }>
}

interface Demographics {
  signups_by_country: { country: string; total: number; this_month: number }[]
  gender_global: GenderSlice[]
  regions_by_country: Record<
    string,
    {
      regions: { region: string; groups: number }[]
      sub_regions: { region: string; sub_region: string; groups: number }[]
    }
  >
}

const OVERVIEW_COUNTRIES = ['kenya', 'rwanda', 'ghana'] as const
type OverviewCountry = (typeof OVERVIEW_COUNTRIES)[number]

// Administrative divisions are named differently per country (they are not all
// "sub-counties"), so the region card labels itself to the selected country.
// Mirrors frontend/lib/location-data.ts level1Label/level2Label.
const AREA_LABELS: Record<OverviewCountry, { level1: string; level2: string }> = {
  kenya: { level1: 'County', level2: 'Sub-county' },
  rwanda: { level1: 'Province', level2: 'District' },
  ghana: { level1: 'Region', level2: 'District' },
}

// Keep every overview card scannable: never render more than this many ranked
// rows, so a busy country cannot bloat the page.
const AREA_ROW_CAP = 5

export default function ConsoleOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [demographics, setDemographics] = useState<Demographics | null>(null)
  const [regionCountry, setRegionCountry] = useState<OverviewCountry>('kenya')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get('/admin-portal/superadmin/overview/')
      .then(({ data }) => {
        if (!cancelled) setData(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load platform figures. Refresh to try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    // Demographics is a second, cheaper call so the scale figures render even
    // if this one is slow; a failure here just leaves the demographics band empty.
    api
      .get('/admin-portal/superadmin/demographics/')
      .then(({ data }) => {
        if (!cancelled) setDemographics(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const t = data?.totals
  const byCountry = useMemo(() => data?.by_country || [], [data])

  const signups = useMemo(() => data?.signups_trend || [], [data])
  const signupSeries = useMemo(() => signups.map((p) => p.signups), [signups])
  const totalSignups = useMemo(() => signupSeries.reduce((a, b) => a + b, 0), [signupSeries])
  const hasSignups = totalSignups > 0

  // Month-over-month change in signups, shown on the Members card. Direction,
  // not raw sign, drives the colour.
  const membersDelta = useMemo(() => {
    if (signups.length < 2) return undefined
    const last = signups[signups.length - 1].signups
    const prev = signups[signups.length - 2].signups
    const diff = last - prev
    return {
      label: `${diff >= 0 ? '+' : ''}${formatCount(diff)} vs last month`,
      direction: diff > 0 ? ('up' as const) : diff < 0 ? ('down' as const) : ('flat' as const),
    }
  }, [signups])

  // The actionable queue: things a super admin is expected to decide. Summed
  // from the per-country figures, so no extra request. Each links to where the
  // work is done.
  const defaultedLoans = useMemo(() => byCountry.reduce((s, c) => s + c.defaulted_loans, 0), [byCountry])
  const pendingAdminLoans = useMemo(() => byCountry.reduce((s, c) => s + c.pending_admin_loans, 0), [byCountry])

  const signupRows = useMemo(
    () =>
      (demographics?.signups_by_country || []).map((c) => ({
        label: countryLabel(c.country),
        value: c.total,
        hint: c.this_month > 0 ? `+${formatCount(c.this_month)} this mo` : undefined,
      })),
    [demographics],
  )

  // Where groups are forming inside the selected country. Prefer sub-counties
  // (the granular signal the user asked for) and fall back to the county/region
  // when no sub-region is on record yet.
  const { areaRows, areaLevelLabel } = useMemo(() => {
    const region = demographics?.regions_by_country?.[regionCountry]
    const labels = AREA_LABELS[regionCountry]
    // Prefer the granular unit (sub-county / district). Fall back to the top
    // level only when that is the only thing recorded. An empty country still
    // shows the granular label, so the heading always reads correctly for
    // that country ("district" for Rwanda and Ghana, "sub-county" for Kenya).
    if (region && region.sub_regions.length > 0) {
      return {
        areaRows: region.sub_regions
          .slice(0, AREA_ROW_CAP)
          .map((r) => ({ label: r.sub_region, sublabel: r.region, value: r.groups })),
        areaLevelLabel: labels.level2,
      }
    }
    if (region && region.regions.length > 0) {
      return {
        areaRows: region.regions.slice(0, AREA_ROW_CAP).map((r) => ({ label: r.region, value: r.groups })),
        areaLevelLabel: labels.level1,
      }
    }
    return { areaRows: [], areaLevelLabel: labels.level2 }
  }, [demographics, regionCountry])

  const revenueFor = (country: string) => data?.revenue_by_country.find((r) => r.country === country)

  const columns: Column<CountryKpis>[] = [
    {
      key: 'country',
      header: 'Country',
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Globe className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-navy">{countryLabel(c.country)}</span>
        </div>
      ),
    },
    {
      key: 'groups',
      header: 'Groups',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums text-slate-600">
          {formatCount(c.active_groups)}
          <span className="text-slate-400"> / {formatCount(c.total_groups)}</span>
        </span>
      ),
    },
    { key: 'members', header: 'Members', align: 'right', render: (c) => <span className="tabular-nums text-slate-600">{formatCount(c.total_members)}</span> },
    {
      key: 'kyc',
      header: 'KYC waiting',
      align: 'right',
      render: (c) =>
        c.kyc_pending > 0 ? (
          <span className="tabular-nums font-medium text-amber-700">{formatCount(c.kyc_pending)}</span>
        ) : (
          <span className="tabular-nums text-slate-400">0</span>
        ),
    },
    {
      key: 'contributions',
      header: 'Contributions',
      align: 'right',
      render: (c) => <span className="tabular-nums text-navy">{formatMoney(c.contributions_confirmed, c.country)}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue (MTD)',
      align: 'right',
      render: (c) => {
        const r = revenueFor(c.country)
        return <span className="tabular-nums text-slate-600">{r ? formatMoney(r.mtd, c.country) : '-'}</span>
      },
    },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: (c) => (
        <Link
          href={`/dashboard/countries?country=${c.country}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Open
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16 pt-1">
      {error && (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-5 py-4 text-sm text-[#b42318]">{error}</div>
      )}

      {/* 1. Scale. Counts aggregate; the attention tone is driven by whether
             there is work waiting, so a clean platform reads calm. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[128px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ))
        ) : (
          <>
            <StatCard
              label="Groups"
              value={formatCount(t?.total_groups)}
              icon={Globe}
              tone={t && t.pending_review > 0 ? 'attention' : 'default'}
              sub={t && t.pending_review > 0 ? `${formatCount(t.pending_review)} awaiting review` : 'All verified'}
              href="/dashboard/groups"
            />
            <StatCard
              label="Members"
              value={formatCount(t?.total_members)}
              icon={Users}
              spark={signupSeries}
              delta={membersDelta}
              href="/dashboard/users?tab=members"
            />
            <StatCard
              label="KYC awaiting review"
              value={formatCount(t?.kyc_pending)}
              icon={UserCheck}
              tone={t && t.kyc_pending > 0 ? 'attention' : 'default'}
              sub={t && t.kyc_pending > 0 ? 'Submitted, not yet decided' : 'Queue clear'}
              href="/dashboard/users?tab=members&kyc_status=submitted"
            />
            <RevenueCard revenue={data?.revenue_by_country || []} />
          </>
        )}
      </div>

      {/* 2. Growth, and the queue of decisions waiting on the super admin. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="New members"
            description="Registrations across all three countries, last six months."
            actions={
              !loading ? (
                <span className="text-sm font-medium tabular-nums text-slate-500">{formatCount(totalSignups)} in 6 months</span>
              ) : undefined
            }
          >
            {loading ? (
              <div className="h-[240px] animate-pulse rounded-xl bg-slate-50" />
            ) : hasSignups ? (
              <TrendAreaChart
                data={signups}
                xKey="month"
                yKey="signups"
                formatValue={(v) => formatCount(v)}
                formatTooltipLabel={(label) => `${label} new members`}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No signups in this window"
                description="New member registrations across all three countries will chart here."
              />
            )}
          </SectionCard>
        </div>

        <ActionQueue
          loading={loading}
          items={[
            { icon: UserCheck, label: 'KYC submissions to review', count: t?.kyc_pending ?? 0, tone: 'amber', href: '/dashboard/users?tab=members&kyc_status=submitted' },
            { icon: ShieldCheck, label: 'Groups awaiting verification', count: t?.pending_review ?? 0, tone: 'amber', href: '/dashboard/groups?verification_status=pending_review' },
            { icon: Banknote, label: 'Loans awaiting approval', count: pendingAdminLoans, tone: 'amber', href: '/dashboard/loans?status=pending_admin' },
            { icon: Landmark, label: 'Loans in default', count: defaultedLoans, tone: 'red', href: '/dashboard/loans?status=defaulted' },
          ]}
        />
      </div>

      {/* 3. Who is signing up, and where. Live demographics, not the deferred
             financial rollup. Deeper cuts live on the Analytics page. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <SectionCard
          title="Signups by country"
          description="Members registered, with this month's gain alongside."
          actions={
            <Link href="/dashboard/analytics" className="text-sm font-medium text-primary hover:underline">
              Analytics
            </Link>
          }
        >
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-xl bg-slate-50" />
          ) : (
            <HBarChart rows={signupRows} emptyText="No signups yet." />
          )}
        </SectionCard>

        <SectionCard title="Gender split" description="Platform-wide, members with a gender on file.">
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-xl bg-slate-50" />
          ) : (
            <GenderDonut data={demographics?.gender_global || []} />
          )}
        </SectionCard>
      </div>

      {/* 4. Per-country breakdown, money in local currency. */}
      <SectionCard
        title="By country"
        description="Each country runs on its own database. Money is shown in that country's currency and is not summed across borders."
        bodyClassName=""
        actions={
          <Link href="/dashboard/countries" className="text-sm font-medium text-primary hover:underline">
            Manage countries
          </Link>
        }
      >
        <DataTable
          columns={columns}
          rows={byCountry}
          rowKey={(c) => c.country}
          minWidth={680}
          empty={loading ? 'Loading country figures…' : 'No country data available.'}
        />
      </SectionCard>

      {/* 5. Where groups are forming inside a country, paired with a compact
             activity feed so the feed is a narrow side column, not a full slab. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionCard
            title={`Groups by ${areaLevelLabel.toLowerCase()}`}
            description="Which areas inside a country are creating the most groups. Check marketer coverage at a glance."
            actions={
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {OVERVIEW_COUNTRIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setRegionCountry(c)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                      regionCountry === c ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-navy'
                    }`}
                  >
                    {countryLabel(c)}
                  </button>
                ))}
              </div>
            }
          >
            {loading ? (
              <div className="h-[240px] animate-pulse rounded-xl bg-slate-50" />
            ) : (
              <HBarChart
                rows={areaRows}
                color="#2e90fa"
                emptyText={`No group locations recorded for ${countryLabel(regionCountry)} yet.`}
              />
            )}
          </SectionCard>
        </div>

        <div className="min-w-0">
          <SectionCard
            title="Recent activity"
            actions={
              <Link href="/dashboard/logs" className="text-sm font-medium text-primary hover:underline">
                Audit log
              </Link>
            }
          >
            {data?.recent_alerts?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.recent_alerts.slice(0, 6).map((a, i) => (
                  <li key={`${a.action}-${a.created_at}-${i}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium capitalize text-navy">{a.action.replace(/_/g, ' ')}</p>
                        {a.country && <p className="text-xs text-slate-400">{countryLabel(a.country)}</p>}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">{formatDateTime(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title={loading ? 'Loading activity' : 'Nothing yet'}
                description={loading ? undefined : 'Admin actions will appear here as they happen.'}
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

type RevenuePeriod = 'today' | 'mtd' | 'ytd'
const REVENUE_PERIODS: { key: RevenuePeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'mtd', label: 'MRR' },
  { key: 'ytd', label: 'ARR' },
]

/**
 * Platform revenue on the scale row, in place of the old active-loans count.
 * Revenue is the platform fee on successful disbursements, recorded per
 * country in that country's currency, so figures are shown per currency and
 * never summed across borders. The small toggle switches the window (today,
 * this month as MRR, this year as ARR). Same footprint as a StatCard.
 */
function RevenueCard({ revenue }: { revenue: CountryRevenue[] }) {
  const [period, setPeriod] = useState<RevenuePeriod>('today')

  const nonZero = revenue.filter((r) => r[period] > 0)
  const valueText = nonZero.length
    ? nonZero.map((r) => formatMoney(r[period], r.country)).join('   ·   ')
    : formatMoney(0, revenue[0]?.country || 'kenya')

  return (
    <div className="flex h-full min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">Revenue</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#039855]">
          <TrendingUp className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-navy" title={valueText}>
        {valueText}
      </p>
      <div className="mt-3 flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
        {REVENUE_PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
              period === p.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-navy'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type QueueTone = 'amber' | 'red'
interface QueueItem {
  icon: typeof UserCheck
  label: string
  count: number
  tone: QueueTone
  href: string
}

/**
 * The decisions waiting on the super admin, as a compact list. This is the
 * oversight hub: what to approve, verify or investigate, each linking straight
 * to the queue. Only non-zero rows show; an empty queue reads as "all clear"
 * rather than a wall of zeros.
 */
function ActionQueue({ loading, items }: { loading: boolean; items: QueueItem[] }) {
  const live = items.filter((i) => i.count > 0)
  const total = live.reduce((s, i) => s + i.count, 0)

  return (
    <SectionCard
      title="Needs your attention"
      description={loading ? undefined : total > 0 ? `${formatCount(total)} across ${live.length} ${live.length === 1 ? 'queue' : 'queues'}` : undefined}
    >
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-50" />
          ))}
        </div>
      ) : live.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#ecfdf3] text-[#12b76a]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-navy">All clear</p>
          <p className="mt-1 text-sm text-slate-500">No approvals or reviews are waiting.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {live.map((item) => {
            const Icon = item.icon
            const tone =
              item.tone === 'red'
                ? { chip: 'bg-[#fef3f2] text-[#d92d20]', pill: 'bg-[#fef3f2] text-[#b42318]' }
                : { chip: 'bg-amber-50 text-amber-600', pill: 'bg-amber-50 text-amber-700' }
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50/60"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.chip}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-navy">{item.label}</span>
                  <span className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums ${tone.pill}`}>
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
