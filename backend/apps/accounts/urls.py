from django.urls import path
from .views import (
    RegisterView, UserMeView, TokenObtainPairView,
    KYCSubmitView, KYCStatusView,
)

urlpatterns = [
    path('register/',      RegisterView.as_view(),        name='register'),
    path('me/',            UserMeView.as_view(),           name='user-me'),
    path('token/',         TokenObtainPairView.as_view(),  name='token-obtain'),
    path('kyc/submit/',    KYCSubmitView.as_view(),        name='kyc-submit'),
    path('kyc/status/',    KYCStatusView.as_view(),        name='kyc-status'),
]
