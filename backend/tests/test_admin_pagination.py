"""
Coverage for admin list pagination.

The admin portal's list views used to cap output with hardcoded slices
([:200], [:100]): anything past the cap was silently invisible, so an admin
could be looking at an incomplete loan book with no signal that rows were
missing. These tests pin the replacement behaviour: a real page/page_size
contract, a server-side size cap, and a count that reflects the whole set
rather than the visible page.
"""
import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from common.pagination import paginate_admin_queryset


class FakeRequest:
    """query_params stand-in so the helper can be tested without HTTP."""

    def __init__(self, **params):
        self.query_params = {k: str(v) for k, v in params.items()}


class TestPaginateAdminQueryset:
    def test_clamps_page_size_to_the_server_cap(self):
        items, meta = paginate_admin_queryset(
            FakeRequest(page_size=10000), list(range(500)), max_page_size=100,
        )
        assert len(items) == 100
        assert meta['page_size'] == 100

    def test_garbage_page_inputs_do_not_raise(self):
        # int('abc') raising out of a view was a live 500 on several admin
        # endpoints before this helper existed.
        items, meta = paginate_admin_queryset(
            FakeRequest(page='abc', page_size='xyz'), list(range(10)),
        )
        assert meta['page'] == 1
        assert len(items) == 10

    def test_pages_partition_the_set_without_overlap(self):
        data = list(range(120))
        first, meta1 = paginate_admin_queryset(FakeRequest(page=1, page_size=50), data)
        second, meta2 = paginate_admin_queryset(FakeRequest(page=2, page_size=50), data)
        third, meta3 = paginate_admin_queryset(FakeRequest(page=3, page_size=50), data)
        assert list(first) + list(second) + list(third) == data
        assert meta1['count'] == meta2['count'] == 120
        assert meta1['total_pages'] == 3

    def test_zero_and_negative_inputs_are_clamped(self):
        items, meta = paginate_admin_queryset(FakeRequest(page=0, page_size=-5), list(range(9)))
        assert meta['page'] == 1
        assert meta['page_size'] == 1

    def test_empty_set_reports_one_page(self):
        items, meta = paginate_admin_queryset(FakeRequest(), [])
        assert list(items) == []
        assert meta == {'count': 0, 'page': 1, 'page_size': 50, 'total_pages': 1}


@pytest.fixture
def super_admin(db):
    from apps.accounts.models import User
    return User.objects.create(
        email='pager-super@test.orbisave.com',
        phone='+254700000098',
        full_name='Pager Super Admin',
        role='super_admin',
        country=None,
        is_active=True,
        email_verified=True,
        password=make_password('SecurePass123!'),
    )


@pytest.fixture
def many_members(db):
    from apps.accounts.models import User
    users = [
        User(
            email=f'member{i}@pager.orbisave.com',
            phone=f'+2547001{i:05d}',
            full_name=f'Member {i:03d}',
            role='member',
            country='kenya',
            is_active=True,
            password=make_password('SecurePass123!'),
        )
        for i in range(60)
    ]
    return User.objects.bulk_create(users)


@pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])
class TestAdminUserListPagination:
    """End-to-end over /api/v1/admin-portal/users/, the busiest admin list."""

    def _client(self, super_admin):
        client = APIClient()
        client.force_authenticate(user=super_admin)
        return client

    def test_count_is_the_full_set_not_the_page(self, super_admin, many_members):
        response = self._client(super_admin).get(
            '/api/v1/admin-portal/users/', {'page_size': 10},
        )
        assert response.status_code == 200
        payload = response.json()
        assert len(payload['results']) == 10
        # 60 created members; the fixture admin is excluded by role. What
        # matters is that count exceeds the page, proving no silent cap.
        assert payload['count'] >= 60
        assert payload['total_pages'] >= 6

    def test_page_two_returns_the_next_rows(self, super_admin, many_members):
        client = self._client(super_admin)
        one = client.get('/api/v1/admin-portal/users/', {'page': 1, 'page_size': 10}).json()
        two = client.get('/api/v1/admin-portal/users/', {'page': 2, 'page_size': 10}).json()
        ids_one = {r['id'] for r in one['results']}
        ids_two = {r['id'] for r in two['results']}
        assert ids_one and ids_two
        assert ids_one.isdisjoint(ids_two)

    def test_client_cannot_exceed_the_size_cap(self, super_admin, many_members):
        response = self._client(super_admin).get(
            '/api/v1/admin-portal/users/', {'page_size': 100000},
        )
        assert response.status_code == 200
        assert len(response.json()['results']) <= 100

    def test_garbage_paging_params_do_not_500(self, super_admin):
        response = self._client(super_admin).get(
            '/api/v1/admin-portal/users/', {'page': 'zzz', 'page_size': 'huge'},
        )
        assert response.status_code == 200
