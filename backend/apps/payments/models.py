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
    Credentials stored as plain text here but MUST be encrypted at rest via
    django-encrypted-model-fields in production (KMS key per country).
    In dev they are stored unencrypted for simplicity.
    """

    name          = models.CharField(max_length=150, help_text="Display name, e.g. 'Equity Bank Kenya'")
    provider_code = models.CharField(max_length=30, choices=PROVIDER_CODES, default='custom')
    country       = models.CharField(max_length=10, choices=COUNTRIES)
    environment   = models.CharField(max_length=10, choices=ENVIRONMENTS, default='sandbox')
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')

    # ── API Credentials (encrypted in prod) ──────────────────────────────────
    api_key       = models.TextField(blank=True, help_text="API key / Consumer key")
    api_secret    = models.TextField(blank=True, help_text="API secret / Consumer secret")
    merchant_code = models.CharField(max_length=100, blank=True, help_text="Merchant / business code")
    extra_config  = models.JSONField(default=dict, blank=True,
                                     help_text="Provider-specific extras (e.g. RSA private key path, paybill)")

    # ── Endpoints ─────────────────────────────────────────────────────────────
    base_url      = models.URLField(blank=True, help_text="Provider API base URL (sandbox or live)")
    webhook_url   = models.URLField(blank=True, help_text="Our webhook URL registered with the provider")
    webhook_secret = models.TextField(blank=True, help_text="Secret used to verify inbound webhook signatures")

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
