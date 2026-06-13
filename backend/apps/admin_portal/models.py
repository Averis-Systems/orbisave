import uuid
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone
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


class AdminEmailVerification(BaseModel):
    PURPOSE_CHOICES = [
        ('admin_registration', 'Admin Registration'),
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
