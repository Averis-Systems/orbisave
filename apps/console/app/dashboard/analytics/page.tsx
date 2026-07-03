import { BarChart3 } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleAnalyticsPage() {
  return (
    <OperationsPlaceholder
      title="Analytics"
      description="Platform analytics for group growth, contribution compliance, payout reliability, and loan performance."
      icon={BarChart3}
      items={[
        'Group activation, contribution, payout, loan, and savings trends by country.',
        'No production-looking values until analytics endpoints are connected.',
        'Cohorts for chamas, VSLAs, cooperatives, and other community savings groups.',
        'Export controls for finance, compliance, and leadership reporting.',
      ]}
    />
  )
}
