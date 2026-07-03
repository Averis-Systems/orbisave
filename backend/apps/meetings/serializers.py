from rest_framework import serializers
from .models import Meeting, MeetingAttendance, MeetingSettings
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
            'ended_at', 'status', 'livekit_room', 'video_provider',
            'video_room_name', 'video_room_url', 'created_by',
            'created_by_detail', 'minutes', 'attendees_count'
        ]
        read_only_fields = [
            'started_at', 'ended_at', 'livekit_room', 'video_provider',
            'video_room_name', 'video_room_url', 'created_by'
        ]


class MeetingSettingsSerializer(serializers.ModelSerializer):
    group = serializers.UUIDField(source='group_id', read_only=True)

    class Meta:
        model = MeetingSettings
        fields = [
            'id',
            'group',
            'frequency',
            'notice_days',
            'quorum_percent',
            'majority_percent',
            'provider_mode',
            'attendance_tracking',
            'minutes_required',
            'updated_by',
            'updated_at',
        ]
        read_only_fields = ['group', 'updated_by', 'updated_at']

    def validate_notice_days(self, value):
        if value > 90:
            raise serializers.ValidationError('Notice window cannot exceed 90 days.')
        return value

    def validate_quorum_percent(self, value):
        if value < 1 or value > 100:
            raise serializers.ValidationError('Quorum must be between 1 and 100 percent.')
        return value

    def validate_majority_percent(self, value):
        if value < 1 or value > 100:
            raise serializers.ValidationError('Majority must be between 1 and 100 percent.')
        return value
