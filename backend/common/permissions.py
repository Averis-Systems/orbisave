from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
import structlog

logger = structlog.get_logger(__name__)


def _resolve_group(obj):
    """
    Group-scoped permissions receive different object types depending on the
    route: the Group itself, or a group-linked row (GroupMember, RotationCycle,
    Loan, ...). Resolve to the governing Group — permissions must never crash
    with AttributeError on a financial endpoint (a 500 here previously broke
    member remove/suspend/reinstate and rotation-schedule routes).
    """
    from apps.groups.models import Group
    if isinstance(obj, Group):
        return obj
    return getattr(obj, 'group', None)


class IsGroupMember(BasePermission):
    """
    Validates the user has an 'active' GroupMember row linking them to the requested Group.
    Satisfies Checklist Item 11: Multi-tenant isolation (groups cannot access each other).
    """
    def has_object_permission(self, request, view, obj):
        group = _resolve_group(obj)
        if group is None:
            return False
        has_membership = group.memberships.filter(member=request.user, status='active').exists()
        if not has_membership:
            logger.warning("rbac_violation_group_member", user_id=request.user.id, group_id=group.id, ip=request.META.get('REMOTE_ADDR'))
        return has_membership

class IsGroupChairperson(BasePermission):
    """
    Must be an active, approved chairperson for the group.
    """
    def has_object_permission(self, request, view, obj):
        group = _resolve_group(obj)
        if group is None:
            return False
        is_chair = (
            group.chairperson == request.user
            and group.verification_status == 'verified'
            and group.memberships.filter(member=request.user, role='chairperson', status='active').exists()
        )
        if not is_chair:
            logger.warning("rbac_violation_chairperson", user_id=request.user.id, group_id=group.id)
        return is_chair

class IsGroupTreasurer(BasePermission):
    """
    Must literally be the treasurer.
    """
    def has_object_permission(self, request, view, obj):
        group = _resolve_group(obj)
        if group is None:
            return False
        is_treasurer = group.treasurer == request.user
        if not is_treasurer:
            logger.warning("rbac_violation_treasurer", user_id=request.user.id, group_id=group.id)
        return is_treasurer

class IsGroupLeader(BasePermission):
    """
    Combinatory Role: Chairperson OR Treasurer.
    """
    def has_object_permission(self, request, view, obj):
        group = _resolve_group(obj)
        if group is None or group.verification_status != 'verified':
            return False
        return group.memberships.filter(
            member=request.user,
            role__in=['chairperson', 'treasurer'],
            status='active',
        ).exists()

class IsPlatformAdmin(BasePermission):
    """
    Country staff and platform owners.

    The is_authenticated check is load bearing: view-level permission_classes
    REPLACE the global IsAuthenticated default rather than adding to it, and
    AnonymousUser has no .role attribute, so without the check an anonymous
    request to any view using this class was a 500 (AttributeError), not a 401.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'role', None) in ('platform_admin', 'super_admin')
        )

class IsSuperAdmin(BasePermission):
    """Platform owners only. Same is_authenticated note as IsPlatformAdmin."""
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'role', None) == 'super_admin'
        )

class IsKYCVerified(BasePermission):
    message = 'KYC verification strictly required to perform this action.'
    def has_permission(self, request, view):
        # Fast query, avoids deep object hydration
        return getattr(request.user, 'kyc_status', None) == 'verified'
