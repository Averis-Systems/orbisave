from datetime import timedelta
from decimal import Decimal
import structlog
from django.db import transaction
from django.utils import timezone

from apps.payouts.models import Payout
from apps.ledger.models import SystemConfiguration
from apps.ledger.services import append_ledger_entry
from apps.groups.models import GroupMember, RotationCycle, RotationSchedule
from apps.contributions.models import Contribution
from apps.payments.selector import get_payment_provider
from apps.groups.serializers import WalletCalculations
from common.db_utils import get_db_for_group

logger = structlog.get_logger(__name__)

# Country → default payment method mapping.
# Replaces the previous hardcoded 'mpesa' for all countries.
COUNTRY_DEFAULT_METHOD = {
    'kenya':  'mpesa',
    'rwanda': 'mtn_momo',
    'ghana':  'mtn_momo',
}


class PayoutService:
    @staticmethod
    def evaluate_rotation_payout_readiness(group, cycle=None, as_of=None):
        """
        Calculate whether the current scheduled rotation payout can proceed.

        This is the decision point used by future Celery automation: if every
        active member has confirmed a contribution, payout can proceed
        immediately; otherwise the group receives a one-day grace window.
        """
        db_alias = get_db_for_group(group)
        as_of = as_of or timezone.now()
        as_of_date = timezone.localtime(as_of).date() if timezone.is_aware(as_of) else as_of.date()

        if cycle is None:
            cycle = (
                RotationCycle.objects.using(db_alias)
                .filter(group=group, is_current=True, status='open')
                .order_by('cycle_number')
                .first()
            )

        if cycle is None:
            return {
                "status": "scheduled",
                "should_disburse": False,
                "reason": "No open rotation cycle.",
                "recipient_id": None,
                "missing_member_ids": [],
                "grace_deadline": None,
            }

        schedule = (
            RotationSchedule.objects.using(db_alias)
            .filter(
                group=group,
                cycle_number=cycle.cycle_number,
                is_paid_out=False,
                scheduled_payout_date__lte=as_of_date,
            )
            .order_by('scheduled_payout_date', 'cycle_number')
            .first()
        )

        if schedule is None:
            return {
                "status": "scheduled",
                "should_disburse": False,
                "reason": "No due unpaid rotation schedule.",
                "recipient_id": None,
                "missing_member_ids": [],
                "grace_deadline": None,
            }

        active_member_ids = list(
            GroupMember.objects.using(db_alias)
            .filter(group=group, status='active')
            .order_by('rotation_position')
            .values_list('member_id', flat=True)
        )
        confirmed_member_ids = set(
            Contribution.objects.using(db_alias)
            .filter(group=group, cycle=cycle, status='confirmed')
            .values_list('member_id', flat=True)
        )
        missing_member_ids = [
            str(member_id)
            for member_id in active_member_ids
            if member_id not in confirmed_member_ids
        ]

        if not missing_member_ids:
            return {
                "status": "ready_for_disbursement",
                "should_disburse": True,
                "reason": "All active members have confirmed contributions.",
                "recipient_id": str(schedule.member_id),
                "missing_member_ids": [],
                "grace_deadline": None,
            }

        grace_deadline = schedule.scheduled_payout_date + timedelta(days=1)
        if as_of_date <= grace_deadline:
            return {
                "status": "grace_period",
                "should_disburse": False,
                "reason": "Waiting for missing contributions within the one-day grace period.",
                "recipient_id": str(schedule.member_id),
                "missing_member_ids": missing_member_ids,
                "grace_deadline": grace_deadline,
            }

        return {
            "status": "awaiting_contributions",
            "should_disburse": False,
            "reason": "Grace period expired with missing contributions.",
            "recipient_id": str(schedule.member_id),
            "missing_member_ids": missing_member_ids,
            "grace_deadline": grace_deadline,
        }

    @staticmethod
    def process_due_rotation_payout(group, cycle=None, as_of=None):
        """
        Execute the next due payout only when the readiness gate is green.

        This is safe for scheduled workers to call repeatedly: the readiness
        check blocks grace-period payouts, and execute_rotation_payout still
        enforces payout idempotency for the cycle/recipient.
        """
        db_alias = get_db_for_group(group)
        if cycle is None:
            cycle = (
                RotationCycle.objects.using(db_alias)
                .filter(group=group, is_current=True, status='open')
                .order_by('cycle_number')
                .first()
            )

        readiness = PayoutService.evaluate_rotation_payout_readiness(group, cycle=cycle, as_of=as_of)
        if not readiness["should_disburse"]:
            return {"readiness": readiness, "payout": None}

        from apps.accounts.models import User
        target_member = User.objects.get(id=readiness["recipient_id"])
        payout = PayoutService.execute_rotation_payout(group, target_member, cycle=cycle)

        if getattr(payout, "status", None) in {"completed", "paid"}:
            RotationSchedule.objects.using(db_alias).filter(
                group=group,
                cycle_number=cycle.cycle_number,
                member_id=target_member.id,
                is_paid_out=False,
            ).update(is_paid_out=True)

        return {"readiness": readiness, "payout": payout}

    @staticmethod
    def execute_rotation_payout(group, target_member, cycle=None):
        """
        Executes an atomic payout applying versioned dynamic system fees.
        Satisfies Financial Engine Checklist Items 5 (Payout Engine) & 6 (System Fees).

        Fixes applied:
          - Provider method now determined by group.country, not hardcoded 'mpesa'.
          - Uses get_db_for_group() to safely route to the correct country DB.
          - Payout is linked to the current RotationCycle for full traceability.
          - failure_reason is stored on provider failure.
        """
        if group.status != 'active':
            raise ValueError("Group is inactive — no payouts authorised.")

        wallet = WalletCalculations.get_cached_group_wallet(group)
        available_rotation_funds = Decimal(str(wallet['rotation_pool']))

        if available_rotation_funds <= Decimal('0.00'):
            raise ValueError("No capital available in the rotation pool.")

        # Dynamically fetch fee — never hardcoded.
        fee_pct = SystemConfiguration.get_withdrawal_fee_pct()
        raw_fee_value = (available_rotation_funds * fee_pct) / Decimal('100.0')
        net_disbursement = available_rotation_funds - raw_fee_value

        # Route provider by country — not hardcoded to mpesa.
        payment_method = COUNTRY_DEFAULT_METHOD.get(group.country, 'mpesa')
        # Use member's preferred mobile money number, fall back to main phone.
        payout_phone = target_member.mobile_money_number or target_member.phone

        db_alias = get_db_for_group(group)
        membership = GroupMember.objects.using(db_alias).get(group=group, member=target_member)

        with transaction.atomic(using=db_alias):
            # ── Idempotency Guard ────────────────────────────────────────────
            # Prevent double-payout from a double-click or a retry storm.
            # If a payout already exists for this cycle+recipient in a
            # non-failed state, return it — do not create a duplicate.
            if cycle:
                existing = Payout.objects.using(db_alias).filter(
                    group=group,
                    recipient=target_member,
                    cycle=cycle,
                    status__in=['processing', 'completed'],
                ).first()
                if existing:
                    logger.info(
                        "payout_duplicate_blocked",
                        group_id=group.id,
                        recipient_id=target_member.id,
                        payout_id=existing.id,
                    )
                    return existing

            payout = Payout.objects.using(db_alias).create(
                group=group,
                recipient=target_member,
                cycle=cycle,
                rotation_position=membership.rotation_position or 1,
                cycle_number=cycle.cycle_number if cycle else 0,
                gross_amount=available_rotation_funds,
                service_fee=raw_fee_value,
                net_amount=net_disbursement,
                currency=group.currency,
                method=payment_method,
                mobile_number=payout_phone,
                scheduled_date=timezone.now().date(),
                status='processing',
            )

            provider = get_payment_provider(group.country, payment_method)
            res = provider.initiate_disbursement(
                phone=payout_phone,
                amount=net_disbursement,
                reference=f"PAY-{payout.id}",
                remarks=f"Rotation payout — {group.name}",
            )

            payout.provider_reference = res.get('provider_reference')

            if res.get('status') == 'success':
                payout.status = 'completed'
                payout.processed_at = timezone.now()
                payout.save(using=db_alias)

                append_ledger_entry(
                    group=group,
                    member=target_member,
                    account_stream='rotation',
                    entry_type='payout',
                    direction='debit',
                    amount=payout.gross_amount,
                    currency=group.currency,
                    description=f"Rotation payout to {target_member.full_name}.",
                    reference=f"PAY-LEDGER-{payout.id}",
                    related_payout=payout,
                    idempotency_key=f"payout:{payout.id}:rotation",
                    source_system='orbisave_payout',
                )
                logger.info("payout_completed", group_id=group.id, net=str(net_disbursement))
            else:
                payout.status = 'failed'
                payout.failure_reason = res.get('error', 'Provider returned failure status.')
                payout.save(using=db_alias)
                logger.warning("payout_provider_failed", group_id=group.id, res=res)

        return payout
