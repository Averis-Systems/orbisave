from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.utils import timezone
from apps.groups.models import Group
from .models import Meeting, MeetingAttendance, MeetingSettings
from .serializers import MeetingSerializer, MeetingAttendanceSerializer, MeetingSettingsSerializer
from .services import (
    DailyMeetingConfigurationError,
    DailyMeetingProviderError,
    create_daily_room_for_meeting,
)
from common.exceptions import success_response
from django.db.models import Count

class MeetingViewSet(viewsets.ModelViewSet):
    """
    Controller for group meetings.
    Scheduling and lifecycle controls are scoped to group leaders. Members can
    only see or join meetings for groups where they have an active membership.
    """
    serializer_class = MeetingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _is_group_member(self, group):
        return group.memberships.filter(
            member=self.request.user,
            status='active',
        ).exists()

    def _is_group_leader(self, group):
        return (
            group.verification_status == 'verified'
            and group.memberships.filter(
                member=self.request.user,
                role__in=['chairperson', 'treasurer'],
                status='active',
            ).exists()
        )

    def _require_group_member(self, group):
        if not self._is_group_member(group):
            raise PermissionDenied("You can only access meetings for groups you belong to.")

    def _require_group_leader(self, group):
        if not self._is_group_leader(group):
            raise PermissionDenied("Only active group leaders can manage meetings for this group.")

    def _requested_group(self):
        group_id = self.request.query_params.get('group')
        if not group_id:
            raise ValidationError({"group": "Group is required."})
        try:
            return Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise ValidationError({"group": "Group was not found."})

    def get_queryset(self):
        user = self.request.user
        queryset = Meeting.objects.filter(
            group__memberships__member=user,
            group__memberships__status='active'
        ).distinct().annotate(attendees_count=Count('attendances')).order_by('-scheduled_at')
        group_id = self.request.query_params.get('group')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return queryset

    def perform_create(self, serializer):
        group = serializer.validated_data['group']
        self._require_group_leader(group)
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        group = serializer.validated_data.get('group', serializer.instance.group)
        self._require_group_leader(group)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_group_leader(instance.group)
        instance.delete()

    @action(detail=False, methods=['get', 'patch'], url_path='settings')
    def meeting_settings(self, request):
        group = self._requested_group()
        self._require_group_member(group)
        settings, _ = MeetingSettings.objects.get_or_create(group=group)

        if request.method == 'GET':
            return success_response(data=MeetingSettingsSerializer(settings).data)

        self._require_group_leader(group)
        serializer = MeetingSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return success_response(data=serializer.data, message="Meeting settings updated.")

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        meeting = self.get_object()
        self._require_group_leader(meeting.group)
        if meeting.status != 'scheduled':
            return Response({"error": "Only scheduled meetings can be started."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            daily_room = create_daily_room_for_meeting(meeting)
        except DailyMeetingConfigurationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except DailyMeetingProviderError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        meeting.status = 'live'
        meeting.started_at = timezone.now()
        meeting.video_provider = 'daily'
        meeting.video_room_name = daily_room.name
        meeting.video_room_url = daily_room.url
        meeting.livekit_room = ''
        meeting.save()
        
        return success_response(data=MeetingSerializer(meeting).data, message="Meeting is now LIVE.")

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        meeting = self.get_object()
        self._require_group_leader(meeting.group)
        if meeting.status != 'live':
            return Response({"error": "Only live meetings can be ended."}, status=status.HTTP_400_BAD_REQUEST)
        
        meeting.status = 'ended'
        meeting.ended_at = timezone.now()
        meeting.save()
        
        return success_response(data=MeetingSerializer(meeting).data, message="Meeting has ended.")

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        meeting = self.get_object()
        self._require_group_member(meeting.group)
        if meeting.status != 'live':
            return Response({"error": "Meeting is not currently live."}, status=status.HTTP_400_BAD_REQUEST)
        
        attendance, created = MeetingAttendance.objects.get_or_create(
            meeting=meeting,
            member=request.user
        )
        data = MeetingAttendanceSerializer(attendance).data
        data.update({
            'video_provider': meeting.video_provider,
            'video_room_name': meeting.video_room_name,
            'video_room_url': meeting.video_room_url,
        })
        return success_response(data=data, message="Joined meeting successfully.")
