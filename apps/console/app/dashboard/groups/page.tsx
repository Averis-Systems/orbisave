import { ShieldCheck } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleGroupsPage() {
  return (
    <OperationsPlaceholder
      title="Groups"
      description="Global group oversight for verification status, activation gates, financial streams, and operational health."
      icon={ShieldCheck}
      items={[
        'Country, verification status, chairperson KYC, and first-deposit activation gate.',
        'Group wallet split across rotation savings, mandatory savings, and loan pool streams.',
        'Pending review, active, suspended, and closed group states.',
        'Links to audit logs, support tickets, members, contributions, and payouts.',
      ]}
    />
  )
}
