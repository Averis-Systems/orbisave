'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ArrowUpRight, Banknote, Globe, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { PageHeader, SectionCard, StatCard, DataTable, EmptyState, type Column } from '@/components/ui'
import { TrendAreaChart } from '@/components/ui/TrendAreaChart'
import { countryLabel, formatCount, formatMoney, formatDateTime } from '@/lib/format'

/**
 * Console overview — the platform's front door for a super admin.
 *
 * Answers, in order of the eye's path down the page:
 *   1. What is the scale of the platform right now?      (KPI row, counts)
 *   2. Is it growing, and is it earning?                 (signups trend, revenue)
 *   3. How is each country doing?                        (by-country table)
 *   4. Is anything wrong that I should act on?           (recent alerts)
 *
 * Every figure is real. Counts aggregate cleanly because people are not
 * currency; money is shown per country in local currency and never summed
 * across Kenya, Rwanda and Ghana. Revenue is the immutable service-fee ledger,
 * which today reads zero because no rotation payout has settled yet, so the
 * revenue panel states that rather than inventing a number.
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

  const signups = data?.signups_trend || []
  const totalSignups = useMemo(() => signups.reduce((sum, p) => sum + p.signups, 0), [signups])
  const hasSignups = totalSignups > 0

  const revenue = data?.revenue_by_country || []
  const hasRevenue = revenue.some((r) => r.total > 0)

  const columns: Column<CountryKpis>[] = [
    {
      key: 'country',
      header: 'Country',
      render: (c) => <span className="font-medium text-navy">{countryLabel(c.country)}</span>,
    },
    {
      key: 'groups',
      header: 'Groups',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums">
          {formatCount(c.active_groups)} active
          <span className="text-slate-400"> / {formatCount(c.total_groups)}</span>
        </span>
      ),
    },
    { key: 'members', header: 'Members', align: 'right', render: (c) => <span className="tabular-nums">{formatCount(c.total_members)}</span> },
    {
      key: 'kyc',
      header: 'KYC verified',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums">
          {formatCount(c.kyc_verified)}
          {c.kyc_pending > 0 && <span className="text-amber-600"> ({formatCount(c.kyc_pending)} waiting)</span>}
        </span>
      ),
    },
    {
      key: 'loans',
      header: 'Active loans',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums">
          {formatCount(c.active_loans)}
          {c.defaulted_loans > 0 && <span className="text-[#d92d20]"> ({formatCount(c.defaulted_loans)} defaulted)</span>}
        </span>
      ),
    },
    {
      key: 'contributions',
      header: 'Contributions confirmed',
      align: 'right',
      render: (c) => <span className="tabular-nums">{formatMoney(c.contributions_confirmed, c.country)}</span>,
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
        description="Groups, members and money across Kenya, Rwanda and Ghana. Figures read live from each country database."
      />

      {error && (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-5 py-4 text-sm text-[#d92d20]">{error}</div>
      )}

      {/* 1. Scale — counts, safe to aggregate across countries. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[122px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ))
        ) : (
          <>
            <StatCard label="Groups" value={formatCount(t?.total_groups)} icon={Globe} sub={`${formatCount(t?.pending_review)} awaiting review`} />
            <StatCard label="Members" value={formatCount(t?.total_members)} icon={Users} sub="Across all countries" />
            <StatCard
              label="KYC awaiting review"
              value={formatCount(t?.kyc_pending)}
              icon={UserCheck}
              sub="Submitted, not yet decided"
              href="/dashboard/users?tab=members&kyc_status=submitted"
            />
            <StatCard label="Active loans" value={formatCount(t?.active_loans)} icon={ShieldCheck} sub="Disbursed and running" href="/dashboard/loans" />
          </>
        )}
      </div>

      {/* 2. Growth and earnings, side by side. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="New members"
          description="People who joined in the last six months, platform-wide."
          actions={
            !loading ? (
              <span className="text-sm font-medium tabular-nums text-slate-500">{formatCount(totalSignups)} in 6 months</span>
            ) : undefined
          }
        >
          <div className="lg:col-span-2">
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
          </div>
        </SectionCard>

        <SectionCard
          title="Service-fee revenue"
          description="Platform fee earned on settled rotation payouts."
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-50" />
              ))}
            </div>
          ) : hasRevenue ? (
            <ul className="space-y-1">
              {revenue.map((r) => (
                <li key={r.country} className="flex items-center justify-between rounded-xl px-1 py-3">
                  <span className="text-sm font-medium text-navy">{countryLabel(r.country)}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-navy">{formatMoney(r.mtd, r.country)}</p>
                    <p className="text-xs tabular-nums text-slate-400">{formatMoney(r.total, r.country)} all time</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Banknote}
              title="No revenue yet"
              description="The platform earns its fee when a rotation payout settles. Nothing has settled yet, so revenue is zero."
            />
          )}
          {/* The plan is explicit that this covers rotation payouts only; loan and
              savings-withdrawal fees are not built, so revenue under-reports until
              they are. Stated here rather than silently omitted. */}
          {!loading && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              Covers rotation payouts only. Loan and savings-withdrawal fees are not yet charged.
            </p>
          )}
        </SectionCard>
      </div>

      {/* 3. Per-country breakdown. */}
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
          rows={data?.by_country || []}
          rowKey={(c) => c.country}
          minWidth={860}
          empty={loading ? 'Loading country figures…' : 'No country data available.'}
        />
      </SectionCard>

      {/* 4. Anything needing action. */}
      <SectionCard
        title="Recent alerts"
        description="Rejections and administrative actions from the audit trail."
        actions={
          <Link href="/dashboard/logs" className="text-sm font-medium text-primary hover:underline">
            View audit log
          </Link>
        }
      >
        {data?.recent_alerts?.length ? (
          <ul className="divide-y divide-slate-100">
            {data.recent_alerts.map((a, i) => (
              <li key={`${a.action}-${a.created_at}-${i}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize text-navy">{a.action.replace(/_/g, ' ')}</p>
                  {a.country && <p className="mt-0.5 text-xs text-slate-500">{countryLabel(a.country)}</p>}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">{formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={loading ? 'Loading alerts' : 'Nothing needs attention'}
            description={loading ? undefined : 'Rejections and administrative actions will appear here as they happen.'}
          />
        )}
      </SectionCard>
    </div>
  )
}
