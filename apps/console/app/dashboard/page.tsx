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
  UserCheck,
  Users,
} from 'lucide-react'
import { PageHeader, SectionCard, StatCard, DataTable, EmptyState, type Column } from '@/components/ui'
import { TrendAreaChart } from '@/components/ui/TrendAreaChart'
import { countryLabel, formatCount, formatMoney, formatDateTime } from '@/lib/format'

/**
 * Console overview — the single-source-of-truth front door for a super admin.
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
  mtd: number
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

export default function ConsoleOverview() {
  const [data, setData] = useState<Overview | null>(null)
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
        return <span className="tabular-nums text-slate-600">{r ? formatMoney(r.mtd, c.country) : '—'}</span>
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
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Platform overview"
        description="Groups, members and money across Kenya, Rwanda and Ghana, live from each country database."
      />

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
            <StatCard
              label="Active loans"
              value={formatCount(t?.active_loans)}
              icon={Banknote}
              tone={defaultedLoans > 0 ? 'risk' : 'default'}
              sub={defaultedLoans > 0 ? `${formatCount(defaultedLoans)} defaulted` : 'None defaulted'}
              href="/dashboard/loans"
            />
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
                formatTooltipLabel={(label) => `${label} — new members`}
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

      {/* 3. Per-country breakdown, money in local currency. */}
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
          minWidth={920}
          empty={loading ? 'Loading country figures…' : 'No country data available.'}
        />
      </SectionCard>

      {/* 4. Recent activity from the audit trail. */}
      <SectionCard
        title="Recent activity"
        description="Rejections and administrative actions, newest first."
        actions={
          <Link href="/dashboard/logs" className="text-sm font-medium text-primary hover:underline">
            View audit log
          </Link>
        }
      >
        {data?.recent_alerts?.length ? (
          <ul className="divide-y divide-slate-100">
            {data.recent_alerts.map((a, i) => (
              <li key={`${a.action}-${a.created_at}-${i}`} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
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
            title={loading ? 'Loading activity' : 'Nothing needs attention'}
            description={loading ? undefined : 'Rejections and administrative actions will appear here as they happen.'}
          />
        )}
      </SectionCard>
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
