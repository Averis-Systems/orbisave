"""
Coverage for cross-shard admin list pagination.

Groups and loans live only in the country databases. A super_admin has
country=None, and an unscoped query routes to 'default' where those tables are
empty, so the platform-wide lists silently returned nothing even when data
existed in the shards. These tests pin the fan-out: a platform-wide list reads
every shard, a scoped list reads exactly one, and the merged order is correct.
"""
import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


def _admin(email, role, country):
    from apps.accounts.models import User
    return User.objects.create(
        email=email,
        phone=f'+2547{abs(hash(email)) % 10**8:08d}',
        full_name=email.split('@')[0],
        role=role,
        country=country,
        is_active=True,
        email_verified=True,
        password=make_password('SecurePass123!'),
    )


@pytest.fixture
def super_admin(db):
    return _admin('shard-super@test.orbisave.com', 'super_admin', None)


@pytest.fixture
def kenya_admin(db):
    return _admin('shard-ke@test.orbisave.com', 'platform_admin', 'kenya')


def _make_group(name, country, chairperson):
    """Groups route by thread-local country, so write on the country's shard."""
    from decimal import Decimal
    from apps.groups.models import Group
    from common.db_utils import get_db_for_country
    return Group.objects.using(get_db_for_country(country)).create(
        name=name,
        description='',
        country=country,
        currency='KES' if country == 'kenya' else 'RWF',
        max_members=10,
        contribution_amount=Decimal('1000.00'),
        contribution_frequency='monthly',
        contribution_day=1,
        rotation_savings_pct=Decimal('70'),
        loan_pool_pct=Decimal('30'),
        max_loan_multiplier=Decimal('3'),
        loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal('5.00'),
        rotation_method='sequential',
        status='active',
        verification_status='verified',
        chairperson=chairperson,
    )


@pytest.fixture
def groups_across_shards(db, kenya_admin):
    # Two in kenya, one in rwanda, so a platform-wide list must merge shards
    # and a kenya-scoped list must exclude the rwanda one.
    return [
        _make_group('Alpha Circle', 'kenya', kenya_admin),
        _make_group('Beta Circle', 'kenya', kenya_admin),
        _make_group('Gamma Circle', 'rwanda', kenya_admin),
    ]


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestGroupListShardFanout:
    def test_super_admin_sees_groups_from_every_shard(self, super_admin, groups_across_shards):
        payload = _client(super_admin).get('/api/v1/admin-portal/groups/').json()
        names = {g['name'] for g in payload['results']}
        assert names == {'Alpha Circle', 'Beta Circle', 'Gamma Circle'}
        assert payload['count'] == 3

    def test_country_admin_sees_only_their_shard(self, kenya_admin, groups_across_shards):
        payload = _client(kenya_admin).get('/api/v1/admin-portal/groups/').json()
        countries = {g['country'] for g in payload['results']}
        assert countries == {'kenya'}
        assert payload['count'] == 2

    def test_super_admin_can_target_one_country(self, super_admin, groups_across_shards):
        payload = _client(super_admin).get('/api/v1/admin-portal/groups/', {'country': 'rwanda'}).json()
        assert {g['name'] for g in payload['results']} == {'Gamma Circle'}
        assert payload['count'] == 1

    def test_merged_pages_do_not_overlap(self, super_admin, groups_across_shards):
        client = _client(super_admin)
        one = client.get('/api/v1/admin-portal/groups/', {'page': 1, 'page_size': 2}).json()
        two = client.get('/api/v1/admin-portal/groups/', {'page': 2, 'page_size': 2}).json()
        assert one['count'] == 3 and one['total_pages'] == 2
        assert len(one['results']) == 2 and len(two['results']) == 1
        ids = {g['id'] for g in one['results']} | {g['id'] for g in two['results']}
        assert len(ids) == 3

    def test_search_filters_across_shards(self, super_admin, groups_across_shards):
        payload = _client(super_admin).get('/api/v1/admin-portal/groups/', {'search': 'Gamma'}).json()
        assert {g['name'] for g in payload['results']} == {'Gamma Circle'}


class TestPaginateShardedUnit:
    def test_gather_bound_and_merge_order(self):
        from common.pagination import paginate_sharded

        class Req:
            query_params = {'page': '1', 'page_size': '3'}

        # Two "shards" of pre-sorted descending numbers.
        shards = {'a': [9, 6, 3], 'b': [8, 5, 2]}

        def build_qs(alias):
            data = shards[alias]

            class FakeQS(list):
                def count(self):
                    return len(self)

            return FakeQS(data)

        items, meta = paginate_sharded(
            Req(), ['a', 'b'], build_qs, sort_key=lambda x: x, reverse=True,
        )
        assert items == [9, 8, 6]  # top 3 across both shards, descending
        assert meta['count'] == 6
        assert meta['total_pages'] == 2
