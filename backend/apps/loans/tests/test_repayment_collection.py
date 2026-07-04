"""
Loan repayment collection — the money-in half of the loan lifecycle.

Covers: borrower-only initiation with server-computed amounts, duplicate
guards, webhook settlement with a BALANCED ledger event group (debit
provider_settlement / credit loaning), idempotent retries, fail-closed
amount mismatches into suspense, and the loan's transition to 'repaid'
when the final installment settles.
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from rest_framework.test import APIClient

from apps.ledger.models import LedgerEntry, LedgerEventGroup
from apps.ledger.services import verify_ledger_stream
from apps.loans.models import LoanRepayment, LoanRepaymentPayment
from apps.loans.services.loan_engine import LoanEngine

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


def seed_loan_pool(group, amount='50000.00'):
    from apps.ledger.services import append_ledger_entry
    return append_ledger_entry(
        group=group,
        account_stream='loaning',
        entry_type='contribution',
        direction='credit',
        amount=Decimal(amount),
        currency=group.currency,
        description='Seed loan pool',
        reference=f'SEED-REPAY-POOL-{amount}',
    )


@pytest.fixture
def disbursed_loan(approved_loan, chairperson):
    """Loan disbursed via the manual path, with a repayment schedule."""
    seed_loan_pool(approved_loan.group)
    return LoanEngine.disburse_loan(
        approved_loan, actor=chairperson, disbursement_reference='MANUAL-DISB-REPAY'
    )


def initiate_payment(user, loan, repayment):
    client = APIClient()
    client.force_authenticate(user=user)
    with patch('apps.loans.repayment_views.get_payment_provider') as factory:
        provider = MagicMock()
        provider.initiate_collection.return_value = {
            'status': 'pending_async',
            'provider_reference': f'MOCK-REPAY-{repayment.id}',
        }
        factory.return_value = provider
        response = client.post(f'/api/v1/loans/{loan.id}/repayments/{repayment.id}/pay/')
    return response


def fire_webhook(prov_ref, amount, cb_status='success'):
    client = APIClient()
    with patch('apps.loans.repayment_views.get_payment_provider') as factory:
        provider = MagicMock()
        provider.verify_webhook_signature.return_value = True
        provider.parse_callback.return_value = {
            'status': cb_status,
            'transaction_id': prov_ref,
            'amount': str(amount),
        }
        del provider.record_callback  # hasattr() -> False for the mock
        factory.return_value = provider
        return client.post('/api/v1/loans/webhook/kenya/mpesa/', {}, format='json')


class TestInitiateRepayment:

    def test_borrower_initiates_with_server_computed_amount(self, disbursed_loan, user):
        repayment = disbursed_loan.repayments.order_by('due_date').first()
        response = initiate_payment(user, disbursed_loan, repayment)

        assert response.status_code == 201, response.data
        payment = LoanRepaymentPayment.objects.get(repayment=repayment)
        assert payment.amount == repayment.total_due  # server-computed, not client-chosen
        assert payment.status == 'initiated'

    def test_non_borrower_cannot_initiate(self, disbursed_loan, chairperson):
        repayment = disbursed_loan.repayments.order_by('due_date').first()
        response = initiate_payment(chairperson, disbursed_loan, repayment)
        assert response.status_code == 403

    def test_duplicate_pending_payment_conflicts(self, disbursed_loan, user):
        repayment = disbursed_loan.repayments.order_by('due_date').first()
        assert initiate_payment(user, disbursed_loan, repayment).status_code == 201
        assert initiate_payment(user, disbursed_loan, repayment).status_code == 409


class TestRepaymentWebhook:

    def test_settlement_posts_balanced_event_group_and_marks_paid(self, disbursed_loan, user):
        repayment = disbursed_loan.repayments.order_by('due_date').first()
        initiate_payment(user, disbursed_loan, repayment)
        payment = LoanRepaymentPayment.objects.get(repayment=repayment)

        response = fire_webhook(payment.provider_reference, payment.amount)
        assert response.status_code == 200

        repayment.refresh_from_db()
        assert repayment.status == 'paid'
        assert repayment.amount_paid == repayment.total_due

        entries = LedgerEntry.objects.filter(
            reference__startswith=payment.provider_reference
        )
        assert entries.count() == 2
        assert entries.get(account_stream='provider_settlement').direction == 'debit'
        assert entries.get(account_stream='loaning').direction == 'credit'
        event_group = LedgerEventGroup.objects.get(
            event_group_key=f'loan_repayment:{payment.provider_reference}:settled'
        )
        assert event_group.status == LedgerEventGroup.STATUS_CLOSED

        result = verify_ledger_stream(
            group=disbursed_loan.group, account_stream='loaning',
            currency=disbursed_loan.group.currency,
        )
        assert result['valid'], result['errors']

    def test_duplicate_webhook_is_idempotent(self, disbursed_loan, user):
        repayment = disbursed_loan.repayments.order_by('due_date').first()
        initiate_payment(user, disbursed_loan, repayment)
        payment = LoanRepaymentPayment.objects.get(repayment=repayment)

        fire_webhook(payment.provider_reference, payment.amount)
        fire_webhook(payment.provider_reference, payment.amount)  # retry storm

        repayment.refresh_from_db()
        assert repayment.amount_paid == repayment.total_due  # not double-counted
        assert LedgerEntry.objects.filter(
            reference__startswith=payment.provider_reference
        ).count() == 2

    def test_amount_mismatch_freezes_to_suspense(self, disbursed_loan, user):
        repayment = disbursed_loan.repayments.order_by('due_date').first()
        initiate_payment(user, disbursed_loan, repayment)
        payment = LoanRepaymentPayment.objects.get(repayment=repayment)

        wrong_amount = payment.amount - Decimal('10.00')
        response = fire_webhook(payment.provider_reference, wrong_amount)
        assert response.status_code == 200

        payment.refresh_from_db()
        repayment.refresh_from_db()
        assert payment.status == 'disputed'
        assert repayment.amount_paid == Decimal('0.00')  # untouched
        # Observed money is isolated in suspense, never forced into loaning.
        suspense = LedgerEntry.objects.filter(
            account_stream='suspense', reference=f'SUSPENSE-{payment.provider_reference}'
        )
        assert suspense.count() == 1
        assert LedgerEntry.objects.filter(
            account_stream='loaning', reference__startswith=str(payment.provider_reference)
        ).count() == 0

    def test_failed_callback_marks_payment_failed(self, disbursed_loan, user):
        repayment = disbursed_loan.repayments.order_by('due_date').first()
        initiate_payment(user, disbursed_loan, repayment)
        payment = LoanRepaymentPayment.objects.get(repayment=repayment)

        fire_webhook(payment.provider_reference, payment.amount, cb_status='failed')

        payment.refresh_from_db()
        repayment.refresh_from_db()
        assert payment.status == 'failed'
        assert repayment.status != 'paid'
        assert LedgerEntry.objects.filter(
            reference__startswith=str(payment.provider_reference)
        ).count() == 0

    def test_loan_transitions_to_repaid_after_final_installment(self, disbursed_loan, user):
        installments = list(disbursed_loan.repayments.order_by('due_date'))
        assert len(installments) >= 1

        for installment in installments:
            initiate_payment(user, disbursed_loan, installment)
            payment = LoanRepaymentPayment.objects.get(repayment=installment, status='initiated')
            fire_webhook(payment.provider_reference, payment.amount)

        disbursed_loan.refresh_from_db()
        assert disbursed_loan.status == 'repaid'
        assert disbursed_loan.fully_repaid_at is not None

        # Fully repaid borrowers can exit their group again (Phase 2 guard).
        from apps.groups.models import GroupMember
        membership = GroupMember.objects.get(group=disbursed_loan.group, member=user)
        client = APIClient()
        client.force_authenticate(user=user)
        exit_response = client.post(
            f'/api/v1/groups/{disbursed_loan.group.id}/members/{membership.id}/exit/'
        )
        assert exit_response.status_code == 200, exit_response.data
