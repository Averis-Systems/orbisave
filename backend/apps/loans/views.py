from rest_framework import views, status
from rest_framework.response import Response
from common.permissions import IsGroupChairperson, IsGroupLeader, IsGroupMember
from apps.loans.models import Loan
from apps.groups.models import Group
from apps.loans.services import LoanEngine
from common.exceptions import success_response
from apps.audit.services import log_audit
import structlog

logger = structlog.get_logger(__name__)

class LoanApprovalView(views.APIView):
    """
    Exposes immutable Argon2id Pin based Loan verifications structurally to authorized leadership arrays.
    """
    permission_classes = [IsGroupLeader]

    def post(self, request, loan_pk):
        provided_pin = request.data.get('pin')
        
        if not provided_pin:
             return Response({"error": "Argon2id verification specifically requires a physical PIN."}, status=status.HTTP_400_BAD_REQUEST)

        try:
             # N+1 isolation through strict select mapping
             loan = Loan.objects.select_related('group', 'borrower').get(id=loan_pk)
        except Loan.DoesNotExist:
             return Response({"error": "Loan logically invalid or actively corrupt."}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Shift execution into ultra-hardened Engine validation stack
            finalized_loan = LoanEngine.approve_loan(loan, request.user, provided_pin)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error("loan_engine_uncaught_collapse", error=str(e), loan_id=loan.id)
            return Response({"error": "System state critically fractured globally."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        log_audit(
            action='loan_chair_approved',
            actor=request.user,
            target_user=loan.borrower,
            target_group=loan.group,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return success_response(data={"loan_id": finalized_loan.id, "status": finalized_loan.status}, message="Loan radically approved. Ledger permanently mutated.", status_code=201)
