import structlog
from rest_framework import views, status
from rest_framework.response import Response
from common.permissions import IsGroupLeader
from apps.groups.models import GroupMember, Group
from apps.payouts.services import PayoutService

logger = structlog.get_logger(__name__)

class PayoutExecutionView(views.APIView):
    """
    Exposes the payout engine tightly bound strictly to Group leadership authorization roles.
    Satisfies Financial Engine Checklist Item 5: Payout Engine (Atomic, Configurable Fee, Defined Eligibility).
    """
    permission_classes = [IsGroupLeader]

    def post(self, request, group_pk):
        target_member_id = request.data.get('target_member_id')
        
        if not target_member_id:
             return Response({"error": "Must strictly provide target_member_id."}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
            group = Group.objects.get(id=group_pk)
        except Group.DoesNotExist:
            return Response({"error": "Group structurally invalid or strictly non-existent."}, status=status.HTTP_404_NOT_FOUND)
        
        try:
             target_membership = GroupMember.objects.select_related('member').get(
                 group=group, 
                 member_id=target_member_id, 
                 status='active'
             )
        except GroupMember.DoesNotExist:
             return Response({"error": "Target recipient structurally invalid or universally inactive."}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Mechanically trigger the strict transaction engine explicitly executing state allocations
            payout = PayoutService.execute_rotation_payout(group, target_membership.member)
            
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
