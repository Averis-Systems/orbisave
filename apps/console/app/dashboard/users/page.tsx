import { UserCheck } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleMembersKycPage() {
  return (
    <OperationsPlaceholder
      title="Members & KYC"
      description="Global view of member identity, KYC workflow status, and restricted compliance operations."
      icon={UserCheck}
      items={[
        'KYC states: verified, submitted, pending, rejected, and exception review.',
        'Raw KYC access restricted to compliance roles with audited access.',
        'Country mismatch indicators between user KYC and group country.',
        'Retention and deletion status for identity documents.',
      ]}
    />
  )
}
