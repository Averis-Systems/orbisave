"""
Feedback / support system tests.

Covers the flow: member submits (optionally serious -> auto-escalated), sees only
their own tickets; a country manager sees only their country and can resolve /
escalate; the super admin sees everything including escalated; non-admins are
locked out of the admin queue; screenshot uploads are validated.

Feedback lives on the platform (default) DB, so no country-shard setup is needed.
"""
import io
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.feedback.models import Feedback

pytestmark = pytest.mark.django_db

MEMBER_URL = '/api/v1/feedback/'
ADMIN_URL = '/api/v1/admin-portal/feedback/'


def _rows(resp):
    """Items from either shape: the member StandardPagination envelope
    ({data: [...]}) or the admin table shape ({results: [...], count})."""
    body = resp.json()
    if isinstance(body, dict):
        if 'results' in body:
            return body['results']
        if 'data' in body:
            return body['data']
    return body


def _png():
    buf = io.BytesIO()
    Image.new('RGB', (4, 4), (10, 120, 10)).save(buf, format='PNG')
    return buf.getvalue()


@pytest.fixture
def ke_manager(db):
    return User.objects.create(
        email='ke.manager@test.orbisave.com', phone='+254700100001',
        full_name='Kenya Manager', role='platform_admin', country='kenya', is_active=True,
    )


@pytest.fixture
def gh_manager(db):
    return User.objects.create(
        email='gh.manager@test.orbisave.com', phone='+233200100001',
        full_name='Ghana Manager', role='platform_admin', country='ghana', is_active=True,
    )


@pytest.fixture
def super_admin(db):
    return User.objects.create(
        email='super@test.orbisave.com', phone='+254700100009',
        full_name='Super Admin', role='super_admin', country='kenya', is_active=True,
    )


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestMemberSubmit:
    def test_member_can_submit(self, user):
        resp = _client(user).post(MEMBER_URL, {
            'category': 'bug', 'subject': 'App crashes on save',
            'message': 'It closes when I tap save.', 'severity': 'normal',
        }, format='json')
        assert resp.status_code == 201, resp.content
        fb = Feedback.objects.get()
        assert fb.reporter_id == user.id
        assert fb.country == user.country       # denormalised from reporter
        assert fb.status == 'open'

    def test_serious_auto_escalates(self, user):
        resp = _client(user).post(MEMBER_URL, {
            'category': 'payment', 'subject': 'Money missing',
            'message': 'My contribution left my account but is not showing.',
            'severity': 'serious',
        }, format='json')
        assert resp.status_code == 201, resp.content
        fb = Feedback.objects.get()
        assert fb.status == 'escalated'
        assert fb.escalated_at is not None

    def test_anonymous_cannot_submit(self):
        resp = APIClient().post(MEMBER_URL, {'subject': 'x', 'message': 'y'}, format='json')
        assert resp.status_code in (401, 403)

    def test_member_sees_only_own(self, user, chairperson):
        Feedback.objects.create(reporter=user, country='kenya', subject='mine', message='m')
        Feedback.objects.create(reporter=chairperson, country='kenya', subject='theirs', message='m')
        resp = _client(user).get(MEMBER_URL)
        assert resp.status_code == 200
        subjects = [r['subject'] for r in _rows(resp)]
        assert 'mine' in subjects and 'theirs' not in subjects

    def test_malicious_screenshot_rejected(self, user):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        bad = SimpleUploadedFile('shot.png', svg, content_type='image/png')
        resp = _client(user).post(MEMBER_URL, {
            'subject': 'x', 'message': 'y', 'screenshot': bad,
        }, format='multipart')
        assert resp.status_code == 400, resp.content
        assert Feedback.objects.count() == 0

    def test_genuine_screenshot_accepted(self, user):
        good = SimpleUploadedFile('shot.png', _png(), content_type='image/png')
        resp = _client(user).post(MEMBER_URL, {
            'subject': 'with shot', 'message': 'see attached', 'screenshot': good,
        }, format='multipart')
        assert resp.status_code == 201, resp.content
        assert Feedback.objects.get().screenshot


class TestAdminQueue:
    def test_manager_sees_only_their_country(self, ke_manager, user):
        Feedback.objects.create(reporter=user, country='kenya', subject='ke issue', message='m')
        Feedback.objects.create(reporter=user, country='ghana', subject='gh issue', message='m')
        resp = _client(ke_manager).get(ADMIN_URL)
        assert resp.status_code == 200, resp.content
        subjects = [r['subject'] for r in _rows(resp)]
        assert 'ke issue' in subjects and 'gh issue' not in subjects

    def test_super_admin_sees_all(self, super_admin, user):
        Feedback.objects.create(reporter=user, country='kenya', subject='ke issue', message='m')
        Feedback.objects.create(reporter=user, country='ghana', subject='gh issue', message='m')
        resp = _client(super_admin).get(ADMIN_URL)
        assert resp.status_code == 200
        assert len(_rows(resp)) == 2

    def test_member_cannot_access_admin_queue(self, user):
        resp = _client(user).get(ADMIN_URL)
        assert resp.status_code == 403

    def test_manager_can_resolve(self, ke_manager, user):
        fb = Feedback.objects.create(reporter=user, country='kenya', subject='x', message='m')
        resp = _client(ke_manager).post(f'{ADMIN_URL}{fb.id}/resolve/', {'resolution_note': 'fixed it'}, format='json')
        assert resp.status_code == 200, resp.content
        fb.refresh_from_db()
        assert fb.status == 'resolved'
        assert fb.resolved_by_id == ke_manager.id
        assert fb.resolution_note == 'fixed it'

    def test_manager_cannot_resolve_other_country(self, ke_manager, user):
        fb = Feedback.objects.create(reporter=user, country='ghana', subject='x', message='m')
        resp = _client(ke_manager).post(f'{ADMIN_URL}{fb.id}/resolve/', {}, format='json')
        assert resp.status_code == 404  # out of the manager's scoped queryset
        fb.refresh_from_db()
        assert fb.status == 'open'

    def test_manager_can_escalate(self, ke_manager, user):
        fb = Feedback.objects.create(reporter=user, country='kenya', subject='x', message='m')
        resp = _client(ke_manager).post(f'{ADMIN_URL}{fb.id}/escalate/', {}, format='json')
        assert resp.status_code == 200, resp.content
        fb.refresh_from_db()
        assert fb.status == 'escalated'
        assert fb.escalated_at is not None

    def test_super_admin_escalated_filter(self, super_admin, user):
        Feedback.objects.create(reporter=user, country='kenya', subject='open one', message='m', status='open')
        Feedback.objects.create(reporter=user, country='ghana', subject='esc one', message='m', status='escalated')
        resp = _client(super_admin).get(f'{ADMIN_URL}?escalated=true')
        assert resp.status_code == 200
        subjects = [r['subject'] for r in _rows(resp)]
        assert subjects == ['esc one']
