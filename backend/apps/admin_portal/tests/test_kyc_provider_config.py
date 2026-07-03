import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_portal.models import KYCProviderConfiguration


pytestmark = pytest.mark.django_db


@pytest.fixture
def super_admin():
    return User.objects.create(
        email='owner@test.orbisave.com',
        phone='+254799000001',
        full_name='Platform Owner',
        role='super_admin',
        country='kenya',
        is_active=True,
        password=make_password('SecurePass123!'),
    )


def test_super_admin_can_create_didit_config_without_exposing_secrets(super_admin):
    client = APIClient()
    client.force_authenticate(user=super_admin)

    response = client.post(
        '/api/v1/admin-portal/superadmin/kyc-providers/',
        {
            'name': 'Didit Identity Verification',
            'provider_code': 'didit',
            'environment': 'sandbox',
            'status': 'inactive',
            'base_url': 'https://verification.didit.me',
            'workflow_id': 'wf_test_123',
            'client_id': 'client_test_123',
            'client_secret': 'secret_test_123',
            'webhook_url': 'https://api.orbisave.com/webhooks/didit/',
            'webhook_secret': 'webhook_secret_123',
            'allowed_events': ['verification.completed', 'verification.failed'],
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['has_client_secret'] is True
    assert response.data['has_webhook_secret'] is True
    assert 'client_secret' not in response.data
    assert 'webhook_secret' not in response.data

    provider = KYCProviderConfiguration.objects.get(provider_code='didit')
    assert provider.client_secret == 'secret_test_123'
    assert provider.webhook_secret == 'webhook_secret_123'


def test_didit_config_read_keeps_secrets_masked(super_admin):
    KYCProviderConfiguration.objects.create(
        name='Didit Identity Verification',
        provider_code='didit',
        environment='sandbox',
        client_id='client_test_123',
        client_secret='secret_test_123',
        webhook_secret='webhook_secret_123',
    )
    client = APIClient()
    client.force_authenticate(user=super_admin)

    response = client.get('/api/v1/admin-portal/superadmin/kyc-providers/')

    assert response.status_code == 200
    result = response.data['results'][0]
    assert result['has_client_secret'] is True
    assert result['has_webhook_secret'] is True
    assert 'client_secret' not in result
    assert 'webhook_secret' not in result
