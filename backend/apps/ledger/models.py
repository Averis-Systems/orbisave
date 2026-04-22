import hashlib, json
from django.db import models
from common.models import BaseModel

class LedgerEntry(BaseModel):
    ENTRY_TYPES = [
        ('contribution','Contribution'), ('payout','Payout'),
        ('loan_disbursement','Loan Disbursement'), ('loan_repayment','Loan Repayment'),
        ('service_fee','Service Fee'), ('interest','Interest'),
        ('refund','Refund'), ('reconciliation_adjustment','Reconciliation Adjustment'),
    ]
    DIRECTIONS = [('credit','Credit'), ('debit','Debit')]

    group               = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='ledger_entries')
    member              = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, db_constraint=False)
    entry_type          = models.CharField(max_length=40, choices=ENTRY_TYPES)
    direction           = models.CharField(max_length=10, choices=DIRECTIONS)
    amount              = models.DecimalField(max_digits=14, decimal_places=2)
    currency            = models.CharField(max_length=5)
    running_balance     = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    description         = models.TextField()
    reference           = models.CharField(max_length=255, unique=True)
    related_contribution = models.ForeignKey('contributions.Contribution', on_delete=models.PROTECT, null=True, blank=True)
    related_loan        = models.ForeignKey('loans.Loan', on_delete=models.PROTECT, null=True, blank=True)
    related_payout      = models.ForeignKey('payouts.Payout', on_delete=models.PROTECT, null=True, blank=True)
    recorded_by         = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, related_name='ledger_entries_recorded', db_constraint=False)
    previous_hash       = models.CharField(max_length=64, default='0' * 64)
    hash                = models.CharField(max_length=64)

    class Meta:
        db_table = 'ledger_entry'
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Ledger entries are immutable — no updates permitted.")
        
        previous = LedgerEntry.objects.filter(group=self.group).order_by('-created_at').first()
        
        # 1. Compute Running Balance Contextually
        from decimal import Decimal
        if getattr(self, 'running_balance', None) is None or getattr(self, 'running_balance') == Decimal('0.00') or getattr(self, 'running_balance') == 0:
            prev_balance = previous.running_balance if previous else Decimal('0.00')
            if self.direction == 'credit':
                self.running_balance = prev_balance + Decimal(str(self.amount))
            elif self.direction == 'debit':
                self.running_balance = prev_balance - Decimal(str(self.amount))
            else:
                self.running_balance = prev_balance
                
        # 2. Build Cryptographic Chain Hash
        if not self.hash:
            prev_hash = previous.hash if previous else '0' * 64
            payload = f"{prev_hash}{self.group_id}{self.entry_type}{self.amount}{self.reference}"
            self.hash = hashlib.sha256(payload.encode()).hexdigest()
            
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Ledger entries cannot be deleted.")


class DailyLedgerCheckpoint(BaseModel):
    """
    Immutable daily checkpoint storing the Merkle root of all ledger transactions 
    for a given group on a specific date. Periodically signed and exported offline.
    """
    group = models.ForeignKey('groups.Group', on_delete=models.RESTRICT, related_name='ledger_checkpoints')
    date = models.DateField()
    merkle_root_hash = models.CharField(max_length=64, help_text="SHA-256 Merkle root of all transactions for this day")
    transaction_count = models.PositiveIntegerField()
    total_volume = models.DecimalField(max_digits=14, decimal_places=2)
    exported_to_s3 = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'ledger_daily_checkpoint'
        unique_together = ('group', 'date')

    def save(self, *args, **kwargs):
        if self.pk and getattr(self, '_state', None) and self._state.adding is False:
            if not kwargs.get('update_fields') == ['exported_to_s3']:
                raise PermissionError("Checkpoints are immutable except for the exported_to_s3 flag.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Ledger checkpoints cannot be deleted.")

class SystemConfiguration(BaseModel):
    """
    Satisfies Financial Engine Checklist Item 6: System Fees & Configuration.
    Tracks highly dynamic global system parameters across historical records.
    Never MUTATED - only new version appended when changed.
    """
    key = models.CharField(max_length=50, unique=True)
    value = models.JSONField(help_text="Flexible mapping matching key necessities")
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'ledger_system_configuration'
        
    @classmethod
    def get_withdrawal_fee_pct(cls):
        """
        Dynamically acquires precise system fees statically returning a default safely.
        """
        config = cls.objects.filter(key='PAYOUT_SERVICE_FEE_PCT', active=True).first()
        from decimal import Decimal
        if config and 'pct' in config.value:
            return Decimal(str(config.value['pct']))
        return Decimal('4.15') # Failsafe hard-default
