from decimal import Decimal
from django.utils import timezone
from apps.contributions.models import Contribution, Penalty
from apps.groups.models import PenaltyRule


class PenaltyService:
    @staticmethod
    def apply_late_penalty(contribution: Contribution) -> 'Penalty | None':
        """
        Applies a late-contribution penalty if the member confirmed AFTER the grace period.

        Called immediately after a webhook confirms a contribution as 'confirmed'.
        Satisfies Financial Engine Checklist Items 52, 167, 168.

        BUG FIX: Previously the guard `if contribution.status == 'confirmed': return None`
        caused the method to always exit early — it is always called post-confirmation.
        Fixed to check confirmed_at vs scheduled_date to determine actual lateness.
        """
        # Only evaluate confirmed contributions (all other states are not eligible).
        if contribution.status != 'confirmed':
            return None

        rule = PenaltyRule.objects.filter(
            group=contribution.group,
            rule_type='late_contribution'
        ).first()
        if not rule:
            return None

        due_date = contribution.scheduled_date
        # Use confirmed_at.date() — when they actually paid — vs scheduled due_date.
        confirmed_date = (
            contribution.confirmed_at.date()
            if contribution.confirmed_at
            else timezone.now().date()
        )

        days_late = (confirmed_date - due_date).days
        if days_late <= rule.grace_period_days:
            return None  # Paid on time — no penalty

        # Calculate penalty amount
        if rule.penalty_type == 'fixed':
            penalty_amount = rule.value
        elif rule.penalty_type == 'percentage':
            penalty_amount = (contribution.amount * rule.value) / Decimal('100.0')
        else:
            return None

        # Strictly idempotent: one penalty per contribution/rule combination.
        penalty, _ = Penalty.objects.get_or_create(
            contribution=contribution,
            member=contribution.member,
            rule=rule,
            defaults={'amount': penalty_amount, 'status': 'pending'},
        )
        return penalty
