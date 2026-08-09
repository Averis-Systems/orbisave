from django.db import models
from common.models import BaseModel


class Feedback(BaseModel):
    """A support / feedback item raised by a member from the app.

    Lives on the default (platform) database: it is a cross-cutting support
    concern, not financial state, and the country manager scopes on the
    denormalised `country` field (copied from the reporter at submit time) so no
    cross-shard join is needed. Serious items escalate to the super admin.
    """
    CATEGORY = [
        ('bug', 'Something is broken'),
        ('payment', 'Payment or money issue'),
        ('account', 'Account or login'),
        ('question', 'General question'),
        ('suggestion', 'Suggestion'),
        ('other', 'Other'),
    ]
    SEVERITY = [('normal', 'Normal'), ('serious', 'Serious')]
    STATUS = [
        ('open', 'Open'),
        ('in_progress', 'In progress'),
        ('resolved', 'Resolved'),
        ('escalated', 'Escalated to super admin'),
    ]

    reporter = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True,
        related_name='feedback_reports', db_constraint=False,
    )
    # Denormalised from the reporter so a country manager can filter without a
    # cross-database join (reporter lives on the platform DB alongside this row).
    country = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY, default='other')
    subject = models.CharField(max_length=200)
    message = models.TextField()
    screenshot = models.ImageField(upload_to='feedback/', null=True, blank=True)
    # Where the reporter was in the app when they raised it (context for triage).
    page_url = models.CharField(max_length=500, blank=True)

    severity = models.CharField(max_length=10, choices=SEVERITY, default='normal')
    status = models.CharField(max_length=15, choices=STATUS, default='open')

    resolved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='feedback_resolved', db_constraint=False,
    )
    resolution_note = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'feedback_feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['country', 'status']),
            models.Index(fields=['status', 'severity']),
        ]

    def __str__(self):
        return f"[{self.status}] {self.subject} ({self.country})"
