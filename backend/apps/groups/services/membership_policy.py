"""
Single-active-group policy (production-beta scope, 2026-07-03).

A user occupies at most one group slot at a time — across creation, invites,
admin adds, and reinstatement. The DB-level backstop is the
one_active_group_per_member partial unique constraint; this module is the
service layer that turns it into a clear, actionable message before users
ever hit an IntegrityError.
"""
from common.db_utils import get_db_for_country

from apps.groups.models import BLOCKING_MEMBERSHIP_STATUSES, GroupMember


class SingleGroupLimitError(Exception):
    """Raised when a user already occupies their one group slot."""

    def __init__(self, membership):
        self.membership = membership
        group = membership.group
        super().__init__(
            f"You already belong to '{group.name}' "
            f"(membership status: {membership.get_status_display().lower()}). "
            "Leave that group before joining or creating another — "
            "multi-group membership is coming in a future update."
        )

    def as_response_data(self):
        return {
            'error': str(self),
            'code': 'single_group_limit',
            'current_group_id': str(self.membership.group_id),
            'current_group_name': self.membership.group.name,
            'current_membership_status': self.membership.status,
        }


def get_blocking_membership(user, exclude_group=None):
    """
    Return the membership occupying this user's group slot, or None.

    A user's country pins their financial records to one country DB, which is
    where production membership rows live. 'default' is also checked because
    dev/test environments (and any row written before country routing was
    hardened) store memberships there — a duplicate-alias query is cheap and
    this check guards money-adjacent membership state.
    """
    aliases = {get_db_for_country(getattr(user, 'country', None)), 'default'}
    for db_alias in aliases:
        qs = (
            GroupMember.objects.using(db_alias)
            .filter(member=user, status__in=BLOCKING_MEMBERSHIP_STATUSES)
            .select_related('group')
        )
        if exclude_group is not None:
            qs = qs.exclude(group=exclude_group)
        blocking = qs.first()
        if blocking is not None:
            return blocking
    return None


def enforce_single_group_limit(user, exclude_group=None):
    """Raise SingleGroupLimitError if the user's slot is already occupied."""
    blocking = get_blocking_membership(user, exclude_group=exclude_group)
    if blocking is not None:
        raise SingleGroupLimitError(blocking)
