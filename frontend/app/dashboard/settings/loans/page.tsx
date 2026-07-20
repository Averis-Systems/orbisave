"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { AlertCircle, ChevronLeft, CreditCard, Landmark, Percent, Vote } from "lucide-react"

import { RequireGroupLeader } from "@/components/dashboard/RequireGroupLeader"
import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/dashboard/ui"
import { useActiveGroup } from "@/hooks/useGroups"
import { useAuthStore } from "@/store/auth"
import { formatCurrency } from "@/lib/formatters"

/**
 * Loan pool rules: READ ONLY.
 *
 * The previous version rendered a full proposal form (rate, term, exposure
 * limit, quorum, majority, an enable/disable toggle) and a "Prepare Vote
 * Proposal" button that only fired a success toast. Nothing was ever sent to
 * the backend and there is no endpoint to send it to, so every one of those
 * controls has been removed rather than left looking editable.
 */

const COUNTRY_POLICY: Record<string, { authority: string; market: string; currency: string }> = {
  kenya: { authority: "Central Bank of Kenya", market: "Kenya", currency: "KES" },
  rwanda: { authority: "National Bank of Rwanda", market: "Rwanda", currency: "RWF" },
  ghana: { authority: "Bank of Ghana", market: "Ghana", currency: "GHS" },
}

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

function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
      <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">{children}</p>
    </div>
  )
}

export default function LoanSettingsPage() {
  return (
    <RequireGroupLeader>
      <LoanRules />
    </RequireGroupLeader>
  )
}

function LoanRules() {
  const user = useAuthStore((state) => state.user)
  const { activeGroup, isLoading } = useActiveGroup()

  const policy = COUNTRY_POLICY[activeGroup?.country || user?.country || "kenya"] || COUNTRY_POLICY.kenya
  const currency = activeGroup?.currency || activeGroup?.wallet?.currency || policy.currency
  const loanPool = activeGroup?.wallet?.loan_pool ?? 0

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
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading loan pool configuration.</p>
      </div>
    )
  }

  if (!activeGroup) {
    return (
      <div className="space-y-6">
        {backLink}
        <EmptyState
          icon={CreditCard}
          title="No active group yet"
          description="Lending terms belong to a group. Create a group or accept an invite to see them."
        />
      </div>
    )
  }

  // TODO(api): GroupSerializer does not expose loan_interest_rate_monthly,
  // loan_pool_pct, max_loan_multiplier or loan_term_weeks, even though all four
  // are captured at group creation. Add them to the read serializer so the rows
  // below show the group's real terms instead of reporting them as unpublished.
  const rate = activeGroup.loan_interest_rate_monthly
  const rateLabel = rate ? `${rate}% monthly` : "Not published by the API"

  return (
    <div className="space-y-6">
      {backLink}

      <PageHeader
        eyebrow="Loan pool"
        title="Loan pool rules"
        description="The lending terms recorded for this group when it was created, and the policy that caps them. These values are not editable here."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Loan pool balance"
          value={formatCurrency(loanPool, currency)}
          sub="Capital available for member lending"
          icon={Landmark}
        />
        <StatCard label="Monthly interest" value={rateLabel} sub="Set at group creation" icon={Percent} />
        <StatCard label="Policy market" value={policy.market} sub={policy.authority} icon={Vote} />
      </div>

      <SectionCard title="Recorded lending terms" description="Read-only. Captured when the group was set up.">
        <div className="-mt-2">
          <InfoRow label="Monthly interest rate" value={rateLabel} />
          <InfoRow label="Currency" value={currency} />
          <InfoRow label="Country policy authority" value={policy.authority} note="Source of the maximum permitted rate." />
          <InfoRow
            label="Maximum permitted rate"
            value="Not published by the API"
            note="Held in super admin country policy settings."
          />
          {/* TODO(api): country rate caps live in the admin_portal CountryPolicy
              model and are not exposed to the member dashboard. Add a read only
              endpoint so the cap for this group's country can be shown and
              compared against the group's own rate. */}
        </div>
      </SectionCard>

      <SectionCard title="Why these terms are not editable here">
        <div className="space-y-4">
          <Note icon={<AlertCircle size={17} />}>
            Changing an interest rate affects loans members have already taken and repayments already scheduled, so it
            cannot be a single click in a settings form. It needs a group vote and a backend rule for when the new rate
            takes effect.
          </Note>
          <Note icon={<Vote size={17} />}>
            The safest internal rates sit well below the legal cap. A lower rate means fewer defaults and a loan pool
            that keeps circulating.
          </Note>
        </div>
        {/* TODO(api): there is no endpoint for proposing or adopting loan rule
            changes. A proposal flow needs: create proposal, list proposals,
            cast vote, adopt on quorum plus majority, and server side rejection
            of any rate above the active country cap. Until that exists this
            page stays read only. */}
        {/* TODO(product): confirm whether an adopted rate applies to new loans
            only or also re-prices outstanding ones, and whether the loan pool
            can be paused at all once members hold active loans. */}
      </SectionCard>
    </div>
  )
}
