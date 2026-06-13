from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'type', 'channel', 'title', 'body', 'metadata', 'read_at', 'created_at']
        read_only_fields = ['recipient', 'created_at']
