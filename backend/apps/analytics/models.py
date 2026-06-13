from django.db import models
from common.models import BaseModel

class GroupHealthSnapshot(BaseModel):
    group              = models.ForeignKey('groups.Group', on_delete=models.CASCADE, related_name='health_snapshots')
    health_score       = models.DecimalField(max_digits=5, decimal_places=2) # 0-100
    contribution_rate  = models.DecimalField(max_digits=5, decimal_places=2)
    repayment_rate     = models.DecimalField(max_digits=5, decimal_places=2)
    attendance_rate    = models.DecimalField(max_digits=5, decimal_places=2)
    captured_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analytics_group_health'
        ordering = ['-captured_at']
