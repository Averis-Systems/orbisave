import { PiggyBank } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleSavingsPage() {
  return (
    <OperationsPlaceholder
      title="Savings"
      description="Global mandatory savings oversight across countries, groups, members, and trust account streams."
      icon={PiggyBank}
      items={[
        'Mandatory savings totals by country and group.',
        'Auto-deduction compliance by contribution cycle.',
        'Disbursement authorization readiness and written group approval status.',
        'Savings ledger stream reconciliation against trust account balances.',
      ]}
    />
  )
}
