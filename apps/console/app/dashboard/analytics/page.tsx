import { BarChart3 } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

/**
 * Analytics is deliberately still a stated-intent page, not a table of numbers.
 *
 * The trends it will show (on-time contribution ratio, activation funnel,
 * best- and worst-performing groups) must be computed by fanning out across
 * every country database, which does not scale as a live per-request query.
 * They are meant to be served from a nightly rollup table that has not been
 * built yet. Rather than show fabricated figures in the meantime, the page
 * says plainly what it will show and where the real numbers already are: the
 * live signup trend and per-country revenue are on the Overview, computed from
 * the ledger and the accounts table.
 */
export default function ConsoleAnalyticsPage() {
  return (
    <OperationsPlaceholder
      title="Analytics"
      description="Platform trends for growth, contribution reliability, and loan performance. Built on a nightly rollup so the numbers are never fabricated to fill the page."
      icon={BarChart3}
      items={[
        'On-time contribution ratio per group, ranked best and worst, per country.',
        'Activation funnel: registered, email verified, joined a group, first contribution.',
        'Loan performance and arrears trends over time.',
        'Live signup and revenue trends are already on the Overview; these deeper cuts need the nightly rollup table, which is the next backend piece.',
      ]}
    />
  )
}
