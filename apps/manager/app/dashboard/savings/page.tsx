import { PiggyBank } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ManagerSavingsPage() {
  return (
    <OperationsPlaceholder
      title="Savings"
      description="Mandatory savings oversight for country groups, including balances, deduction rules, and disbursement readiness."
      icon={PiggyBank}
      items={[
        'Mandatory savings balance per group and member.',
        'Auto-deduction status from scheduled contributions.',
        'Written group authorization gate before savings disbursement.',
        'Ledger stream checks so savings do not affect rotation balances.',
      ]}
    />
  )
}
