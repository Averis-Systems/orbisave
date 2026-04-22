import secrets
from django.db import models
from django.utils import timezone
from common.models import BaseModel

class Group(BaseModel):
    CONTRIBUTION_FREQUENCY = [
        ('weekly','Weekly'), ('biweekly','Bi-weekly'),
        ('monthly','Monthly'), ('harvest','Harvest Season'),
    ]
    ROTATION_METHODS = [
        ('sequential','Sequential'), ('random','Random Draw'), ('manual','Manual'),
    ]
    STATUS   = [('active','Active'), ('paused','Paused'), ('closed','Closed')]
    COUNTRIES = [('kenya','Kenya'), ('rwanda','Rwanda'), ('ghana','Ghana')]

    name                      = models.CharField(max_length=255)
    description               = models.TextField(blank=True)
    country                   = models.CharField(max_length=10, choices=COUNTRIES)
    chairperson               = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='chaired_groups')
    treasurer                 = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='treasured_groups', null=True, blank=True)
    max_members               = models.PositiveIntegerField(default=20)
    contribution_amount       = models.DecimalField(max_digits=14, decimal_places=2)
    contribution_frequency    = models.CharField(max_length=20, choices=CONTRIBUTION_FREQUENCY)
    contribution_day          = models.PositiveIntegerField()
    harvest_start_month       = models.PositiveIntegerField(null=True, blank=True)
    harvest_end_month         = models.PositiveIntegerField(null=True, blank=True)
    rotation_savings_pct      = models.DecimalField(max_digits=5, decimal_places=2, default=70)
    loan_pool_pct             = models.DecimalField(max_digits=5, decimal_places=2, default=30)
    max_loan_multiplier       = models.DecimalField(max_digits=5, decimal_places=2, default=3)
    loan_term_weeks           = models.PositiveIntegerField(default=12)
    loan_interest_rate_monthly = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    rotation_method           = models.CharField(max_length=20, choices=ROTATION_METHODS, default='sequential')
    status                    = models.CharField(max_length=20, choices=STATUS, default='active')
    invite_code               = models.CharField(max_length=50, unique=True, blank=True)
    invite_expires_at         = models.DateTimeField(null=True, blank=True)
    currency                  = models.CharField(max_length=5)  # KES | RWF | GHS
    trust_account_ref         = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'groups_group'

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(20)
        from datetime import timedelta
        if not self.invite_expires_at:
            self.invite_expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class GroupMember(BaseModel):
    # 'exited' replaces old 'left' for consistency with the financial engine checklist.
    # 'deceased' added as required by Section 8 (Member State Management).
    STATUS = [
        ('active','Active'),
        ('suspended','Suspended'),
        ('exited','Exited'),
        ('deceased','Deceased'),
    ]
    ROLE_CHOICES = [('member', 'Member'), ('chairperson', 'Chairperson'), ('treasurer', 'Treasurer')]

    # Cross-DB FK: accounts.User lives in 'default' DB; financial data in country DBs.
    # db_constraint=False prevents IntegrityError on country-specific DB migrations.
    group             = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    member            = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='group_memberships', db_constraint=False
    )
    role              = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    rotation_position = models.PositiveIntegerField(null=True, blank=True)
    status            = models.CharField(max_length=20, choices=STATUS, default='active')
    joined_at         = models.DateTimeField(auto_now_add=True)
    exited_at         = models.DateTimeField(null=True, blank=True)  # Renamed from left_at
    suspension_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'groups_member'
        unique_together = [('group', 'member')]

    def __str__(self):
        return f"{self.member_id} in {self.group.name} [{self.role}]"

class GroupInvite(BaseModel):
    STATUS = [('pending','Pending'), ('accepted','Accepted'), ('expired','Expired'), ('cancelled','Cancelled')]
    group        = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='invites')
    invited_by   = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, db_constraint=False
    )
    contact      = models.CharField(max_length=255)
    contact_type = models.CharField(max_length=10)  # email | phone
    token        = models.CharField(max_length=255, unique=True)
    status       = models.CharField(max_length=20, choices=STATUS, default='pending')
    accepted_by  = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accepted_invites', db_constraint=False
    )
    expires_at   = models.DateTimeField()
    accepted_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'groups_invite'

class RotationCycle(BaseModel):
    STATUS = [('open', 'Open'), ('completed', 'Completed'), ('locked', 'Locked')]
    group              = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='cycles')
    cycle_number       = models.PositiveIntegerField()
    start_date         = models.DateField()
    end_date           = models.DateField()
    is_current         = models.BooleanField(default=False)
    status             = models.CharField(max_length=20, choices=STATUS, default='open')
    total_contributions = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_payouts       = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'groups_rotation_cycle'
        unique_together = ('group', 'cycle_number')

    def __str__(self):
        return f"Cycle {self.cycle_number} for {self.group.name}"

class RotationSchedule(BaseModel):
    group                 = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='payout_schedules')
    # db_constraint=False: member lives in default DB; rotation records in country DB.
    member                = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_constraint=False
    )
    cycle_number          = models.PositiveIntegerField()
    scheduled_payout_date = models.DateField()
    is_paid_out           = models.BooleanField(default=False)

    class Meta:
        db_table = 'groups_rotation_schedule'
        # One slot per member per group cycle — each member receives exactly once per cycle.
        unique_together = [('group', 'cycle_number', 'member')]

    def __str__(self):
        return f"Member {self.member_id} — Cycle {self.cycle_number} ({self.group.name})"

class PenaltyRule(BaseModel):
    RULE_TYPES = [('late_contribution', 'Late Contribution'), ('missed_meeting', 'Missed Meeting'), ('loan_default', 'Loan Default')]
    PENALTY_TYPES = [('fixed', 'Fixed Amount'), ('percentage', 'Percentage of Amount')]
    group             = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='penalty_rules')
    rule_type         = models.CharField(max_length=30, choices=RULE_TYPES)
    penalty_type      = models.CharField(max_length=20, choices=PENALTY_TYPES)
    value             = models.DecimalField(max_digits=14, decimal_places=2)
    grace_period_days = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'groups_penalty_rule'

    def __str__(self):
        return f"{self.rule_type} penalty for {self.group.name}"
