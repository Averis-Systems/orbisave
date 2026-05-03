from django.db import models
from common.models import BaseModel

class Meeting(BaseModel):
    STATUS = [('scheduled','Scheduled'), ('live','Live'), ('ended','Ended'), ('cancelled','Cancelled')]
    group          = models.ForeignKey('groups.Group', on_delete=models.CASCADE, related_name='meetings')
    title          = models.CharField(max_length=255)
    agenda         = models.TextField(blank=True)
    scheduled_at   = models.DateTimeField()
    started_at     = models.DateTimeField(null=True, blank=True)
    ended_at       = models.DateTimeField(null=True, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    livekit_room   = models.CharField(max_length=255, null=True, blank=True)
    created_by     = models.ForeignKey('accounts.User', on_delete=models.PROTECT, db_constraint=False)
    minutes        = models.TextField(blank=True)

    class Meta:
        db_table = 'meetings_meeting'

class MeetingAttendance(BaseModel):
    meeting   = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='attendances')
    member    = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='meeting_attendances', db_constraint=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'meetings_attendance'
        unique_together = [('meeting','member')]
