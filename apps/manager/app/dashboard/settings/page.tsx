import { Settings } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ManagerSettingsPage() {
  return (
    <OperationsPlaceholder
      title="Settings"
      description="Country operations settings for review thresholds, support routing, provider availability, and operational controls."
      icon={Settings}
      items={[
        'Country-scoped configuration only, never global platform settings.',
        'Provider availability and maintenance windows by country.',
        'KYC review assignment, escalation, and risk indicator settings.',
        'Audit-controlled changes for sensitive financial operations.',
      ]}
    />
  )
}
