import uuid
from decimal import Decimal
import structlog
from django.db import transaction
from django.utils import timezone

from apps.payouts.models import Payout
from apps.ledger.models import LedgerEntry, SystemConfiguration
from apps.groups.models import GroupMember
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

        membership = GroupMember.objects.get(group=group, member=target_member)
        db_alias = get_db_for_group(group)

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

            payout = Payout.objects.create(
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
                payout.save()

                LedgerEntry.objects.create(
                    group=group,
                    member=target_member,
                    entry_type='payout',
                    direction='debit',
                    amount=payout.gross_amount,
                    currency=group.currency,
                    description=f"Rotation payout to {target_member.full_name}.",
                    reference=str(uuid.uuid4()),
                    related_payout=payout,
                )
                logger.info("payout_completed", group_id=group.id, net=str(net_disbursement))
            else:
                payout.status = 'failed'
                payout.failure_reason = res.get('error', 'Provider returned failure status.')
                payout.save()
                logger.warning("payout_provider_failed", group_id=group.id, res=res)

        return payout
