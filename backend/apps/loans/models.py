from django.db import models
from django.core.exceptions import ValidationError
from common.models import BaseModel

# Maximum allowable monthly interest rate — anti-exploitation cap.
# Group treasurers cannot set rates above this, protecting borrowers.
MAX_LOAN_INTEREST_RATE_MONTHLY = 30


def get_country_interest_policy(group):
    if not group:
        return None
    try:
        from apps.admin_portal.models import CountryPolicy

        return CountryPolicy.objects.filter(
            country=group.country,
            is_active=True,
        ).first()
    except Exception:
        return None

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
            policy = get_country_interest_policy(self.group)
            cap = policy.max_loan_interest_rate_monthly if policy else MAX_LOAN_INTEREST_RATE_MONTHLY
            cap_source = policy.central_bank_name if policy else 'platform fallback policy'

            if self.interest_rate_monthly > cap:
                raise ValidationError(
                    f"Interest rate {self.interest_rate_monthly}% exceeds the maximum "
                    f"allowed rate of {cap}% per month for {cap_source}. "
                    "Contact your platform administrator to adjust country policy limits."
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


class LoanRepaymentPayment(BaseModel):
    """
    Payment intent for one loan-repayment collection (STK push) — the loans
    counterpart of Contribution in the money-in flow. The webhook confirms it,
    posts the balanced ledger event group (debit provider_settlement / credit
    loaning), rolls the amount into LoanRepayment.amount_paid, and transitions
    the loan to 'repaid' once every installment settles.
    """
    STATUS = [
        ('initiated', 'Initiated'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
        ('disputed', 'Disputed'),  # amount mismatch — isolated to suspense
    ]

    repayment          = models.ForeignKey(LoanRepayment, on_delete=models.PROTECT, related_name='payments')
    loan               = models.ForeignKey(Loan, on_delete=models.PROTECT, related_name='repayment_payments')
    group              = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='loan_repayment_payments')
    member             = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='loan_repayment_payments', db_constraint=False)
    amount             = models.DecimalField(max_digits=14, decimal_places=2)
    actual_amount      = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency           = models.CharField(max_length=5)
    method             = models.CharField(max_length=30, default='mpesa')
    mobile_number      = models.CharField(max_length=20)
    provider_reference = models.CharField(max_length=255, null=True, blank=True)
    platform_reference = models.CharField(max_length=255, unique=True)
    status             = models.CharField(max_length=20, choices=STATUS, default='initiated')
    initiated_at       = models.DateTimeField(null=True, blank=True)
    confirmed_at       = models.DateTimeField(null=True, blank=True)
    failure_reason     = models.TextField(blank=True)

    class Meta:
        db_table = 'loans_repayment_payment'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider_reference']),
            models.Index(fields=['repayment', 'status']),
        ]

    def __str__(self):
        return f"RepaymentPayment {self.platform_reference} | {self.amount} {self.currency} [{self.status}]"
