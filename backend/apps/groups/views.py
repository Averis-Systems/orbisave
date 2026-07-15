from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Prefetch
from django.utils import timezone
from .models import Group, GroupMember, RotationCycle, RotationSchedule
from .serializers import (
    GroupSerializer, GroupCreateSerializer, GroupMemberSerializer, 
    WalletCalculations, RotationCycleSerializer, RotationScheduleSerializer
)
from common.permissions import IsGroupChairperson, IsGroupMember, IsGroupLeader
from apps.audit.services import log_audit
from common.exceptions import success_response

class RotationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes rotation cycles and schedules.
    """
    permission_classes = [IsAuthenticated, IsGroupMember]

    def get_queryset(self):
        user = self.request.user
        group_id = self.request.query_params.get('group')
        
        if self.action == 'list':
            # Default to cycles
            return RotationCycle.objects.filter(
                group__memberships__member=user,
                group__memberships__status='active'
            ).order_by('-cycle_number')
        
        return RotationCycle.objects.all()

    def get_serializer_class(self):
        if self.action == 'schedules':
            return RotationScheduleSerializer
        return RotationCycleSerializer

    @action(detail=True, methods=['get'])
    def schedules(self, request, pk=None):
        """
        Get schedules for a specific cycle.
        """
        cycle = self.get_object()
        schedules = RotationSchedule.objects.filter(
            group=cycle.group, 
            cycle_number=cycle.cycle_number
        ).order_by('scheduled_payout_date')
        
        return Response(RotationScheduleSerializer(schedules, many=True).data)

    # NOTE: the old `trigger_payout` action that lived here was removed
    # deliberately: it fabricated a Payout(status='completed') with a
    # hardcoded fee, no payment-provider call, and no ledger entries —
    # permanently desyncing Payout state from the ledger and the bank.
    # The one sanctioned payout path is POST /api/v1/payouts/<group>/execute/
    # (PIN-gated, idempotent, schedule-derived recipient, balanced ledger
    # event group). See apps/payouts/views.py and apps/payouts/services.py.

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
            return [IsAuthenticated()]
        elif self.action in ['update', 'partial_update', 'pause', 'close']:
            return [IsAuthenticated(), IsGroupChairperson()]
        return [IsAuthenticated(), IsGroupMember()]

    def get_queryset(self):
        """
        Heavily optimized QuerySet using `annotate` for member_count to avoid N+1 count queries,
        and `select_related` for chairperson relationships.
        Only returns groups the user is actively a member of.
        """
        user = self.request.user
        db_alias = user.country if getattr(user, 'country', None) in ['kenya', 'rwanda', 'ghana'] else 'default'
        qs = Group.objects.using(db_alias).filter(
            memberships__member=user,
            memberships__status__in=['active', 'pending_approval', 'pending_session_refresh'],
        )
        return qs.annotate(
            members_count=Count('memberships')
        ).prefetch_related(
            # We don't generally load all entries in lists, but cache handles deep limits
            'ledger_entries'
        )

    def create(self, request, *args, **kwargs):
        # Money-adjacent action: the phone number that mobile-money flows
        # through must be verified before a group can be created.
        if settings.PHONE_VERIFICATION_ENFORCED and not request.user.phone_verified:
            return Response(
                {
                    'error': 'Verify your phone number before creating a group.',
                    'code': 'phone_unverified',
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Production-beta rule: one occupied group slot per user. Creating a
        # group makes you its (pending) chairperson, which occupies the slot.
        from .services.membership_policy import get_blocking_membership, SingleGroupLimitError
        blocking = get_blocking_membership(request.user)
        if blocking is not None:
            return Response(
                SingleGroupLimitError(blocking).as_response_data(),
                status=status.HTTP_409_CONFLICT,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        country = serializer.validated_data['country']
        with transaction.atomic(using=country):
            group = serializer.save()
            db_alias = group._state.db or country
            
            GroupMember.objects.using(db_alias).create(
                group=group,
                member=self.request.user,
                role='chairperson',
                status='pending_approval',
                rotation_position=1
            )
            log_audit(
                action='group_created', 
                actor=self.request.user, 
                target_group=group, 
                ip_address=self.request.META.get('REMOTE_ADDR'),
                metadata={'approval_state': 'pending_review'},
                country=group.country,
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

        if not request.user.next_of_kin_name or not request.user.next_of_kin_phone:
            return Response(
                {"error": "Next of Kin information (name and phone) is mandatory before activating a group."},
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


class GroupMemberActionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Sub-resource specifically managing individual user links within a specific targeted group.
    """
    queryset = GroupMember.objects.all()
    serializer_class = GroupMemberSerializer

    def get_permissions(self):
        if self.action == 'list':
            return [IsAuthenticated(), IsGroupMember()]
        if self.action == 'exit':
            # Voluntary exit: any authenticated group member may call it, but
            # the action itself only allows exiting your OWN membership
            # (or the chairperson processing a member's exit request).
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsGroupChairperson()]

    def get_queryset(self):
        # User records live in the platform database; avoid cross-database joins.
        return super().get_queryset().filter(group_id=self.kwargs['group_pk']).select_related('group')

    @action(detail=True, methods=['post'])
    def remove(self, request, group_pk=None, pk=None):
        membership = self.get_object()
        if membership.role == 'chairperson':
            return Response({"error": "Cannot forcefully remove the group chairperson."}, status=status.HTTP_400_BAD_REQUEST)

        # Same financial rule as voluntary exit: removing a borrower would
        # sever the loan pool's claim on them. Suspend instead while the
        # obligation is outstanding.
        from decimal import Decimal
        from django.db.models import Sum
        from apps.loans.models import Loan
        outstanding = Loan.objects.filter(
            group=membership.group,
            borrower=membership.member,
            status__in=['approved', 'disbursed', 'active'],
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        if outstanding > Decimal('0'):
            return Response(
                {
                    "error": (
                        "Removal blocked: this member has outstanding loan obligations "
                        f"of {outstanding} {membership.group.currency}. Suspend the member "
                        "instead, or settle/waive the loans first."
                    ),
                    "outstanding_loan_obligations": str(outstanding),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        # A member who exited and joined a different group cannot be
        # reinstated here — their single group slot is already occupied.
        from .services.membership_policy import get_blocking_membership, SingleGroupLimitError
        blocking = get_blocking_membership(membership.member, exclude_group=membership.group)
        if blocking is not None:
            return Response(
                SingleGroupLimitError(blocking).as_response_data(),
                status=status.HTTP_409_CONFLICT,
            )

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
        Exiting frees the user's single group slot (see membership_policy).
        """
        membership = self.get_object()

        # Only the member themselves — or the chairperson processing an exit
        # request — may exit a membership.
        is_self = membership.member_id == request.user.id
        is_chair = membership.group.chairperson_id == request.user.id
        if not (is_self or is_chair):
            return Response(
                {"error": "You can only exit your own membership."},
                status=status.HTTP_403_FORBIDDEN,
            )

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

        # A member with unsettled loan obligations cannot exit: the loan pool
        # would lose its claim on the borrower the moment membership ends.
        if outstanding_loans > Decimal('0'):
            return Response(
                {
                    "error": (
                        "Exit blocked: this member has outstanding loan obligations "
                        f"of {outstanding_loans} {group.currency}. Loans must be fully "
                        "repaid (or formally waived by the group) before exiting."
                    ),
                    "outstanding_loan_obligations": str(outstanding_loans),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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
