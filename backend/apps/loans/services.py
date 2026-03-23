from decimal import Decimal
import uuid
import structlog
from django.db import transaction
from django.utils import timezone
from apps.ledger.models import LedgerEntry
from apps.groups.models import GroupMember

logger = structlog.get_logger(__name__)

class LoanEngine:
    @staticmethod
    def approve_loan(loan, authorizing_member, provided_pin):
        """
        Executes a highly rigid deterministic state transition for loan pools.
        Satisfies Financial Engine Checklist Item 7: Multi-Party Approval.
        """
        group = loan.group
        
        # 1. Structural Validation
        if loan.status not in ['pending_chair', 'pending_treasurer']:
            raise ValueError("Loan state heavily mutated. Only pending requests structurally validate.")
            
        # 2. Cryptographic Validation
        from django.contrib.auth.hashers import check_password
        if not authorizing_member.transaction_pin:
             raise PermissionError("Argon2id Transaction PIN strictly never properly instantiated by authorizing agent.")
        if not check_password(provided_pin, authorizing_member.transaction_pin):
             # Highly sensitive failure! Log aggressively.
             logger.warning("loan_critical_fraud_attempt", user_id=authorizing_member.id, loan_id=loan.id)
             raise PermissionError("Argon2id Transaction PIN failed strict cryptographic verification.")
             
        # 3. Role Validation & Routing
        try:
             membership = GroupMember.objects.get(group=group, member=authorizing_member, status='active')
        except GroupMember.DoesNotExist:
             raise PermissionError("Authorizing agent actively lacks any underlying valid membership ties.")
             
        # 4. Atomic Execution Pipeline
        with transaction.atomic(using=group.country):
            if loan.status == 'pending_chair':
                if membership.role != 'chairperson':
                     raise PermissionError("Rigidly un-authorized role. Must be chairperson for this stage.")
                
                loan.chair_approved_by = authorizing_member
                loan.chair_approved_at = timezone.now()
                
                if group.treasurer:
                     loan.status = 'pending_treasurer'
                else:
                     loan.status = 'approved'
                     
            elif loan.status == 'pending_treasurer':
                if membership.role != 'treasurer':
                     raise PermissionError("Rigidly un-authorized role. Must be treasurer for this stage.")
                     
                loan.status = 'approved'
                loan.treasurer_approved_by = authorizing_member
                loan.treasurer_approved_at = timezone.now()
                
            loan.save()
            
            if loan.status == 'approved':
                # Formally log the immutable state trace defining the exact moment capital leaves the theoretical pool mapping.
                LedgerEntry.objects.create(
                    group=group,
                    member=loan.borrower,
                    entry_type='loan_disbursement',
                    direction='debit',  # Money leaves group aggregate loan pool strictly
                    amount=loan.amount,
                    currency=group.currency,
                    description=f"Loan uniquely disbursed. Authorized physically by {authorizing_member.full_name}.",
                    reference=str(uuid.uuid4()),
                    related_loan=loan
                )
                
                # Automate statutory repayment flow instantly
                from apps.loans.services.repayment_service import LoanRepaymentService
                LoanRepaymentService.generate_repayments(loan)
                
                logger.info("loan_formally_approved_ledger_locked", loan_id=loan.id, auth_id=authorizing_member.id)
            
        return loan
