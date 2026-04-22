"""
PenaltyService test suite.
Tests late contribution penalty logic including idempotency.
Satisfies Financial Engine Checklist §9 (Defaults & Penalties).
"""
import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone


def _make_penalty_rule(group, grace_days=0, penalty_type='fixed', value='500'):
    from apps.groups.models import PenaltyRule
    return PenaltyRule.objects.create(
        group=group,
        rule_type='late_contribution',
        penalty_type=penalty_type,
        value=Decimal(value),
        grace_period_days=grace_days,
    )


@pytest.mark.django_db
class TestPenaltyService:

    def test_on_time_contribution_no_penalty(self, group, contribution_confirmed):
        """
        A contribution confirmed on its scheduled_date must NOT create a Penalty.
        Satisfies: grace_period_days=0, confirmed same day.
        """
        from apps.contributions.services.penalty_service import PenaltyService

        _make_penalty_rule(group, grace_days=0)
        # Contribution's scheduled_date == today (set in fixture), confirmed today.

        penalty = PenaltyService.apply_late_penalty(contribution_confirmed)
        assert penalty is None

    def test_late_contribution_creates_penalty(self, group, contribution_confirmed):
        """
        A contribution confirmed 5 days after the scheduled_date (grace=0)
        must create a Penalty record.
        Satisfies Financial Engine Checklist §52: Late contribution penalty applied.
        """
        from apps.contributions.services.penalty_service import PenaltyService

        _make_penalty_rule(group, grace_days=0, penalty_type='fixed', value='500')

        # Simulate lateness: scheduled 5 days ago
        contribution_confirmed.scheduled_date = (timezone.now() - timedelta(days=5)).date()
        contribution_confirmed.save(update_fields=['scheduled_date'])

        penalty = PenaltyService.apply_late_penalty(contribution_confirmed)
        assert penalty is not None
        assert penalty.amount == Decimal('500.00')
        assert penalty.status == 'pending'

    def test_within_grace_period_no_penalty(self, group, contribution_confirmed):
        """
        A contribution confirmed 2 days late, but grace period is 3 days.
        Must NOT create a Penalty.
        """
        from apps.contributions.services.penalty_service import PenaltyService

        _make_penalty_rule(group, grace_days=3)

        contribution_confirmed.scheduled_date = (timezone.now() - timedelta(days=2)).date()
        contribution_confirmed.save(update_fields=['scheduled_date'])

        penalty = PenaltyService.apply_late_penalty(contribution_confirmed)
        assert penalty is None

    def test_percentage_penalty_calculated_correctly(self, group, contribution_confirmed):
        """
        Percentage-type penalty: contribution=5000, rate=10% → penalty=500.
        """
        from apps.contributions.services.penalty_service import PenaltyService

        _make_penalty_rule(group, grace_days=0, penalty_type='percentage', value='10')

        contribution_confirmed.scheduled_date = (timezone.now() - timedelta(days=3)).date()
        contribution_confirmed.save(update_fields=['scheduled_date'])

        penalty = PenaltyService.apply_late_penalty(contribution_confirmed)
        assert penalty is not None
        assert penalty.amount == Decimal('500.00')  # 10% of 5000

    def test_penalty_is_idempotent(self, group, contribution_confirmed):
        """
        Calling apply_late_penalty twice must create exactly ONE Penalty record.
        Satisfies Financial Engine Checklist §12: All financial calculations deterministic.
        """
        from apps.contributions.services.penalty_service import PenaltyService
        from apps.contributions.models import Penalty

        _make_penalty_rule(group, grace_days=0)
        contribution_confirmed.scheduled_date = (timezone.now() - timedelta(days=3)).date()
        contribution_confirmed.save(update_fields=['scheduled_date'])

        PenaltyService.apply_late_penalty(contribution_confirmed)
        PenaltyService.apply_late_penalty(contribution_confirmed)  # Called twice

        count = Penalty.objects.filter(contribution=contribution_confirmed).count()
        assert count == 1  # Strictly one — idempotent

    def test_no_rule_no_penalty(self, group, contribution_confirmed):
        """
        When no PenaltyRule exists for the group, no penalty is applied.
        Graceful no-op — not an error.
        """
        from apps.contributions.services.penalty_service import PenaltyService

        # No rule created
        contribution_confirmed.scheduled_date = (timezone.now() - timedelta(days=5)).date()
        contribution_confirmed.save(update_fields=['scheduled_date'])

        penalty = PenaltyService.apply_late_penalty(contribution_confirmed)
        assert penalty is None
