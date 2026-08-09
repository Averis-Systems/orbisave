import math
from decimal import Decimal

import structlog
from django.db import transaction
from django.utils import timezone

from apps.groups.models import GroupMember
from common.db_utils import get_db_for_group, advisory_xact_lock
from .models import GroupProposal, GroupVote

logger = structlog.get_logger(__name__)


def _active_member_count(group, db_alias):
    return GroupMember.objects.using(db_alias).filter(group=group, status='active').count()


def tally(proposal, db_alias=None):
    """Return the live standing of a proposal (no state change)."""
    db_alias = db_alias or get_db_for_group(proposal.group)
    votes = GroupVote.objects.using(db_alias).filter(proposal=proposal)
    yes = votes.filter(choice='yes').count()
    no = votes.filter(choice='no').count()
    abstain = votes.filter(choice='abstain').count()
    cast = yes + no + abstain
    active = _active_member_count(proposal.group, db_alias)
    quorum_needed = math.ceil((Decimal(proposal.quorum_pct) / 100) * active) if active else 0
    decided = yes + no
    yes_needed = math.ceil((Decimal(proposal.pass_pct) / 100) * decided) if decided else 0
    return {
        'yes': yes, 'no': no, 'abstain': abstain, 'cast': cast,
        'active_members': active, 'quorum_needed': quorum_needed,
        'quorum_met': cast >= quorum_needed and active > 0,
        'yes_needed': yes_needed,
    }


def resolve_if_ready(proposal, db_alias=None, force=False):
    """
    Resolve a proposal once it is decidable: every active member has voted, or
    the deadline has passed (`force` also triggers a deadline check on read).
    Quorum decides — if too few voted, it expires; otherwise a Yes majority of
    the cast yes/no votes passes it and the change is applied.
    """
    db_alias = db_alias or get_db_for_group(proposal.group)
    if proposal.status != 'open':
        return proposal

    t = tally(proposal, db_alias)
    deadline_passed = timezone.now() >= proposal.closes_at
    everyone_voted = t['active_members'] > 0 and t['cast'] >= t['active_members']
    if not (deadline_passed or everyone_voted or force):
        return proposal
    if not (deadline_passed or everyone_voted):
        # force was set but the vote is genuinely still open.
        return proposal

    if not t['quorum_met']:
        proposal.status = 'expired'
        proposal.outcome_note = (
            f"Quorum not reached: {t['cast']} of {t['quorum_needed']} required votes."
        )
    else:
        decided = t['yes'] + t['no']
        passed = decided > 0 and t['yes'] >= t['yes_needed']
        if passed:
            proposal.status = 'passed'
            proposal.outcome_note = f"Passed with {t['yes']} of {decided} decisive votes in favour."
            apply_on_pass(proposal, db_alias)
        else:
            proposal.status = 'rejected'
            proposal.outcome_note = f"Rejected: {t['yes']} of {decided} decisive votes in favour."

    proposal.resolved_at = timezone.now()
    proposal.save(using=db_alias, update_fields=['status', 'outcome_note', 'resolved_at', 'updated_at'])
    logger.info('proposal_resolved', proposal_id=str(proposal.id), status=proposal.status, type=proposal.proposal_type)
    return proposal


# Group config fields a passed proposal is allowed to change, per type. Anything
# not listed is ignored, so a payload cannot mutate arbitrary columns.
_LOAN_TERM_FIELDS = {
    'loan_pool_pct', 'loan_interest_rate_monthly', 'max_loan_multiplier', 'loan_term_weeks',
}


def apply_on_pass(proposal, db_alias):
    """Apply a passed proposal's payload to the group. Guarded field allowlists."""
    group = proposal.group
    p = proposal.payload or {}
    changed = []

    if proposal.proposal_type == 'activate_loan_pool':
        group.loan_pool_enabled = True
        changed.append('loan_pool_enabled')
        for f in _LOAN_TERM_FIELDS:
            if f in p:
                setattr(group, f, p[f])
                changed.append(f)

    elif proposal.proposal_type == 'deactivate_loan_pool':
        group.loan_pool_enabled = False
        changed.append('loan_pool_enabled')

    elif proposal.proposal_type == 'change_loan_terms':
        for f in _LOAN_TERM_FIELDS:
            if f in p:
                setattr(group, f, p[f])
                changed.append(f)

    elif proposal.proposal_type == 'change_contribution':
        if 'contribution_amount' in p:
            group.contribution_amount = p['contribution_amount']
            changed.append('contribution_amount')

    elif proposal.proposal_type == 'change_savings':
        if 'mandatory_savings_amount' in p:
            group.mandatory_savings_amount = p['mandatory_savings_amount']
            changed.append('mandatory_savings_amount')

    elif proposal.proposal_type == 'remove_member':
        member_id = p.get('member_id')
        if member_id:
            GroupMember.objects.using(db_alias).filter(
                group=group, member_id=member_id, status='active',
            ).update(status='exited', exited_at=timezone.now())

    elif proposal.proposal_type == 'dissolve_group':
        group.status = 'closed'
        changed.append('status')

    # 'custom' proposals carry no automatic action.
    if changed:
        group.save(using=db_alias, update_fields=[*set(changed), 'updated_at'])
        logger.info('proposal_applied', proposal_id=str(proposal.id), fields=changed)


def cast_vote(proposal, voter, choice):
    """Record (or change) a member's vote, then resolve the proposal if ready.

    Serialized per proposal so a burst of final votes cannot race the tally into
    two resolutions.
    """
    db_alias = get_db_for_group(proposal.group)
    with transaction.atomic(using=db_alias):
        with advisory_xact_lock(db_alias, 'group_vote', proposal.id):
            fresh = GroupProposal.objects.using(db_alias).select_for_update().get(id=proposal.id)
            if fresh.status != 'open':
                return fresh, None
            if timezone.now() >= fresh.closes_at:
                resolve_if_ready(fresh, db_alias)
                return fresh, None
            vote, _ = GroupVote.objects.using(db_alias).update_or_create(
                proposal=fresh, voter=voter, defaults={'choice': choice},
            )
            resolve_if_ready(fresh, db_alias)
    return fresh, vote
