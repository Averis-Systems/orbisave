import datetime
from decimal import Decimal
from django.db import transaction
from apps.loans.models import LoanRepayment

class LoanRepaymentService:
    @staticmethod
    def generate_repayments(loan):
        """
        Generates a series of interest-bearing repayments for a disbursed loan.
        Satisfies Financial Engine Checklist Item 133 & 146.
        """
        # Interest calculation (Simple Monthly Amortization)
        # Assuming term_weeks is converted to months for interest application
        months = max(1, loan.term_weeks // 4)
        total_interest = (loan.amount * loan.interest_rate_monthly * months) / Decimal('100.0')
        repayment_amount_total = loan.amount + total_interest
        
        monthly_principal = (loan.amount / Decimal(str(months))).quantize(Decimal('0.01'))
        monthly_interest = (total_interest / Decimal(str(months))).quantize(Decimal('0.01'))
        monthly_total = (repayment_amount_total / Decimal(str(months))).quantize(Decimal('0.01'))
        
        with transaction.atomic(using=loan.group.country):
            repayments = []
            for i in range(1, months + 1):
                # Simple 30-day schedule
                due_date = datetime.date.today() + datetime.timedelta(days=30 * i)
                repayments.append(LoanRepayment(
                    loan=loan,
                    due_date=due_date,
                    principal_amount=monthly_principal,
                    interest_amount=monthly_interest,
                    total_due=monthly_total,
                    status='upcoming'
                ))
            
            # Adjustment for rounding deltas on the final repayment
            if repayments:
                principal_delta = loan.amount - (monthly_principal * months)
                interest_delta = total_interest - (monthly_interest * months)
                repayments[-1].principal_amount += principal_delta
                repayments[-1].interest_amount += interest_delta
                repayments[-1].total_due += (principal_delta + interest_delta)
            
            LoanRepayment.objects.bulk_create(repayments)
            return len(repayments)
