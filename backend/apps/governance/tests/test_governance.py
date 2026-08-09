"""
Group governance (proposals + quorum voting) tests.

Covers: only active members can propose/vote; a passed 'activate_loan_pool'
proposal turns the pool on and applies the proposed terms; a No majority
rejects; one vote per member; and quorum-not-reached expires the proposal.

Governance is a sharded (financial) app, so the country context is aligned so
fixture writes and the country-aware views read the same shard.
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from apps.groups.models import Group, GroupMember
from apps.governance.models import GroupProposal, GroupVote
from common.middleware import set_current_country, get_current_country

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


@pytest.fixture(autouse=True)
def _kenya_ctx():
    prev = get_current_country()
    set_current_country('kenya')
    yield
    set_current_country(prev)


@pytest.fixture
def loan_off_group(group):
    """The shared group with loaning OFF, so we can vote it on."""
    Group.objects.using('kenya').filter(id=group.id).update(loan_pool_enabled=False)
    group.refresh_from_db()
    return group


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _propose(client, group, **over):
    body = {
        'proposal_type': 'activate_loan_pool',
        'title': 'Turn on internal loaning',
        'payload': {'loan_pool_pct': '25.00', 'loan_interest_rate_monthly': '4.00'},
        'quorum_pct': '50.00',
        'pass_pct': '50.00',
        'duration_hours': 72,
    }
    body.update(over)
    return client.post(f'/api/v1/governance/groups/{group.id}/proposals/', body, format='json')


class TestProposalAuthz:
    def test_member_can_create(self, loan_off_group, chairperson, user, group_member):
        resp = _propose(_client(user), loan_off_group)
        assert resp.status_code == 201, resp.content
        assert GroupProposal.objects.using('kenya').filter(group=loan_off_group).count() == 1

    def test_non_member_cannot_create(self, loan_off_group, db):
        from apps.accounts.models import User
        outsider = User.objects.create(
            email='out@test.orbisave.com', phone='+254700088888',
            full_name='Outsider', role='member', country='kenya',
        )
        resp = _propose(_client(outsider), loan_off_group)
        assert resp.status_code == 403, resp.content

    def test_non_member_cannot_vote(self, loan_off_group, chairperson, user, group_member, db):
        from apps.accounts.models import User
        p = _propose(_client(user), loan_off_group).json()
        outsider = User.objects.create(
            email='out2@test.orbisave.com', phone='+254700088887',
            full_name='Outsider2', role='member', country='kenya',
        )
        resp = _client(outsider).post(f"/api/v1/governance/proposals/{p['id']}/vote/", {'choice': 'yes'}, format='json')
        assert resp.status_code == 403, resp.content


class TestQuorumVoting:
    def test_activate_loan_pool_passes_and_applies(self, loan_off_group, chairperson, user, group_member):
        # Two active members (chair + user). Both vote yes -> everyone voted ->
        # quorum met, Yes majority -> passes and applies the terms.
        pid = _propose(_client(user), loan_off_group).json()['id']
        _client(user).post(f'/api/v1/governance/proposals/{pid}/vote/', {'choice': 'yes'}, format='json')
        final = _client(chairperson).post(f'/api/v1/governance/proposals/{pid}/vote/', {'choice': 'yes'}, format='json')
        assert final.status_code == 200, final.content
        assert final.json()['status'] == 'passed'

        loan_off_group.refresh_from_db()
        assert loan_off_group.loan_pool_enabled is True
        assert loan_off_group.loan_pool_pct == Decimal('25.00')
        assert loan_off_group.loan_interest_rate_monthly == Decimal('4.00')

    def test_majority_no_rejects(self, loan_off_group, chairperson, user, group_member):
        pid = _propose(_client(user), loan_off_group).json()['id']
        _client(user).post(f'/api/v1/governance/proposals/{pid}/vote/', {'choice': 'no'}, format='json')
        final = _client(chairperson).post(f'/api/v1/governance/proposals/{pid}/vote/', {'choice': 'no'}, format='json')
        assert final.json()['status'] == 'rejected', final.content
        loan_off_group.refresh_from_db()
        assert loan_off_group.loan_pool_enabled is False

    def test_one_vote_per_member(self, loan_off_group, chairperson, user, group_member):
        pid = _propose(_client(user), loan_off_group).json()['id']
        _client(user).post(f'/api/v1/governance/proposals/{pid}/vote/', {'choice': 'yes'}, format='json')
        _client(user).post(f'/api/v1/governance/proposals/{pid}/vote/', {'choice': 'no'}, format='json')
        votes = GroupVote.objects.using('kenya').filter(proposal_id=pid, voter=user)
        assert votes.count() == 1
        assert votes.first().choice == 'no'

    def test_quorum_not_met_expires(self, loan_off_group, chairperson, user, group_member):
        # A proposal whose window has closed with nobody voting -> expired, no change.
        proposal = GroupProposal.objects.using('kenya').create(
            group=loan_off_group, proposal_type='activate_loan_pool',
            title='stale', quorum_pct=Decimal('50'), pass_pct=Decimal('50'),
            closes_at=timezone.now() - timedelta(hours=1), created_by=user,
        )
        resp = _client(user).get(f'/api/v1/governance/proposals/{proposal.id}/')
        assert resp.status_code == 200
        assert resp.json()['status'] == 'expired', resp.content
        loan_off_group.refresh_from_db()
        assert loan_off_group.loan_pool_enabled is False


class TestLoanGate:
    def test_loan_request_gate_follows_the_flag(self, loan_off_group):
        """The loan request serializer refuses while the pool is off and accepts
        once it is enabled. Tested at the serializer level to isolate the gate
        from the loan endpoint's (separately tracked) cross-shard PK routing."""
        from rest_framework.exceptions import ValidationError
        from apps.loans.serializers import LoanRequestSerializer

        s = LoanRequestSerializer()
        with pytest.raises(ValidationError):
            s.validate({'group': loan_off_group, 'amount': Decimal('1000')})

        loan_off_group.loan_pool_enabled = True
        # No exception now: validate returns the attrs unchanged.
        assert s.validate({'group': loan_off_group, 'amount': Decimal('1000')})['group'] is loan_off_group
