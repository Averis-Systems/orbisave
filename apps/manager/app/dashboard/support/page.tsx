import { Headphones } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ManagerSupportPage() {
  return (
    <OperationsPlaceholder
      title="Support"
      description="Country support workspace for group onboarding, contribution issues, KYC follow-up, and member assistance."
      icon={Headphones}
      items={[
        'Support tickets linked to groups, members, contributions, KYC, and payouts.',
        'Masked financial and identity data by default.',
        'Escalation path to compliance, finance operations, or platform administrators.',
        'Audit trail for every support action performed on a user or group.',
      ]}
    />
  )
}
