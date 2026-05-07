from django.urls import path
from .views import (
    AdminDashboardStatsView,
    AdminKYCQueueView,
    AdminKYCReviewView,
    AdminUserListView,
)

urlpatterns = [
    path('stats/',                   AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('kyc/queue/',               AdminKYCQueueView.as_view(),       name='admin-kyc-queue'),
    path('kyc/<uuid:kyc_id>/review/',AdminKYCReviewView.as_view(),      name='admin-kyc-review'),
    path('users/',                   AdminUserListView.as_view(),        name='admin-users'),
]
