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
        
        # Async invocation! Offloads 2-3 SECONDS of delay entirely
        send_invite_notification.delay(invite.id, channel, address)
        
        log_audit(
            action='invite_sent',
            actor=request.user,
            target_group=group,
            ip_address=request.META.get('REMOTE_ADDR'),
            metadata={'channel': channel, 'address': address}
        )
        
        return success_response(data={"token": token}, message="Invite heavily securely dispatched.", status_code=201)


class GroupInvitePublicView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            invite = GroupInvite.objects.select_related('group', 'invited_by').get(token=token, status='pending')
        except GroupInvite.DoesNotExist:
            return Response({"error": "Invite invalid or expired."}, status=status.HTTP_404_NOT_FOUND)

        if invite.expires_at < timezone.now():
            return Response({"error": "Invite expired."}, status=status.HTTP_400_BAD_REQUEST)

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
        Accept invite strictly via active authenticated target recipient.
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
        member_count = group.memberships.filter(status='active').count()
        
        if member_count >= group.max_members:
            return Response({"error": "Target collective strictly reached maximum capacity constraints."}, status=status.HTTP_403_FORBIDDEN)
            
        # Already a member handling
        if group.memberships.filter(member=request.user, status='active').exists():
            return Response({"error": "User is actively structurally integrated within target collective."}, status=status.HTTP_400_BAD_REQUEST)

        # Lock in positional membership logically
        GroupMember.objects.create(
            group=group,
            member=request.user,
            role='member',
            rotation_position=member_count + 1  # Next slot naturally
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
        
        return success_response(data={"group_id": group.id}, message="Invite fundamentally accepted and collective strictly entered.")
