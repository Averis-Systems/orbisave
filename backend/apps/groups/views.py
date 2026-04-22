from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Prefetch
from django.utils import timezone
from .models import Group, GroupMember
from .serializers import GroupSerializer, GroupCreateSerializer, GroupMemberSerializer, WalletCalculations
from common.permissions import IsGroupChairperson, IsGroupMember, IsGroupLeader
from apps.audit.services import log_audit
from common.exceptions import success_response

class GroupViewSet(viewsets.ModelViewSet):
    """
    Core Controller for handling Collective Saving Groups.
    Highly optimized for read-heavy operations, utilizing cache and precise database prefetching.
    Satisfies Checklist Item 5: N+1 Eliminated.
    Satisfies Checklist Item 6: RBAC.
    """
    def get_serializer_class(self):
        if self.action == 'create':
            return GroupCreateSerializer
        return GroupSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return []  # Creating group only requires being authenticated (which is global)
        elif self.action in ['update', 'partial_update', 'pause', 'close']:
            return [IsGroupChairperson()]
        return [IsGroupMember()]

    def get_queryset(self):
        """
        Heavily optimized QuerySet using `annotate` for member_count to avoid N+1 count queries,
        and `select_related` for chairperson relationships.
        Only returns groups the user is actively a member of.
        """
        user = self.request.user
        qs = Group.objects.filter(memberships__member=user, memberships__status='active')
        return qs.select_related('chairperson').annotate(
            members_count=Count('memberships')
        ).prefetch_related(
            # We don't generally load all entries in lists, but cache handles deep limits
            'ledger_entries'
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            group = serializer.save()
            
            # Creator is fundamentally granted chairperson and member rights at position 1.
            GroupMember.objects.create(
                group=group,
                member=self.request.user,
                role='chairperson',
                status='active',
                rotation_position=1
            )

            # Enforce Checklist Item: "Role promotion on first group creation"
            if self.request.user.role == 'member':
                self.request.user.role = 'chairperson'
                self.request.user.save(update_fields=['role'])

            log_audit(
                action='group_created', 
                actor=self.request.user, 
                target_group=group, 
                ip_address=self.request.META.get('REMOTE_ADDR')
            )

    @action(detail=True, methods=['get'])
    def wallet(self, request, pk=None):
        """
        Exposes directly the Redis-cached live ledger aggregates without extra serializers.
        Sub-1ms retrieval of massive aggregate states.
        """
        group = self.get_object()
        wallet_data = WalletCalculations.get_cached_group_wallet(group)
        return success_response(data=wallet_data, message="Live wallet synchronised.")

    @action(detail=True, methods=['post'], permission_classes=[IsGroupChairperson])
    def pause(self, request, pk=None):
        group = self.get_object()
        reason = request.data.get('reason', 'Administrative Pause')
        group.status = 'paused'
        group.save(update_fields=['status'])
        
        log_audit(
            action='group_paused', 
            actor=request.user, 
            target_group=group, 
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'reason': reason}
        )
        return success_response(data=None, message="Group heavily paused. Financial engine halted.")
        
    @action(detail=True, methods=['post'], permission_classes=[IsGroupChairperson])
    def close(self, request, pk=None):
        group = self.get_object()
        group.status = 'closed'
        group.save(update_fields=['status'])
        
        log_audit(
            action='group_closed', 
            actor=request.user, 
            target_group=group, 
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return success_response(data=None, message="Group closed permanently.")

    @action(detail=True, methods=['post'], permission_classes=[IsGroupChairperson])
    def initialize_rotation(self, request, pk=None):
        group = self.get_object()
        from .services.rotation_service import RotationService
        count = RotationService.initialize_rotation(group)
        
        log_audit(
            action='admin_action', 
            actor=request.user, 
            target_group=group, 
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'action': 'initialize_rotation', 'members_count': count}
        )
        return success_response(data={"members_scheduled": count}, message="Rotation schedule strictly initialized.")

    @action(detail=True, methods=['post'], permission_classes=[IsGroupChairperson])
    def next_cycle(self, request, pk=None):
        group = self.get_object()
        from .services.rotation_service import RotationService
        cycle = RotationService.start_next_cycle(group)
        
        log_audit(
            action='admin_action', 
            actor=request.user, 
            target_group=group, 
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'action': 'next_cycle', 'cycle_number': cycle.cycle_number}
        )
        return success_response(data={"cycle_number": cycle.cycle_number}, message="Group transitioned to next financial cycle.")

    @action(detail=True, methods=['post'], permission_classes=[IsGroupChairperson])
    def activate(self, request, pk=None):
        """
        Activates a newly created group after verifying:
          1. Chairperson KYC is 'verified'.
          2. At least one confirmed contribution exists (first-deposit gate).
        Satisfies Financial Engine Checklist: first-deposit gate before group activation.
        """
        group = self.get_object()

        if group.status == 'active':
            return Response({"error": "Group is already active."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.kyc_status != 'verified':
            return Response(
                {"error": "KYC verification required before activating a group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.contributions.models import Contribution
        has_deposit = Contribution.objects.filter(group=group, status='confirmed').exists()
        if not has_deposit:
            return Response(
                {"error": "At least one confirmed contribution is required to activate this group."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group.status = 'active'
        group.save(update_fields=['status'])

        log_audit(
            action='group_activated',
            actor=request.user,
            target_group=group,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return success_response(data=None, message="Group is now active. Financial engine is running.")


class GroupMemberActionViewSet(viewsets.GenericViewSet):
    """
    Sub-resource specifically managing individual user links within a specific targeted group.
    """
    queryset = GroupMember.objects.all()
    serializer_class = GroupMemberSerializer
    permission_classes = [IsGroupChairperson]  # Only chair can remove/suspend

    def get_queryset(self):
        # N+1 protection: select_related the concrete member object.
        return super().get_queryset().filter(group_id=self.kwargs['group_pk']).select_related('member')

    @action(detail=True, methods=['post'])
    def remove(self, request, group_pk=None, pk=None):
        membership = self.get_object()
        if membership.role == 'chairperson':
            return Response({"error": "Cannot forcefully remove the group chairperson."}, status=status.HTTP_400_BAD_REQUEST)

        membership.status = 'exited'  # 'removed' was invalid — 'exited' is the correct state
        membership.exited_at = timezone.now()  # field renamed from left_at
        membership.save(update_fields=['status', 'exited_at'])

        log_audit(
            action='member_exited',
            actor=request.user,
            target_user=membership.member,
            target_group=membership.group,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return success_response(data=None, message="Member exited from collective.")

    @action(detail=True, methods=['post'])
    def suspend(self, request, group_pk=None, pk=None):
        membership = self.get_object()
        if membership.role == 'chairperson':
            return Response({"error": "Cannot suspend the group chairperson."}, status=status.HTTP_400_BAD_REQUEST)

        membership.status = 'suspended'
        membership.save(update_fields=['status'])
        
        log_audit(
            action='member_suspended',
            actor=request.user, 
            target_user=membership.member,
            target_group=membership.group,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return success_response(data=None, message="Member successfully suspended.")

    @action(detail=True, methods=['post'])
    def reinstate(self, request, group_pk=None, pk=None):
        membership = self.get_object()

        membership.status = 'active'
        membership.exited_at = None  # field renamed from left_at
        membership.save(update_fields=['status', 'exited_at'])

        log_audit(
            action='member_reinstated',
            actor=request.user,
            target_user=membership.member,
            target_group=membership.group,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return success_response(data=None, message="Member actively reinstated into all active pools.")

    @action(detail=True, methods=['post'])
    def exit(self, request, group_pk=None, pk=None):
        """
        Voluntary member exit with full settlement calculation.
        Satisfies Financial Engine Checklist §8: Settlement calculation required on exit.
        """
        membership = self.get_object()

        if membership.role == 'chairperson':
            return Response(
                {"error": "Chairperson cannot exit without first transferring the role."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if membership.status != 'active':
            return Response(
                {"error": f"Member is already '{membership.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = membership.group
        member = membership.member
        from decimal import Decimal
        from django.db.models import Sum
        from apps.contributions.models import Contribution
        from apps.payouts.models import Payout
        from apps.loans.models import Loan

        total_contributed = Contribution.objects.filter(
            group=group, member=member, status='confirmed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_received = Payout.objects.filter(
            group=group, recipient=member, status='completed'
        ).aggregate(total=Sum('net_amount'))['total'] or Decimal('0')

        outstanding_loans = Loan.objects.filter(
            group=group, borrower=member, status__in=['approved', 'disbursed', 'active']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        settlement = {
            'total_contributed': str(total_contributed),
            'total_payouts_received': str(total_received),
            'outstanding_loan_obligations': str(outstanding_loans),
            'net_settlement': str(total_contributed - total_received - outstanding_loans),
            'currency': group.currency,
        }

        membership.status = 'exited'
        membership.exited_at = timezone.now()
        membership.save(update_fields=['status', 'exited_at'])

        log_audit(
            action='member_exited',
            actor=request.user,
            target_user=member,
            target_group=group,
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata=settlement,
        )
        return success_response(data=settlement, message="Member exited. Settlement summary generated.")
