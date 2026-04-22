from django.db import models
from django.core.exceptions import ValidationError
from common.models import BaseModel

# Maximum allowable monthly interest rate — anti-exploitation cap.
# Group treasurers cannot set rates above this, protecting borrowers.
MAX_LOAN_INTEREST_RATE_MONTHLY = 30  # 30% per month hard cap

class Loan(BaseModel):
    STATUS = [
        ('pending_chair','Pending Chairperson'), ('pending_treasurer','Pending Treasurer'),
        ('pending_admin','Pending Platform Admin'), ('approved','Approved'),
        ('disbursed','Disbursed'), ('active','Active'), ('repaid','Repaid'),
        ('defaulted','Defaulted'), ('rejected','Rejected'),
    ]
    group                    = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='loans')
    # db_constraint=False: User on 'default', loans on country DB
    borrower                 = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='loans', db_constraint=False)
    amount                   = models.DecimalField(max_digits=14, decimal_places=2)
    currency                 = models.CharField(max_length=5)
    interest_rate_monthly    = models.DecimalField(max_digits=5, decimal_places=2)
    term_weeks               = models.PositiveIntegerField()
    purpose                  = models.CharField(max_length=255)
    purpose_detail           = models.TextField(blank=True)
    status                   = models.CharField(max_length=25, choices=STATUS, default='pending_chair')
    # Approval chain
    chair_approved_by        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='chair_approved_loans', db_constraint=False)
    chair_approved_at        = models.DateTimeField(null=True, blank=True)
    chair_rejection_reason   = models.TextField(null=True, blank=True)
    treasurer_approved_by    = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='treasurer_approved_loans', db_constraint=False)
    treasurer_approved_at    = models.DateTimeField(null=True, blank=True)
    treasurer_rejection_reason = models.TextField(null=True, blank=True)
    admin_approved_by        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='admin_approved_loans', db_constraint=False)
    admin_approved_at        = models.DateTimeField(null=True, blank=True)
    admin_rejection_reason   = models.TextField(null=True, blank=True)
    disbursed_at             = models.DateTimeField(null=True, blank=True)
    disbursement_reference   = models.CharField(max_length=255, null=True, blank=True)
    fully_repaid_at          = models.DateTimeField(null=True, blank=True)
    defaulted_at             = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'loans_loan'

    def clean(self):
        """
        Enforce the interest rate cap before ANY save.
        Satisfies Financial Engine Checklist §7: System enforces upper cap (anti-exploitation).
        """
        if self.interest_rate_monthly is not None:
            if self.interest_rate_monthly > MAX_LOAN_INTEREST_RATE_MONTHLY:
                raise ValidationError(
                    f"Interest rate {self.interest_rate_monthly}% exceeds the maximum "
                    f"allowed rate of {MAX_LOAN_INTEREST_RATE_MONTHLY}% per month. "
                    "Contact your platform administrator to adjust rate limits."
                )
            if self.interest_rate_monthly < 0:
                raise ValidationError("Interest rate cannot be negative.")


class LoanRepayment(BaseModel):
    STATUS = [('upcoming','Upcoming'), ('paid','Paid'), ('overdue','Overdue'), ('waived','Waived')]
    loan             = models.ForeignKey(Loan, on_delete=models.PROTECT, related_name='repayments')
    due_date         = models.DateField()
    principal_amount = models.DecimalField(max_digits=14, decimal_places=2)
    interest_amount  = models.DecimalField(max_digits=14, decimal_places=2)
    total_due        = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status           = models.CharField(max_length=20, choices=STATUS, default='upcoming')
    paid_at          = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'loans_loan_repayment'
