"use client"

import Link from "next/link"
import { Calendar, ChevronRight, CreditCard, RefreshCw } from "lucide-react"

import { RequireGroupLeader } from "@/components/dashboard/RequireGroupLeader"
import { PageHeader, SectionCard, EmptyState, StatusBadge } from "@/components/dashboard/ui"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMeetingSettings } from "@/hooks/useMeetings"
import { normalizeFrequency } from "@/lib/dashboard-reference"
import { formatCurrency } from "@/lib/formatters"

/**
 * Group Governance hub.
 *
 * Every card below points at a page that actually exists. The old "Group
 * Rules" card linked to this same page, so it has been removed rather than
 * left as a link that goes nowhere.
 */
const SETTING_CARDS = [
  {
    icon: RefreshCw,
    title: "Rotation and payouts",
    desc: "See the payout order the system derived from your group setup, and when each payout settles.",
    href: "/dashboard/settings/rotations",
  },
  {
    icon: CreditCard,
    title: "Loan pool",
    desc: "Review the lending terms recorded for this group and the country policy that caps them.",
    href: "/dashboard/settings/loans",
  },
  {
    icon: Calendar,
    title: "Meetings and quorum",
    desc: "Set meeting cadence, notice period, quorum and majority thresholds for valid votes.",
    href: "/dashboard/settings/meetings",
  },
]

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3.5 last:border-0 dark:border-gray-800">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <RequireGroupLeader>
      <SettingsHub />
    </RequireGroupLeader>
  )
}

function SettingsHub() {
  const { activeGroup, isLoading } = useActiveGroup()
  const { data: meetingSettings } = useMeetingSettings(activeGroup?.id || null)

  const currency = activeGroup?.currency || activeGroup?.wallet?.currency || "KES"

  // Every value here is read from the group record. Nothing is invented: a
  // field the API does not publish yet reads as "Not published by the API".
  const snapshot = activeGroup
    ? [
        { label: "Group", value: activeGroup.name },
        { label: "Contribution amount", value: formatCurrency(activeGroup.contribution_amount, currency) },
        { label: "Contribution frequency", value: normalizeFrequency(activeGroup.contribution_frequency) },
        { label: "Contribution day", value: activeGroup.contribution_day ? `Day ${activeGroup.contribution_day}` : "Not set" },
        { label: "Members", value: `${activeGroup.member_count} of ${activeGroup.max_members} seats` },
        {
          label: "Mandatory savings",
          value: activeGroup.mandatory_savings_amount
            ? formatCurrency(activeGroup.mandatory_savings_amount, currency)
            : "Not set",
        },
        // TODO(api): GroupSerializer does not expose payout_strategy or
        // loan_interest_rate_monthly. Add both to the read serializer so these
        // rows can show the group's real configured values.
        { label: "Payout order method", value: activeGroup.payout_strategy || "Not published by the API" },
        {
          label: "Loan interest",
          value: activeGroup.loan_interest_rate_monthly
            ? `${activeGroup.loan_interest_rate_monthly}% monthly`
            : "Not published by the API",
        },
        { label: "Meeting quorum", value: meetingSettings ? `${meetingSettings.quorum_percent}%` : "Not set" },
        { label: "Voting majority", value: meetingSettings ? `${meetingSettings.majority_percent}%` : "Not set" },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group governance"
        title="Group settings"
        description="Review the rules your group runs on. Rotation order is derived by the system; meeting rules are yours to set."
        actions={activeGroup ? <StatusBadge status={activeGroup.status} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SETTING_CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group block rounded-2xl border border-gray-200 bg-white p-5 no-underline transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <card.icon size={20} />
              </div>
              <ChevronRight
                size={18}
                className="mt-3 text-gray-300 transition-colors group-hover:text-[#00ab00] dark:text-gray-600"
              />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{card.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">{card.desc}</p>
          </Link>
        ))}
      </div>

      <SectionCard
        title="Current configuration"
        description="Read-only. These values were set when the group was created."
      >
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading group configuration.</p>
        ) : !activeGroup ? (
          <EmptyState
            title="No active group yet"
            description="Create a group or accept an invite, then its configuration will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
            {snapshot.map((row) => (
              <SnapshotRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Changing these rules">
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          Contribution amount, frequency, member capacity and payout order are fixed at group creation and are not
          editable from this screen. Changing them mid cycle would alter money already committed by members.
        </p>
        {/* TODO(product): confirm the intended path for amending group financial
            rules after activation, for example a quorum vote in a meeting that
            then unlocks an amendment, and whether it applies from the next
            cycle only. Until that rule is decided, this page does not offer any
            way to edit them. */}
      </SectionCard>
    </div>
  )
}
