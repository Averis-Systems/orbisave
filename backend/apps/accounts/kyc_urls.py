from django.urls import path
from .kyc_views import KYCSubmitView, KYCStatusView

urlpatterns = [
    path('submit/', KYCSubmitView.as_view(), name='kyc_submit'),
    path('status/', KYCStatusView.as_view(), name='kyc_status'),
]
