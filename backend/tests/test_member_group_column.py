"""
Coverage for the members list's group column and group filter.

Membership is the cross-shard join: a User is on 'default', the GroupMember row
is on the member's country shard. A super_admin request routes unscoped queries
to 'default', so without an explicit shard read every member shows "no group".
These tests pin the batched lookup and the ?group= filter against real
cross-database data.
"""
from decimal import Decimal

import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


def _user(email, role='member', country='kenya', active=True):
    from apps.accounts.models import User
    return User.objects.create(
        email=email,
        phone=f'+2547{abs(hash(email)) % 10**8:08d}',
        full_name=email.split('@')[0],
        role=role,
        country=country,
        is_active=active,
        email_verified=True,
        password=make_password('SecurePass123!'),
    )


def _group(name, country, chairperson):
    from apps.groups.models import Group
    from common.db_utils import get_db_for_country
    return Group.objects.using(get_db_for_country(country)).create(
        name=name, description='', country=country,
        currency='KES' if country == 'kenya' else 'RWF',
        max_members=10, contribution_amount=Decimal('1000.00'),
        contribution_frequency='monthly', contribution_day=1,
        rotation_savings_pct=Decimal('70'), loan_pool_pct=Decimal('30'),
        max_loan_multiplier=Decimal('3'), loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal('5.00'), rotation_method='sequential',
        status='active', verification_status='verified', chairperson=chairperson,
    )


def _join(group, member, country, role='member'):
    from apps.groups.models import GroupMember
    from common.db_utils import get_db_for_country
    return GroupMember.objects.using(get_db_for_country(country)).create(
        group=group, member=member, role=role, status='active', rotation_position=1,
    )


@pytest.fixture
def super_admin(db):
    return _user('col-super@test.orbisave.com', role='super_admin', country=None)


@pytest.fixture
def scenario(db):
    """Two members in a group, one member with no group."""
    chair = _user('col-chair@test.orbisave.com', role='chairperson')
    joined = _user('col-joined@test.orbisave.com')
    ungrouped = _user('col-solo@test.orbisave.com')
    group = _group('Harambee Circle', 'kenya', chair)
    _join(group, chair, 'kenya', role='chairperson')
    _join(group, joined, 'kenya', role='member')
    return {'group': group, 'chair': chair, 'joined': joined, 'ungrouped': ungrouped}


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _by_name(results):
    return {r['full_name']: r for r in results}


class TestGroupColumn:
    def test_group_name_resolved_across_shard(self, super_admin, scenario):
        rows = _by_name(_client(super_admin).get('/api/v1/admin-portal/users/').json()['results'])
        assert rows['col-joined']['group_name'] == 'Harambee Circle'
        assert rows['col-joined']['group_role'] == 'member'
        assert rows['col-chair']['group_role'] == 'chairperson'

    def test_ungrouped_member_has_no_group(self, super_admin, scenario):
        rows = _by_name(_client(super_admin).get('/api/v1/admin-portal/users/').json()['results'])
        assert rows['col-solo']['group_name'] is None
        assert rows['col-solo']['group_id'] is None


class TestGroupFilter:
    def test_filter_to_one_group_returns_its_members(self, super_admin, scenario):
        gid = str(scenario['group'].id)
        payload = _client(super_admin).get('/api/v1/admin-portal/users/', {'group': gid}).json()
        names = {r['full_name'] for r in payload['results']}
        assert names == {'col-chair', 'col-joined'}
        assert 'col-solo' not in names

    def test_filter_none_returns_only_ungrouped(self, super_admin, scenario):
        payload = _client(super_admin).get('/api/v1/admin-portal/users/', {'group': '__none__'}).json()
        names = {r['full_name'] for r in payload['results']}
        assert 'col-solo' in names
        assert 'col-chair' not in names
        assert 'col-joined' not in names


class TestUserDetailMembership:
    def test_detail_shows_membership_for_super_admin(self, super_admin, scenario):
        # The detail view had the same cross-shard bug: memberships read from
        # 'default' and came back empty for a super_admin.
        uid = str(scenario['joined'].id)
        payload = _client(super_admin).get(f'/api/v1/admin-portal/users/{uid}/').json()
        groups = [m['group_name'] for m in payload['group_memberships']]
        assert 'Harambee Circle' in groups
