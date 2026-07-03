import { Banknote } from 'lucide-react'
import { OperationsPlaceholder } from '@/components/OperationsPlaceholder'

export default function ManagerLoansPage() {
  return (
    <OperationsPlaceholder
      title="Loans"
      description="Country operations for group loan requests, approval stages, loan pool availability, and repayment monitoring."
      icon={Banknote}
      items={[
        'Loan queue with chairperson, treasurer, and platform approval status.',
        'Loan pool balance and expected balance after each disbursement.',
        'KYC and contribution-history eligibility checks before approval.',
        'Repayment status, arrears flags, and audit trail for every loan decision.',
      ]}
    />
  )
}
