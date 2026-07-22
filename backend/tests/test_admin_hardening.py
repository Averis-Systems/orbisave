"""
Coverage for the admin hardening pass: the KYC reset action, the pre-DRF
admin-portal gate, and the production JWT key requirement.
"""
import importlib

import pytest
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


def _user(email, role, country, **extra):
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
        **extra,
    )


@pytest.fixture
def kenya_admin(db):
    return _user('hard-ke@test.orbisave.com', 'platform_admin', 'kenya')


@pytest.fixture
def rejected_member(db):
    return _user('hard-member@test.orbisave.com', 'member', 'kenya', kyc_status='rejected')


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestKycReset:
    def test_reset_returns_member_to_pending_and_audits(self, kenya_admin, rejected_member):
        from apps.audit.models import AuditLog

        response = _client(kenya_admin).post(
            f'/api/v1/admin-portal/users/{rejected_member.id}/kyc-reset/',
            {'reason': 'Rejected by mistake, allow resubmission'},
            format='json',
        )
        assert response.status_code == 200, response.content
        rejected_member.refresh_from_db()
        assert rejected_member.kyc_status == 'pending'

        audit = AuditLog.objects.filter(target_user=rejected_member).order_by('-created_at').first()
        assert audit is not None
        assert audit.metadata.get('action') == 'kyc_reset'
        assert audit.metadata.get('previous_status') == 'rejected'

    def test_open_submission_is_closed_by_the_reset(self, kenya_admin, rejected_member):
        from apps.accounts.models import KYCDocument

        rejected_member.kyc_status = 'submitted'
        rejected_member.save(update_fields=['kyc_status'])
        doc = KYCDocument.objects.create(
            user=rejected_member, document_type='national_id', status='submitted',
        )

        response = _client(kenya_admin).post(
            f'/api/v1/admin-portal/users/{rejected_member.id}/kyc-reset/',
            {'reason': 'Document unreadable'},
            format='json',
        )
        assert response.status_code == 200
        doc.refresh_from_db()
        # The queue must not keep showing paperwork that no longer counts.
        assert doc.status == 'rejected'
        assert 'Reset by admin' in doc.rejection_reason

    def test_reason_is_mandatory(self, kenya_admin, rejected_member):
        response = _client(kenya_admin).post(
            f'/api/v1/admin-portal/users/{rejected_member.id}/kyc-reset/', {}, format='json',
        )
        assert response.status_code == 400
        rejected_member.refresh_from_db()
        assert rejected_member.kyc_status == 'rejected'

    def test_cross_country_admin_is_refused(self, rejected_member):
        rwanda_admin = _user('hard-rw@test.orbisave.com', 'platform_admin', 'rwanda')
        response = _client(rwanda_admin).post(
            f'/api/v1/admin-portal/users/{rejected_member.id}/kyc-reset/',
            {'reason': 'Trying from the wrong country'},
            format='json',
        )
        assert response.status_code == 403

    def test_admin_accounts_cannot_be_reset(self, kenya_admin):
        other_admin = _user('hard-ke2@test.orbisave.com', 'platform_admin', 'kenya')
        response = _client(kenya_admin).post(
            f'/api/v1/admin-portal/users/{other_admin.id}/kyc-reset/',
            {'reason': 'Should not work'},
            format='json',
        )
        assert response.status_code == 403

    def test_nothing_to_reset_is_a_clear_400(self, kenya_admin):
        fresh = _user('hard-fresh@test.orbisave.com', 'member', 'kenya', kyc_status='pending')
        response = _client(kenya_admin).post(
            f'/api/v1/admin-portal/users/{fresh.id}/kyc-reset/',
            {'reason': 'Nothing here'},
            format='json',
        )
        assert response.status_code == 400


class TestAdminPortalGate:
    """
    The pre-DRF backstop. DRF checks permissions before throttles, so 401/403
    responses were unlimited; the gate bounds them ahead of DRF entirely.
    """

    @pytest.fixture(autouse=True)
    def _clean_cache(self):
        cache.clear()
        yield
        cache.clear()

    @override_settings(ADMIN_GATE_PER_MINUTE=5)
    def test_anonymous_probing_is_cut_off(self):
        client = APIClient()
        statuses = [
            client.get('/api/v1/admin-portal/users/').status_code
            for _ in range(8)
        ]
        assert 429 in statuses, f'expected a 429 among {statuses}'
        # The first few must still be ordinary auth failures, proving the gate
        # sits above the ceiling rather than replacing normal behaviour.
        assert statuses[0] in (401, 403)

    @override_settings(ADMIN_GATE_PER_MINUTE=5)
    def test_non_admin_paths_are_not_gated(self):
        client = APIClient()
        statuses = [
            client.get('/api/v1/groups/').status_code
            for _ in range(8)
        ]
        assert 429 not in statuses

    @override_settings(ADMIN_GATE_PER_MINUTE=0)
    def test_zero_disables_the_gate(self):
        client = APIClient()
        statuses = [
            client.get('/api/v1/admin-portal/users/').status_code
            for _ in range(8)
        ]
        assert 429 not in statuses

    @override_settings(ADMIN_GATE_PER_MINUTE=3)
    def test_fails_open_when_cache_is_down(self, monkeypatch):
        from common import admin_gate

        def explode(*args, **kwargs):
            raise ConnectionError('redis is down')

        monkeypatch.setattr(admin_gate.cache, 'add', explode)

        client = APIClient()
        statuses = [
            client.get('/api/v1/admin-portal/users/').status_code
            for _ in range(6)
        ]
        assert 429 not in statuses, 'a cache outage must not lock admins out'


class TestProductionJwtKeys:
    def test_production_refuses_to_boot_without_rsa_keys(self, monkeypatch):
        """
        base.py resolves the HS256/SECRET_KEY fallback while its own DEBUG=True
        still holds, so production must hard-fail when the key files are
        missing rather than quietly signing sessions with a SECRET_KEY that
        has been committed to a public repository.
        """
        from django.core.exceptions import ImproperlyConfigured

        # Point the key paths at nothing so base's loader returns ''.
        monkeypatch.setenv('JWT_PRIVATE_KEY_PATH', 'secrets/does-not-exist.pem')
        monkeypatch.setenv('JWT_PUBLIC_KEY_PATH', 'secrets/does-not-exist.pem')
        monkeypatch.setenv('SECRET_KEY', 'test-secret')

        import config.settings.base as base
        import config.settings.production as production

        # production does `from .base import *`, which reads the CACHED base
        # module; base must be reloaded first so its key loader actually runs
        # against the patched paths.
        try:
            importlib.reload(base)
            with pytest.raises(ImproperlyConfigured, match='RSA JWT keys'):
                importlib.reload(production)
        finally:
            # Whatever happened, put both modules back the way the rest of the
            # process expects them.
            monkeypatch.undo()
            importlib.reload(base)
            importlib.reload(production)
