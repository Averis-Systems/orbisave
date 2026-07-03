import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_portal.models import MeetingProviderConfiguration


pytestmark = pytest.mark.django_db


@pytest.fixture
def super_admin():
    return User.objects.create(
        email='meeting-owner@test.orbisave.com',
        phone='+254799000002',
        full_name='Meeting Owner',
        role='super_admin',
        country='kenya',
        is_active=True,
        password=make_password('SecurePass123!'),
    )


def test_super_admin_can_create_daily_config_without_exposing_secrets(super_admin):
    client = APIClient()
    client.force_authenticate(user=super_admin)

    response = client.post(
        '/api/v1/admin-portal/superadmin/meeting-providers/',
        {
            'name': 'Daily Embedded Meetings',
            'provider_code': 'daily',
            'environment': 'sandbox',
            'status': 'inactive',
            'base_url': 'https://api.daily.co/v1',
            'api_key': 'daily_api_key_123',
            'webhook_url': 'https://api.orbisave.com/webhooks/daily/',
            'webhook_secret': 'daily_webhook_secret_123',
            'allowed_events': ['room.started', 'room.ended', 'participant.joined'],
            'notes': 'Default embedded meeting provider.',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['provider_code'] == 'daily'
    assert response.data['has_api_key'] is True
    assert response.data['has_webhook_secret'] is True
    assert 'api_key' not in response.data
    assert 'webhook_secret' not in response.data

    provider = MeetingProviderConfiguration.objects.get(provider_code='daily')
    assert provider.api_key == 'daily_api_key_123'
    assert provider.webhook_secret == 'daily_webhook_secret_123'


def test_meeting_provider_list_keeps_secrets_masked(super_admin):
    MeetingProviderConfiguration.objects.create(
        name='Daily Embedded Meetings',
        provider_code='daily',
        environment='sandbox',
        base_url='https://api.daily.co/v1',
        api_key='daily_api_key_123',
        webhook_secret='daily_webhook_secret_123',
    )
    client = APIClient()
    client.force_authenticate(user=super_admin)

    response = client.get('/api/v1/admin-portal/superadmin/meeting-providers/')

    assert response.status_code == 200
    result = response.data['results'][0]
    assert result['has_api_key'] is True
    assert result['has_webhook_secret'] is True
    assert 'api_key' not in result
    assert 'webhook_secret' not in result


def test_meeting_provider_rejects_non_daily_provider(super_admin):
    client = APIClient()
    client.force_authenticate(user=super_admin)

    response = client.post(
        '/api/v1/admin-portal/superadmin/meeting-providers/',
        {
            'name': 'Google Meet Workspace',
            'provider_code': 'google_meet',
            'environment': 'sandbox',
        },
        format='json',
    )

    assert response.status_code == 400
    assert MeetingProviderConfiguration.objects.count() == 0


def test_meeting_provider_test_reports_missing_required_fields(super_admin):
    provider = MeetingProviderConfiguration.objects.create(
        name='Daily Embedded Meetings',
        provider_code='daily',
        environment='sandbox',
    )
    client = APIClient()
    client.force_authenticate(user=super_admin)

    response = client.post(f'/api/v1/admin-portal/superadmin/meeting-providers/{provider.id}/test/')

    assert response.status_code == 200
    assert response.data['success'] is False
    assert 'api_key' in response.data['missing']
    provider.refresh_from_db()
    assert provider.status == 'error'
