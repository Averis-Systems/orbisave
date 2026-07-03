import uuid
import structlog
from django.db import transaction
from django.utils import timezone

from apps.groups.models import GroupMember
from apps.ledger.models import LedgerEntry

logger = structlog.get_logger(__name__)


class LoanEngine:
    """
    Deterministic loan approval and disbursement state machine.

    Approval and money movement are deliberately separate:
        pending_chair -> pending_treasurer -> pending_admin -> approved
        approved -> disbursed
    """

    @staticmethod
    def approve_loan(loan, authorizing_member, provided_pin):
        """
        Executes one PIN-authenticated approval transition.
        This method never creates disbursement ledger entries or repayment schedules.
        """
        group = loan.group

        valid_pending_states = ['pending_chair', 'pending_treasurer', 'pending_admin']
        if loan.status not in valid_pending_states:
            raise ValueError(f"Loan is in '{loan.status}' - only pending loans can be approved.")

        from django.contrib.auth.hashers import check_password
        if not authorizing_member.transaction_pin:
            raise PermissionError("Transaction PIN has not been set by this user.")
        if authorizing_member.is_transaction_pin_locked:
            raise PermissionError("Transaction PIN is locked. Please request a PIN reset.")
        if not check_password(provided_pin, authorizing_member.transaction_pin):
            authorizing_member.transaction_pin_failed_attempts += 1
            update_fields = ['transaction_pin_failed_attempts']
            if authorizing_member.transaction_pin_failed_attempts >= 3:
                authorizing_member.transaction_pin_locked_at = timezone.now()
                update_fields.append('transaction_pin_locked_at')
            authorizing_member.save(update_fields=update_fields)
            logger.warning(
                "loan_approval_invalid_pin",
                user_id=authorizing_member.id,
                loan_id=loan.id,
                stage=loan.status,
            )
            raise PermissionError("Transaction PIN verification failed.")
        if authorizing_member.transaction_pin_failed_attempts:
            authorizing_member.transaction_pin_failed_attempts = 0
            authorizing_member.save(update_fields=['transaction_pin_failed_attempts'])

        try:
            membership = GroupMember.objects.get(
                group=group,
                member=authorizing_member,
                status='active',
            )
        except GroupMember.DoesNotExist:
            raise PermissionError("Authorizing user is not an active member of this group.")

        from common.db_utils import get_db_for_group
        db_alias = loan._state.db or get_db_for_group(group)

        with transaction.atomic(using=db_alias):
            if loan.status == 'pending_chair':
                if membership.role != 'chairperson':
                    raise PermissionError("Only the chairperson can approve at this stage.")
                loan.chair_approved_by = authorizing_member
                loan.chair_approved_at = timezone.now()
                loan.status = 'pending_treasurer' if group.treasurer_id else 'pending_admin'

            elif loan.status == 'pending_treasurer':
                if membership.role != 'treasurer':
                    raise PermissionError("Only the treasurer can approve at this stage.")
                loan.treasurer_approved_by = authorizing_member
                loan.treasurer_approved_at = timezone.now()
                loan.status = 'pending_admin'

            elif loan.status == 'pending_admin':
                if authorizing_member.role not in ('platform_admin', 'super_admin'):
                    raise PermissionError("Only a Platform Admin can approve at this stage.")
                loan.admin_approved_by = authorizing_member
                loan.admin_approved_at = timezone.now()
                loan.status = 'approved'

            loan.save(using=db_alias)

        logger.info(
            "loan_approval_stage_completed",
            loan_id=loan.id,
            authoriser_id=authorizing_member.id,
            status=loan.status,
        )
        return loan

    @staticmethod
    def disburse_loan(loan, actor, disbursement_reference=None):
        """
        Finalizes actual money movement after business approval.
        Ledger entries and repayment schedules are created only here.
        """
        if loan.status == 'disbursed':
            return loan
        if loan.status != 'approved':
            raise ValueError(f"Loan is in '{loan.status}' - only approved loans can be disbursed.")

        group = loan.group
        from common.db_utils import get_db_for_group
        db_alias = loan._state.db or get_db_for_group(group)

        with transaction.atomic(using=db_alias):
            loan.status = 'disbursed'
            loan.disbursed_at = timezone.now()
            loan.disbursement_reference = disbursement_reference or f"DISB-{uuid.uuid4()}"
            loan.save(using=db_alias, update_fields=['status', 'disbursed_at', 'disbursement_reference'])

            LedgerEntry.objects.using(db_alias).create(
                group=group,
                member=loan.borrower,
                account_stream='loaning',
                entry_type='loan_disbursement',
                direction='debit',
                amount=loan.amount,
                currency=group.currency,
                description=f"Loan #{loan.id} disbursed. Authorised by {actor.full_name}.",
                reference=str(uuid.uuid4()),
                related_loan=loan,
                recorded_by=actor,
            )

            from apps.loans.services.repayment_service import LoanRepaymentService
            LoanRepaymentService.generate_repayments(loan)

        logger.info(
            "loan_disbursed",
            loan_id=loan.id,
            actor_id=actor.id,
            reference=loan.disbursement_reference,
        )
        return loan
