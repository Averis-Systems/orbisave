import { Landmark } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ManagerTrustAccountPage() {
  return (
    <OperationsPlaceholder
      title="Trust Account"
      description="Country trust account monitoring for custody balances, provider settlement, and platform ledger reconciliation."
      icon={Landmark}
      items={[
        'Country-specific trust account totals in local currency.',
        'Rotation, savings, loaning, company revenue, suspense, and provider settlement streams.',
        'Bank statement reconciliation against platform ledger entries.',
        'Exception queue for mismatched callbacks, failed payouts, and suspense items.',
      ]}
    />
  )
}
