'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Banknote,
  Landmark,
  MapPin,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users2,
} from 'lucide-react'
import {
  PageHeader,
  SectionCard,
  StatCard,
  EmptyState,
  DataTable,
  formatCount,
  formatMoney,
  formatDateTime,
  type Column,
} from '@orbisave/admin-ui'
import { TrendAreaChart } from '@/components/ui/TrendAreaChart'
import { GenderPieChart } from '@/components/ui/GenderPieChart'
import { RegionBarChart } from '@/components/ui/RegionBarChart'
import { useAttention, type AttentionWorklistItem, type GrowthLogItem } from '@/hooks/useAttention'

/**
 * Manager overview — an operations cockpit for a country admin managing
 * thousands of groups, not a ceremonial scoreboard.
 *
 * Layout rules for this page (kept tight so cards never spill the shell):
 *   - Every grid child carries min-w-0 so flex/grid children can shrink.
 *   - Table SectionCards use bodyClassName="p-0" so DataTable's own
 *     horizontal padding is the only padding (no double-pad overflow).
 *   - Tables scroll inside their card, never the page.
 */

export default function DashboardOverview() {
  const { data, loading, error } = useAttention()
  const country = data?.country || 'kenya'

  const scale = data?.scale
  const queues = data?.queues
  const trend = useMemo(() => data?.monthly_contribution_trend || [], [data])

  const pluralize = (n: number, one: string, many: string) => (n === 1 ? one : many)

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 pb-10">
      <PageHeader
        title="Country operations"
        description={
          loading || !scale
            ? undefined
            : `${formatCount(scale.total_groups)} ${pluralize(scale.total_groups, 'group', 'groups')} · ${formatCount(scale.total_members)} ${pluralize(scale.total_members, 'member', 'members')} · ${formatMoney(scale.contributions_mtd, country)} collected this month`
        }
      />

      {error && (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-5 py-4 text-sm text-[#b42318]">{error}</div>
      )}

      {/* 1. Needs your action */}
      <div className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Needs your action</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[128px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
            ))
          ) : (
            <>
              <div className="min-w-0">
                <StatCard
                  label="Groups pending review"
                  value={formatCount(queues?.groups_pending_review.count)}
                  icon={ShieldCheck}
                  tone={queues && queues.groups_pending_review.count > 0 ? 'attention' : 'default'}
                  sub={
                    queues && queues.groups_pending_review.count > 0
                      ? `Oldest waiting ${queues.groups_pending_review.oldest_days}d`
                      : 'Queue clear'
                  }
                  href="/dashboard/groups"
                />
              </div>
              <div className="min-w-0">
                <StatCard
                  label="KYC pending"
                  value={formatCount(queues?.kyc_pending.count)}
                  icon={UserCheck}
                  tone={queues && queues.kyc_pending.count > 0 ? 'attention' : 'default'}
                  sub={
                    queues && queues.kyc_pending.count > 0
                      ? `Oldest waiting ${queues.kyc_pending.oldest_days}d`
                      : 'Queue clear'
                  }
                  href="/dashboard/kyc"
                />
              </div>
              <div className="min-w-0">
                <StatCard
                  label="Loan arrears"
                  value={formatMoney(queues?.loan_arrears.amount_overdue || 0, country)}
                  icon={Banknote}
                  tone={queues && (queues.loan_arrears.overdue_installments > 0 || queues.loan_arrears.defaulted_count > 0) ? 'risk' : 'default'}
                  sub={
                    queues
                      ? queues.loan_arrears.defaulted_count > 0
                        ? `${formatCount(queues.loan_arrears.overdue_installments)} overdue · ${formatCount(queues.loan_arrears.defaulted_count)} defaulted`
                        : `${formatCount(queues.loan_arrears.overdue_installments)} overdue installments`
                      : undefined
                  }
                />
              </div>
              <div className="min-w-0">
                <StatCard
                  label="Reconciliation"
                  value={formatMoney(queues?.reconciliation.amount_at_risk || 0, country)}
                  icon={Landmark}
                  tone={queues && queues.reconciliation.by_severity.red > 0 ? 'risk' : queues && queues.reconciliation.count > 0 ? 'attention' : 'default'}
                  sub={
                    queues && queues.reconciliation.count > 0
                      ? `${formatCount(queues.reconciliation.count)} open · ${formatCount(queues.reconciliation.by_severity.red)} red · oldest ${queues.reconciliation.oldest_days}d`
                      : 'Nothing open'
                  }
                  href="/dashboard/trust-account"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Priority worklist + contribution trend */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionCard
            title="Priority worklist"
            description="Oldest and most severe items waiting on you."
            bodyClassName="p-0"
          >
            {loading ? (
              <div className="space-y-2.5 p-5 sm:p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-50" />
                ))}
              </div>
            ) : (
              <WorklistTable items={data?.worklist ?? []} />
            )}
          </SectionCard>
        </div>

        <div className="min-w-0">
          <SectionCard
            title="Contribution volume"
            description="Confirmed contributions, last six months."
          >
            {loading ? (
              <div className="h-[200px] animate-pulse rounded-xl bg-slate-50" />
            ) : trend.some((p) => p.contributions > 0) ? (
              <div className="min-w-0">
                <TrendAreaChart
                  data={trend}
                  xKey="month"
                  yKey="contributions"
                  height={200}
                  formatValue={(v) => formatMoney(v, country)}
                  formatAxis={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v)
                  }
                  formatTooltipLabel={(label) => `${label} — contributions`}
                />
              </div>
            ) : (
              <EmptyState
                icon={Banknote}
                title="No contributions in this window"
                description="Confirmed contributions will chart here by month."
              />
            )}
          </SectionCard>
        </div>
      </div>

      {/* 3. Analytics band — the two country-shape charts, grouped together */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionCard
            title="Groups by region"
            description="This month vs all-time — check against marketers' reported regional recruitment."
          >
            {loading ? (
              <div className="h-[260px] animate-pulse rounded-xl bg-slate-50" />
            ) : data?.region_distribution && data.region_distribution.length > 0 ? (
              <div className="min-w-0 overflow-hidden">
                <RegionBarChart data={data.region_distribution} height={260} />
              </div>
            ) : (
              <EmptyState
                icon={MapPin}
                title="No regional data yet"
                description="Groups created with a county/region selected will chart here."
              />
            )}
          </SectionCard>
        </div>

        <div className="min-w-0">
          <SectionCard
            title="Gender split"
            description="Signed-up members with a gender on file."
          >
            {loading ? (
              <div className="h-[260px] animate-pulse rounded-xl bg-slate-50" />
            ) : data?.gender_distribution?.some((g) => g.count > 0) ? (
              <GenderPieChart data={data.gender_distribution} />
            ) : (
              <EmptyState
                icon={Users2}
                title="No gender data yet"
                description="Appears once members add gender to their profile."
              />
            )}
          </SectionCard>
        </div>
      </div>

      {/* 4. Activity feeds band — two peer feeds at equal width, newest-first slices */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <SectionCard
            title="New signups & groups"
            description="Newest members and groups in your country."
            bodyClassName="p-0"
          >
            {loading ? (
              <div className="space-y-2.5 p-5 sm:p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-50" />
                ))}
              </div>
            ) : (
              <GrowthLogTable items={data?.growth_log ?? []} />
            )}
          </SectionCard>
        </div>

        <div className="min-w-0">
          <SectionCard
            title="Recent activity"
            description="Operational decisions in your country."
            actions={
              <Link href="/dashboard/audit" className="text-sm font-medium text-primary hover:underline">
                Audit log
              </Link>
            }
          >
            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-50" />
                ))}
              </div>
            ) : data?.recent_activity && data.recent_activity.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {data.recent_activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{a.summary}</p>
                      {a.target_group_name && (
                        <span className="mt-1 inline-block max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          {a.target_group_name}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-400">{formatDateTime(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing yet" description="Country actions will appear here as they happen." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

const GROWTH_TYPE_LABEL: Record<GrowthLogItem['type'], string> = {
  signup: 'Signup',
  group: 'Group',
}

function GrowthLogTable({ items }: { items: GrowthLogItem[] }) {
  const columns: Column<GrowthLogItem>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.type === 'signup' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-blue-50 text-blue-700'
          }`}
        >
          {row.type === 'signup' ? <UserPlus className="h-3 w-3" /> : <Users2 className="h-3 w-3" />}
          {GROWTH_TYPE_LABEL[row.type]}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="block max-w-[220px] truncate font-medium text-navy">{row.name}</span>,
    },
    {
      key: 'detail',
      header: 'Detail',
      render: (row) => <span className="block max-w-[160px] truncate text-slate-500">{row.detail}</span>,
    },
    {
      key: 'created_at',
      header: 'Date',
      align: 'right',
      render: (row) => <span className="whitespace-nowrap tabular-nums text-slate-500">{formatDateTime(row.created_at)}</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(row) => `${row.type}-${row.id}`}
      minWidth={480}
      empty={
        <EmptyState
          title="No new signups or groups yet"
          description="New members and groups in your country will appear here."
        />
      }
    />
  )
}

const WORKLIST_TYPE_LABEL: Record<AttentionWorklistItem['type'], string> = {
  group_verification: 'Group',
  kyc: 'KYC',
  reconciliation: 'Recon',
}

function WorklistTable({ items }: { items: AttentionWorklistItem[] }) {
  const columns: Column<AttentionWorklistItem>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {WORKLIST_TYPE_LABEL[row.type]}
        </span>
      ),
    },
    {
      key: 'label',
      header: 'Item',
      render: (row) => <span className="block max-w-[220px] truncate font-medium text-navy">{row.label}</span>,
    },
    {
      key: 'detail',
      header: 'Detail',
      render: (row) => <span className="block max-w-[200px] truncate text-slate-500">{row.detail}</span>,
    },
    {
      key: 'age',
      header: 'Age',
      align: 'right',
      render: (row) => (
        <span className={`tabular-nums ${row.age_days >= 7 ? 'font-semibold text-[#d92d20]' : 'text-slate-500'}`}>
          {row.age_days}d
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) => (
        <Link href={row.href} className="text-sm font-medium text-primary hover:underline">
          Review
        </Link>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(row) => `${row.type}-${row.id}`}
      minWidth={520}
      empty={
        <EmptyState
          title="All clear"
          description="No groups, KYC, or reconciliation items waiting on you."
        />
      }
    />
  )
}
