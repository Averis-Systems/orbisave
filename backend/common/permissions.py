from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
import structlog

logger = structlog.get_logger(__name__)

class IsGroupMember(BasePermission):
    """
    Validates the user has an 'active' GroupMember row linking them to the requested Group.
    Satisfies Checklist Item 11: Multi-tenant isolation (groups cannot access each other).
    """
    def has_object_permission(self, request, view, obj):
        # Prevent N+1 issues in views, assume obj is a Group. 
        # For object-level membership checks:
        has_membership = obj.memberships.filter(member=request.user, status='active').exists()
        if not has_membership:
            logger.warning("rbac_violation_group_member", user_id=request.user.id, group_id=obj.id, ip=request.META.get('REMOTE_ADDR'))
        return has_membership

class IsGroupChairperson(BasePermission):
    """
    Must literally be the chairperson.
    """
    def has_object_permission(self, request, view, obj):
        is_chair = obj.chairperson == request.user
        if not is_chair:
            logger.warning("rbac_violation_chairperson", user_id=request.user.id, group_id=obj.id)
        return is_chair

class IsGroupTreasurer(BasePermission):
    """
    Must literally be the treasurer.
    """
    def has_object_permission(self, request, view, obj):
        is_treasurer = obj.treasurer == request.user
        if not is_treasurer:
            logger.warning("rbac_violation_treasurer", user_id=request.user.id, group_id=obj.id)
        return is_treasurer

class IsGroupLeader(BasePermission):
    """
    Combinatory Role: Chairperson OR Treasurer.
    """
    def has_object_permission(self, request, view, obj):
        return obj.chairperson == request.user or obj.treasurer == request.user

class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ('platform_admin', 'super_admin')

class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'super_admin'

class IsKYCVerified(BasePermission):
    message = 'KYC verification strictly required to perform this action.'
    def has_permission(self, request, view):
        # Fast query, avoids deep object hydration
        return getattr(request.user, 'kyc_status', None) == 'verified'
