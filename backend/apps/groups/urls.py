from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GroupViewSet, GroupMemberActionViewSet
from .invite_views import GroupInviteCreateView, GroupInvitePublicView

router = DefaultRouter()
router.register(r'', GroupViewSet, basename='group')

urlpatterns = [
    # Invite specific routes nested
    path('<uuid:group_pk>/invites/', GroupInviteCreateView.as_view(), name='group-invite-create'),
    
    # Member lifecycle routes explicitly defined for strict structural controls
    path('<uuid:group_pk>/members/<uuid:pk>/remove/', GroupMemberActionViewSet.as_view({'post': 'remove'}), name='group-member-remove'),
    path('<uuid:group_pk>/members/<uuid:pk>/suspend/', GroupMemberActionViewSet.as_view({'post': 'suspend'}), name='group-member-suspend'),
    path('<uuid:group_pk>/members/<uuid:pk>/reinstate/', GroupMemberActionViewSet.as_view({'post': 'reinstate'}), name='group-member-reinstate'),

    # Includes standard REST routes: GET /groups/, POST /groups/, GET /groups/{id}/
    path('', include(router.urls)),
]
