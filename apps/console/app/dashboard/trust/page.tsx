import { Landmark } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleTrustAccountsPage() {
  return (
    <OperationsPlaceholder
      title="Trust Accounts"
      description="Global custody oversight for country trust accounts, ledger streams, provider settlement, and reconciliation."
      icon={Landmark}
      items={[
        'Country trust account totals in KES, RWF, and GHS once bank feeds are connected.',
        'Rotation, savings, loaning, company revenue, suspense, and provider settlement streams.',
        'Bank reconciliation status and exception queues.',
        'Restricted visibility for account numbers and sensitive custody data.',
      ]}
    />
  )
}
