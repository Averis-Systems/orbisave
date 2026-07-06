"""
MTN MoMo provider — verified against the public sandbox contract
(sandbox.momodeveloper.mtn.com): Basic-auth token per product,
UUIDv4 X-Reference-Id per transaction, 202-then-poll async settlement,
EUR-only sandbox currency, fail-closed callbacks.
"""
import base64
import re
import uuid
from decimal import Decimal

import pytest
import responses

from apps.payments.models import BankProvider, ProviderTransaction
from apps.payments.providers.momo import MTNMoMoProvider, SANDBOX_BASE_URL

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])

API_USER = "11111111-2222-3333-4444-555555555555"


@pytest.fixture
def momo_record(db):
    return BankProvider.objects.create(
        name='MTN MoMo Rwanda',
        provider_code='mtn_momo',
        country='rwanda',
        environment='sandbox',
        status='active',
        api_key='sub-key-collection',
        api_secret='api-user-key-xyz',
        merchant_code=API_USER,
        supported_mobile_methods=['mtn_momo'],
        extra_config={'callback_host': 'https://api.orbisave.com'},
    )


def mock_token(product='collection'):
    responses.add(
        responses.POST,
        f'{SANDBOX_BASE_URL}/{product}/token/',
        json={'access_token': f'{product}-token', 'token_type': 'access_token', 'expires_in': 3600},
        status=200,
    )


class TestMoMoAuth:

    @responses.activate
    def test_token_uses_basic_auth_and_subscription_key(self, momo_record):
        mock_token()
        provider = MTNMoMoProvider(momo_record)
        token = provider._get_token('collection')

        assert token == 'collection-token'
        request = responses.calls[0].request
        expected_basic = base64.b64encode(f'{API_USER}:api-user-key-xyz'.encode()).decode()
        assert request.headers['Authorization'] == f'Basic {expected_basic}'
        assert request.headers['Ocp-Apim-Subscription-Key'] == 'sub-key-collection'


class TestMoMoCollection:

    @responses.activate
    def test_requesttopay_is_async_and_journaled(self, momo_record):
        mock_token()
        responses.add(
            responses.POST, f'{SANDBOX_BASE_URL}/collection/v1_0/requesttopay', status=202,
        )
        provider = MTNMoMoProvider(momo_record)
        result = provider.initiate_collection(
            phone='+250781234567', amount=Decimal('5000.00'),
            reference='GRP-RW-1', description='Contribution to Kigali Chama',
        )

        assert result['status'] == 'pending_async'
        # Our transaction key is a client-generated UUIDv4 (the MoMo contract).
        tx_reference = result['provider_reference']
        assert uuid.UUID(tx_reference).version == 4

        request = responses.calls[-1].request
        assert request.headers['X-Reference-Id'] == tx_reference
        assert request.headers['X-Target-Environment'] == 'sandbox'
        assert b'"currency": "EUR"' in request.body or b'"currency":"EUR"' in request.body  # sandbox rule
        assert b'250781234567' in request.body  # MSISDN without '+'

        tx = ProviderTransaction.objects.get(internal_reference=tx_reference)
        assert tx.direction == 'inbound'
        assert tx.status == 'pending_customer_action'
        assert tx.provider_reference == 'GRP-RW-1'

    @responses.activate
    def test_requesttopay_rejection_reports_failed(self, momo_record):
        mock_token()
        responses.add(
            responses.POST, f'{SANDBOX_BASE_URL}/collection/v1_0/requesttopay',
            json={'message': 'Invalid subscription key'}, status=401,
        )
        provider = MTNMoMoProvider(momo_record)
        result = provider.initiate_collection(
            phone='+250781234567', amount=Decimal('100.00'),
            reference='GRP-RW-2', description='x',
        )
        assert result['status'] == 'failed'
        assert ProviderTransaction.objects.count() == 0


class TestMoMoDisbursement:

    @responses.activate
    def test_transfer_settling_immediately_reports_success(self, momo_record):
        mock_token('disbursement')
        responses.add(responses.POST, f'{SANDBOX_BASE_URL}/disbursement/v1_0/transfer', status=202)
        responses.add(
            responses.GET,
            re.compile(rf'{re.escape(SANDBOX_BASE_URL)}/disbursement/v1_0/transfer/.+'),
            json={'status': 'SUCCESSFUL', 'financialTransactionId': '99887766'},
            status=200,
        )
        provider = MTNMoMoProvider(momo_record)
        result = provider.initiate_disbursement(
            phone='+250788888888', amount=Decimal('12000.00'),
            reference='PAY-RW-1', remarks='Rotation payout',
        )
        assert result['status'] == 'success'
        assert result['financial_transaction_id'] == '99887766'
        tx = ProviderTransaction.objects.get(internal_reference=result['provider_reference'])
        assert tx.direction == 'outbound'

    @responses.activate
    def test_transfer_still_pending_reports_failed_for_safe_retry(self, momo_record):
        mock_token('disbursement')
        responses.add(responses.POST, f'{SANDBOX_BASE_URL}/disbursement/v1_0/transfer', status=202)
        responses.add(
            responses.GET,
            re.compile(rf'{re.escape(SANDBOX_BASE_URL)}/disbursement/v1_0/transfer/.+'),
            json={'status': 'PENDING'}, status=200,
        )
        provider = MTNMoMoProvider(momo_record)
        result = provider.initiate_disbursement(
            phone='+250788888888', amount=Decimal('500.00'),
            reference='PAY-RW-2', remarks='x',
        )
        # Payouts must never be marked completed on unsettled money.
        assert result['status'] == 'failed'
        assert 'pending' in result['error'].lower()


class TestMoMoStatusAndCallbacks:

    @responses.activate
    def test_query_transaction_details_maps_collection_status(self, momo_record):
        mock_token()
        responses.add(
            responses.GET,
            re.compile(rf'{re.escape(SANDBOX_BASE_URL)}/collection/v1_0/requesttopay/.+'),
            json={'status': 'SUCCESSFUL', 'financialTransactionId': '123',
                  'referenceId': 'abc', 'amount': '5000.00'},
            status=200,
        )
        provider = MTNMoMoProvider(momo_record)
        details = provider.query_transaction_details('some-uuid')
        parsed = provider.parse_callback(details.get('data'))
        assert parsed['status'] == 'success'

    def test_parse_callback_normalizes_statuses(self, momo_record):
        provider = MTNMoMoProvider(momo_record)
        assert provider.parse_callback({'status': 'SUCCESSFUL', 'referenceId': 'r1'})['status'] == 'success'
        assert provider.parse_callback({'status': 'FAILED'})['status'] == 'failed'
        assert provider.parse_callback({'status': 'PENDING'})['status'] == 'pending'
        assert provider.parse_callback({'status': 'REJECTED'})['status'] == 'rejected'
        # Keys on OUR UUID first, business ref second.
        parsed = provider.parse_callback({'status': 'SUCCESSFUL', 'referenceId': 'uuid-1', 'externalId': 'GRP-1'})
        assert parsed['transaction_id'] == 'uuid-1'

    def test_webhook_verification_fails_closed_without_secret(self, momo_record, rf):
        provider = MTNMoMoProvider(momo_record)
        request = rf.post('/webhook', data={}, content_type='application/json')
        assert provider.verify_webhook_signature(request) is False

    def test_webhook_verification_accepts_configured_basic_pair(self, momo_record, rf):
        momo_record.webhook_secret = 'orbi:hooksecret'
        momo_record.save(update_fields=['webhook_secret'])
        provider = MTNMoMoProvider(momo_record)
        good = base64.b64encode(b'orbi:hooksecret').decode()
        request = rf.post(
            '/webhook', data={}, content_type='application/json',
            HTTP_AUTHORIZATION=f'Basic {good}',
        )
        assert provider.verify_webhook_signature(request) is True
