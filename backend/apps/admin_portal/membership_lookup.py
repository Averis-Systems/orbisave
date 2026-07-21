"""
Resolve which group a member belongs to, from admin views.

Membership is the awkward cross-shard case. A User lives on 'default', but the
GroupMember row that ties them to a group lives in that member's country
database. So `GroupMember.objects.filter(member=user)` from an admin request
reads whatever thread-local routing picked — 'default' for a super_admin — and
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
