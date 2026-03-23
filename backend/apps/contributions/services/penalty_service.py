from decimal import Decimal
from django.utils import timezone
from apps.contributions.models import Contribution, Penalty
from apps.groups.models import PenaltyRule

class PenaltyService:
    @staticmethod
    def apply_late_penalty(contribution):
        """
        Checks if a contribution is past its grace period and applies a penalty.
        Satisfies Financial Engine Checklist Item 52, 167, and 168.
        """
        if contribution.status == 'confirmed':
            return None
            
        rule = PenaltyRule.objects.filter(
            group=contribution.group, 
            rule_type='late_contribution'
        ).first()
        
        if not rule:
            return None
            
        due_date = contribution.scheduled_date
        current_date = timezone.now().date()
        
        days_late = (current_date - due_date).days
        if days_late > rule.grace_period_days:
            # Calculate penalty amount
            penalty_amount = Decimal('0.00')
            if rule.penalty_type == 'fixed':
                penalty_amount = rule.value
            elif rule.penalty_type == 'percentage':
                penalty_amount = (contribution.amount * rule.value) / Decimal('100.0')
            
            # Maintain idempotency: one penalty record per contribution/rule combination
            penalty, created = Penalty.objects.update_or_create(
                contribution=contribution,
                member=contribution.member,
                rule=rule,
                defaults={'amount': penalty_amount}
            )
            return penalty
        return None
