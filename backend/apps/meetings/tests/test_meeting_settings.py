import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.groups.models import Group, GroupMember
from apps.meetings.models import MeetingSettings


pytestmark = pytest.mark.django_db


@pytest.fixture
def other_chairperson():
    return User.objects.create(
        email='settings-other-chair@test.orbisave.com',
        phone='+254700000014',
        full_name='Settings Other Chair',
        role='chairperson',
        country='kenya',
        kyc_status='verified',
        is_active=True,
        password=make_password('SecurePass123!'),
    )


@pytest.fixture
def other_group(other_chairperson):
    group = Group.objects.create(
        name='Private Settings Group',
        description='Meeting settings boundary test group',
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


def test_member_can_read_default_meeting_settings_for_own_group(group, group_member, user):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(f'/api/v1/meetings/settings/?group={group.id}')

    assert response.status_code == 200
    assert response.data['data']['group'] == str(group.id)
    assert response.data['data']['frequency'] == 'monthly'
    assert response.data['data']['provider_mode'] == 'daily'
    assert response.data['data']['quorum_percent'] == 60


def test_member_cannot_update_meeting_settings(group, group_member, user):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        f'/api/v1/meetings/settings/?group={group.id}',
        {'frequency': 'weekly'},
        format='json',
    )

    assert response.status_code == 403
    assert not MeetingSettings.objects.filter(group=group, frequency='weekly').exists()


def test_chairperson_can_update_meeting_settings_for_own_group(chairperson, group):
    group.verification_status = 'verified'
    group.save(update_fields=['verification_status'])
    client = APIClient()
    client.force_authenticate(user=chairperson)

    response = client.patch(
        f'/api/v1/meetings/settings/?group={group.id}',
        {
            'frequency': 'weekly',
            'notice_days': 5,
            'quorum_percent': 65,
            'majority_percent': 55,
            'provider_mode': 'daily',
            'attendance_tracking': False,
            'minutes_required': True,
        },
        format='json',
    )

    assert response.status_code == 200
    settings = MeetingSettings.objects.get(group=group)
    assert settings.frequency == 'weekly'
    assert settings.notice_days == 5
    assert settings.quorum_percent == 65
    assert settings.majority_percent == 55
    assert settings.provider_mode == 'daily'
    assert settings.attendance_tracking is False


def test_chairperson_cannot_read_or_update_other_group_settings(chairperson, other_group):
    client = APIClient()
    client.force_authenticate(user=chairperson)

    read_response = client.get(f'/api/v1/meetings/settings/?group={other_group.id}')
    update_response = client.patch(
        f'/api/v1/meetings/settings/?group={other_group.id}',
        {'frequency': 'weekly'},
        format='json',
    )

    assert read_response.status_code == 403
    assert update_response.status_code == 403
