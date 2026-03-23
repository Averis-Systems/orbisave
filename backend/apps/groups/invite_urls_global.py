from django.urls import path
from .invite_views import GroupInvitePublicView

urlpatterns = [
    # Global public endpoints based solely on token
    path('<str:token>/', GroupInvitePublicView.as_view(), name='group-invite-public-get'),
    path('<str:token>/accept/', GroupInvitePublicView.as_view(), name='group-invite-public-accept'),
]
