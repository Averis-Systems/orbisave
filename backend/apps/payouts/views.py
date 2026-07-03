import structlog
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework import views, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.models import User
from apps.groups.models import GroupMember, Group, RotationCycle, RotationSchedule
from apps.payouts.services import PayoutService

logger = structlog.get_logger(__name__)


def _verify_transaction_pin(user, provided_pin):
    if not provided_pin:
        raise ValueError("Transaction PIN is required to authorise this payout.")
    if not str(provided_pin).isdigit() or not 4 <= len(str(provided_pin)) <= 6:
        raise ValueError("PIN must contain 4 to 6 digits.")
    if not user.transaction_pin:
        raise PermissionError("Transaction PIN has not been set by this user.")
    if user.is_transaction_pin_locked:
        raise PermissionError("Transaction PIN is locked. Please request a PIN reset.")
    if not check_password(str(provided_pin), user.transaction_pin):
        user.transaction_pin_failed_attempts += 1
        update_fields = ['transaction_pin_failed_attempts']
        if user.transaction_pin_failed_attempts >= 3:
            user.transaction_pin_locked_at = timezone.now()
            update_fields.append('transaction_pin_locked_at')
        user.save(update_fields=update_fields)
        logger.warning("payout_execution_invalid_pin", user_id=user.id)
        raise PermissionError("Transaction PIN verification failed.")
    if user.transaction_pin_failed_attempts:
        user.transaction_pin_failed_attempts = 0
        user.save(update_fields=['transaction_pin_failed_attempts'])


class PayoutExecutionView(views.APIView):
    """
    Exposes the payout engine tightly bound strictly to Group leadership authorization roles.
    Satisfies Financial Engine Checklist Item 5: Payout Engine (Atomic, Configurable Fee, Defined Eligibility).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, group_pk):
        db_alias = request.user.country if getattr(request.user, 'country', None) in ['kenya', 'rwanda', 'ghana'] else 'default'

        try:
            group = Group.objects.using(db_alias).get(id=group_pk)
        except Group.DoesNotExist:
            return Response({"error": "Group structurally invalid or strictly non-existent."}, status=status.HTTP_404_NOT_FOUND)

        is_leader = (
            group.verification_status == 'verified'
            and GroupMember.objects.using(db_alias).filter(
                group=group,
                member=request.user,
                role__in=['chairperson', 'treasurer'],
                status='active',
            ).exists()
        )
        if not is_leader:
            return Response({"error": "Only active verified group leaders can execute payouts."}, status=status.HTTP_403_FORBIDDEN)

        try:
            _verify_transaction_pin(request.user, request.data.get('pin'))
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)

        cycle = RotationCycle.objects.using(db_alias).filter(
            group=group,
            is_current=True,
            status='open',
        ).order_by('cycle_number').first()
        if not cycle:
            return Response({"error": "No open current rotation cycle is available for payout."}, status=status.HTTP_400_BAD_REQUEST)

        schedule = RotationSchedule.objects.using(db_alias).filter(
            group=group,
            cycle_number=cycle.cycle_number,
            is_paid_out=False,
        ).order_by('scheduled_payout_date', 'cycle_number', 'created_at').first()
        if not schedule:
            return Response({"error": "No unpaid rotation recipient is scheduled for this cycle."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_member = User.objects.get(id=schedule.member_id)
        except User.DoesNotExist:
            return Response({"error": "Scheduled payout recipient no longer exists."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Mechanically trigger the strict transaction engine explicitly executing state allocations
            payout = PayoutService.execute_rotation_payout(group, target_member, cycle=cycle)
            
        except ValueError as e:
            logger.warning("payout_engine_rigid_rejection", reason=str(e), group_id=group.id)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error("payout_engine_catastrophic_failure", error=str(e), group_id=group.id)
            return Response({"error": "Internal ledger execution routing failed globally."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({
            "message": "Payout logically dispatched.",
            "payout_id": payout.id,
            "net_amount": payout.net_amount,
            "status": payout.status
        }, status=status.HTTP_201_CREATED)
