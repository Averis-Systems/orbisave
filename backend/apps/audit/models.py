from django.db import models
from common.models import BaseModel

class AuditLog(BaseModel):
    # NOTE: Django does not validate CharField choices on .save(), so drift
    # between this list and log_audit() call sites is SILENT. Keep them in
    # sync — the admin audit UI filters by these labels. (2026-07-04: nine
    # in-use actions were missing and have been added below.)
    ACTION_TYPES = [
        ('user_login','User Login'), ('user_logout','User Logout'),
        ('kyc_submitted','KYC Submitted'), ('kyc_verified','KYC Verified'), ('kyc_rejected','KYC Rejected'),
        ('group_created','Group Created'), ('group_paused','Group Paused'), ('group_closed','Group Closed'),
        ('group_activated','Group Activated'), ('group_verified','Group Verified'), ('group_rejected','Group Rejected'),
        ('member_joined','Member Joined'), ('member_suspended','Member Suspended'), ('member_reinstated','Member Reinstated'),
        ('member_exited','Member Exited'),
        ('contribution_scheduled','Contribution Scheduled'), ('contribution_initiated','Contribution Initiated'),
        ('contribution_confirmed','Contribution Confirmed'), ('contribution_failed','Contribution Failed'),
        ('loan_requested','Loan Requested'), ('loan_approved','Loan Approved'), ('loan_rejected','Loan Rejected'),
        ('loan_chair_approved','Loan Chair Approved'),
        ('loan_chair_rejected','Loan Chair Rejected'), ('loan_treasurer_approved','Loan Treasurer Approved'),
        ('loan_treasurer_rejected','Loan Treasurer Rejected'), ('loan_admin_approved','Loan Admin Approved'),
        ('loan_admin_rejected','Loan Admin Rejected'), ('loan_disbursed','Loan Disbursed'),
        ('loan_repayment_received','Loan Repayment Received'), ('payout_processed','Payout Processed'),
        ('payout_triggered','Payout Triggered (legacy)'),  # historical rows from the removed endpoint
        ('invite_sent','Invite Sent'), ('invite_accepted','Invite Accepted'),
        ('reconciliation_item_action','Reconciliation Item Action'),
        ('admin_action','Admin Action'), ('transaction_pin_changed','Transaction PIN Changed'),
        ('transaction_pin_instantiated','Transaction PIN Instantiated'),
        ('phone_verified','Phone Verified'), ('password_reset','Password Reset'),
        ('password_changed','Password Changed'), ('2fa_enabled','2FA Enabled'), ('2fa_disabled','2FA Disabled'),
    ]
    action       = models.CharField(max_length=50, choices=ACTION_TYPES)
    actor        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True)
    target_user  = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='audit_targets')
    target_group = models.ForeignKey('groups.Group', on_delete=models.PROTECT, null=True, blank=True, db_constraint=False)
    country      = models.CharField(max_length=10, null=True, blank=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    user_agent   = models.TextField(null=True, blank=True)
    metadata     = models.JSONField(default=dict)
    previous_state = models.JSONField(null=True, blank=True, help_text="State of the object before mutation")
    new_state    = models.JSONField(null=True, blank=True, help_text="State of the object after mutation")
    session_id   = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'audit_log'

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise PermissionError("Audit log entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Audit log entries cannot be deleted.")
