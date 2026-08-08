"""
Authorization tests for the penalty (fine) endpoints.

Regression tests for the security fixes:
  F1 - POST /fines/issue/ was reachable UNAUTHENTICATED and by non-leaders,
       letting anyone fabricate a penalty against any member of any group. The
       action now requires authentication and an active leader of the target
       group (verified below via the anonymous + ordinary-member rejections).
  F3 - PenaltyViewSet was a full ModelViewSet, so a member could DELETE a fine
       and `create` was routable. It is now read-only (no destroy/create routes).

These assert the negative (security) cases, which do not depend on the
country-shard routing of the issuance write path.
"""
import pytest
from decimal import Decimal

from apps.groups.models import Group, PenaltyRule
from apps.contributions.models import Penalty

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])

ISSUE_URL = '/api/v1/contributions/fines/issue/'


@pytest.fixture
def verified_group(group):
    Group.objects.filter(pk=group.pk).update(verification_status='verified')
    group.refresh_from_db()
    return group


def _payload(grp, member, amount='500.00'):
    return {
        'group': str(grp.id),
        'member': str(member.id),
        'amount': amount,
        'rule_type': 'late_contribution',
    }


class TestPenaltyIssueAuthorization:
    def test_unauthenticated_cannot_issue(self, api_client, verified_group, user, group_member):
        resp = api_client.post(ISSUE_URL, _payload(verified_group, user), format='json')
        assert resp.status_code in (401, 403), resp.content
        assert Penalty.objects.count() == 0

    def test_ordinary_member_cannot_issue(self, member_client, verified_group, user, group_member):
        # `user` is an active member but not a chair/treasurer of the group.
        resp = member_client.post(ISSUE_URL, _payload(verified_group, user), format='json')
        assert resp.status_code == 403, resp.content
        assert Penalty.objects.count() == 0


class TestPenaltyReadOnly:
    def test_delete_route_not_exposed(self, member_client, verified_group, user, group_member):
        # Create a fine directly, then confirm the member cannot delete it: the
        # viewset is read-only, so DELETE is 405 (method not allowed) regardless
        # of object visibility.
        rule = PenaltyRule.objects.create(
            group=verified_group, rule_type='late_contribution',
            penalty_type='fixed', value=Decimal('500'),
        )
        penalty = Penalty.objects.create(member=user, rule=rule, amount=Decimal('500'), status='pending')
        resp = member_client.delete(f'/api/v1/contributions/fines/{penalty.id}/')
        assert resp.status_code == 405, resp.content
        assert Penalty.objects.filter(id=penalty.id).exists()

    def test_create_route_not_exposed(self, member_client, verified_group):
        resp = member_client.post('/api/v1/contributions/fines/', {'amount': '500'}, format='json')
        assert resp.status_code == 405, resp.content
