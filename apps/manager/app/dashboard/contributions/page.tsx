import { HandCoins } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ManagerContributionsPage() {
  return (
    <OperationsPlaceholder
      title="Contributions"
      description="Country-scoped contribution collections, reconciliation, and compliance monitoring for active groups."
      icon={HandCoins}
      items={[
        'Confirmed, pending, failed, and manually recorded contribution collections.',
        'Split visibility for rotation savings, mandatory savings, and loan pool allocation.',
        'Provider callback reconciliation against the immutable ledger.',
        'Offline and network-error states for mobile money collection attempts.',
      ]}
    />
  )
}
