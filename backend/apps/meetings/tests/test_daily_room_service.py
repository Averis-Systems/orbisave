import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.admin_portal.models import MeetingProviderConfiguration
from apps.meetings.models import Meeting


pytestmark = pytest.mark.django_db


def _meeting(group, chairperson):
    return Meeting.objects.create(
        group=group,
        title='Monthly Group Meeting',
        agenda='Contribution status and governance proposals.',
        scheduled_at=timezone.now() + timezone.timedelta(days=1),
        status='scheduled',
        created_by=chairperson,
    )


def test_start_meeting_requires_active_daily_provider(chairperson, group):
    group.verification_status = 'verified'
    group.save(update_fields=['verification_status'])
    meeting = _meeting(group, chairperson)
    client = APIClient()
    client.force_authenticate(user=chairperson)

    response = client.post(f'/api/v1/meetings/{meeting.id}/start/')

    assert response.status_code == 503
    meeting.refresh_from_db()
    assert meeting.status == 'scheduled'


def test_start_meeting_creates_daily_room(monkeypatch, chairperson, group):
    group.verification_status = 'verified'
    group.save(update_fields=['verification_status'])
    MeetingProviderConfiguration.objects.create(
        name='Daily Embedded Meetings',
        provider_code='daily',
        environment='sandbox',
        status='active',
        base_url='https://api.daily.co/v1',
        api_key='daily_api_key_123',
        webhook_url='https://api.orbisave.com/webhooks/daily/',
        webhook_secret='daily_webhook_secret_123',
    )
    meeting = _meeting(group, chairperson)
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                'name': 'orbisave-test-room',
                'url': 'https://orbisave.daily.co/orbisave-test-room',
            }

    def fake_post(url, json, headers, timeout):
        captured['url'] = url
        captured['json'] = json
        captured['headers'] = headers
        captured['timeout'] = timeout
        return FakeResponse()

    monkeypatch.setattr('apps.meetings.services.requests.post', fake_post)
    client = APIClient()
    client.force_authenticate(user=chairperson)

    response = client.post(f'/api/v1/meetings/{meeting.id}/start/')

    assert response.status_code == 200
    meeting.refresh_from_db()
    assert meeting.status == 'live'
    assert meeting.video_provider == 'daily'
    assert meeting.video_room_name == 'orbisave-test-room'
    assert meeting.video_room_url == 'https://orbisave.daily.co/orbisave-test-room'
    assert captured['url'] == 'https://api.daily.co/v1/rooms'
    assert captured['headers']['Authorization'] == 'Bearer daily_api_key_123'
    assert captured['json']['privacy'] == 'private'


def test_join_live_meeting_returns_daily_room_url(user, group, group_member, chairperson):
    meeting = Meeting.objects.create(
        group=group,
        title='Live Daily Meeting',
        agenda='Governance review.',
        scheduled_at=timezone.now(),
        status='live',
        video_provider='daily',
        video_room_name='orbisave-test-room',
        video_room_url='https://orbisave.daily.co/orbisave-test-room',
        created_by=chairperson,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(f'/api/v1/meetings/{meeting.id}/join/')

    assert response.status_code == 200
    assert response.data['data']['video_provider'] == 'daily'
    assert response.data['data']['video_room_url'] == 'https://orbisave.daily.co/orbisave-test-room'
