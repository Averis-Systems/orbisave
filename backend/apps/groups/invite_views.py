from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import timedelta
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Group, GroupInvite, GroupMember
from common.permissions import IsGroupChairperson
from common.exceptions import success_response
from apps.audit.services import log_audit
from apps.notifications.tasks import send_invite_notification

class GroupInviteCreateView(views.APIView):
    permission_classes = [IsAuthenticated, IsGroupChairperson]

    def post(self, request, group_pk):
        """
        Generates uniquely cryptographically secure 7-day tokens and async dispatches message.
        """
        group = Group.objects.get(id=group_pk)
        target_phone = request.data.get('phone')
        target_email = request.data.get('email')
        
        if not target_phone and not target_email:
            return Response({"error": "Must provide 'phone' or 'email' target."}, status=status.HTTP_400_BAD_REQUEST)

        is_active_chairperson = (
            group.chairperson_id == request.user.id
            and group.verification_status == 'verified'
            and group.memberships.filter(member=request.user, role='chairperson', status='active').exists()
        )
        if not is_active_chairperson:
            return Response({"error": "Only the verified active chairperson can create invites."}, status=status.HTTP_403_FORBIDDEN)

        if group.status != 'active':
            return Response(
                {"error": "Invite links are enabled after the chairperson completes KYC and confirms the first contribution."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Disallow generation if max members reached
        if group.memberships.filter(status='active').count() >= group.max_members:
             return Response({"error": "Group has reached maximum capacity."}, status=status.HTTP_403_FORBIDDEN)

        # 7-day token logic securely
        token = get_random_string(16)
        invite = GroupInvite.objects.create(
            group=group,
            invited_by=request.user,
            contact=target_email or target_phone,
            contact_type='email' if target_email else 'phone',
            token=token,
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        channel = 'sms' if target_phone else 'email'
        address = target_phone if target_phone else target_email
        
        # Async invocation. Notification failure must not invalidate a created invite.
        try:
            send_invite_notification.delay(invite.id, channel, address)
        except Exception as exc:
            import structlog
            structlog.get_logger(__name__).warning(
                "invite_notification_dispatch_failed",
                invite_id=str(invite.id),
                error=str(exc),
            )
        
        log_audit(
            action='invite_sent',
            actor=request.user,
            target_group=group,
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'channel': channel, 'address': address}
        )
        
        return success_response(data={"token": token}, message="Invite created and queued for delivery.", status_code=201)


class GroupInvitePublicView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            invite = GroupInvite.objects.select_related('group').get(token=token, status='pending')
        except GroupInvite.DoesNotExist:
            return Response({"error": "Invite invalid or expired."}, status=status.HTTP_404_NOT_FOUND)

        if invite.expires_at < timezone.now():
            return Response({"error": "Invite expired."}, status=status.HTTP_400_BAD_REQUEST)

        if invite.group.status != 'active':
            return Response({"error": "Invite is not active until the group is activated."}, status=status.HTTP_403_FORBIDDEN)

        member_count = invite.group.memberships.filter(status='active').count()
        payload = {
            "group_name": invite.group.name,
            "chairperson_name": invite.invited_by.full_name,
            "contribution_amount": invite.group.contribution_amount,
            "currency": invite.group.currency,
            "member_count": member_count,
            "max_members": invite.group.max_members
        }
        return Response(payload)

    def post(self, request, token):
        """
        Accept an invite for the authenticated user.
        """
        if not request.user.is_authenticated:
            return Response({"error": "Authentication universally required."}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            invite = GroupInvite.objects.select_related('group').get(token=token, status='pending')
        except GroupInvite.DoesNotExist:
            return Response({"error": "Invite invalid or structurally already processed."}, status=status.HTTP_404_NOT_FOUND)

        if invite.expires_at < timezone.now():
            invite.status = 'expired'
            invite.save(update_fields=['status'])
            return Response({"error": "Invite explicitly expired."}, status=status.HTTP_400_BAD_REQUEST)

        group = invite.group
        if group.status != 'active':
            return Response({"error": "Invite is not active until the group is activated."}, status=status.HTTP_403_FORBIDDEN)

        member_count = group.memberships.filter(status='active').count()
        
        if member_count >= group.max_members:
            return Response({"error": "This group has reached maximum capacity."}, status=status.HTTP_403_FORBIDDEN)
            
        # Already a member handling
        if group.memberships.filter(member=request.user, status__in=['active', 'pending_approval', 'pending_session_refresh']).exists():
            return Response({"error": "User is already linked to this collective."}, status=status.HTTP_400_BAD_REQUEST)

        # Money-adjacent action: the phone number that mobile-money flows
        # through must be verified before joining a group.
        if not request.user.phone_verified:
            return Response(
                {
                    'error': 'Verify your phone number before joining a group.',
                    'code': 'phone_unverified',
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Production-beta rule: one occupied group slot per user.
        from .services.membership_policy import get_blocking_membership, SingleGroupLimitError
        blocking = get_blocking_membership(request.user, exclude_group=group)
        if blocking is not None:
            return Response(
                SingleGroupLimitError(blocking).as_response_data(),
                status=status.HTTP_409_CONFLICT,
            )

        # Mandatory Next of Kin check
        if not request.user.next_of_kin_name or not request.user.next_of_kin_phone:
            return Response(
                {"error": "Next of Kin information (name and phone) is mandatory before joining a group."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Lock in positional membership logically
        GroupMember.objects.create(
            group=group,
            member=request.user,
            role='member',
            status='pending_approval',
            rotation_position=member_count + 1
        )
        
        invite.status = 'accepted'
        invite.accepted_by = request.user
        invite.accepted_at = timezone.now()
        invite.save(update_fields=['status', 'accepted_by', 'accepted_at'])
        
        log_audit(
            action='invite_accepted',
            actor=request.user,
            target_group=group,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return success_response(data={"group_id": group.id}, message="Invite accepted. Membership is pending activation.")
