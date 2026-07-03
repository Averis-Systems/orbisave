import { Banknote } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ConsoleLoansPage() {
  return (
    <OperationsPlaceholder
      title="Loans"
      description="Platform-wide loan pool oversight, risk monitoring, approval flow visibility, and repayment performance."
      icon={Banknote}
      items={[
        'Loan requests by country, group, approval stage, and disbursement state.',
        'Loaning ledger stream separation from rotation and mandatory savings.',
        'Repayment performance, arrears, and default risk indicators.',
        'Provider disbursement status and audit references for each loan.',
      ]}
    />
  )
}
