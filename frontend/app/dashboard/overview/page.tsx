"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, Banknote, Box, Users } from "lucide-react"
import { CardMenuLink, StatCard, StatusBadge } from "@/components/dashboard/ui"
import { useAuthStore } from "@/store/auth"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMeetings } from "@/hooks/useMeetings"
import { useLoans } from "@/hooks/useLoans"
import { useContributions } from "@/hooks/useContributions"
import {
  buildDashboardMetrics,
  getTargetTitle,
  normalizeFrequency,
  type DashboardMetric,
} from "@/lib/dashboard-reference"
import { formatCurrency, formatDate } from "@/lib/formatters"

// MetricBadge was removed: the shared StatCard renders trends via TrendBadge,
// so keeping a second local implementation would reintroduce the drift this
// page was just reconciled away from.

/*
 * Uses the shared StatCard rather than a local tile.
 *
 * This page previously hand-rolled its own stat card that disagreed with the
 * primitive on every dimension: 30px/bold versus 28px/semibold, a 12x12 icon
 * chip versus 11x11, icon above the value versus beside it, and no
 * tabular-nums so the digits jittered as values changed. Two cards with the
 * same job and different geometry is exactly the inconsistency being removed,
 * so the primitive is now the single definition everywhere.
 */
function GroupWalletMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  const icons = [Users, Box, Banknote, Activity]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {metrics.slice(0, 2).map((metric, index) => (
        <StatCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          sub={metric.sub}
          icon={icons[index]}
          trend={metric.trendLabel ? { label: metric.trendLabel, direction: metric.trend } : undefined}
        />
      ))}
    </div>
  )
}

function PoolBarChart({
  currency,
  contributions,
}: {
  currency: string
  contributions: ReturnType<typeof useContributions>["data"]
}) {
  const data = (contributions || [])
    .filter((item) => item.status === "confirmed")
    .reduce<Array<{ month: string; amount: number }>>((acc, item) => {
      const date = item.confirmed_at || item.scheduled_date
      const month = date
        ? new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(date))
        : "Unscheduled"
      const existing = acc.find((row) => row.month === month)
      const amount = Number(item.actual_amount ?? item.amount ?? 0)

      if (existing) {
        existing.amount += amount
      } else {
        acc.push({ month, amount })
      }

      return acc
    }, [])

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Monthly contributions</h3>
        <CardMenuLink href="/dashboard/contributions" label="View all" />
      </div>

      {/* No min-width on the chart: Recharts fills its parent, and a fixed
          520px floor was being clipped by the card's overflow-hidden on a
          375px phone, hiding the right-hand months entirely. */}
      {data.length > 0 ? (
        <div className="mt-3 h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={24}>
              <CartesianGrid vertical={false} stroke="#f2f4f7" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "#f9fafb" }}
                formatter={(value) => [formatCurrency(Number(value ?? 0), currency), "Collected"]}
              />
              <Bar dataKey="amount" fill="#00ab00" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 flex h-[210px] w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
          <div className="max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/empty-wallet.svg" alt="" className="mx-auto mb-3 h-20 w-auto" loading="lazy" />
            <p className="text-sm font-semibold text-gray-800">No confirmed contributions yet</p>
            <p className="mt-2 text-sm text-gray-500">Confirmed contribution collections will appear here once mobile money or manual records are posted.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function TargetCard({
  title,
  target,
  collected,
  currency,
}: {
  title: string
  target: number
  collected: number
  currency: string
}) {
  const progress = target > 0 ? Math.min(Math.round((collected / target) * 100), 100) : 0
  const series = [
    { name: "progress", value: progress },
    { name: "remaining", value: 100 - progress },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100">
      <div className="rounded-2xl bg-white px-5 pb-11 pt-5 sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="mt-1 text-sm font-normal text-gray-500">Target based on group contribution settings</p>
          </div>
          <CardMenuLink href="/dashboard/my-group" label="Group rules" />
        </div>

        <div className="relative mx-auto mt-5 h-[260px] max-w-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={series}
                dataKey="value"
                startAngle={205}
                endAngle={-25}
                innerRadius="76%"
                outerRadius="94%"
                stroke="none"
              >
                <Cell fill="#00ab00" />
                <Cell fill="#e4e7ec" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pt-4">
            <span className="text-4xl font-semibold text-gray-800">{progress}%</span>
          </div>
        </div>

        <p className="mx-auto mt-2 max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          {formatCurrency(collected, currency)} collected against a {formatCurrency(target, currency)} group target.
        </p>
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        {[
          ["Target", formatCurrency(target, currency)],
          ["Collected", formatCurrency(collected, currency)],
          ["Remaining", formatCurrency(Math.max(target - collected, 0), currency)],
        ].map(([label, value], index) => (
          <div key={label} className="flex items-center gap-5 sm:gap-8">
            {index > 0 && <div className="h-7 w-px bg-gray-200" />}
            <div>
              <p className="mb-1 text-center text-xs text-gray-500 sm:text-sm">{label}</p>
              <p className="text-center text-base font-semibold text-gray-800 sm:text-lg">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/*
 * The "Group Wallet Statistics" card was removed rather than restyled.
 *
 * It had no data source and no state: the Monthly/Quarterly/Annually toggle
 * had no handler, the date range was the hardcoded string "Jun 07 - Jun 13",
 * and the body always rendered "No wallet history yet" even for a group with a
 * full year of confirmed contributions. Monthly contribution movement is
 * already charted honestly by PoolBarChart above, so the card was a duplicate
 * wrapped in dead controls.
 *
 * TODO(api): rotation payout and loan pool movement have no wallet-history
 * endpoint. When one exists, add a combined movement chart here rather than
 * reviving the period toggle without a query behind it.
 */
function CommunityCard({ memberCount, maxMembers }: { memberCount: number; maxMembers: number }) {
  const capacity = maxMembers > 0 ? Math.round((memberCount / maxMembers) * 100) : 0
  const rows = [
    { name: "Active Members", detail: `${memberCount} members`, percent: capacity || 0 },
    // Without a group there are no seats at all: don't show a full bar for 0 of 0.
    { name: "Available Seats", detail: `${Math.max(maxMembers - memberCount, 0)} seats`, percent: maxMembers > 0 ? Math.max(100 - capacity, 0) : 0 },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Group capacity</h3>
          <p className="mt-1 text-sm text-gray-500">Seats taken against the group maximum</p>
        </div>
        <CardMenuLink href="/dashboard/my-group" label="View members" />
      </div>

      <div className="my-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 sm:px-6">
        <div className="flex h-[212px] items-center justify-center">
          <div className="relative h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="percent"
                  innerRadius="68%"
                  outerRadius="92%"
                  startAngle={90}
                  endAngle={450}
                  stroke="none"
                >
                  <Cell fill="#00ab00" />
                  <Cell fill="#e4e7ec" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-gray-800">{capacity}%</span>
              <span className="text-xs text-gray-500">Capacity</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ecfdf3] text-[#00ab00]">
                <Users size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{row.name}</p>
                <span className="block text-xs text-gray-500">{row.detail}</span>
              </div>
            </div>

            <div className="flex w-full max-w-[140px] items-center gap-3">
              <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200">
                <div className="absolute left-0 top-0 h-full rounded-sm bg-[#00ab00]" style={{ width: `${row.percent}%` }} />
              </div>
              <p className="text-sm font-medium text-gray-800">{row.percent}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type ActivityCategory = "all" | "contributions" | "loans"

function RecentActivityTable({
  contributions,
  loans,
  currency,
}: {
  contributions: ReturnType<typeof useContributions>["data"]
  loans: ReturnType<typeof useLoans>["data"]
  currency: string
}) {
  // "Recent" has to mean recent. Rows used to be an arbitrary 3-contributions
  // plus 2-loans slice in whatever order the API returned, so the newest entry
  // was frequently missing entirely. Merge, sort by the real event date, then
  // take the top 5.
  // TODO(api): both lists are fetched in full and trimmed here. Once the
  // contributions and loans endpoints accept ordering and page_size, request
  // only the newest few instead of downloading the whole history.
  const [category, setCategory] = useState<ActivityCategory>("all")

  const rows = useMemo(() => {
    const contributionRows = (contributions || []).map((item) => ({
      id: item.id,
      name: item.member_name,
      meta: item.platform_reference || "Contribution",
      amount: formatCurrency(item.actual_amount ?? item.amount, item.currency || currency),
      category: "Contribution" as const,
      status: item.status,
      at: item.confirmed_at || item.initiated_at || item.scheduled_date || "",
    }))

    const loanRows = (loans || []).map((item) => ({
      id: item.id,
      name: item.borrower_name,
      meta: item.purpose?.replace(/_/g, " ") || "Loan request",
      amount: formatCurrency(item.amount, item.currency || currency),
      category: "Loan" as const,
      status: item.status,
      // TODO(api): LoanListSerializer exposes no request timestamp, only
      // disbursed_at, so a loan awaiting approval has no date to sort on and
      // falls to the bottom. Add created_at to the serializer to fix ordering.
      at: item.disbursed_at || "",
    }))

    const merged =
      category === "contributions" ? contributionRows : category === "loans" ? loanRows : [...contributionRows, ...loanRows]

    return merged
      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
      .slice(0, 5)
  }, [contributions, loans, currency, category])

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Recent wallet activity</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* A filter has to say what it filters. This one narrows the feed by
              activity type and actually re-renders the rows. */}
          <label className="sr-only" htmlFor="activity-category">
            Filter activity by type
          </label>
          <select
            id="activity-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ActivityCategory)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#00ab00] focus:ring-2 focus:ring-[#00ab00]/15"
          >
            <option value="all">All activity</option>
            <option value="contributions">Contributions only</option>
            <option value="loans">Loans only</option>
          </select>
          <Link
            href="/dashboard/contributions"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-800"
          >
            View all in Contributions
          </Link>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[620px]">
          <thead className="border-y border-gray-100">
            <tr>
              {["Member", "Amount", "Category", "Status"].map((heading) => (
                <th key={heading} className="py-3 text-left text-xs font-medium text-gray-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-md bg-gray-100 text-sm font-semibold text-gray-700">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{row.name}</p>
                        <span className="text-xs text-gray-500">{row.meta}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-sm tabular-nums text-gray-500">{row.amount}</td>
                  <td className="py-3 text-sm text-gray-500">{row.category}</td>
                  <td className="py-3 text-sm text-gray-500">
                    {/* Was hardcoded success green for every row, so a failed
                        contribution or rejected loan read as successful. */}
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                  Activity feed will sync as members contribute.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()

  const { data: meetings } = useMeetings(activeGroup?.id || null)
  const { data: loans } = useLoans(activeGroup?.id || null)
  const { data: contributions } = useContributions(activeGroup?.id || null)

  const upcomingMeeting = meetings?.find((meeting) => meeting.status === "scheduled")
  const wallet = activeGroup?.wallet
  const currency = activeGroup?.currency || wallet?.currency || "KES"

  const metrics = useMemo(
    () =>
      buildDashboardMetrics({
        memberCount: activeGroup?.member_count,
        maxMembers: activeGroup?.max_members,
        rotationPool: wallet?.rotation_pool,
        totalPool: wallet?.total,
        loanPool: wallet?.loan_pool,
        currency,
        frequency: activeGroup?.contribution_frequency,
      }),
    [activeGroup, currency, wallet]
  )

  const showGetStarted = !activeGroup && !groupsLoading

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        {showGetStarted ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-col items-center gap-8 p-6 sm:p-10 lg:flex-row lg:justify-between">
              <div className="max-w-xl text-center lg:text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-[#00ab00]">Get started</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0a2540] sm:text-3xl">
                  Start or join your savings group
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Hello <strong className="font-semibold text-gray-700">{user?.full_name}</strong>. Contributions,
                  rotation payouts, savings, and loans all begin with a group. Create yours or accept an invite,
                  and this dashboard fills in from there.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <button
                    onClick={() => router.push("/dashboard/my-group")}
                    className="rounded-lg bg-[#00ab00] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#009200]"
                  >
                    Create or manage group
                  </button>
                  <button
                    onClick={() => router.push("/how-loaning-works")}
                    className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#0a2540] transition-colors hover:bg-gray-50"
                  >
                    See how groups work
                  </button>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/savings.svg" alt="" className="h-36 w-auto sm:h-48" loading="lazy" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#bfe8c4] bg-[#ecfdf3] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Hello <strong>{user?.full_name}</strong>. {activeGroup?.name || "Your group"} status is{" "}
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium uppercase text-[#00ab00]">
                    {activeGroup?.status || "loading"}
                  </span>
                  {upcomingMeeting && <>. Next meeting is scheduled for {formatDate(upcomingMeeting.scheduled_at)}.</>}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Contribution cadence: {normalizeFrequency(activeGroup?.contribution_frequency)}
                </p>
              </div>
              <button
                onClick={() => router.push("/dashboard/my-group")}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#00ab00] hover:bg-[#e9f3ed]"
              >
                Manage Group
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-7">
        <GroupWalletMetrics metrics={metrics} />
        <PoolBarChart currency={currency} contributions={contributions} />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <TargetCard
          title={getTargetTitle(activeGroup?.contribution_frequency)}
          target={(activeGroup?.contribution_amount || 0) * Math.max(activeGroup?.member_count || 1, 1)}
          collected={wallet?.rotation_pool || 0}
          currency={currency}
        />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <CommunityCard memberCount={activeGroup?.member_count || 0} maxMembers={activeGroup?.max_members || 0} />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentActivityTable contributions={contributions} loans={loans} currency={currency} />
      </div>
    </div>
  )
}
