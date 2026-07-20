"""
Coverage for the rate limiting controls and the client IP recovery they depend
on.

These are security controls with no visible symptom when they break: if the
throttle silently stops applying, or every caller collapses into one IP bucket,
nothing fails loudly. So they are asserted directly.
"""
from contextlib import contextmanager

import pytest
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient

from common.client_ip import ClientIPMiddleware


# Throttle state lives in the cache, so every test starts from a clean slate.
# Without this the counter leaks between tests and the order changes results.
@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@contextmanager
def throttle_rates(**overrides):
    """
    Re-enable specific throttle rates for the duration of a test.

    Test settings zero every rate out, so each test opts back in to only the
    one it exercises. This patches SimpleRateThrottle.THROTTLE_RATES rather
    than using override_settings, because DRF binds that dict as a class
    attribute at import time and never re-reads it from settings. Overriding
    REST_FRAMEWORK appears to work but leaves the class attribute pointing at
    the dict captured on first import, so whether a test passed depended on
    which module imported DRF first.
    """
    from rest_framework.throttling import SimpleRateThrottle

    original = SimpleRateThrottle.THROTTLE_RATES
    SimpleRateThrottle.THROTTLE_RATES = {**original, **overrides}
    try:
        yield
    finally:
        SimpleRateThrottle.THROTTLE_RATES = original


# ── Client IP recovery ────────────────────────────────────────────────────────

class TestClientIPMiddleware:
    """
    Every browser-facing app reaches Django through a Next proxy, so without
    this middleware REMOTE_ADDR is the proxy on every request and all IP-keyed
    limits share one bucket.
    """

    def _resolve(self, remote_addr, forwarded=None, trusted=('127.0.0.1',)):
        with override_settings(TRUSTED_PROXY_IPS=list(trusted)):
            middleware = ClientIPMiddleware(lambda request: request)
            request = type('R', (), {})()
            request.META = {'REMOTE_ADDR': remote_addr}
            if forwarded is not None:
                request.META['HTTP_X_FORWARDED_FOR'] = forwarded
            middleware(request)
            return request.META['REMOTE_ADDR']

    def test_recovers_client_ip_behind_trusted_proxy(self):
        assert self._resolve('127.0.0.1', '203.0.113.9') == '203.0.113.9'

    def test_ignores_forwarded_header_from_untrusted_peer(self):
        # The header is client-supplied. Believing it from an arbitrary peer
        # would let anyone claim a fresh IP per request and never be limited.
        assert self._resolve('198.51.100.7', '203.0.113.9') == '198.51.100.7'

    def test_ignores_client_spoofed_entries_prepended_to_the_chain(self):
        # A client can prepend anything. Only the rightmost non-trusted hop was
        # actually observed by our own infrastructure.
        resolved = self._resolve('127.0.0.1', '1.2.3.4, 203.0.113.9', trusted=('127.0.0.1',))
        assert resolved == '203.0.113.9'

    def test_walks_past_trusted_hops(self):
        resolved = self._resolve(
            '127.0.0.1',
            '203.0.113.9, 10.0.0.5, 127.0.0.1',
            trusted=('127.0.0.1', '10.0.0.0/8'),
        )
        assert resolved == '203.0.113.9'

    def test_no_trusted_proxies_configured_is_a_no_op(self):
        assert self._resolve('127.0.0.1', '203.0.113.9', trusted=()) == '127.0.0.1'

    def test_malformed_chain_entry_does_not_become_the_client_ip(self):
        assert self._resolve('127.0.0.1', 'not-an-ip') == '127.0.0.1'

    def test_preserves_the_proxy_address_for_audit(self):
        with override_settings(TRUSTED_PROXY_IPS=['127.0.0.1']):
            middleware = ClientIPMiddleware(lambda request: request)
            request = type('R', (), {})()
            request.META = {'REMOTE_ADDR': '127.0.0.1', 'HTTP_X_FORWARDED_FOR': '203.0.113.9'}
            middleware(request)
            assert request.META['ORBI_PROXY_ADDR'] == '127.0.0.1'


# ── Throttling ────────────────────────────────────────────────────────────────

@pytest.fixture
def super_admin(db):
    from apps.accounts.models import User
    from django.contrib.auth.hashers import make_password
    return User.objects.create(
        email='super@test.orbisave.com',
        phone='+254700000099',
        full_name='Test Super Admin',
        role='super_admin',
        country=None,
        is_active=True,
        email_verified=True,
        password=make_password('SecurePass123!'),
    )


@pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])
class TestAdminThrottle:
    """
    The admin portal is where records belonging to other people are served, so
    it carries a rate far below ordinary user traffic.
    """

    def test_authorised_admin_scraping_is_cut_off(self, super_admin):
        """
        The exposure this closes: an admin who genuinely has access could page
        the entire user, group, loan, contribution, ledger and audit tables as
        fast as the network allowed.
        """
        client = APIClient()
        client.force_authenticate(user=super_admin)

        with throttle_rates(admin_list='3/min'):
            statuses = [
                client.get('/api/v1/admin-portal/users/').status_code
                for _ in range(6)
            ]

        assert 429 in statuses, f'expected a 429 among {statuses}'
        # And the early calls must still have worked, or the limit is too tight
        # to do the job the portal exists for.
        assert 200 in statuses, f'expected some successful reads among {statuses}'

    def test_member_endpoints_are_not_subject_to_the_admin_rate(self, user):
        client = APIClient()
        client.force_authenticate(user=user)

        with throttle_rates(admin_list='1/min'):
            statuses = [
                client.get('/api/v1/groups/').status_code
                for _ in range(4)
            ]

        # The admin throttle selects itself by URL prefix, so a member paging
        # their own dashboard must never trip it.
        assert 429 not in statuses, f'admin rate leaked onto member traffic: {statuses}'


@pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])
class TestAuthThrottle:
    """
    Credential and six digit code endpoints. The per-record attempt counter
    caps guesses against one code; this caps how fast codes can be requested
    and tried at all.
    """

    def test_login_rejects_a_burst(self):
        client = APIClient()

        with throttle_rates(auth='3/min'):
            statuses = [
                client.post(
                    '/api/v1/admin-portal/auth/login/',
                    {'email': 'nobody@invalid.test', 'password': 'wrong'},
                    format='json',
                ).status_code
                for _ in range(5)
            ]

        assert 429 in statuses, f'expected a 429 among {statuses}'

    def test_throttle_is_per_client_ip_not_global(self):
        """
        The regression this guards: with every request arriving from the Next
        proxy, one attacker exhausting the limit would lock out every other
        user if the bucket were shared.
        """
        attacker = APIClient()
        bystander = APIClient()

        with throttle_rates(auth='2/min'):
            for _ in range(4):
                attacker.post(
                    '/api/v1/admin-portal/auth/login/',
                    {'email': 'nobody@invalid.test', 'password': 'wrong'},
                    format='json',
                    HTTP_X_FORWARDED_FOR='203.0.113.9',
                )

            bystander_status = bystander.post(
                '/api/v1/admin-portal/auth/login/',
                {'email': 'someone@invalid.test', 'password': 'wrong'},
                format='json',
                HTTP_X_FORWARDED_FOR='198.51.100.4',
            ).status_code

        assert bystander_status != 429, 'one IP exhausting the limit locked out another'


@pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])
class TestThrottleCacheOutage:
    """
    Throttles read the cache on every request, which is a dependency the
    request path did not have before they existed. If that read raises, the
    platform must stay up.
    """

    def test_unreachable_cache_does_not_500_the_api(self, user, monkeypatch):
        from rest_framework.throttling import SimpleRateThrottle

        def explode(*args, **kwargs):
            raise ConnectionError('Error 10061 connecting to localhost:6379')

        monkeypatch.setattr(SimpleRateThrottle, 'get_cache_key', explode)

        with throttle_rates(burst='1000/min', sustained='1000/hour'):
            response = APIClient()
            response.force_authenticate(user=user)
            status = response.get('/api/v1/groups/').status_code

        assert status != 500, 'a cache outage turned every request into a 500'

    def test_fails_open_and_says_so(self, monkeypatch):
        """
        A rate limit that is silently not running is the state an attacker
        wants, so failing open must be loud.
        """
        from common import throttling

        recorded = []
        monkeypatch.setattr(
            throttling.logger, 'error',
            lambda event, **kw: recorded.append((event, kw)),
        )
        monkeypatch.setattr(
            throttling.BurstRateThrottle, 'get_cache_key',
            lambda *a, **k: (_ for _ in ()).throw(ConnectionError('redis is down')),
        )

        request = type('R', (), {'path': '/api/v1/groups/'})()

        with throttle_rates(burst='1000/min'):
            allowed = throttling.BurstRateThrottle().allow_request(request, None)

        assert allowed is True, 'a cache outage must not block the request'
        assert recorded, 'failing open was silent'
        event, fields = recorded[0]
        assert event == 'throttle_backend_unavailable'
        assert fields['scope'] == 'burst'


@pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])
class TestPageSizeCap:
    """
    A client must not be able to widen a page beyond the server's ceiling,
    which is what makes pagination a scraping control rather than a convenience.
    """

    def test_page_size_is_capped_server_side(self, chair_client, group):
        response = chair_client.get('/api/v1/groups/', {'page_size': 10000})

        assert response.status_code == 200
        from common.pagination import StandardPagination
        payload = response.json()
        rows = payload.get('data', payload.get('results', []))
        assert len(rows) <= StandardPagination.max_page_size
