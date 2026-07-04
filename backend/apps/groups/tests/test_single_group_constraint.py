"""
Single-active-group policy tests (production-beta scope, 2026-07-03).

One occupied group slot per user, enforced twice:
  * service layer — friendly 409 with the occupying group named,
  * database   — one_active_group_per_member partial unique constraint,
    the hard floor for any code path that forgets to check.
Exiting frees the slot; suspension does not.
"""
from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from apps.groups.models import Group, GroupMember
from apps.groups.services.membership_policy import (
    SingleGroupLimitError,
    enforce_single_group_limit,
    get_blocking_membership,
)

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


def make_group(chairperson, name='Second Chama'):
    return Group.objects.create(
        name=name,
        country='kenya',
        chairperson=chairperson,
        contribution_amount=Decimal('1000.00'),
        contribution_frequency='weekly',
        contribution_day=1,
        currency='KES',
    )


class TestSingleGroupService:

    def test_active_membership_occupies_slot(self, group, user, group_member):
        blocking = get_blocking_membership(user)
        assert blocking is not None
        assert blocking.group_id == group.id

        with pytest.raises(SingleGroupLimitError) as exc:
            enforce_single_group_limit(user)
        data = exc.value.as_response_data()
        assert data['code'] == 'single_group_limit'
        assert data['current_group_name'] == group.name

    def test_exited_membership_frees_slot(self, group, user, group_member):
        group_member.status = 'exited'
        group_member.save(update_fields=['status'])
        assert get_blocking_membership(user) is None
        enforce_single_group_limit(user)  # must not raise

    def test_suspended_membership_still_occupies_slot(self, group, user, group_member):
        group_member.status = 'suspended'
        group_member.save(update_fields=['status'])
        assert get_blocking_membership(user) is not None

    def test_exclude_group_allows_same_group_operations(self, group, user, group_member):
        # Re-checks scoped to the member's own group (e.g. reinstate) pass.
        assert get_blocking_membership(user, exclude_group=group) is None


class TestSingleGroupAPI:

    def test_create_second_group_returns_409(self, group, chairperson):
        # chairperson already has an active chairperson membership in `group`.
        client = APIClient()
        client.force_authenticate(user=chairperson)
        response = client.post('/api/v1/groups/', {
            'name': 'Second Chama',
            'country': 'kenya',
            'max_members': 10,
            'contribution_amount': '500.00',
            'contribution_frequency': 'weekly',
            'contribution_day': 1,
            'rotation_savings_pct': 70,
            'loan_pool_pct': 30,
        }, format='json')

        assert response.status_code == 409
        assert response.data['code'] == 'single_group_limit'
        assert response.data['current_group_name'] == group.name

    def test_create_group_allowed_after_exit(self, group, user, group_member):
        group_member.status = 'exited'
        group_member.save(update_fields=['status'])
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post('/api/v1/groups/', {
            'name': 'Fresh Start Chama',
            'country': 'kenya',
            'max_members': 10,
            'contribution_amount': '500.00',
            'contribution_frequency': 'weekly',
            'contribution_day': 1,
            'rotation_savings_pct': 70,
            'loan_pool_pct': 30,
        }, format='json')

        assert response.status_code == 201, response.data


class TestMembershipExitLifecycle:

    def test_member_can_voluntarily_exit_and_slot_frees(self, group, user, group_member):
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(f'/api/v1/groups/{group.id}/members/{group_member.id}/exit/')

        assert response.status_code == 200, response.data
        group_member.refresh_from_db()
        assert group_member.status == 'exited'
        assert group_member.exited_at is not None
        assert get_blocking_membership(user) is None

    def test_member_cannot_exit_someone_elses_membership(self, group, user, group_member, chairperson):
        from apps.accounts.models import User
        from django.contrib.auth.hashers import make_password
        outsider = User.objects.create(
            email='outsider@example.com', phone='+254700111222',
            full_name='Outsider', country='kenya',
            password=make_password('Pass123!'),
        )
        client = APIClient()
        client.force_authenticate(user=outsider)
        response = client.post(f'/api/v1/groups/{group.id}/members/{group_member.id}/exit/')

        assert response.status_code == 403
        group_member.refresh_from_db()
        assert group_member.status == 'active'

    def test_exit_blocked_with_outstanding_loan(self, group, user, group_member, approved_loan):
        # approved_loan belongs to `user` in `group` with status 'approved'.
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(f'/api/v1/groups/{group.id}/members/{group_member.id}/exit/')

        assert response.status_code == 400
        assert 'outstanding_loan_obligations' in response.data
        group_member.refresh_from_db()
        assert group_member.status == 'active'

    def test_chair_remove_blocked_with_outstanding_loan(self, group, user, group_member, chairperson, approved_loan):
        # Chair-gated actions require a verified group.
        group.verification_status = 'verified'
        group.save(update_fields=['verification_status'])

        client = APIClient()
        client.force_authenticate(user=chairperson)
        response = client.post(f'/api/v1/groups/{group.id}/members/{group_member.id}/remove/')

        assert response.status_code == 400, response.data
        assert 'outstanding_loan_obligations' in response.data
        group_member.refresh_from_db()
        assert group_member.status == 'active'


class TestSingleGroupDatabaseFloor:

    def test_db_constraint_blocks_second_blocking_membership(self, group, user, group_member, chairperson):
        other = make_group(chairperson, name='Slot Collision Chama')
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                GroupMember.objects.create(
                    group=other, member=user, role='member', status='active',
                )

    def test_db_allows_second_membership_after_exit(self, group, user, group_member, chairperson):
        group_member.status = 'exited'
        group_member.save(update_fields=['status'])
        other = make_group(chairperson, name='Post Exit Chama')
        membership = GroupMember.objects.create(
            group=other, member=user, role='member', status='active',
        )
        assert membership.pk is not None
