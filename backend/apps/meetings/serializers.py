from rest_framework import serializers
from .models import Meeting, MeetingAttendance
from apps.accounts.serializers import UserSerializer

class MeetingAttendanceSerializer(serializers.ModelSerializer):
    member_detail = UserSerializer(source='member', read_only=True)
    
    class Meta:
        model = MeetingAttendance
        fields = ['id', 'meeting', 'member', 'member_detail', 'joined_at', 'left_at']
        read_only_fields = ['joined_at']

class MeetingSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    attendees_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Meeting
        fields = [
            'id', 'group', 'title', 'agenda', 'scheduled_at', 'started_at', 
            'ended_at', 'status', 'livekit_room', 'created_by', 
            'created_by_detail', 'minutes', 'attendees_count'
        ]
        read_only_fields = ['started_at', 'ended_at', 'livekit_room', 'created_by']
