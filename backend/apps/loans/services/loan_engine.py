import uuid
import structlog
from django.db import transaction
from django.utils import timezone

from apps.groups.models import GroupMember
from apps.ledger.services import append_ledger_entry, close_ledger_event_group
from apps.payments.selector import COUNTRY_DEFAULT_METHOD, get_payment_provider

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

        Money leaves through the country's configured payment rail (B2C to the
        borrower's mobile money), then a balanced ledger event group records:
            debit  loaning              (principal leaves the loan pool)
            credit provider_settlement  (cash owed out through the provider)
        — the same stream convention as rotation payouts, so daily bank
        reconciliation sees every outbound movement on provider_settlement.
        The loaning debit is overdraft-protected: a loan can never draw the
        pool below zero.

        Passing an explicit disbursement_reference records a MANUAL (offline)
        disbursement — e.g. a bank transfer executed outside the rails by an
        admin — and skips the provider call. Ledger entries are identical;
        reconciliation matches the manual reference against the statement.

        On provider failure nothing is written and the loan stays 'approved',
        so the action can be safely retried.
        """
        if loan.status == 'disbursed':
            return loan
        if loan.status != 'approved':
            raise ValueError(f"Loan is in '{loan.status}' - only approved loans can be disbursed.")

        group = loan.group
        borrower = loan.borrower
        from common.db_utils import get_db_for_group
        db_alias = loan._state.db or get_db_for_group(group)

        is_manual = bool(disbursement_reference)
        provider_reference = disbursement_reference

        with transaction.atomic(using=db_alias):
            if not is_manual:
                payment_method = COUNTRY_DEFAULT_METHOD.get(group.country, 'mpesa')
                payout_phone = borrower.mobile_money_number or borrower.phone
                provider = get_payment_provider(group.country, payment_method)
                res = provider.initiate_disbursement(
                    phone=payout_phone,
                    amount=loan.amount,
                    reference=f"LOAN-{loan.id}",
                    remarks=f"Loan disbursement — {group.name}",
                )
                if res.get('status') != 'success':
                    logger.warning(
                        "loan_disbursement_provider_failed",
                        loan_id=loan.id,
                        group_id=group.id,
                        response=res,
                    )
                    raise ValueError(
                        f"Provider failed to disburse loan: {res.get('error', 'provider returned failure status')}"
                    )
                provider_reference = res.get('provider_reference') or f"DISB-{uuid.uuid4()}"

            loan.status = 'disbursed'
            loan.disbursed_at = timezone.now()
            loan.disbursement_reference = provider_reference
            loan.save(using=db_alias, update_fields=['status', 'disbursed_at', 'disbursement_reference'])

            event_group_key = f"loan_disbursement:{loan.id}"
            append_ledger_entry(
                group=group,
                member=borrower,
                account_stream='loaning',
                entry_type='loan_disbursement',
                direction='debit',
                amount=loan.amount,
                currency=group.currency,
                description=f"Loan #{loan.id} principal disbursed to {borrower.full_name}. Authorised by {actor.full_name}.",
                reference=f"LOAN-LEDGER-{loan.id}",
                related_loan=loan,
                recorded_by=actor,
                idempotency_key=f"loan_disbursement:{loan.id}:loaning",
                source_system='orbisave_loans',
                event_group_key=event_group_key,
                event_type='loan_disbursement',
            )
            append_ledger_entry(
                group=group,
                member=borrower,
                account_stream='provider_settlement',
                entry_type='loan_disbursement',
                direction='credit',
                amount=loan.amount,
                currency=group.currency,
                description=(
                    f"{'Manual settlement' if is_manual else 'Provider settlement'} payable for "
                    f"loan #{loan.id} to {borrower.full_name}."
                ),
                reference=f"LOAN-PROVIDER-LEDGER-{loan.id}",
                related_loan=loan,
                recorded_by=actor,
                idempotency_key=f"loan_disbursement:{loan.id}:provider_settlement",
                source_system='orbisave_loans',
                event_group_key=event_group_key,
                event_type='loan_disbursement',
            )
            close_ledger_event_group(event_group_key, db_alias=db_alias)

            from apps.loans.services.repayment_service import LoanRepaymentService
            LoanRepaymentService.generate_repayments(loan)

        logger.info(
            "loan_disbursed",
            loan_id=loan.id,
            actor_id=actor.id,
            reference=loan.disbursement_reference,
            manual=is_manual,
        )
        return loan
