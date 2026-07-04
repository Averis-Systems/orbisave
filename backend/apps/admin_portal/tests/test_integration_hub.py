"""
Console integration hub (Phase 5): SMS/notification provider CRUD, encrypted
platform settings, and the reconciliation queue endpoints.
"""
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_portal.models import NotificationProviderConfiguration, SystemConfiguration
from apps.ledger.models import ReconciliationItem
from apps.ledger.services import record_reconciliation_exception, start_reconciliation_run
from common.encryption import ENCRYPTED_PREFIX

# The reconciliation views sweep every financial alias, so all must be declared.
pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


@pytest.fixture
def super_admin(db):
    return User.objects.create(
        email='hub.super@averissystems.com', phone='+254700300001',
        full_name='Hub Super', role='super_admin', country='kenya',
        kyc_status='verified', phone_verified=True, is_active=True,
        password=make_password('SecurePass123!'),
    )


@pytest.fixture
def super_client(super_admin):
    client = APIClient()
    client.force_authenticate(user=super_admin)
    return client


@pytest.fixture
def kenya_admin(db):
    return User.objects.create(
        email='hub.admin@averissystems.com', phone='+254700300002',
        full_name='Hub Admin', role='platform_admin', country='kenya',
        kyc_status='verified', phone_verified=True, is_active=True,
        password=make_password('SecurePass123!'),
    )


class TestNotificationProviderHub:

    def test_crud_masks_api_key_and_audits(self, super_client):
        create = super_client.post('/api/v1/admin-portal/superadmin/notification-providers/', {
            'name': "Africa's Talking KE", 'provider_code': 'africastalking',
            'environment': 'sandbox', 'username': 'sandbox',
            'api_key': 'at-sandbox-key-123', 'sender_id': 'ORBISAVE',
        }, format='json')
        assert create.status_code == 201, create.data
        # Secret never travels back out.
        assert 'at-sandbox-key-123' not in str(create.data)
        assert create.data['has_api_key'] is True

        provider = NotificationProviderConfiguration.objects.get()
        # Encrypted at rest (EncryptedTextField).
        from django.db import connections
        with connections[provider._state.db or 'default'].cursor() as cursor:
            cursor.execute(
                "SELECT api_key FROM notification_provider_configuration WHERE id = %s",
                [provider.id.hex],
            )
            raw = cursor.fetchone()[0]
        assert raw.startswith(ENCRYPTED_PREFIX)

        # Blank api_key on update preserves the stored secret.
        patch_resp = super_client.patch(
            f'/api/v1/admin-portal/superadmin/notification-providers/{provider.id}/',
            {'sender_id': 'ORBI', 'api_key': ''}, format='json',
        )
        assert patch_resp.status_code == 200
        provider.refresh_from_db()
        assert provider.api_key == 'at-sandbox-key-123'
        assert provider.sender_id == 'ORBI'

    def test_toggle_and_field_test(self, super_client):
        provider = NotificationProviderConfiguration.objects.create(
            name='AT', provider_code='africastalking', environment='sandbox',
            username='sandbox', api_key='key',
        )
        toggle = super_client.post(
            f'/api/v1/admin-portal/superadmin/notification-providers/{provider.id}/toggle/')
        assert toggle.status_code == 200 and toggle.data['status'] == 'active'

        test = super_client.post(
            f'/api/v1/admin-portal/superadmin/notification-providers/{provider.id}/test/',
            {}, format='json')
        assert test.status_code == 200
        assert test.data['success'] is True

    def test_live_sms_test_uses_this_config(self, super_client):
        provider = NotificationProviderConfiguration.objects.create(
            name='AT', provider_code='africastalking', environment='sandbox',
            username='sandbox', api_key='key', status='active',
        )
        with patch('apps.notifications.sms.send_via_config') as sender:
            sender.return_value = {'channel': 'africastalking'}
            test = super_client.post(
                f'/api/v1/admin-portal/superadmin/notification-providers/{provider.id}/test/',
                {'test_phone': '+254700300009'}, format='json')
        assert test.status_code == 200, test.data
        assert test.data['success'] is True
        assert sender.call_args.args[0].id == provider.id


class TestSystemConfigurationEncryption:

    def test_encrypted_setting_is_ciphertext_at_rest_and_masked_in_reads(self, super_client):
        create = super_client.post('/api/v1/admin-portal/superadmin/settings/create/', {
            'key': 'google_translate_api_key', 'value': 'AIza-super-secret',
            'category': 'api_data', 'is_encrypted': True,
        }, format='json')
        assert create.status_code == 201, create.data
        assert create.data['value'] == '********'

        config = SystemConfiguration.objects.get(key='google_translate_api_key')
        assert config.value.startswith(ENCRYPTED_PREFIX)
        assert 'AIza' not in config.value
        # Service-side read decrypts transparently.
        assert SystemConfiguration.get_value('google_translate_api_key') == 'AIza-super-secret'

        # Round-tripping the mask must not destroy the stored secret.
        update = super_client.patch(
            f'/api/v1/admin-portal/superadmin/settings/{config.id}/',
            {'value': '********', 'description': 'Translation key'}, format='json')
        assert update.status_code == 200
        assert SystemConfiguration.get_value('google_translate_api_key') == 'AIza-super-secret'


class TestReconciliationQueue:

    def test_country_admin_sees_and_resolves_items(self, kenya_admin, group):
        run = start_reconciliation_run(
            country='kenya', provider_code='jenga_ke',
            account_stream='provider_settlement', account_number='110019',
            business_date='2026-07-03', db_alias='default',
        )
        record_reconciliation_exception(
            country='kenya', account_stream='provider_settlement',
            issue_type='orphan_bank_transaction', reference='MYSTERY-1',
            observed_amount=Decimal('777.00'), currency='KES',
            run=run, severity='red', db_alias='default',
        )

        client = APIClient()
        client.force_authenticate(user=kenya_admin)

        runs = client.get('/api/v1/admin-portal/reconciliation/runs/')
        assert runs.status_code == 200 and runs.data['count'] == 1
        assert runs.data['results'][0]['open_items'] == 1

        items = client.get('/api/v1/admin-portal/reconciliation/items/')
        assert items.status_code == 200 and items.data['count'] == 1
        item_id = items.data['results'][0]['id']

        no_note = client.post(
            f'/api/v1/admin-portal/reconciliation/items/{item_id}/action/',
            {'action': 'resolved'}, format='json')
        assert no_note.status_code == 400  # note mandatory on resolve

        resolved = client.post(
            f'/api/v1/admin-portal/reconciliation/items/{item_id}/action/',
            {'action': 'resolved', 'note': 'Matched to manual deposit slip #12'},
            format='json')
        assert resolved.status_code == 200, resolved.data

        item = ReconciliationItem.objects.get(id=item_id)
        assert item.status == 'resolved'
        assert item.resolved_by == kenya_admin
        assert item.details['resolution_log'][0]['note'].startswith('Matched')
