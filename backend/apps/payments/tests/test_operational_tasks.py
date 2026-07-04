"""
Provider operations: stuck-transaction polling and daily statement import.

These two jobs are the reconciliation backbone — they run against mocked
provider APIs here and against the Jenga sandbox in staging.
"""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.ledger.models import ReconciliationItem, ReconciliationRun
from apps.payments.models import BankProvider, ProviderStatementLine, ProviderTransaction
from apps.payments.tasks import import_daily_statements, poll_stuck_provider_transactions

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


@pytest.fixture
def provider_record(db):
    record = BankProvider.objects.create(
        name='Equity Bank Kenya - Jenga',
        provider_code='jenga_ke',
        country='kenya',
        environment='sandbox',
        status='active',
        api_key='sandbox-key',
    )
    record.accounts.create(
        label='Reconciliation',
        account_type='collection',
        account_number='1100194977404',
        account_name='OrbiSave Collections',
        country_code='KE',
        currency='KES',
        is_default_for_reconciliation=True,
    )
    return record


def make_tx(record, reference, status='submitted', age_minutes=30):
    tx = ProviderTransaction.objects.create(
        provider=record,
        direction='inbound',
        channel='stk_push',
        country='kenya',
        currency='KES',
        amount=Decimal('5000.00'),
        internal_reference=reference,
        status=status,
    )
    ProviderTransaction.objects.filter(pk=tx.pk).update(
        created_at=timezone.now() - timedelta(minutes=age_minutes)
    )
    tx.refresh_from_db()
    return tx


class TestStuckTransactionPolling:

    @patch('apps.payments.selector.get_provider_by_id')
    def test_poller_advances_settled_transactions(self, factory, provider_record):
        tx = make_tx(provider_record, 'GRP-POLL-1')
        provider = MagicMock()
        provider.query_transaction_details.return_value = {'data': {'status': 'SUCCESS'}}
        provider.parse_callback.return_value = {'status': 'success', 'transaction_id': 'GRP-POLL-1'}
        factory.return_value = provider

        result = poll_stuck_provider_transactions.apply().get()

        tx.refresh_from_db()
        assert tx.status == 'settled'
        assert tx.final_at is not None
        assert result['advanced'] == 1

    @patch('apps.payments.selector.get_provider_by_id')
    def test_ancient_unresolvable_transactions_escalate(self, factory, provider_record):
        tx = make_tx(provider_record, 'GRP-POLL-2', age_minutes=60 * 30)  # 30h old
        provider = MagicMock()
        provider.query_transaction_details.side_effect = RuntimeError('provider down')
        factory.return_value = provider

        result = poll_stuck_provider_transactions.apply().get()

        tx.refresh_from_db()
        assert tx.status == 'manual_review'
        assert result['escalated'] == 1

    @patch('apps.payments.selector.get_provider_by_id')
    def test_fresh_transactions_left_alone(self, factory, provider_record):
        tx = make_tx(provider_record, 'GRP-POLL-3', age_minutes=2)  # under threshold
        result = poll_stuck_provider_transactions.apply().get()
        tx.refresh_from_db()
        assert tx.status == 'submitted'
        assert result['checked'] == 0
        factory.assert_not_called()


class TestStatementImport:

    @patch('apps.payments.selector.get_provider_by_id')
    def test_import_matches_known_and_flags_orphans(self, factory, provider_record):
        make_tx(provider_record, 'GRP-KNOWN-1', status='settled')

        provider = MagicMock()
        provider.get_full_statement.return_value = {
            'data': {
                'transactions': [
                    {
                        'transactionId': 'BANKTX-1', 'reference': 'GRP-KNOWN-1',
                        'amount': '5000.00', 'type': 'Credit',
                        'description': 'STK collection', 'currency': 'KES',
                    },
                    {
                        'transactionId': 'BANKTX-2', 'reference': 'MYSTERY-REF',
                        'amount': '777.00', 'type': 'Credit',
                        'description': 'Unknown deposit', 'currency': 'KES',
                    },
                ]
            }
        }
        provider.get_opening_closing_balance.return_value = {
            'data': {'balances': [{'type': 'Closing', 'amount': '12345.67'}]}
        }
        factory.return_value = provider

        result = import_daily_statements.apply(kwargs={'business_date': '2026-07-03'}).get()

        assert result['providers'][0]['imported'] == 2
        assert result['providers'][0]['matched'] == 1
        assert result['providers'][0]['orphans'] == 1

        assert ProviderStatementLine.objects.filter(matched_status='matched').count() == 1
        orphan_line = ProviderStatementLine.objects.get(matched_status='exception')
        assert orphan_line.reference == 'MYSTERY-REF'

        run = ReconciliationRun.objects.get()
        assert run.status == 'needs_review'
        assert run.observed_closing_balance == Decimal('12345.67')
        item = ReconciliationItem.objects.get()
        assert item.issue_type == 'orphan_bank_transaction'
        assert item.severity == 'red'
        assert item.observed_amount == Decimal('777.00')

    @patch('apps.payments.selector.get_provider_by_id')
    def test_reimport_is_idempotent(self, factory, provider_record):
        provider = MagicMock()
        provider.get_full_statement.return_value = {
            'data': {'transactions': [{
                'transactionId': 'BANKTX-9', 'reference': 'SOME-REF',
                'amount': '100.00', 'type': 'Credit', 'currency': 'KES',
            }]}
        }
        provider.get_opening_closing_balance.return_value = {'data': {'balances': []}}
        factory.return_value = provider

        import_daily_statements.apply(kwargs={'business_date': '2026-07-03'}).get()
        second = import_daily_statements.apply(kwargs={'business_date': '2026-07-03'}).get()

        assert ProviderStatementLine.objects.count() == 1
        assert second['providers'][0]['imported'] == 0
        # No duplicate reconciliation items either.
        assert ReconciliationItem.objects.count() == 1