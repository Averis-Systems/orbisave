from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Meeting, MeetingAttendance
from .serializers import MeetingSerializer, MeetingAttendanceSerializer
from common.permissions import IsGroupLeader, IsGroupMember
from common.exceptions import success_response
from django.db.models import Count

class MeetingViewSet(viewsets.ModelViewSet):
    """
    Controller for Chama Meetings.
    Includes support for scheduling, starting (LiveKit integration), and attendance.
    """
    serializer_class = MeetingSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'start', 'end']:
            return [IsGroupLeader()]
        return [IsGroupMember()]

    def get_queryset(self):
        user = self.request.user
        return Meeting.objects.filter(
            group__memberships__member=user,
            group__memberships__status='active'
        ).annotate(attendees_count=Count('attendances')).order_by('-scheduled_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        meeting = self.get_object()
        if meeting.status != 'scheduled':
            return Response({"error": "Only scheduled meetings can be started."}, status=status.HTTP_400_BAD_REQUEST)
        
        meeting.status = 'live'
        meeting.started_at = timezone.now()
        # LiveKit Room ID generation (simplified for now)
        meeting.livekit_room = f"meeting-{meeting.id}-{timezone.now().strftime('%Y%m%d')}"
        meeting.save()
        
        return success_response(data=MeetingSerializer(meeting).data, message="Meeting is now LIVE.")

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        meeting = self.get_object()
        if meeting.status != 'live':
            return Response({"error": "Only live meetings can be ended."}, status=status.HTTP_400_BAD_REQUEST)
        
        meeting.status = 'ended'
        meeting.ended_at = timezone.now()
        meeting.save()
        
        return success_response(data=MeetingSerializer(meeting).data, message="Meeting has ended.")

    @action(detail=True, methods=['post'], permission_classes=[IsGroupMember])
    def join(self, request, pk=None):
        meeting = self.get_object()
        if meeting.status != 'live':
            return Response({"error": "Meeting is not currently live."}, status=status.HTTP_400_BAD_REQUEST)
        
        attendance, created = MeetingAttendance.objects.get_or_create(
            meeting=meeting,
            member=request.user
        )
        return success_response(data=MeetingAttendanceSerializer(attendance).data, message="Joined meeting successfully.")
