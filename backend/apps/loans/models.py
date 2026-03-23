from django.db import models
from common.models import BaseModel

class Loan(BaseModel):
    STATUS = [
        ('pending_chair','Pending Chairperson'), ('pending_treasurer','Pending Treasurer'),
        ('pending_admin','Pending Platform Admin'), ('approved','Approved'),
        ('disbursed','Disbursed'), ('active','Active'), ('repaid','Repaid'),
        ('defaulted','Defaulted'), ('rejected','Rejected'),
    ]
    group                    = models.ForeignKey('groups.Group', on_delete=models.PROTECT, related_name='loans')
    borrower                 = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='loans')
    amount                   = models.DecimalField(max_digits=14, decimal_places=2)
    currency                 = models.CharField(max_length=5)
    interest_rate_monthly    = models.DecimalField(max_digits=5, decimal_places=2)
    term_weeks               = models.PositiveIntegerField()
    purpose                  = models.CharField(max_length=255)
    purpose_detail           = models.TextField(blank=True)
    status                   = models.CharField(max_length=25, choices=STATUS, default='pending_chair')
    # Approval chain
    chair_approved_by        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='chair_approved_loans')
    chair_approved_at        = models.DateTimeField(null=True, blank=True)
    chair_rejection_reason   = models.TextField(null=True, blank=True)
    treasurer_approved_by    = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='treasurer_approved_loans')
    treasurer_approved_at    = models.DateTimeField(null=True, blank=True)
    treasurer_rejection_reason = models.TextField(null=True, blank=True)
    admin_approved_by        = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True, related_name='admin_approved_loans')
    admin_approved_at        = models.DateTimeField(null=True, blank=True)
    admin_rejection_reason   = models.TextField(null=True, blank=True)
    disbursed_at             = models.DateTimeField(null=True, blank=True)
    disbursement_reference   = models.CharField(max_length=255, null=True, blank=True)
    fully_repaid_at          = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'loans_loan'

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
