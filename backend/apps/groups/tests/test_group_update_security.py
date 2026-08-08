"""
Mass-assignment regression tests for GroupViewSet update (F2).

GroupSerializer left status/verification_status/country/currency writable, so a
verified chairperson could PATCH /groups/{id}/ to self-activate, self-verify, or
corrupt the per-country shard + currency invariant. Those fields are now
read_only; DRF silently ignores them on input, so the values must not change.
"""
import pytest

from apps.groups.models import Group
from common.middleware import set_current_country, get_current_country

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


@pytest.fixture(autouse=True)
def _kenya_db_context():
    """Align the shard the fixtures write to with the one the country-aware view
    reads from (separate in-memory connections per alias in the test settings)."""
    previous = get_current_country()
    set_current_country('kenya')
    yield
    set_current_country(previous)


@pytest.fixture
def verified_group(group):
    Group.objects.filter(pk=group.pk).update(
        verification_status='verified', status='pending_activation',
    )
    group.refresh_from_db()
    return group


class TestGroupUpdateMassAssignment:
    def _url(self, grp):
        return f'/api/v1/groups/{grp.id}/'

    def test_chair_cannot_self_verify(self, chair_client, verified_group):
        # Force it back to unverified first so a successful write would show.
        Group.objects.filter(pk=verified_group.pk).update(verification_status='pending_review')
        resp = chair_client.patch(self._url(verified_group), {'verification_status': 'verified'}, format='json')
        assert resp.status_code in (200, 403), resp.content
        verified_group.refresh_from_db()
        assert verified_group.verification_status == 'pending_review'

    def test_chair_cannot_activate_via_patch(self, chair_client, verified_group):
        resp = chair_client.patch(self._url(verified_group), {'status': 'active'}, format='json')
        assert resp.status_code in (200, 403), resp.content
        verified_group.refresh_from_db()
        assert verified_group.status == 'pending_activation'  # unchanged

    def test_chair_cannot_change_country_or_currency(self, chair_client, verified_group):
        resp = chair_client.patch(
            self._url(verified_group), {'country': 'ghana', 'currency': 'GHS'}, format='json',
        )
        assert resp.status_code in (200, 403), resp.content
        verified_group.refresh_from_db()
        assert verified_group.country == 'kenya'
        assert verified_group.currency == 'KES'

    def test_editable_field_still_writable(self, chair_client, verified_group):
        # A non-protected field (description) should still update, proving the
        # lockdown is scoped and did not freeze the whole serializer.
        resp = chair_client.patch(self._url(verified_group), {'description': 'Updated by chair'}, format='json')
        assert resp.status_code == 200, resp.content
        verified_group.refresh_from_db()
        assert verified_group.description == 'Updated by chair'
