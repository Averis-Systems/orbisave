import uuid
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone
from common.fields import EncryptedTextField
from common.models import BaseModel

class SystemConfiguration(BaseModel):
    """
    Global platform settings and API credentials.
    Enables 'Plug and Play' API management (Google Translate, Jenga, etc.)
    entirely from the Console.
    """
    CATEGORY_CHOICES = [
        ('platform', 'Platform Core'),
        ('api_data', 'Data & Translation APIs'),
        ('api_billing', 'Billing & Payment APIs'),
        ('regional', 'Regional Defaults'),
    ]

    key          = models.CharField(max_length=100, unique=True, help_text="Config key, e.g. 'google_translate_api_key'")
    value        = models.TextField(blank=True, help_text="Config value (encrypted if sensitive)")
    category     = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='platform')
    description  = models.TextField(blank=True)
    is_encrypted = models.BooleanField(default=False, help_text="Whether this value is encrypted at rest")
    is_public    = models.BooleanField(default=False, help_text="If true, exposed to lower-level dashboards (manager/user)")

    class Meta:
        db_table = 'system_configuration'
        ordering = ['category', 'key']

    def __str__(self):
        return f"{self.key} ({self.category})"

    @classmethod
    def get_value(cls, key, default=None):
        """
        Resolve a config value, transparently decrypting encrypted entries —
        the read API for service code (e.g. the translation client).
        """
        from common.encryption import decrypt_value
        config = cls.objects.filter(key=key).first()
        if config is None or not config.value:
            return default
        return decrypt_value(config.value)


class KYCProviderConfiguration(BaseModel):
    """
    Super-admin managed identity provider credentials.

    Secret values are write-only through the API and represented as masked
    booleans in read responses. This keeps Didit wiring ready without exposing
    raw credentials back to the console.
    """
    PROVIDER_CHOICES = [
        ('didit', 'Didit'),
        ('custom', 'Custom / Other'),
    ]
    ENVIRONMENT_CHOICES = [('sandbox', 'Sandbox'), ('live', 'Live')]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('testing', 'Testing'),
        ('error', 'Error'),
    ]

    name = models.CharField(max_length=150)
    provider_code = models.CharField(max_length=30, choices=PROVIDER_CHOICES, default='didit')
    environment = models.CharField(max_length=10, choices=ENVIRONMENT_CHOICES, default='sandbox')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    base_url = models.URLField(blank=True, default='https://verification.didit.me')
    workflow_id = models.CharField(max_length=120, blank=True)
    client_id = models.CharField(max_length=255, blank=True)
    client_secret = EncryptedTextField(blank=True)
    webhook_url = models.URLField(blank=True)
    webhook_secret = EncryptedTextField(blank=True)
    allowed_events = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    configured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='configured_kyc_providers',
    )
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_status = models.CharField(max_length=20, blank=True)
    last_test_message = models.TextField(blank=True)

    class Meta:
        db_table = 'kyc_provider_configuration'
        ordering = ['provider_code', 'environment', 'name']
        unique_together = [('provider_code', 'environment')]

    def __str__(self):
        return f"{self.name} [{self.provider_code}/{self.environment}]"


class MeetingProviderConfiguration(BaseModel):
    """
    Super-admin managed meeting provider credentials.

    OrbiSave uses Daily.co as the single embedded meeting provider. Raw
    provider credentials stay in the console and are never returned by read APIs.
    """
    PROVIDER_CHOICES = [
        ('daily', 'Daily.co'),
    ]
    ENVIRONMENT_CHOICES = [('sandbox', 'Sandbox'), ('live', 'Live')]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('testing', 'Testing'),
        ('error', 'Error'),
    ]

    name = models.CharField(max_length=150)
    provider_code = models.CharField(max_length=30, choices=PROVIDER_CHOICES, default='daily')
    environment = models.CharField(max_length=10, choices=ENVIRONMENT_CHOICES, default='sandbox')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    base_url = models.URLField(blank=True, default='https://api.daily.co/v1')
    api_key = EncryptedTextField(blank=True)
    webhook_url = models.URLField(blank=True)
    webhook_secret = EncryptedTextField(blank=True)
    allowed_events = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    configured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='configured_meeting_providers',
    )
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_status = models.CharField(max_length=20, blank=True)
    last_test_message = models.TextField(blank=True)

    class Meta:
        db_table = 'meeting_provider_configuration'
        ordering = ['provider_code', 'environment', 'name']
        unique_together = [('provider_code', 'environment')]

    def __str__(self):
        return f"{self.name} [{self.provider_code}/{self.environment}]"


class NotificationProviderConfiguration(BaseModel):
    """
    Super-admin managed SMS/notification provider credentials (Africa's
    Talking first). Same console-managed, encrypted-at-rest pattern as the
    payment/KYC/meeting providers: no env-file credentials, kill-switchable,
    testable. OTP delivery (signup verification, password reset) resolves the
    active provider at send time; with none active, dev environments fall
    back to logging the message.
    """
    PROVIDER_CHOICES = [
        ('africastalking', "Africa's Talking"),
        ('custom', 'Custom / Other'),
    ]
    ENVIRONMENT_CHOICES = [('sandbox', 'Sandbox'), ('live', 'Live')]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('testing', 'Testing'),
        ('error', 'Error'),
    ]

    name = models.CharField(max_length=150)
    provider_code = models.CharField(max_length=30, choices=PROVIDER_CHOICES, default='africastalking')
    environment = models.CharField(max_length=10, choices=ENVIRONMENT_CHOICES, default='sandbox')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    username = models.CharField(max_length=150, blank=True, help_text="Provider account username (AT: 'sandbox' for sandbox)")
    api_key = EncryptedTextField(blank=True)
    sender_id = models.CharField(max_length=30, blank=True, help_text="Registered SMS sender ID / shortcode")
    notes = models.TextField(blank=True)
    configured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='configured_notification_providers',
    )
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_status = models.CharField(max_length=20, blank=True)
    last_test_message = models.TextField(blank=True)

    class Meta:
        db_table = 'notification_provider_configuration'
        ordering = ['provider_code', 'environment', 'name']
        unique_together = [('provider_code', 'environment')]

    def __str__(self):
        return f"{self.name} [{self.provider_code}/{self.environment}]"


class PlatformBranding(BaseModel):
    """
    Singleton: the platform-wide logo and favicon, editable by super_admin
    from Console, served publicly (unauthenticated) so all three frontends
    (member, Console, Manager) can fetch it before login. Falls back to each
    app's built-in static branding (Logo.tsx, favicon.ico) when unset.
    """
    logo = models.ImageField(upload_to='branding/', null=True, blank=True)
    favicon = models.ImageField(upload_to='branding/', null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='platform_branding_updates',
    )

    class Meta:
        db_table = 'platform_branding'

    def __str__(self):
        return 'Platform branding'

    @classmethod
    def current(cls):
        obj = cls.objects.order_by('created_at').first()
        return obj if obj is not None else cls.objects.create()


class CountryPolicy(BaseModel):
    """
    Super-admin managed country policy guardrails.

    Loan interest caps are policy data because national guidance changes over
    time. Group-voted rates must remain below the active country cap.
    """
    COUNTRIES = [('kenya', 'Kenya'), ('rwanda', 'Rwanda'), ('ghana', 'Ghana')]

    country = models.CharField(max_length=10, choices=COUNTRIES, unique=True)
    currency = models.CharField(max_length=5)
    central_bank_name = models.CharField(max_length=150)
    max_loan_interest_rate_monthly = models.DecimalField(max_digits=5, decimal_places=2)
    recommended_loan_interest_rate_monthly = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    source_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='updated_country_policies',
    )

    class Meta:
        db_table = 'country_policy'
        ordering = ['country']

    def __str__(self):
        return f"{self.country} policy cap ({self.max_loan_interest_rate_monthly}% monthly)"


class AdminEmailVerification(BaseModel):
    PURPOSE_CHOICES = [
        ('admin_registration', 'Admin Registration'),
        ('admin_password_reset', 'Admin Password Reset'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_email_verifications',
    )
    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=255)
    purpose = models.CharField(max_length=40, choices=PURPOSE_CHOICES, default='admin_registration')
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)

    class Meta:
        db_table = 'admin_email_verification'
        ordering = ['-created_at']

    def set_code(self, code):
        self.code_hash = make_password(code)

    def verify_code(self, code):
        if self.used_at or timezone.now() > self.expires_at:
            return False
        if self.attempt_count >= self.max_attempts:
            return False
        self.attempt_count += 1
        is_valid = check_password(code, self.code_hash)
        if is_valid:
            self.used_at = timezone.now()
        self.save(update_fields=['attempt_count', 'used_at', 'updated_at'])
        return is_valid
