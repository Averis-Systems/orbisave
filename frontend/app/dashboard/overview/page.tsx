"use client"

import { useMemo } from "react"
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
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Banknote,
  Box,
  Calendar,
  Filter,
  MoreHorizontal,
  Users,
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMeetings } from "@/hooks/useMeetings"
import { useLoans } from "@/hooks/useLoans"
import { useContributions } from "@/hooks/useContributions"
import { AppStatePanel } from "@/components/states/AppState"
import {
  buildDashboardMetrics,
  getTargetTitle,
  normalizeFrequency,
  type DashboardMetric,
} from "@/lib/dashboard-reference"
import { formatCurrency, formatDate } from "@/lib/formatters"

function MetricBadge({ trend, label }: { trend: DashboardMetric["trend"]; label: string }) {
  const isUp = trend === "up"
  const isDown = trend === "down"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isUp
          ? "bg-[#ecfdf3] text-[#039855]"
          : isDown
            ? "bg-[#fef3f2] text-[#d92d20]"
            : "bg-[#f2f4f7] text-gray-600"
      }`}
    >
      {isUp && <ArrowUp size={14} />}
      {isDown && <ArrowDown size={14} />}
      {label}
    </span>
  )
}

function GroupWalletMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  const icons = [Users, Box, Banknote, Activity]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {metrics.slice(0, 2).map((metric, index) => {
        const Icon = icons[index]
        return (
          <div key={metric.label} className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <Icon className="h-6 w-6 text-gray-800" />
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <span className="text-sm text-gray-500">{metric.label}</span>
                <h4 className="mt-2 text-[30px] font-bold leading-[38px] text-gray-800">{metric.value}</h4>
                <p className="mt-1 text-xs text-gray-400">{metric.sub}</p>
              </div>
              <MetricBadge trend={metric.trend} label={metric.trendLabel} />
            </div>
          </div>
        )
      })}
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
        <h3 className="text-lg font-semibold text-gray-800">Monthly Contributions</h3>
        <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="More options">
          <MoreHorizontal size={22} />
        </button>
      </div>

      {data.length > 0 ? (
        <div className="mt-3 h-[210px] min-w-[520px]">
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
        <div className="mt-3 flex h-[210px] min-w-[520px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
          <div className="max-w-xs">
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
      <div className="rounded-2xl bg-white px-5 pb-11 pt-5 shadow-[0_1px_3px_rgba(16,24,40,0.1)] sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="mt-1 text-sm font-normal text-gray-500">Target based on group contribution settings</p>
          </div>
          <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="More options">
            <MoreHorizontal size={22} />
          </button>
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
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-medium text-[#039855]">
            +10%
          </span>
        </div>

        <p className="mx-auto mt-2 max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          {formatCurrency(collected, currency)} collected against a {formatCurrency(target, currency)} group target.
        </p>
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        {[
          ["Target", formatCurrency(target, currency)],
          ["Collected", formatCurrency(collected, currency)],
          ["Today", formatCurrency(Math.round(collected * 0.08), currency)],
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

function StatisticsChart({ currency }: { currency: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800">Group Wallet Statistics</h3>
          <p className="mt-1 text-sm text-gray-500">Contribution and payout movement will appear once wallet history is connected.</p>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <div className="rounded-lg bg-gray-100 p-0.5">
            {["Monthly", "Quarterly", "Annually"].map((label, index) => (
              <button
                key={label}
                className={`rounded-md px-3 py-2 text-xs font-medium ${
                  index === 0 ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)]" : "text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
            <Calendar size={16} />
            Jun 07 - Jun 13
          </button>
        </div>
      </div>

      <div className="flex h-[310px] min-w-[760px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ecfdf3] text-[#00ab00]">
            <Activity size={22} />
          </div>
          <p className="text-sm font-semibold text-gray-800">No wallet history yet</p>
          <p className="mt-2 text-sm text-gray-500">
            We will chart contribution collections, rotation payouts, and loan pool movements here after live group wallet events are available in {currency}.
          </p>
        </div>
      </div>
    </div>
  )
}

function CommunityCard({ memberCount, maxMembers }: { memberCount: number; maxMembers: number }) {
  const capacity = maxMembers > 0 ? Math.round((memberCount / maxMembers) * 100) : 0
  const rows = [
    { name: "Active Members", detail: `${memberCount} members`, percent: capacity || 0 },
    { name: "Available Seats", detail: `${Math.max(maxMembers - memberCount, 0)} seats`, percent: Math.max(100 - capacity, 0) },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Members Demographic</h3>
          <p className="mt-1 text-sm text-gray-500">Number of members based on group capacity</p>
        </div>
        <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="More options">
          <MoreHorizontal size={22} />
        </button>
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

function RecentActivityTable({
  contributions,
  loans,
  currency,
}: {
  contributions: ReturnType<typeof useContributions>["data"]
  loans: ReturnType<typeof useLoans>["data"]
  currency: string
}) {
  const rows = [
    ...(contributions || []).slice(0, 3).map((item) => ({
      id: item.id,
      name: item.member_name,
      meta: item.platform_reference || "Contribution",
      amount: formatCurrency(item.actual_amount ?? item.amount, item.currency || currency),
      category: "Contribution",
      status: item.status,
    })),
    ...(loans || []).slice(0, 2).map((item) => ({
      id: item.id,
      name: item.borrower_name,
      meta: item.purpose || "Loan request",
      amount: formatCurrency(item.amount, item.currency || currency),
      category: "Loan",
      status: item.status.replace(/_/g, " "),
    })),
  ].slice(0, 5)

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 sm:px-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Recent Wallet Activity</h3>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-gray-50 hover:text-gray-800">
            <Filter size={18} />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-gray-50 hover:text-gray-800">
            See all
          </button>
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
                  <td className="py-3 text-sm text-gray-500">{row.amount}</td>
                  <td className="py-3 text-sm text-gray-500">{row.category}</td>
                  <td className="py-3 text-sm text-gray-500">
                    <span className="rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-xs font-medium capitalize text-[#039855]">
                      {row.status}
                    </span>
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

  if (!activeGroup && !groupsLoading) {
    return <AppStatePanel stateKey="groups.empty" className="min-h-[60vh]" />
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
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

      <div className="col-span-12">
        <div className="overflow-x-auto">
          <StatisticsChart currency={currency} />
        </div>
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
