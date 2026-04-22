from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from common.models import BaseModel

class UserManager(BaseUserManager):
    def create_user(self, email, phone, full_name, password=None, **extra_fields):
        email = self.normalize_email(email)
        user = self.model(email=email, phone=phone, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, phone, full_name, password=None, **extra_fields):
        extra_fields.setdefault('role', 'super_admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, phone, full_name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    ROLES = [
        ('member', 'Member'),
        ('chairperson', 'Chairperson'),
        ('treasurer', 'Treasurer'),
        ('platform_admin', 'Platform Admin'),
        ('super_admin', 'Super Admin'),
    ]
    COUNTRIES = [('kenya','Kenya'), ('rwanda','Rwanda'), ('ghana','Ghana')]
    KYC_STATUS = [
        ('pending','Pending'), ('submitted','Submitted'),
        ('verified','Verified'), ('rejected','Rejected'),
    ]

    email                  = models.EmailField(unique=True)
    phone                  = models.CharField(max_length=20, unique=True)
    full_name              = models.CharField(max_length=255)
    date_of_birth          = models.DateField(null=True, blank=True)
    national_id            = models.CharField(max_length=50, null=True, blank=True)
    role                   = models.CharField(max_length=20, choices=ROLES, default='member')
    country                = models.CharField(max_length=10, choices=COUNTRIES, null=True, blank=True)
    avatar                 = models.ImageField(upload_to='avatars/', null=True, blank=True)
    kyc_status             = models.CharField(max_length=20, choices=KYC_STATUS, default='pending')
    kyc_provider_ref       = models.CharField(max_length=255, null=True, blank=True)
    phone_verified         = models.BooleanField(default=False)
    two_factor_enabled     = models.BooleanField(default=False)
    mobile_money_provider  = models.CharField(max_length=50, null=True, blank=True)
    mobile_money_number    = models.CharField(max_length=20, null=True, blank=True)
    is_active              = models.BooleanField(default=True)
    is_staff               = models.BooleanField(default=False)
    last_login_ip          = models.GenericIPAddressField(null=True, blank=True)
    next_of_kin_name       = models.CharField(max_length=255, blank=True)
    next_of_kin_phone      = models.CharField(max_length=20, blank=True)
    # Argon2id-hashed 4-digit PIN — SOLE transaction PIN field (transaction_pin_hash removed).
    transaction_pin        = models.CharField(max_length=255, blank=True, help_text="Argon2id hashed 4-digit transaction verification code")

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['phone', 'full_name']
    objects = UserManager()

    class Meta:
        db_table = 'accounts_user'

    def __str__(self): return f"{self.full_name} <{self.email}>"

class KYCDocument(BaseModel):
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kyc_documents')
    document_type   = models.CharField(max_length=50)  # national_id | passport | drivers_license
    front_image     = models.FileField(upload_to='kyc/front/')
    back_image      = models.FileField(upload_to='kyc/back/', null=True, blank=True)
    provider_job_id = models.CharField(max_length=255, null=True, blank=True)
    status          = models.CharField(max_length=20, default='pending')
    reviewed_at     = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_kyc_document'

class PhoneOTP(BaseModel):
    """One-time codes for phone number verification."""
    user           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='phone_otps')
    code           = models.CharField(max_length=6)
    expires_at     = models.DateTimeField()
    used           = models.BooleanField(default=False)
    attempt_count  = models.PositiveSmallIntegerField(default=0)
    max_attempts   = models.PositiveSmallIntegerField(default=5)

    class Meta:
        db_table = 'accounts_phone_otp'

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def is_exhausted(self):
        return self.attempt_count >= self.max_attempts

