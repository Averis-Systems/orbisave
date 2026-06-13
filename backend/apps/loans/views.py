from rest_framework import viewsets, mixins, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from common.permissions import IsGroupChairperson, IsGroupLeader, IsGroupMember
from apps.loans.models import Loan
from apps.groups.models import Group
from apps.loans.services import LoanEngine
from apps.loans.serializers import LoanListSerializer, LoanDetailSerializer, LoanRequestSerializer
from common.exceptions import success_response
from apps.audit.services import log_audit
import structlog

logger = structlog.get_logger(__name__)

class LoanViewSet(mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    """
    Controller for member loans.
    Provides visibility into loan status and history.
    """
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LoanDetailSerializer
        if self.action == 'create':
            return LoanRequestSerializer
        return LoanListSerializer

    def perform_create(self, serializer):
        # Additional validation could be done here (e.g. check eligibility)
        serializer.save(borrower=self.request.user)

    def get_permissions(self):
        if self.action in ['approve', 'reject']:
            return [IsGroupLeader()]
        return [IsGroupMember()]

    def get_queryset(self):
        user = self.request.user
        # Users see their own loans, or group leaders see all loans in their groups
        return Loan.objects.filter(
            group__memberships__member=user,
            group__memberships__status='active'
        ).select_related('borrower', 'group').order_by('-created_at')

    @action(detail=True, methods=['post'], permission_classes=[IsGroupLeader])
    def approve(self, request, pk=None):
        loan = self.get_object()
        provided_pin = request.data.get('pin')
        
        if not provided_pin:
             return Response({"error": "PIN is required to authorise approval."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            finalized_loan = LoanEngine.approve_loan(loan, request.user, provided_pin)
            log_audit(
                action='loan_approved',
                actor=request.user,
                target_user=loan.borrower,
                target_group=loan.group,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return success_response(data=LoanDetailSerializer(finalized_loan).data, message="Loan approved successfully.")
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsGroupLeader])
    def reject(self, request, pk=None):
        loan = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        
        try:
            loan.status = 'rejected'
            loan.save()
            log_audit(
                action='loan_rejected',
                actor=request.user,
                target_user=loan.borrower,
                target_group=loan.group,
                metadata={'reason': reason},
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return success_response(message="Loan rejected successfully.")
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LoanApprovalView(views.APIView):
    """
    Legacy endpoint for PIN-based Loan verifications.
    """
    permission_classes = [IsGroupLeader]

    def post(self, request, loan_pk):
        # Redirects to the ViewSet logic for consistency
        viewset = LoanViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': loan_pk}
        return viewset.approve(request, pk=loan_pk)
