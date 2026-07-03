"""
Loan disbursement — money-movement regression suite.

Locks in the fix for the ledger-bypass incident: disburse_loan previously
wrote a raw LedgerEntry (no stream lock, no overdraft check, no idempotency,
single unbalanced row, no provider call). Any group that had disbursed a loan
risked an IntegrityError on its next contribution when the stale stream lock
handed out a colliding sequence number.

These tests assert the corrected behaviour end-to-end:
  * provider B2C is called and gates the state transition,
  * the event group is balanced (debit loaning / credit provider_settlement),
  * the stream lock stays consistent so later writes never collide,
  * failures and retries are safe.
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from apps.ledger.models import LedgerEntry, LedgerEventGroup
from apps.ledger.services import append_ledger_entry, verify_ledger_stream
from apps.loans.services.loan_engine import LoanEngine

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


def seed_loan_pool(group, amount='50000.00', reference='SEED-DISB-POOL'):
    return append_ledger_entry(
        group=group,
        account_stream='loaning',
        entry_type='contribution',
        direction='credit',
        amount=Decimal(amount),
        currency=group.currency,
        description='Seed loan pool',
        reference=reference,
    )


class TestLoanDisbursementLedger:

    @patch('apps.loans.services.loan_engine.get_payment_provider')
    def test_provider_disbursement_writes_balanced_event_group(
        self, provider_factory, approved_loan, chairperson
    ):
        seed_loan_pool(approved_loan.group)
        provider = MagicMock()
        provider.initiate_disbursement.return_value = {
            'status': 'success',
            'provider_reference': 'JENGA-B2C-001',
        }
        provider_factory.return_value = provider

        result = LoanEngine.disburse_loan(approved_loan, actor=chairperson)

        assert result.status == 'disbursed'
        assert result.disbursement_reference == 'JENGA-B2C-001'
        provider.initiate_disbursement.assert_called_once()
        call_kwargs = provider.initiate_disbursement.call_args.kwargs
        assert call_kwargs['amount'] == approved_loan.amount
        assert call_kwargs['reference'] == f"LOAN-{approved_loan.id}"

        entries = LedgerEntry.objects.filter(related_loan=result)
        assert entries.count() == 2
        assert entries.get(account_stream='loaning').direction == 'debit'
        assert entries.get(account_stream='provider_settlement').direction == 'credit'

        event_group = LedgerEventGroup.objects.get(
            event_group_key=f"loan_disbursement:{result.id}"
        )
        assert event_group.status == LedgerEventGroup.STATUS_CLOSED

    @patch('apps.loans.services.loan_engine.get_payment_provider')
    def test_provider_failure_leaves_loan_approved_and_ledger_untouched(
        self, provider_factory, approved_loan, chairperson
    ):
        seed_loan_pool(approved_loan.group)
        provider = MagicMock()
        provider.initiate_disbursement.return_value = {
            'status': 'failed',
            'error': 'Insufficient float on B2C till',
        }
        provider_factory.return_value = provider

        with pytest.raises(ValueError, match='Provider failed to disburse'):
            LoanEngine.disburse_loan(approved_loan, actor=chairperson)

        approved_loan.refresh_from_db()
        assert approved_loan.status == 'approved'
        assert approved_loan.disbursed_at is None
        assert LedgerEntry.objects.filter(related_loan=approved_loan).count() == 0
        assert approved_loan.repayments.count() == 0

    @patch('apps.loans.services.loan_engine.get_payment_provider')
    def test_repeat_disburse_call_is_idempotent(
        self, provider_factory, approved_loan, chairperson
    ):
        seed_loan_pool(approved_loan.group)
        provider = MagicMock()
        provider.initiate_disbursement.return_value = {
            'status': 'success',
            'provider_reference': 'JENGA-B2C-002',
        }
        provider_factory.return_value = provider

        first = LoanEngine.disburse_loan(approved_loan, actor=chairperson)
        second = LoanEngine.disburse_loan(first, actor=chairperson)

        assert second.status == 'disbursed'
        assert provider.initiate_disbursement.call_count == 1
        assert LedgerEntry.objects.filter(related_loan=first).count() == 2

    @patch('apps.loans.services.loan_engine.get_payment_provider')
    def test_disbursement_blocked_when_loan_pool_insufficient(
        self, provider_factory, approved_loan, chairperson
    ):
        # Pool holds less than the principal — the protected loaning stream
        # must refuse to go negative, and nothing may be written.
        seed_loan_pool(approved_loan.group, amount='500.00')
        provider = MagicMock()
        provider.initiate_disbursement.return_value = {
            'status': 'success',
            'provider_reference': 'JENGA-B2C-003',
        }
        provider_factory.return_value = provider

        with pytest.raises(ValueError, match='Insufficient ledger balance'):
            LoanEngine.disburse_loan(approved_loan, actor=chairperson)

        approved_loan.refresh_from_db()
        assert approved_loan.status == 'approved'
        assert LedgerEntry.objects.filter(related_loan=approved_loan).count() == 0

    def test_contribution_after_disbursement_never_collides(
        self, approved_loan, chairperson
    ):
        """
        The original incident: a bypassed stream lock handed the next ledger
        write a colliding sequence_number, crashing the contribution webhook.
        After a manual-path disbursement, appending to the same stream must
        succeed and the full chain must verify.
        """
        group = approved_loan.group
        seed_loan_pool(group)

        LoanEngine.disburse_loan(
            approved_loan, actor=chairperson, disbursement_reference='MANUAL-DISB-XYZ'
        )

        # Simulates the webhook's loan-pool allocation for the next contribution.
        follow_up = append_ledger_entry(
            group=group,
            account_stream='loaning',
            entry_type='contribution',
            direction='credit',
            amount=Decimal('3000.00'),
            currency=group.currency,
            description='Loan pool allocation after disbursement',
            reference='POST-DISB-CONTRIB-001',
        )
        assert follow_up.pk is not None

        result = verify_ledger_stream(
            group=group, account_stream='loaning', currency=group.currency
        )
        assert result['valid'], result['errors']
        # seed + disbursement debit + follow-up = 3 chained entries
        assert result['entry_count'] == 3
