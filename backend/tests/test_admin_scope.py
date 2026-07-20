"""
RBAC coverage for admin country scoping, by direct URL.

The rules under test live in common/admin_scope.py. The bugs they replace were
silent: a platform_admin with no country either saw NULL rows (list views) or
EVERYTHING across all countries (reconciliation, where None meant
unrestricted), and a ?country= param naming another country was silently
ignored, so the URL looked like it worked. Every case here attempts the actual
request, per the standing rule that RBAC is verified by direct URL rather than
by which nav items are hidden.
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
def kenya_admin(db):
    return _admin('scope-ke@test.orbisave.com', 'platform_admin', 'kenya')


@pytest.fixture
def countryless_admin(db):
    return _admin('scope-none@test.orbisave.com', 'platform_admin', None)


@pytest.fixture
def scope_super(db):
    return _admin('scope-super@test.orbisave.com', 'super_admin', None)


@pytest.fixture
def two_country_users(db):
    from apps.accounts.models import User
    rows = []
    for i, country in [(0, 'kenya'), (1, 'kenya'), (2, 'rwanda')]:
        rows.append(User(
            email=f'scope-member{i}@test.orbisave.com',
            phone=f'+2547009000{i:02d}',
            full_name=f'Scope Member {i}',
            role='member',
            country=country,
            is_active=True,
            password=make_password('SecurePass123!'),
        ))
    return User.objects.bulk_create(rows)


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


LIST_URLS = [
    '/api/v1/admin-portal/users/',
    '/api/v1/admin-portal/groups/',
    '/api/v1/admin-portal/kyc/queue/',
    '/api/v1/admin-portal/stats/',
]


class TestCountrylessPlatformAdminIsRefused:
    """
    A staff account with no country is misconfigured, and on an oversight
    surface an empty list is indistinguishable from a working one. The refusal
    must be loud.
    """

    @pytest.mark.parametrize('url', LIST_URLS)
    def test_denied_not_empty(self, countryless_admin, url):
        response = _client(countryless_admin).get(url)
        assert response.status_code == 403, (
            f'{url} returned {response.status_code}; a country-less '
            f'platform_admin must be refused, not silently filtered'
        )

    def test_reconciliation_does_not_fall_open_to_all_countries(self, countryless_admin):
        # The worst variant: here a None scope used to mean UNRESTRICTED, so
        # the misconfigured account saw every country's reconciliation queue.
        response = _client(countryless_admin).get('/api/v1/admin-portal/reconciliation/runs/')
        assert response.status_code == 403


class TestCrossCountryParamIsRefused:
    """A platform_admin cannot reach another country by editing ?country=."""

    @pytest.mark.parametrize('url', LIST_URLS)
    def test_other_country_denied_by_direct_url(self, kenya_admin, url):
        response = _client(kenya_admin).get(url, {'country': 'rwanda'})
        assert response.status_code == 403, (
            f'{url}?country=rwanda returned {response.status_code} for a '
            f'kenya admin; must be 403, never silently their own data'
        )

    def test_own_country_param_is_allowed(self, kenya_admin):
        response = _client(kenya_admin).get('/api/v1/admin-portal/users/', {'country': 'kenya'})
        assert response.status_code == 200

    def test_scoped_to_own_country_rows_only(self, kenya_admin, two_country_users):
        payload = _client(kenya_admin).get('/api/v1/admin-portal/users/').json()
        countries = {row['country'] for row in payload['results']}
        assert countries <= {'kenya'}, f'kenya admin saw rows from {countries}'


class TestSuperAdminTargeting:
    def test_may_target_any_country(self, scope_super, two_country_users):
        payload = _client(scope_super).get(
            '/api/v1/admin-portal/users/', {'country': 'rwanda'},
        ).json()
        countries = {row['country'] for row in payload['results']}
        assert countries <= {'rwanda'}

    def test_omitting_country_means_platform_wide(self, scope_super, two_country_users):
        payload = _client(scope_super).get('/api/v1/admin-portal/users/').json()
        countries = {row['country'] for row in payload['results']}
        assert {'kenya', 'rwanda'} <= countries

    def test_unknown_country_is_a_validation_error(self, scope_super):
        response = _client(scope_super).get(
            '/api/v1/admin-portal/users/', {'country': 'wakanda'},
        )
        assert response.status_code == 400


class TestAnonymousRequestsGet401Not500:
    """
    common.permissions.IsPlatformAdmin read request.user.role with no
    authentication check, and view-level permission_classes REPLACE the global
    IsAuthenticated default, so anonymous requests to views using that class
    raised AttributeError: a 500 where a 401 belongs.
    """

    @pytest.mark.parametrize('url', [
        '/api/v1/admin-portal/reconciliation/runs/',
        '/api/v1/admin-portal/reconciliation/items/',
        '/api/v1/admin-portal/users/',
        '/api/v1/admin-portal/groups/',
    ])
    def test_anonymous_is_unauthenticated_not_server_error(self, url):
        response = APIClient().get(url)
        assert response.status_code in (401, 403), (
            f'{url} returned {response.status_code} for an anonymous request'
        )
        assert response.status_code != 500
