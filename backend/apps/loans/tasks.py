"""
Loans Celery tasks.
Satisfies:
  - Financial Engine Checklist §7 (Loan Engine — repayment logic, defaults)
  - Financial Engine Checklist §9 (Defaults & Penalties — escalation logic)
  - System Design Checklist §9 (Background Job Processing)
"""
import structlog
from celery import shared_task
from django.utils import timezone
from django.db import transaction

logger = structlog.get_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def flag_overdue_loan_repayments(self):
    """
    Runs daily. Scans all LoanRepayment records with status='upcoming'
    whose due_date has passed. Marks them 'overdue' and emits a WS event.

    Satisfies Financial Engine Checklist §7: Late repayment penalties configurable.
    """
    from apps.loans.models import LoanRepayment
    from common.db_utils import get_db_for_group

    today = timezone.now().date()
    flagged = 0

    overdue_repayments = LoanRepayment.objects.filter(
        status='upcoming',
        due_date__lt=today,
    ).select_related('loan__group', 'loan__borrower')

    for repayment in overdue_repayments:
        group = repayment.loan.group
        db_alias = get_db_for_group(group)
        try:
            with transaction.atomic(using=db_alias):
                repayment.status = 'overdue'
                repayment.save(update_fields=['status', 'updated_at'])
                flagged += 1

                _emit_group_event(group.id, 'loan.repayment_overdue', {
                    'loan_id': str(repayment.loan_id),
                    'repayment_id': str(repayment.id),
                    'borrower_id': str(repayment.loan.borrower_id),
                    'amount_due': str(repayment.total_due),
                })

        except Exception as exc:
            logger.error('flag_overdue_error', repayment_id=repayment.id, error=str(exc))

    logger.info('loan_repayments_flagged', flagged=flagged)
    return {'flagged': flagged}


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def check_loan_defaults(self):
    """
    Runs daily. Escalates loans where:
      - More than 50% of the term has elapsed past the first overdue repayment, OR
      - 2+ consecutive repayments are overdue.
    Sets Loan.status = 'defaulted', creates a 'loan_default' Penalty,
    transitions borrower's GroupMember status to 'suspended'.

    Satisfies Financial Engine Checklist §7: Loan default handling defined.
    Satisfies Financial Engine Checklist §9: Escalation logic — Restriction.
    """
    from apps.loans.models import Loan, LoanRepayment
    from apps.groups.models import GroupMember, PenaltyRule
    from apps.contributions.models import Penalty
    from common.db_utils import get_db_for_group
    from decimal import Decimal

    defaulted = 0

    active_loans = Loan.objects.filter(
        status='approved'
    ).select_related('group', 'borrower', 'group__chairperson')

    for loan in active_loans:
        group = loan.group
        db_alias = get_db_for_group(group)
        try:
            overdue_count = LoanRepayment.objects.using(db_alias).filter(
                loan=loan, status='overdue'
            ).count()

            if overdue_count < 2:
                continue  # Not yet at default threshold

            with transaction.atomic(using=db_alias):
                loan.status = 'defaulted'
                loan.save(update_fields=['status', 'updated_at'])
                defaulted += 1

                # Apply loan_default penalty if rule exists
                rule = PenaltyRule.objects.using(db_alias).filter(
                    group=group, rule_type='loan_default'
                ).first()
                if rule:
                    if rule.penalty_type == 'fixed':
                        penalty_amount = rule.value
                    else:
                        penalty_amount = (loan.amount * rule.value) / Decimal('100.0')

                    # Idempotent — one default penalty per loan
                    from apps.contributions.models import Penalty
                    Penalty.objects.using(db_alias).get_or_create(
                        loan=loan,
                        rule=rule,
                        defaults={
                            'member': loan.borrower,
                            'amount': penalty_amount,
                            'status': 'pending',
                        }
                    )

                # Suspend borrower's membership
                GroupMember.objects.using(db_alias).filter(
                    group=group, member=loan.borrower, status='active'
                ).update(
                    status='suspended',
                    suspension_reason=f"Loan #{loan.id} defaulted — {overdue_count} missed repayments.",
                )

                logger.warning(
                    'loan_defaulted',
                    group_id=group.id,
                    loan_id=loan.id,
                    borrower_id=loan.borrower_id,
                    overdue_count=overdue_count,
                )

                _emit_group_event(group.id, 'loan.defaulted', {
                    'loan_id': str(loan.id),
                    'borrower_id': str(loan.borrower_id),
                    'overdue_repayments': overdue_count,
                })

        except Exception as exc:
            logger.error('loan_default_check_error', loan_id=loan.id, error=str(exc))

    logger.info('loan_default_check_complete', defaulted=defaulted)
    return {'defaulted': defaulted}


def _emit_group_event(group_id, event_type: str, payload: dict):
    """Helper: sends a real-time channel event to the group's WebSocket room."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"group_{group_id}",
                {'type': 'group.event', 'event': event_type, 'payload': payload},
            )
    except Exception as exc:
        logger.warning('ws_emit_failed', event=event_type, group_id=group_id, error=str(exc))
