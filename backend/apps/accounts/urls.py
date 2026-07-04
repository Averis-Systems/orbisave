from django.urls import path
from .views import (
    RegisterView, UserMeView, TokenObtainPairView,
    KYCSubmitView, KYCStatusView, ProfileUpdateView
)
from .otp_views import (
    ConfirmPhoneOTPView, PasswordResetConfirmView,
    PasswordResetRequestView, RequestPhoneOTPView,
)
from .pin_views import TransactionPinView

from rest_framework_simplejwt.views import TokenRefreshView

app_name = 'accounts'

urlpatterns = [
    path('register/',        RegisterView.as_view(),        name='register'),
    path('me/',              UserMeView.as_view(),           name='user-me'),
    path('profile/update/',  ProfileUpdateView.as_view(),    name='profile-update'),
    path('token/',           TokenObtainPairView.as_view(),  name='token-obtain'),
    path('token/refresh/',   TokenRefreshView.as_view(),     name='token-refresh'),
    path('kyc/submit/',      KYCSubmitView.as_view(),        name='kyc-submit'),
    path('kyc/status/',      KYCStatusView.as_view(),        name='kyc-status'),
    path('transaction-pin/', TransactionPinView.as_view(),   name='transaction-pin'),
    # Phone verification (signup) + password reset — SMS OTP flows
    path('otp/request/',               RequestPhoneOTPView.as_view(),      name='otp-request'),
    path('otp/confirm/',               ConfirmPhoneOTPView.as_view(),      name='otp-confirm'),
    path('password-reset/request/',    PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/',    PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
