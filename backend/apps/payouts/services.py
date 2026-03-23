import uuid
from decimal import Decimal
import structlog
from django.db import transaction

from apps.payouts.models import Payout
from apps.ledger.models import LedgerEntry, SystemConfiguration
from apps.groups.models import GroupMember
from apps.payments.selector import get_payment_provider
from apps.groups.serializers import WalletCalculations

logger = structlog.get_logger(__name__)

class PayoutService:
    @staticmethod
    def execute_rotation_payout(group, target_member):
        """
        Executes an atomic payout applying versioned dynamic system fees safely.
        Satisfies Financial Engine Checklist Item 5 & 6.
        """
        if group.status != 'active':
            raise ValueError("Group strongly inactive. No payouts authorized.")

        wallet = WalletCalculations.get_cached_group_wallet(group)
        available_rotation_funds = Decimal(str(wallet['rotation_pool']))

        if available_rotation_funds <= Decimal('0.00'):
            raise ValueError("No structurally meaningful capital in the rotation pool.")

        # Dynamically calculate fees ensuring zero hard-coding parameters!
        fee_pct = SystemConfiguration.get_withdrawal_fee_pct()
        raw_fee_value = (available_rotation_funds * fee_pct) / Decimal('100.0')
        net_disbursement = available_rotation_funds - raw_fee_value

        from django.utils import timezone
        membership = GroupMember.objects.get(group=group, member=target_member)
        with transaction.atomic(using=group.country): # Scope strictly inside multi-tenant db
            
            payout = Payout.objects.create(
                group=group,
                recipient=target_member,
                rotation_position=membership.rotation_position or 1,
                cycle_number=1,
                gross_amount=available_rotation_funds, # The gross pool drained
                service_fee=raw_fee_value,        # The historical stamp captured
                net_amount=net_disbursement,
                currency=group.currency,
                method='mobile_money',
                mobile_number=target_member.phone,
                scheduled_date=timezone.now().date(),
                status='processing'
            )

            # Transmit to specific physical bank network abstraction seamlessly 
            provider = get_payment_provider(group.country, 'mpesa') 
            res = provider.initiate_disbursement(
                phone=target_member.phone, 
                amount=net_disbursement,
                reference=f"PAY-{payout.id}",
                remarks=f"Group Rotation Payout ({group.name})"
            )
            
            payout.provider_reference = res.get('provider_reference')
            
            if res.get('status') == 'success':
                 # Mock provider auto-completes. Otherwise, webhook handles this exact logic.
                 payout.status = 'completed'
                 payout.save()
                 
                 # Immutable structural data logging eliminating silent state changes!
                 LedgerEntry.objects.create(
                     group=group,
                     member=target_member,
                     entry_type='payout',
                     direction='debit',  # Money leaves group aggregate logic
                     amount=payout.gross_amount, # Debit the full amount logically (the fee + net)
                     currency=group.currency,
                     description=f"Automated group rotation payout.",
                     reference=str(uuid.uuid4()),
                     related_payout=payout
                 )
                 logger.info("payout_service_successfully_executed", group_id=group.id, net=str(net_disbursement))

                 # Important: In multi-account ledgers, we optionally track the 'service_fee' as a credit 
                 # to an internal Platform Master wallet right here!
                 
            else:
                 payout.save()
                 
        return payout
