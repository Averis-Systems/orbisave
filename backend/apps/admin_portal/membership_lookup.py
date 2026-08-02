"""
Resolve which group a member belongs to, from admin views.

Membership is the awkward cross-shard case. A User lives on 'default', but the
GroupMember row that ties them to a group lives in that member's country
database. So `GroupMember.objects.filter(member=user)` from an admin request
reads whatever thread-local routing picked, 'default' for a super_admin, and
finds nothing. Every admin surface that wants to show a member's group has to
read the country shard explicitly.

Production runs one active group per member (the single-group scope cut), so
each member maps to at most one active group. These helpers batch the lookup
by country shard: one query per country, not one per member.
"""
from collections import defaultdict

from common.db_utils import get_db_for_country


def active_groups_for_users(users):
    """
    Map user id (str) -> {group_id, group_name, group_role} for each user's
    active membership. Users with no active group are simply absent.

    `users` is an iterable of User instances (needs .id and .country). Grouped
    by country so each shard is queried once for all its members on the page.
    """
    from apps.groups.models import GroupMember

    ids_by_country = defaultdict(list)
    for u in users:
        if u.country:
            ids_by_country[u.country].append(u.id)

    result = {}
    for country, ids in ids_by_country.items():
        alias = get_db_for_country(country)
        memberships = (
            GroupMember.objects.using(alias)
            .filter(member_id__in=ids, status='active')
            .select_related('group')
        )
        for m in memberships:
            result[str(m.member_id)] = {
                'group_id': str(m.group_id),
                'group_name': m.group.name,
                'group_role': m.role,
            }
    return result


#: Loan statuses that mean the borrower is mid-application (wants a loan).
PENDING_LOAN_STATUSES = ('pending_chair', 'pending_treasurer', 'pending_admin')


def kyc_context_for_users(users):
    """
    Map user id (str) -> KYC context used to explain WHY a person is doing KYC.

    Under OrbiSave's policy KYC is not for everyone: group management
    (chairperson / treasurer / secretary) always verify, while ordinary members
    verify only when they apply for their first loan, and only if their group
    runs a loan pool. This resolves, per user:

      - group_role         their role in their active group ('' if none)
      - group_name         that group's name
      - group_offers_loans whether the group runs a loan pool (loan_pool_pct > 0)
      - has_pending_loan    whether they have a loan awaiting a decision

    from which the caller derives a single reason. Membership and loans live on
    the country shards, so it batches one pair of queries per country.
    """
    from apps.groups.models import GroupMember
    from apps.loans.models import Loan

    ids_by_country = defaultdict(list)
    for u in users:
        if u.country:
            ids_by_country[u.country].append(u.id)

    result = {}
    for country, ids in ids_by_country.items():
        alias = get_db_for_country(country)
        memberships = (
            GroupMember.objects.using(alias)
            .filter(member_id__in=ids, status='active')
            .select_related('group')
        )
        for m in memberships:
            result[str(m.member_id)] = {
                'group_role': m.role,
                'group_name': m.group.name,
                'group_offers_loans': (m.group.loan_pool_pct or 0) > 0,
                'has_pending_loan': False,
            }
        borrowers = set(
            Loan.objects.using(alias)
            .filter(borrower_id__in=ids, status__in=PENDING_LOAN_STATUSES)
            .values_list('borrower_id', flat=True)
        )
        for bid in borrowers:
            entry = result.setdefault(
                str(bid),
                {'group_role': '', 'group_name': None, 'group_offers_loans': False, 'has_pending_loan': False},
            )
            entry['has_pending_loan'] = True
    return result


def kyc_reason(ctx):
    """Reduce a kyc_context entry to a single reason label the reviewer acts on."""
    if not ctx:
        return 'member'
    if ctx.get('group_role') in ('chairperson', 'treasurer', 'secretary'):
        return 'management'
    if ctx.get('has_pending_loan'):
        return 'loan'
    return 'member'


def member_ids_in_group(group_id, aliases):
    """
    Active member ids for one group, searched across the given shard aliases.

    The group is in exactly one country, so at most one alias yields rows; the
    others return nothing. Used by the members list's ?group= filter, which
    resolves a group to its people and then filters users by id.
    """
    from apps.groups.models import GroupMember

    ids = []
    for alias in aliases:
        ids.extend(
            GroupMember.objects.using(alias)
            .filter(group_id=group_id, status='active')
            .values_list('member_id', flat=True)
        )
    return ids


def all_active_member_ids(aliases):
    """
    Every user id that holds an active membership on any of the given shards.

    Backs the "not in a group" filter: users whose id is absent from this set
    have no active group. Bounded by the member population, which is the same
    order as the user list it filters.
    """
    from apps.groups.models import GroupMember

    ids = set()
    for alias in aliases:
        ids.update(
            GroupMember.objects.using(alias)
            .filter(status='active')
            .values_list('member_id', flat=True)
        )
    return ids
