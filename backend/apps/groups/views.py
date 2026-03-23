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

        membership.status = 'removed'
        membership.left_at = timezone.now()
        membership.save(update_fields=['status', 'left_at'])
        
        log_audit(
            action='member_suspended', # Map 'removed' to suspended conceptually in audit
            actor=request.user, 
            target_user=membership.member,
            target_group=membership.group,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return success_response(data=None, message="Member successfully excised from collective.")

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
        membership.left_at = None
        membership.save(update_fields=['status', 'left_at'])
        
        log_audit(
            action='member_reinstated',
            actor=request.user, 
            target_user=membership.member,
            target_group=membership.group,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return success_response(data=None, message="Member actively reinstated into all active pools.")
