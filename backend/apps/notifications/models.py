from django.db import models
from common.models import BaseModel

class Notification(BaseModel):
    TYPE_CHOICES = [
        ('contribution_confirmed','Contribution Confirmed'),
        ('contribution_failed','Contribution Failed'),
        ('loan_status_changed','Loan Status Changed'),
        ('payout_processed','Payout Processed'),
        ('loan_approval_required','Loan Approval Required'),
        ('new_member_joined','New Member Joined'),
        ('meeting_starting','Meeting Starting'),
        ('admin_alert','Admin Alert'),
        ('reminder','Reminder'),
    ]
    CHANNEL_CHOICES = [('in_app','In-App'), ('sms','SMS'), ('email','Email'), ('push','Push')]

    recipient  = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=50, choices=TYPE_CHOICES)
    channel    = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='in_app')
    title      = models.CharField(max_length=255)
    body       = models.TextField()
    metadata   = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'notifications_notification'

    def __str__(self):
        return f"{self.recipient.email} - {self.title}"
