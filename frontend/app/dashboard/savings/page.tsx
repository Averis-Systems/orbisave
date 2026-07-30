"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { PiggyBank, RefreshCw, Wallet } from "lucide-react"
import { useActiveGroup } from "@/hooks/useGroups"
import { useContributions } from "@/hooks/useContributions"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { normalizeFrequency } from "@/lib/dashboard-reference"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/dashboard/ui"

/**
 * Per-contribution savings split, mirrored from the webhook's allocation
 * formula (apps/contributions/views.py: savings_amount = min(actual_amount,
 * group.mandatory_savings_amount)). Contributions don't store the split, so
 * this reproduces it client-side from data already fetched for the overview
 * page's monthly chart — no new backend call, and it can never disagree with
 * what the ledger actually posted since it's the same rule.
 */
function deriveSavingsAmount(raw: number, configuredPerCycle: number) {
  if (configuredPerCycle <= 0) return 0
  return Math.min(raw, configuredPerCycle)
}

type SavingsRow = {
  id: string
  member: string
  amount: number
  date: string
  status: string
}

function SavingsTrendChart({
  rows,
  currency,
}: {
  rows: SavingsRow[]
  currency: string
}) {
  const data = rows.reduce<Array<{ month: string; amount: number }>>((acc, row) => {
    const month = row.date ? new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(row.date)) : "Unscheduled"
    const existing = acc.find((entry) => entry.month === month)
    if (existing) {
      existing.amount += row.amount
    } else {
      acc.push({ month, amount: row.amount })
    }
    return acc
  }, [])

  return (
    <SectionCard title="Savings growth" description="Mandatory savings collected per month, across all members.">
      {data.length > 0 ? (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={24}>
              <CartesianGrid vertical={false} stroke="#f2f4f7" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "#f9fafb" }}
                formatter={(value) => [formatCurrency(Number(value ?? 0), currency), "Saved"]}
              />
              <Bar dataKey="amount" fill="#00ab00" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          icon={PiggyBank}
          title="No savings collected yet"
          description="Once contributions are confirmed, the mandatory savings deducted from each one will chart here by month."
        />
      )}
    </SectionCard>
  )
}

export default function SavingsPage() {
  const { activeGroup, isLoading: groupLoading } = useActiveGroup()
  const { data: contributions, isLoading: contributionsLoading } = useContributions(activeGroup?.id || null)

  const currency = activeGroup?.currency || "KES"
  const configuredPerCycle = Number(activeGroup?.mandatory_savings_amount ?? 0)
  const accruedBalance = activeGroup?.wallet?.mandatory_savings ?? 0

  const savingsRows = useMemo<SavingsRow[]>(() => {
    return (contributions || [])
      .filter((item) => item.status === "confirmed")
      .map((item) => ({
        id: item.id,
        member: item.member_name,
        amount: deriveSavingsAmount(Number(item.actual_amount ?? item.amount ?? 0), configuredPerCycle),
        date: item.confirmed_at || item.scheduled_date,
        status: item.status,
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  }, [contributions, configuredPerCycle])

  const isLoading = groupLoading || contributionsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (!activeGroup) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Savings"
          title="Mandatory Savings"
          description="Mandatory savings are deducted with each contribution cycle and held separately from the rotation and loan pools."
        />
        <EmptyState
          icon={PiggyBank}
          title="Join or create a group to start saving"
          description="Mandatory savings begin accruing once you're an active member of a savings group."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Savings"
        title="Mandatory Savings"
        description={`Held separately from ${activeGroup.name}'s rotation and loan pools. This is the group's pooled balance, not a personal one — every active member's deductions land in the same trust account.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Group savings balance"
          value={formatCurrency(accruedBalance, currency)}
          sub="Accrued from confirmed contributions, held in the ledger's savings stream"
          icon={PiggyBank}
          tone="green"
        />
        <StatCard
          label="Deducted per cycle"
          value={configuredPerCycle > 0 ? formatCurrency(configuredPerCycle, currency) : "Not configured"}
          sub={
            configuredPerCycle > 0
              ? `Taken automatically each ${normalizeFrequency(activeGroup.contribution_frequency).toLowerCase()} cycle`
              : "The chairperson hasn't set a mandatory savings amount for this group"
          }
          icon={RefreshCw}
        />
      </div>

      <SavingsTrendChart rows={savingsRows} currency={currency} />

      <SectionCard
        title="Recent savings allocations"
        description="The savings portion split out of each confirmed contribution, most recent first."
      >
        <DataTable<SavingsRow>
          columns={[
            {
              key: "member",
              header: "Member",
              render: (row) => <span className="font-medium text-gray-800 dark:text-white">{row.member}</span>,
            },
            {
              key: "amount",
              header: "Savings allocated",
              render: (row) => <span className="tabular-nums">{formatCurrency(row.amount, currency)}</span>,
            },
            {
              key: "date",
              header: "Date",
              render: (row) => formatDate(row.date),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
          rows={savingsRows.slice(0, 8)}
          rowKey={(row) => row.id}
          empty="No confirmed contributions have allocated savings yet."
        />
      </SectionCard>

      <SectionCard title="How mandatory savings work" description="The two rules this group's savings follow.">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <RefreshCw size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Deducted every contribution cycle</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                The configured amount above is taken automatically from each confirmed contribution, before the
                remainder splits into the rotation and loan pools.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <Wallet size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Held in a separate savings balance</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Savings sit outside the rotation pool and the loan pool, so payouts and lending never draw them down.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
