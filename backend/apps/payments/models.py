"""
Payment Provider / Bank Configuration Model
============================================
Enables plug-and-play bank/payment API management entirely from the
Super Admin Console — zero hardcoding. Credentials are stored encrypted.
Each provider record maps one bank (e.g. Equity Bank Kenya) to one country
and can be toggled sandbox ↔ live and enabled/disabled without a deployment.
"""
import uuid
from django.db import models
from common.fields import EncryptedJSONField, EncryptedTextField
from common.models import BaseModel


COUNTRIES = [('kenya', 'Kenya'), ('rwanda', 'Rwanda'), ('ghana', 'Ghana')]

PROVIDER_CODES = [
    ('jenga_ke',   'Jenga (Equity Bank Kenya)'),
    ('jenga_rw',   'Jenga (Equity Bank Rwanda)'),
    ('ecobank_gh', 'Ecobank Ghana'),
    ('mtn_momo',   'MTN MoMo'),
    ('mpesa',      'M-Pesa (Daraja)'),
    ('airtel',     'Airtel Money'),
    ('custom',     'Custom / Other'),
]

ENVIRONMENTS = [('sandbox', 'Sandbox'), ('live', 'Live')]

STATUS_CHOICES = [
    ('active',   'Active'),
    ('inactive', 'Inactive'),
    ('testing',  'Testing'),
    ('error',    'Error'),
]


class BankProvider(BaseModel):
    """
    One row = one bank integration for one country.
    Credentials and provider extras (which can hold RSA private keys) are
    Fernet-encrypted at rest via common.fields — the database only ever sees
    opaque enc$v1$ tokens. Key management: FIELD_ENCRYPTION_KEY env var.
    """

    name          = models.CharField(max_length=150, help_text="Display name, e.g. 'Equity Bank Kenya'")
    provider_code = models.CharField(max_length=30, choices=PROVIDER_CODES, default='custom')
    country       = models.CharField(max_length=10, choices=COUNTRIES)
    environment   = models.CharField(max_length=10, choices=ENVIRONMENTS, default='sandbox')
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')

    # ── API Credentials (encrypted at rest) ──────────────────────────────────
    api_key       = EncryptedTextField(blank=True, help_text="API key / Consumer key")
    api_secret    = EncryptedTextField(blank=True, help_text="API secret / Consumer secret")
    merchant_code = models.CharField(max_length=100, blank=True, help_text="Merchant / business code")
    extra_config  = EncryptedJSONField(default=dict, blank=True,
                                       help_text="Provider-specific extras (e.g. RSA private key, paybill)")

    # ── Endpoints ─────────────────────────────────────────────────────────────
    base_url      = models.URLField(blank=True, help_text="Provider API base URL (sandbox or live)")
    webhook_url   = models.URLField(blank=True, help_text="Our webhook URL registered with the provider")
    webhook_secret = EncryptedTextField(blank=True, help_text="Secret used to verify inbound webhook signatures")

    # ── Capabilities ──────────────────────────────────────────────────────────
    supports_collections    = models.BooleanField(default=True)
    supports_disbursements  = models.BooleanField(default=True)
    supports_mobile_money   = models.BooleanField(default=True,
                                                   help_text="Provider natively bridges to mobile money (e.g. Jenga → M-Pesa)")
    supported_mobile_methods = models.JSONField(default=list, blank=True,
                                                 help_text="e.g. ['mpesa', 'airtel'] — methods bridged via this bank")

    # ── Management metadata ───────────────────────────────────────────────────
    configured_by     = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT,
        null=True, related_name='configured_providers'
    )
    last_tested_at    = models.DateTimeField(null=True, blank=True)
    last_test_status  = models.CharField(max_length=20, blank=True)   # ok | error | timeout
    last_test_message = models.TextField(blank=True)
    notes             = models.TextField(blank=True)

    class Meta:
        db_table = 'payment_bank_provider'
        ordering = ['country', 'name']
        unique_together = [('country', 'provider_code', 'environment')]

    def __str__(self):
        return f"{self.name} [{self.country.upper()} / {self.environment}]"

    @property
    def is_live(self):
        return self.environment == 'live'

    @property
    def is_active(self):
        return self.status == 'active'


class PaymentProviderAccount(BaseModel):
    """
    Bank or wallet account attached to a provider configuration.

    Jenga can expose multiple useful accounts for the same integration:
    collection, payout, trust/custody, settlement/clearing, wallet, and
    reconciliation accounts. Keeping them typed prevents hidden assumptions in
    provider code and lets the admin console rotate sandbox/live account maps.
    """
    ACCOUNT_TYPES = [
        ('collection', 'Collection'),
        ('payout', 'Payout'),
        ('trust', 'Trust / Custody'),
        ('settlement', 'Settlement / Clearing'),
        ('wallet', 'Jenga Wallet'),
        ('reconciliation', 'Reconciliation'),
        ('fee', 'Fee / Revenue'),
    ]

    provider = models.ForeignKey(BankProvider, on_delete=models.PROTECT, related_name='accounts')
    label = models.CharField(max_length=120)
    account_type = models.CharField(max_length=30, choices=ACCOUNT_TYPES)
    account_number = models.CharField(max_length=100)
    account_name = models.CharField(max_length=160, blank=True)
    country_code = models.CharField(max_length=5, default='KE')
    currency = models.CharField(max_length=5, default='KES')
    bank_code = models.CharField(max_length=20, blank=True)
    branch_code = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    is_default_for_collections = models.BooleanField(default=False)
    is_default_for_disbursements = models.BooleanField(default=False)
    is_default_for_reconciliation = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'payment_provider_account'
        ordering = ['provider', 'account_type', 'label']
        unique_together = [('provider', 'account_number', 'account_type')]
        indexes = [
            models.Index(fields=['provider', 'account_type', 'is_active']),
            models.Index(fields=['provider', 'is_default_for_collections']),
            models.Index(fields=['provider', 'is_default_for_disbursements']),
            models.Index(fields=['provider', 'is_default_for_reconciliation']),
        ]

    def __str__(self):
        return f"{self.provider.name} {self.account_type}: {self.account_number}"


class ProviderApiLog(BaseModel):
    """
    Append-only log of every API call made through each provider.
    Enables super admin to audit all payment gateway traffic.
    """
    provider      = models.ForeignKey(BankProvider, on_delete=models.PROTECT, related_name='api_logs')
    direction     = models.CharField(max_length=10, choices=[('outbound', 'Outbound'), ('inbound', 'Inbound')])
    endpoint      = models.CharField(max_length=500)
    method        = models.CharField(max_length=10)
    request_body  = models.JSONField(default=dict, blank=True)
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.JSONField(default=dict, blank=True)
    duration_ms   = models.IntegerField(null=True, blank=True)
    success       = models.BooleanField(default=False)
    reference     = models.CharField(max_length=255, blank=True)  # contribution/loan/payout ref
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'payment_provider_api_log'
        ordering = ['-created_at']


class ProviderTransaction(BaseModel):
    """
    Provider-facing transaction state machine.

    This is not the product ledger. It records the external Jenga/Equity
    processing state that must later reconcile to immutable ledger event groups.
    """
    DIRECTIONS = [('inbound', 'Inbound'), ('outbound', 'Outbound')]
    STATUSES = [
        ('created', 'Created'),
        ('request_signed', 'Request Signed'),
        ('submitted', 'Submitted'),
        ('acknowledged', 'Acknowledged'),
        ('pending_customer_action', 'Pending Customer Action'),
        ('provider_processing', 'Provider Processing'),
        ('awaiting_third_party_settlement', 'Awaiting Third Party Settlement'),
        ('settled', 'Settled'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
        ('settlement_exception', 'Settlement Exception'),
        ('reversed', 'Reversed'),
        ('manual_review', 'Manual Review'),
    ]

    provider = models.ForeignKey(BankProvider, on_delete=models.PROTECT, related_name='transactions')
    direction = models.CharField(max_length=10, choices=DIRECTIONS)
    channel = models.CharField(max_length=40)
    country = models.CharField(max_length=10)
    currency = models.CharField(max_length=5)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    fee_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    internal_reference = models.CharField(max_length=255, unique=True)
    provider_reference = models.CharField(max_length=255, blank=True)
    provider_transaction_id = models.CharField(max_length=255, blank=True)
    source_account = models.CharField(max_length=100, blank=True)
    destination_account = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=40, choices=STATUSES, default='created')
    linked_model = models.CharField(max_length=80, blank=True)
    linked_object_id = models.CharField(max_length=80, blank=True)
    raw_request_checksum = models.CharField(max_length=64, blank=True)
    raw_response_checksum = models.CharField(max_length=64, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    final_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'payment_provider_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider', 'status']),
            models.Index(fields=['provider_reference']),
            models.Index(fields=['provider_transaction_id']),
            models.Index(fields=['country', 'channel', 'status']),
        ]


class ProviderCallback(BaseModel):
    provider = models.ForeignKey(BankProvider, on_delete=models.PROTECT, related_name='callbacks')
    provider_transaction = models.ForeignKey(
        ProviderTransaction,
        on_delete=models.PROTECT,
        related_name='callbacks',
        null=True,
        blank=True,
    )
    callback_type = models.CharField(max_length=80, blank=True)
    provider_reference = models.CharField(max_length=255, blank=True)
    payload_checksum = models.CharField(max_length=64)
    payload = models.JSONField(default=dict, blank=True)
    normalized_status = models.CharField(max_length=40, blank=True)
    is_duplicate = models.BooleanField(default=False)

    class Meta:
        db_table = 'payment_provider_callback'
        ordering = ['-created_at']
        unique_together = [('provider', 'payload_checksum')]


class ProviderStatementLine(BaseModel):
    provider = models.ForeignKey(BankProvider, on_delete=models.PROTECT, related_name='statement_lines')
    account_number = models.CharField(max_length=100)
    transaction_id = models.CharField(max_length=255, blank=True)
    reference = models.CharField(max_length=255, blank=True)
    serial = models.CharField(max_length=255, blank=True)
    posted_date_time = models.CharField(max_length=80, blank=True)
    transaction_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    direction = models.CharField(max_length=10, choices=[('credit', 'Credit'), ('debit', 'Debit')])
    running_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=5, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    matched_status = models.CharField(
        max_length=30,
        choices=[('unmatched', 'Unmatched'), ('matched', 'Matched'), ('exception', 'Exception')],
        default='unmatched',
    )

    class Meta:
        db_table = 'payment_provider_statement_line'
        ordering = ['-posted_date_time', '-created_at']
        indexes = [
            models.Index(fields=['provider', 'account_number']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['reference']),
            models.Index(fields=['matched_status']),
        ]
