from django.db import models
from common.models import BaseModel

class Payout(BaseModel):
    STATUS = [('upcoming','Upcoming'), ('processing','Processing'), ('completed','Completed'), ('failed','Failed'), ('skipped','Skipped')]
    group              = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='payouts')
    recipient          = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='payouts_received')
    rotation_position  = models.PositiveIntegerField()
    cycle_number       = models.PositiveIntegerField()
    gross_amount       = models.DecimalField(max_digits=14, decimal_places=2)
    service_fee        = models.DecimalField(max_digits=14, decimal_places=2)
    net_amount         = models.DecimalField(max_digits=14, decimal_places=2)
    currency           = models.CharField(max_length=5)
    method             = models.CharField(max_length=20)
    mobile_number      = models.CharField(max_length=20)
    provider_reference = models.CharField(max_length=255, null=True, blank=True)
    status             = models.CharField(max_length=20, choices=STATUS, default='upcoming')
    processed_by       = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='processed_payouts')
    processed_at       = models.DateTimeField(null=True, blank=True)
    scheduled_date     = models.DateField()

    class Meta:
        db_table = 'payouts_payout'
