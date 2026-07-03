import pytest
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework.test import APIClient

from apps.admin_portal.models import MeetingProviderConfiguration
from apps.accounts.models import User
from apps.groups.models import Group, GroupMember
from apps.meetings.models import Meeting


pytestmark = pytest.mark.django_db


@pytest.fixture
def other_chairperson():
    return User.objects.create(
        email='other-chair@test.orbisave.com',
        phone='+254700000004',
        full_name='Other Chairperson',
        role='chairperson',
        country='kenya',
        kyc_status='verified',
        is_active=True,
        password=make_password('SecurePass123!'),
    )


@pytest.fixture
def other_group(other_chairperson):
    group = Group.objects.create(
        name='Other Group',
        description='Boundary test group',
        country='kenya',
        currency='KES',
        max_members=10,
        contribution_amount=5000,
        contribution_frequency='monthly',
        contribution_day=1,
        rotation_savings_pct=70,
        loan_pool_pct=30,
        max_loan_multiplier=3,
        loan_term_weeks=12,
        loan_interest_rate_monthly=5,
        rotation_method='sequential',
        status='active',
        verification_status='verified',
        chairperson=other_chairperson,
    )
    GroupMember.objects.create(
        group=group,
        member=other_chairperson,
        role='chairperson',
        status='active',
        rotation_position=1,
    )
    return group


def _schedule_payload(group):
    return {
        'group': str(group.id),
        'title': 'Monthly Group Meeting',
        'agenda': 'Contribution status and rule proposals.',
        'scheduled_at': (timezone.now() + timezone.timedelta(days=2)).isoformat(),
    }


def test_member_cannot_schedule_group_meeting(group, group_member, user):
    group.verification_status = 'verified'
    group.save(update_fields=['verification_status'])
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post('/api/v1/meetings/', _schedule_payload(group), format='json')

    assert response.status_code == 403
    assert Meeting.objects.count() == 0


def test_chairperson_cannot_schedule_meeting_for_other_group(chairperson, group, other_group):
    group.verification_status = 'verified'
    group.save(update_fields=['verification_status'])
    client = APIClient()
    client.force_authenticate(user=chairperson)

    response = client.post('/api/v1/meetings/', _schedule_payload(other_group), format='json')

    assert response.status_code == 403
    assert Meeting.objects.count() == 0


def test_chairperson_can_schedule_and_start_own_group_meeting(monkeypatch, chairperson, group):
    group.verification_status = 'verified'
    group.save(update_fields=['verification_status'])
    MeetingProviderConfiguration.objects.create(
        name='Daily Embedded Meetings',
        provider_code='daily',
        environment='sandbox',
        status='active',
        base_url='https://api.daily.co/v1',
        api_key='daily_api_key_123',
    )

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {'name': 'orbisave-test-room', 'url': 'https://orbisave.daily.co/orbisave-test-room'}

    monkeypatch.setattr('apps.meetings.services.requests.post', lambda *args, **kwargs: FakeResponse())
    client = APIClient()
    client.force_authenticate(user=chairperson)

    create_response = client.post('/api/v1/meetings/', _schedule_payload(group), format='json')

    assert create_response.status_code == 201
    meeting_id = create_response.data['id']

    start_response = client.post(f'/api/v1/meetings/{meeting_id}/start/')

    assert start_response.status_code == 200
    assert start_response.data['data']['status'] == 'live'


def test_member_cannot_join_meeting_for_group_they_do_not_belong_to(user, other_group):
    meeting = Meeting.objects.create(
        group=other_group,
        title='Other Group Live Meeting',
        agenda='Private group agenda.',
        scheduled_at=timezone.now(),
        status='live',
        created_by=other_group.chairperson,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(f'/api/v1/meetings/{meeting.id}/join/')

    assert response.status_code in (403, 404)
