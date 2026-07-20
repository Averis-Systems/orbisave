"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronLeft, Clock, Info, RefreshCw, Users } from "lucide-react"

import { RequireGroupLeader } from "@/components/dashboard/RequireGroupLeader"
import {
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/dashboard/ui"
import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers, type Member } from "@/hooks/useMembers"
import { normalizeFrequency } from "@/lib/dashboard-reference"
import { formatCurrency } from "@/lib/formatters"

/**
 * Rotation payout rules: READ ONLY.
 *
 * The rotation order and the payout schedule are derived by the system from
 * the configuration captured at group creation. A chairperson does not hand
 * tune sequencing here, so this page explains the derived behaviour instead of
 * offering controls that would not persist.
 *
 * The previous version of this file was a mockup: hardcoded amounts, local
 * useState only, an "Update Sequence" button that saved nothing, and an input
 * that let a group edit the platform fee. All of that is removed.
 */

function InfoRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-gray-800">
      <div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {note && <p className="mt-0.5 text-xs text-gray-400">{note}</p>}
      </div>
      <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function Rule({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3.5 border-b border-gray-100 py-4 last:border-0 dark:border-gray-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{children}</p>
      </div>
    </div>
  )
}

export default function RotationSettingsPage() {
  return (
    <RequireGroupLeader>
      <RotationRules />
    </RequireGroupLeader>
  )
}

function RotationRules() {
  const { activeGroup, isLoading } = useActiveGroup()
  const { data: members } = useMembers(activeGroup?.id || null)

  const currency = activeGroup?.currency || activeGroup?.wallet?.currency || "KES"
  const memberCount = activeGroup?.member_count ?? 0

  // The payout a recipient receives is the rotation pool at settlement time,
  // not a fixed figure. This is the expected full-collection value: every
  // active member's contribution for one cycle.
  const expectedCyclePool = (activeGroup?.contribution_amount || 0) * Math.max(memberCount, 0)

  const orderedMembers = [...(members || [])]
    .filter((member) => member.status === "active")
    .sort((a, b) => (a.rotation_position ?? 0) - (b.rotation_position ?? 0))

  const columns: Column<Member>[] = [
    {
      key: "position",
      header: "Position",
      render: (row) => (
        <span className="font-medium tabular-nums text-gray-900 dark:text-white">{row.rotation_position ?? "Not set"}</span>
      ),
    },
    {
      key: "member",
      header: "Member",
      render: (row) => <span className="font-medium text-gray-900 dark:text-white">{row.member_name}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (row) => <span className="capitalize">{row.role}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  const backLink = (
    <Link
      href="/dashboard/settings"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
    >
      <ChevronLeft size={16} />
      Group settings
    </Link>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {backLink}
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading rotation configuration.</p>
      </div>
    )
  }

  if (!activeGroup) {
    return (
      <div className="space-y-6">
        {backLink}
        <EmptyState
          icon={RefreshCw}
          title="No active group yet"
          description="Rotation order is derived from a group's setup. Create a group or accept an invite to see it."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {backLink}

      <PageHeader
        eyebrow="Rotation"
        title="Rotation and payouts"
        description="How OrbiSave works out who gets paid, in what order, and when. These rules come from your group setup and are not edited here."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contribution per member"
          value={formatCurrency(activeGroup.contribution_amount, currency)}
          sub={`${normalizeFrequency(activeGroup.contribution_frequency)} cadence`}
        />
        <StatCard
          label="Expected cycle pool"
          value={formatCurrency(expectedCyclePool, currency)}
          sub={`${memberCount} active members contributing`}
          icon={Users}
        />
        <StatCard
          label="Collection day"
          value={activeGroup.contribution_day ? `Day ${activeGroup.contribution_day}` : "Not set"}
          sub="Day of the contribution cycle"
          icon={Clock}
        />
        <StatCard
          label="Positions in rotation"
          value={memberCount}
          sub={`${activeGroup.max_members} seats configured`}
          icon={RefreshCw}
        />
      </div>

      <SectionCard
        title="How the payout order is decided"
        description="Derived by the system. There is no manual reordering control on this screen."
      >
        <div className="-mt-2">
          <Rule icon={Users} title="Order follows joining sequence">
            Each member is given a rotation position when they join. The chairperson takes position 1 at group
            creation, and every accepted invite takes the next free position. Payouts run from position 1 upward, one
            member per cycle, until everyone has been paid once.
          </Rule>
          <Rule icon={Clock} title="A payout settles once the cycle is fully collected">
            When every active member has a confirmed contribution for the current cycle, the payout for that
            position is released to the recipient&apos;s mobile money number. The recipient is chosen server side from the
            rotation schedule, never picked by hand.
          </Rule>
          <Rule icon={AlertTriangle} title="Late contributions hold the payout, they do not skip it">
            If a contribution is still missing on the scheduled payout date, the group gets a one day grace window
            and the payout waits. The position is not lost and is not given to someone else. Once the missing
            contributions are confirmed, the held payout settles.
          </Rule>
          <Rule icon={Info} title="If the grace window closes with money still missing">
            The payout stays pending and the cycle stays open. What happens next is determined by your group rules,
            agreed in a meeting: your group decides whether to disburse a partial amount, apply a fine, or wait.
            OrbiSave does not silently reassign the position.
          </Rule>
          {/* TODO(product): the backend readiness check
              (PayoutService.evaluate_rotation_payout_readiness) returns
              "awaiting_contributions" after the one day grace window expires
              and then simply holds. Confirm the intended rule for a defaulting
              member: partial disbursement, automatic fine, position deferral to
              the end of the rotation, or chairperson override. Until that is
              decided the copy above must stay non committal. */}
          {/* TODO(product): group.rotation_method supports sequential, random
              draw and manual, but RotationService.initialize_rotation only ever
              orders by rotation_position. Confirm whether draw and manual will
              ship, then update the "Order follows joining sequence" rule to
              branch on the group's actual method. */}
        </div>
      </SectionCard>

      <SectionCard
        title="Current rotation order"
        description="Live from your member list, ordered by rotation position."
        bodyClassName="px-5 sm:px-6 pb-2"
      >
        <DataTable
          columns={columns}
          rows={orderedMembers}
          rowKey={(row) => row.id}
          minWidth={520}
          empty="No active members are in the rotation yet."
        />
      </SectionCard>

      <SectionCard title="Platform utility fee" description="Set by OrbiSave. Groups cannot change it.">
        <div className="-mt-2">
          <InfoRow
            label="Fee on rotation payouts"
            value="Not published by the API"
            note="Deducted from the gross payout at disbursement. The recipient receives the net amount."
          />
          <InfoRow label="Who sets it" value="OrbiSave super admin" note="Applies system wide, to every group." />
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
          This fee is a platform charge, not a group rule. It is stored centrally and versioned, so a change by
          OrbiSave applies to payouts made after the change and never rewrites past ones.
        </p>
        {/* TODO(api): the fee lives in SystemConfiguration and is read server
            side by SystemConfiguration.get_withdrawal_fee_pct(). There is no
            member facing endpoint that exposes it, so the value above is
            labelled as unpublished rather than showing a placeholder number.
            Add a read only endpoint for public SystemConfiguration keys and
            render the real percentage here. */}
      </SectionCard>
    </div>
  )
}
