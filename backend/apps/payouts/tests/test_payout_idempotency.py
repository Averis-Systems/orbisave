"""
Payout idempotency test suite.
Validates that duplicate payout requests for the same cycle+recipient
are safely blocked without creating duplicate records or ledger entries.
Satisfies Financial Engine Checklist §14 (Failure Handling — retry safely).
"""
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.core.cache import cache
from django.utils import timezone

from apps.groups.models import Group, GroupMember, RotationCycle


def _fund_rotation_pool(group, user, reference):
    from apps.ledger.services import append_ledger_entry

    cache.delete(f"group_wallet_{group.id}")
    return append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("10000.00"),
        currency=group.currency,
        description="Test funding for payout idempotency.",
        reference=reference,
    )


@pytest.fixture
def group(db, chairperson):
    return Group.objects.using("kenya").create(
        name='Payout Idempotency Chama',
        description='Automated payout idempotency group',
        country='kenya',
        currency='KES',
        max_members=10,
        contribution_amount=Decimal('5000.00'),
        contribution_frequency='monthly',
        contribution_day=1,
        rotation_savings_pct=Decimal('70'),
        loan_pool_pct=Decimal('30'),
        max_loan_multiplier=Decimal('3'),
        loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal('5.00'),
        rotation_method='sequential',
        status='active',
        verification_status='verified',
        chairperson=chairperson,
    )


@pytest.fixture
def group_member(db, group, user):
    return GroupMember.objects.using("kenya").create(
        group=group,
        member=user,
        role='member',
        status='active',
        rotation_position=2,
    )


@pytest.fixture
def rotation_cycle(db, group):
    """An open rotation cycle for the test group."""
    return RotationCycle.objects.using("kenya").create(
        group=group,
        cycle_number=1,
        start_date=timezone.now().date(),
        end_date=(timezone.now() + __import__('datetime').timedelta(days=30)).date(),
        is_current=True,
        status='open',
    )


@pytest.mark.django_db(databases=["default", "kenya"])
class TestPayoutIdempotency:

    @patch('apps.payouts.services.get_payment_provider')
    def test_duplicate_payout_blocked(
        self, mock_provider_factory, group, user, group_member, rotation_cycle
    ):
        """
        Calling execute_rotation_payout twice for the same cycle+recipient
        must return the same Payout object — no duplicate records created.
        Satisfies Financial Engine Checklist §14: Retry payout safely without duplication.
        """
        from apps.payouts.services import PayoutService
        from apps.payouts.models import Payout
        from apps.ledger.models import LedgerEntry

        # Mock the payment provider to always return success
        mock_provider = MagicMock()
        mock_provider.initiate_disbursement.return_value = {
            'status': 'success',
            'provider_reference': 'MOCK-REF-001',
        }
        mock_provider_factory.return_value = mock_provider
        _fund_rotation_pool(group, user, "PAYOUT-IDEM-FUND-001")

        # First call — should create payout
        payout1 = PayoutService.execute_rotation_payout(
            group=group,
            target_member=user,
            cycle=rotation_cycle,
        )

        # Second call — must return the SAME payout, not create a new one
        payout2 = PayoutService.execute_rotation_payout(
            group=group,
            target_member=user,
            cycle=rotation_cycle,
        )

        # Key assertion: these are the same DB record
        assert payout1.id == payout2.id

        # Strict DB assertion: only ONE payout in the database
        assert Payout.objects.using("kenya").filter(
            group=group, recipient=user, cycle=rotation_cycle
        ).count() == 1

        # Banking ledger check: one balanced event group with rotation debit,
        # platform fee credit, and provider-settlement credit.
        entries = LedgerEntry.objects.using("kenya").filter(related_payout=payout1)
        assert entries.count() == 3
        assert set(entries.values_list("account_stream", "direction")) == {
            ("rotation", "debit"),
            ("company_revenue", "credit"),
            ("provider_settlement", "credit"),
        }

        event_groups = {entry.event_group_id for entry in entries}
        assert len(event_groups) == 1

    @patch('apps.payouts.services.get_payment_provider')
    def test_failed_payout_can_be_retried(
        self, mock_provider_factory, group, user, group_member, rotation_cycle
    ):
        """
        A previously FAILED payout must NOT be treated as a duplicate.
        The next call should create a new payout attempt.
        """
        from apps.payouts.services import PayoutService
        from apps.payouts.models import Payout

        # First call — provider reports failure
        mock_provider = MagicMock()
        mock_provider.initiate_disbursement.return_value = {
            'status': 'failure',
            'error': 'Network timeout',
        }
        mock_provider_factory.return_value = mock_provider
        _fund_rotation_pool(group, user, "PAYOUT-IDEM-FUND-002")

        payout1 = PayoutService.execute_rotation_payout(
            group=group,
            target_member=user,
            cycle=rotation_cycle,
        )
        assert payout1.status == 'failed'

        # Second call with a good provider — should try again (new payout)
        mock_provider.initiate_disbursement.return_value = {
            'status': 'success',
            'provider_reference': 'MOCK-RETRY-001',
        }

        payout2 = PayoutService.execute_rotation_payout(
            group=group,
            target_member=user,
            cycle=rotation_cycle,
        )
        assert payout2.status == 'completed'
        # These are DIFFERENT records — retry creates a new payout
        assert payout1.id != payout2.id
