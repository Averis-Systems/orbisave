import { FileText } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleAuditLogsPage() {
  return (
    <OperationsPlaceholder
      title="Audit Logs"
      description="Global immutable audit trail for sensitive admin, KYC, provider, group, and financial actions."
      icon={FileText}
      items={[
        'Admin actions, KYC document access, provider callbacks, and financial overrides.',
        'Filters by country, actor, group, member, event type, and time window.',
        'PII-safe log presentation with raw data access restricted by role.',
        'Export workflow for compliance and incident review.',
      ]}
    />
  )
}
