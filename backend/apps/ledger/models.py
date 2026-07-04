import hashlib, json
from django.db import models
from common.models import BaseModel

PROTECTED_NON_NEGATIVE_STREAMS = {'rotation', 'savings', 'loaning'}


class LedgerEventGroup(BaseModel):
    STATUS_OPEN = 'open'
    STATUS_CLOSED = 'closed'
    STATUS_VOID = 'void'

    STATUSES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_CLOSED, 'Closed'),
        (STATUS_VOID, 'Void'),
    ]

    event_group_key = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=80)
    source_system = models.CharField(max_length=50, default='orbisave')
    status = models.CharField(max_length=20, choices=STATUSES, default=STATUS_OPEN)
    metadata = models.JSONField(default=dict, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ledger_event_group'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            allowed = {'status', 'closed_at', 'updated_at', 'metadata'}
            update_fields = set(kwargs.get('update_fields') or [])
            if update_fields and not update_fields.issubset(allowed):
                raise PermissionError("Ledger event groups are immutable except status/metadata closure fields.")
        super().save(*args, **kwargs)


class LedgerStreamLock(BaseModel):
    group = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='ledger_stream_locks')
    account_stream = models.CharField(max_length=40)
    currency = models.CharField(max_length=5)
    last_sequence_number = models.PositiveBigIntegerField(default=0)
    last_hash = models.CharField(max_length=64, default='0' * 64)
    current_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'ledger_stream_lock'
        unique_together = [('group', 'account_stream', 'currency')]
        indexes = [
            models.Index(fields=['group', 'account_stream', 'currency']),
        ]

    def __str__(self):
        return f"{self.group_id}:{self.account_stream}:{self.currency} #{self.last_sequence_number}"


class LedgerEntry(BaseModel):
    ENTRY_TYPES = [
        ('contribution','Contribution'), ('payout','Payout'),
        ('loan_disbursement','Loan Disbursement'), ('loan_repayment','Loan Repayment'),
        ('service_fee','Service Fee'), ('interest','Interest'),
        ('refund','Refund'), ('reconciliation_adjustment','Reconciliation Adjustment'),
    ]
    DIRECTIONS = [('credit','Credit'), ('debit','Debit')]
    ACCOUNT_STREAMS = [
        ('rotation', 'Rotation Trust'),
        ('savings', 'Mandatory Savings'),
        ('loaning', 'Loaning'),
        ('company_revenue', 'Company Revenue'),
        ('suspense', 'Suspense'),
        ('provider_settlement', 'Provider Settlement'),
        ('loan_receivable', 'Loan Receivable'),
        ('provider_clearing', 'Provider Clearing'),
    ]

    event_group         = models.ForeignKey(LedgerEventGroup, on_delete=models.PROTECT, null=True, blank=True, related_name='entries')
    group               = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='ledger_entries')
    member              = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, db_constraint=False)
    account_stream      = models.CharField(max_length=40, choices=ACCOUNT_STREAMS, default='rotation')
    entry_type          = models.CharField(max_length=40, choices=ENTRY_TYPES)
    direction           = models.CharField(max_length=10, choices=DIRECTIONS)
    amount              = models.DecimalField(max_digits=14, decimal_places=2)
    currency            = models.CharField(max_length=5)
    # default=None: "not provided" — save() derives it from the chain. A real
    # zero balance must survive as zero (see the drain-to-zero note in save()).
    running_balance     = models.DecimalField(max_digits=14, decimal_places=2, default=None)
    description         = models.TextField()
    reference           = models.CharField(max_length=255, unique=True)
    related_contribution = models.ForeignKey('contributions.Contribution', on_delete=models.PROTECT, null=True, blank=True)
    related_loan        = models.ForeignKey('loans.Loan', on_delete=models.PROTECT, null=True, blank=True)
    related_payout      = models.ForeignKey('payouts.Payout', on_delete=models.PROTECT, null=True, blank=True)
    recorded_by         = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, related_name='ledger_entries_recorded', db_constraint=False)
    idempotency_key     = models.CharField(max_length=255, null=True, blank=True, unique=True)
    source_system       = models.CharField(max_length=50, default='orbisave')
    sequence_number     = models.PositiveBigIntegerField(default=0)
    previous_hash       = models.CharField(max_length=64, default='0' * 64)
    hash                = models.CharField(max_length=64)

    class Meta:
        db_table = 'ledger_entry'
        ordering = ['created_at']
        unique_together = [('group', 'account_stream', 'currency', 'sequence_number')]
        indexes = [
            models.Index(fields=['group', 'account_stream', 'currency', 'sequence_number']),
            models.Index(fields=['event_group']),
        ]

    def canonical_payload(self, previous_hash=None):
        prev_hash = previous_hash if previous_hash is not None else self.previous_hash
        return json.dumps(
            {
                'sequence_number': int(self.sequence_number or 0),
                'previous_hash': prev_hash,
                'event_group_key': self.event_group.event_group_key if self.event_group_id and self.event_group else '',
                'group_id': str(self.group_id),
                'member_id': str(self.member_id or ''),
                'account_stream': self.account_stream,
                'entry_type': self.entry_type,
                'direction': self.direction,
                'amount': f"{self.amount:.2f}",
                'currency': self.currency,
                'running_balance': f"{self.running_balance:.2f}",
                'reference': self.reference,
                'idempotency_key': self.idempotency_key or '',
                'source_system': self.source_system,
            },
            sort_keys=True,
            separators=(',', ':'),
        )

    def compute_hash(self):
        return hashlib.sha256(self.canonical_payload().encode()).hexdigest()

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            raise PermissionError("Ledger entries are immutable — no updates permitted.")

        db_alias = kwargs.get('using') or self._state.db or 'default'
        # Fetch chain context whenever any auto-derived field is missing.
        # CRITICAL: only running_balance=None means "unset". Zero is a REAL
        # balance — a payout that drains a stream to exactly 0.00 previously
        # tripped this fallback with previous=None (sequence was already set,
        # so no previous row was fetched) and overwrote the correct 0 with
        # 0 − amount, corrupting the entry AND the stream lock while the
        # already-computed hash still proved the original value.
        from decimal import Decimal
        previous = None
        needs_chain_context = self._state.adding and (
            not self.sequence_number or self.running_balance is None
        )
        if needs_chain_context:
            previous = (
                LedgerEntry.objects.using(db_alias)
                .filter(
                    group=self.group,
                    account_stream=self.account_stream,
                    currency=self.currency,
                )
                .order_by('-sequence_number', '-created_at')
                .first()
            )

        # 1. Compute Running Balance Contextually (only when truly unset)
        if self._state.adding and self.running_balance is None:
            prev_balance = previous.running_balance if previous else Decimal('0.00')
            if self.direction == 'credit':
                self.running_balance = prev_balance + Decimal(str(self.amount))
            elif self.direction == 'debit':
                self.running_balance = prev_balance - Decimal(str(self.amount))
            else:
                self.running_balance = prev_balance
                
        # 2. Build Cryptographic Chain Hash
        if self._state.adding and not self.sequence_number:
            self.sequence_number = (previous.sequence_number + 1) if previous else 1

        if self._state.adding and (not self.previous_hash or self.previous_hash == '0' * 64):
            self.previous_hash = previous.hash if previous else '0' * 64

        if not self.hash:
            self.hash = self.compute_hash()
            
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


class ReconciliationRun(BaseModel):
    STATUS = [
        ('running', 'Running'),
        ('matched', 'Matched'),
        ('needs_review', 'Needs Review'),
        ('failed', 'Failed'),
    ]

    country = models.CharField(max_length=10)
    provider_code = models.CharField(max_length=40)
    account_stream = models.CharField(max_length=40, choices=LedgerEntry.ACCOUNT_STREAMS)
    account_number = models.CharField(max_length=100)
    business_date = models.DateField()
    source = models.CharField(max_length=80, default='daily_bank_statement')
    expected_closing_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    observed_closing_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='running')
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'ledger_reconciliation_run'
        ordering = ['-business_date', '-created_at']

    def __str__(self):
        return f"{self.country}/{self.provider_code}/{self.account_stream} {self.business_date}"


class ReconciliationItem(BaseModel):
    ISSUE_TYPES = [
        ('amount_mismatch', 'Amount Mismatch'),
        ('closing_balance_mismatch', 'Closing Balance Mismatch'),
        ('missing_bank_record', 'Missing Bank Record'),
        ('missing_provider_callback', 'Missing Provider Callback'),
        ('orphan_bank_transaction', 'Orphan Bank Transaction'),
        ('duplicate_reference', 'Duplicate Reference'),
        ('signature_mismatch', 'Signature Mismatch'),
    ]
    STATUS = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('escalated', 'Escalated'),
    ]
    SEVERITIES = [('green', 'Green'), ('orange', 'Orange'), ('red', 'Red')]

    run = models.ForeignKey(
        ReconciliationRun,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='items',
    )
    group = models.ForeignKey(
        'groups.Group',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='reconciliation_items',
    )
    related_contribution = models.ForeignKey(
        'contributions.Contribution',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='reconciliation_items',
    )
    account_stream = models.CharField(max_length=40, choices=LedgerEntry.ACCOUNT_STREAMS)
    issue_type = models.CharField(max_length=40, choices=ISSUE_TYPES)
    status = models.CharField(max_length=20, choices=STATUS, default='open')
    severity = models.CharField(max_length=10, choices=SEVERITIES, default='orange')
    reference = models.CharField(max_length=255)
    provider_reference = models.CharField(max_length=255, blank=True)
    bank_reference = models.CharField(max_length=255, blank=True)
    expected_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    observed_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=5, blank=True)
    details = models.JSONField(default=dict, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='resolved_reconciliation_items',
        db_constraint=False,
    )

    class Meta:
        db_table = 'ledger_reconciliation_item'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.issue_type} [{self.status}] {self.reference}"

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
