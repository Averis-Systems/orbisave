"""
Payout idempotency test suite.
Validates that duplicate payout requests for the same cycle+recipient
are safely blocked without creating duplicate records or ledger entries.
Satisfies Financial Engine Checklist §14 (Failure Handling — retry safely).
"""
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock


@pytest.fixture
def rotation_cycle(db, group):
    """An open rotation cycle for the test group."""
    from apps.groups.models import RotationCycle
    from django.utils import timezone
    return RotationCycle.objects.create(
        group=group,
        cycle_number=1,
        start_date=timezone.now().date(),
        end_date=(timezone.now() + __import__('datetime').timedelta(days=30)).date(),
        is_current=True,
        status='open',
    )


@pytest.mark.django_db
class TestPayoutIdempotency:

    @patch('apps.payments.selector.get_payment_provider')
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
        assert Payout.objects.filter(
            group=group, recipient=user, cycle=rotation_cycle
        ).count() == 1

        # Strict Ledger check: only ONE ledger entry for this payout
        assert LedgerEntry.objects.filter(related_payout=payout1).count() == 1

    @patch('apps.payments.selector.get_payment_provider')
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
