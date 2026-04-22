from decimal import Decimal
import uuid
import structlog
from django.db import transaction
from django.utils import timezone
from apps.ledger.models import LedgerEntry
from apps.groups.models import GroupMember

logger = structlog.get_logger(__name__)


class LoanEngine:
    """
    Core loan approval state machine.
    Satisfies Financial Engine Checklist Items 7 (Multi-Party Approval), 12 (Data Integrity), 13 (Audit).

    Approval flow:
        pending_chair → (if treasurer exists) pending_treasurer → (if platform admin required) pending_admin → approved
    """

    @staticmethod
    def approve_loan(loan, authorizing_member, provided_pin):
        """
        Executes a deterministic, PIN-authenticated state transition for a loan.
        Handles all three approval stages: chairperson, treasurer, and platform admin.
        """
        group = loan.group

        # ── 1. State Validation ──────────────────────────────────────────────
        VALID_PENDING_STATES = ['pending_chair', 'pending_treasurer', 'pending_admin']
        if loan.status not in VALID_PENDING_STATES:
            raise ValueError(
                f"Loan is in '{loan.status}' — only pending loans can be approved."
            )

        # ── 2. Cryptographic PIN Validation ──────────────────────────────────
        from django.contrib.auth.hashers import check_password
        if not authorizing_member.transaction_pin:
            raise PermissionError("Transaction PIN has not been set by this user.")
        if not check_password(provided_pin, authorizing_member.transaction_pin):
            logger.warning(
                "loan_approval_invalid_pin",
                user_id=authorizing_member.id,
                loan_id=loan.id,
                stage=loan.status,
            )
            raise PermissionError("Transaction PIN verification failed.")

        # ── 3. Role-Bound Stage Routing ──────────────────────────────────────
        try:
            membership = GroupMember.objects.get(
                group=group, member=authorizing_member, status='active'
            )
        except GroupMember.DoesNotExist:
            raise PermissionError("Authorizing user is not an active member of this group.")

        from common.db_utils import get_db_for_group
        db_alias = get_db_for_group(group)
        with transaction.atomic(using=db_alias):
            if loan.status == 'pending_chair':
                if membership.role != 'chairperson':
                    raise PermissionError("Only the chairperson can approve at this stage.")
                loan.chair_approved_by = authorizing_member
                loan.chair_approved_at = timezone.now()

                # Route to next stage
                if group.treasurer_id:
                    loan.status = 'pending_treasurer'
                else:
                    loan.status = 'approved'

            elif loan.status == 'pending_treasurer':
                if membership.role != 'treasurer':
                    raise PermissionError("Only the treasurer can approve at this stage.")
                loan.treasurer_approved_by = authorizing_member
                loan.treasurer_approved_at = timezone.now()
                # Platform admin check: currently optional; set to 'approved' directly.
                # To enable 3-party approval, set loan.status = 'pending_admin' here.
                loan.status = 'approved'

            elif loan.status == 'pending_admin':
                # Fix #6: the missing admin approval stage.
                from common.permissions import IsPlatformAdmin
                if authorizing_member.role not in ('platform_admin', 'super_admin'):
                    raise PermissionError("Only a Platform Admin can approve at this stage.")
                loan.admin_approved_by = authorizing_member
                loan.admin_approved_at = timezone.now()
                loan.status = 'approved'

            loan.save()

            # ── 4. On Full Approval: Ledger + Repayment Schedule ────────────
            if loan.status == 'approved':
                LedgerEntry.objects.create(
                    group=group,
                    member=loan.borrower,
                    entry_type='loan_disbursement',
                    direction='debit',  # Capital logically leaves the loan pool
                    amount=loan.amount,
                    currency=group.currency,
                    description=(
                        f"Loan #{loan.id} approved and disbursed. "
                        f"Authorised by {authorizing_member.full_name}."
                    ),
                    reference=str(uuid.uuid4()),
                    related_loan=loan,
                )

                from apps.loans.services.repayment_service import LoanRepaymentService
                LoanRepaymentService.generate_repayments(loan)

                logger.info(
                    "loan_approved",
                    loan_id=loan.id,
                    authoriser_id=authorizing_member.id,
                    stage_completed=loan.status,
                )

        return loan
