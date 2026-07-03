"use client"

import { PiggyBank, RefreshCw, Wallet } from "lucide-react"
import { useGroups } from "@/hooks/useGroups"
import { formatCurrency } from "@/lib/formatters"

function getMandatorySavingsAmount(group: any) {
  return (
    group?.mandatory_savings_amount ??
    group?.settings?.mandatory_savings_amount ??
    group?.mandatory_savings ??
    0
  )
}

export default function SavingsPage() {
  const { data: groups, isLoading } = useGroups()
  const activeGroup = groups?.[0]
  const currency = activeGroup?.currency || "KES"
  const mandatorySavings = getMandatorySavingsAmount(activeGroup)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Savings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Mandatory savings are deducted automatically and held separately from group contributions.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mandatory Savings</p>
              <p className="mt-3 text-4xl font-semibold text-gray-900 dark:text-white">
                {isLoading ? "..." : formatCurrency(mandatorySavings, currency)}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Auto-deducted with each contribution cycle for {activeGroup?.name || "your active group"}.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9f3ed] text-[#00ab00]">
              <PiggyBank size={26} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Savings Flow</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-500 dark:bg-gray-800">
                <RefreshCw size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Automatic deduction</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Runs with the configured group contribution cadence.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-500 dark:bg-gray-800">
                <Wallet size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Separate savings balance</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Held away from rotation and loan funds for cleaner reporting.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
