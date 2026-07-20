"use client"

import { PiggyBank, RefreshCw, Wallet } from "lucide-react"
import { useActiveGroup } from "@/hooks/useGroups"
import { formatCurrency } from "@/lib/formatters"
import { PageHeader, SectionCard, StatCard } from "@/components/dashboard/ui"

function getMandatorySavingsAmount(group: any) {
  return (
    group?.mandatory_savings_amount ??
    group?.settings?.mandatory_savings_amount ??
    group?.mandatory_savings ??
    0
  )
}

export default function SavingsPage() {
  const { activeGroup, isLoading } = useActiveGroup()
  const currency = activeGroup?.currency || "KES"
  const mandatorySavings = getMandatorySavingsAmount(activeGroup)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Savings"
        title="Mandatory Savings"
        description="Mandatory savings are deducted with each contribution cycle and held separately from the rotation and loan pools."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/*
          This tile shows the group's configured per-cycle mandatory savings
          amount, not an accrued balance. The group wallet does expose a
          `mandatory_savings` running total.
          TODO(copy): confirm with product whether members should see the
          group-wide accrued savings balance here, their own accrued balance,
          or both alongside the configured per-cycle amount.
        */}
        <StatCard
          label="Mandatory savings per cycle"
          value={isLoading ? "..." : formatCurrency(mandatorySavings, currency)}
          sub={`Configured for ${activeGroup?.name || "your active group"}`}
          icon={PiggyBank}
          tone="green"
        />

        <SectionCard title="How mandatory savings work" description="The two rules this group's savings follow.">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <RefreshCw size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">Deducted every contribution cycle</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  The amount above is taken automatically on the group&apos;s contribution cadence.
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
    </div>
  )
}
