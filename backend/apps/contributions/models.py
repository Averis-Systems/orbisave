from django.db import models
from common.models import BaseModel

class Contribution(BaseModel):
    METHODS = [('mpesa','M-Pesa'), ('airtel','Airtel Money'), ('mtn_momo','MTN MoMo'), ('bank','Bank Transfer')]
    STATUS  = [('scheduled','Scheduled'), ('initiated','Initiated'), ('pending','Pending'), ('confirmed','Confirmed'), ('failed','Failed')]

    group              = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='contributions')
    member             = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='contributions')
    amount             = models.DecimalField(max_digits=14, decimal_places=2)
    actual_amount      = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency           = models.CharField(max_length=5)
    method             = models.CharField(max_length=20, choices=METHODS)
    mobile_number      = models.CharField(max_length=20)
    provider_reference = models.CharField(max_length=255, null=True, blank=True)
    platform_reference = models.CharField(max_length=255, unique=True)
    cycle              = models.ForeignKey('groups.RotationCycle', on_delete=models.SET_NULL, null=True, blank=True, related_name='contributions')
    status             = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    scheduled_date     = models.DateField()
    initiated_at       = models.DateTimeField(null=True, blank=True)
    confirmed_at       = models.DateTimeField(null=True, blank=True)
    failure_reason     = models.TextField(null=True, blank=True)
    retry_count        = models.PositiveIntegerField(default=0)
    max_retries        = models.PositiveIntegerField(default=3)

    class Meta:
        db_table = 'contributions_contribution'

    def __str__(self):
        return f"{self.member.phone} -> {self.group.name} : {self.amount}"

class Penalty(BaseModel):
    STATUS = [('pending', 'Pending'), ('paid', 'Paid'), ('waived', 'Waived')]
    contribution       = models.ForeignKey(Contribution, on_delete=models.SET_NULL, null=True, blank=True, related_name='penalties')
    member             = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='penalties')
    rule               = models.ForeignKey('groups.PenaltyRule', on_delete=models.PROTECT)
    amount             = models.DecimalField(max_digits=14, decimal_places=2)
    status             = models.CharField(max_length=20, choices=STATUS, default='pending')
    paid_at            = models.DateTimeField(null=True, blank=True)
    payment_reference  = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'contributions_penalty'

    def __str__(self):
        return f"Penalty ({self.amount}) for {self.member.email}"
