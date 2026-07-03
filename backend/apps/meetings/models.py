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
    video_provider = models.CharField(max_length=30, default='daily')
    video_room_name = models.CharField(max_length=255, blank=True)
    video_room_url = models.URLField(blank=True)
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


class MeetingSettings(BaseModel):
    FREQUENCIES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('as_needed', 'As Needed'),
    ]
    PROVIDER_MODES = [
        ('daily', 'Daily.co'),
    ]

    group = models.OneToOneField('groups.Group', on_delete=models.CASCADE, related_name='meeting_settings')
    frequency = models.CharField(max_length=20, choices=FREQUENCIES, default='monthly')
    notice_days = models.PositiveSmallIntegerField(default=7)
    quorum_percent = models.PositiveSmallIntegerField(default=60)
    majority_percent = models.PositiveSmallIntegerField(default=51)
    provider_mode = models.CharField(max_length=30, choices=PROVIDER_MODES, default='daily')
    attendance_tracking = models.BooleanField(default=True)
    minutes_required = models.BooleanField(default=True)
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='updated_meeting_settings',
        db_constraint=False,
    )

    class Meta:
        db_table = 'meetings_settings'
