import io

import pytest
from django.contrib.auth.hashers import make_password
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_portal.models import PlatformBranding

pytestmark = pytest.mark.django_db


def _test_image(name='logo.png'):
    buf = io.BytesIO()
    Image.new('RGB', (10, 10), color='green').save(buf, format='PNG')
    buf.seek(0)
    buf.name = name
    return buf


@pytest.fixture
def super_admin(db):
    return User.objects.create(
        email='branding.super@averissystems.com',
        phone='+254700400001',
        full_name='Branding Super Admin',
        role='super_admin',
        country='kenya',
        kyc_status='verified',
        is_active=True,
        email_verified=True,
        password=make_password('SecurePass123!'),
    )


@pytest.fixture
def platform_admin(db):
    return User.objects.create(
        email='branding.platform@averissystems.com',
        phone='+254700400002',
        full_name='Branding Platform Admin',
        role='platform_admin',
        country='kenya',
        kyc_status='verified',
        is_active=True,
        email_verified=True,
        password=make_password('SecurePass123!'),
    )


class TestPublicBrandingRead:

    def test_unset_branding_returns_nulls(self):
        response = APIClient().get('/api/v1/platform-branding/')
        assert response.status_code == 200
        assert response.data == {'logo_url': None, 'favicon_url': None}

    def test_no_auth_required(self):
        # Regression guard: this must stay reachable pre-login.
        response = APIClient().get('/api/v1/platform-branding/')
        assert response.status_code != 401 and response.status_code != 403


class TestUpdatePlatformBranding:

    def test_super_admin_can_set_logo_and_favicon(self, super_admin):
        client = APIClient()
        client.force_authenticate(user=super_admin)
        response = client.patch(
            '/api/v1/admin-portal/platform-branding/',
            {'logo': _test_image('logo.png'), 'favicon': _test_image('favicon.png')},
            format='multipart',
        )
        assert response.status_code == 200, response.data
        assert response.data['logo_url'].endswith('.png')
        assert response.data['favicon_url'].endswith('.png')

        public = APIClient().get('/api/v1/platform-branding/')
        assert public.data['logo_url'] == response.data['logo_url']

        branding = PlatformBranding.current()
        assert branding.updated_by == super_admin

    def test_partial_update_leaves_other_field_untouched(self, super_admin):
        client = APIClient()
        client.force_authenticate(user=super_admin)
        client.patch(
            '/api/v1/admin-portal/platform-branding/',
            {'logo': _test_image('logo.png'), 'favicon': _test_image('favicon.png')},
            format='multipart',
        )
        second = client.patch(
            '/api/v1/admin-portal/platform-branding/',
            {'logo': _test_image('new-logo.png')},
            format='multipart',
        )
        assert second.status_code == 200
        assert second.data['favicon_url'] is not None  # untouched, still set

    def test_platform_admin_cannot_update(self, platform_admin):
        client = APIClient()
        client.force_authenticate(user=platform_admin)
        response = client.patch(
            '/api/v1/admin-portal/platform-branding/',
            {'logo': _test_image()},
            format='multipart',
        )
        assert response.status_code == 403

    def test_unauthenticated_cannot_update(self):
        # 401 for "not authenticated" (RS256JWTAuthentication.authenticate_header
        # makes DRF emit the standards-correct status); 403 stays reserved for
        # authenticated-but-forbidden. The 401 is also what drives the member
        # proxy's transparent token refresh and the frontends' session logout.
        response = APIClient().patch(
            '/api/v1/admin-portal/platform-branding/',
            {'logo': _test_image()},
            format='multipart',
        )
        assert response.status_code == 401

    def test_empty_body_rejected(self, super_admin):
        client = APIClient()
        client.force_authenticate(user=super_admin)
        response = client.patch('/api/v1/admin-portal/platform-branding/', {}, format='multipart')
        assert response.status_code == 400
