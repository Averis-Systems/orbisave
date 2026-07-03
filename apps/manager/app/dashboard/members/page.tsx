import { Users } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ManagerMembersPage() {
  return (
    <OperationsPlaceholder
      title="Members"
      description="Country-scoped member operations, group membership, KYC status, and contribution history will be reviewed here."
      icon={Users}
      items={[
        'Member table with group role, KYC status, country, joined date, and account status.',
        'Filters for verified, submitted, pending, and rejected KYC states.',
        'Masked contact details for support users and restricted access for raw KYC data.',
        'Links to contribution, loan, and rotation position history per member.',
      ]}
    />
  )
}
