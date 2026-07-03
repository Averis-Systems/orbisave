import { Globe } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleCountriesPage() {
  return (
    <OperationsPlaceholder
      title="Countries"
      description="Global country oversight for Kenya, Rwanda, Ghana, and future jurisdictions."
      icon={Globe}
      items={[
        'Country status, local currency, trust account readiness, and provider availability.',
        'Country admin assignment and compliance coverage.',
        'Data residency and jurisdiction-specific operational controls.',
        'Launch readiness checklist for new markets.',
      ]}
    />
  )
}
