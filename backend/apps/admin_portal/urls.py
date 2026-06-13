from django.urls import path

from .views import (
    AdminDashboardStatsView,
    AdminKYCQueueView,
    AdminKYCReviewView,
    AdminUserListView,
)
from .auth_views import AdminRegisterView, AdminLoginView, AdminVerifyEmailView
from .group_views import (
    AdminGroupListView,
    AdminGroupVerifyView,
    AdminGroupStatsView,
    AdminPlatformAdminListView,
)
from .extended_views import (
    AdminGroupDetailView,
    AdminGroupMembersView,
    AdminGroupContributionsView,
    AdminGroupLoansView,
    AdminGroupLedgerView,
    AdminLoanListView,
    AdminLoanApproveView,
    AdminContributionsView,
    AdminAuditView,
    AdminAnalyticsView,
    AdminUserDetailView,
    AdminUserSuspendView,
    AdminTrustAccountView,
)
from .super_views import (
    SuperAdminOverviewView,
    SuperAdminCountryView,
    SuperAdminSystemHealthView,
    SuperAdminAdminListView,
    SuperAdminAdminDetailView,
    SuperAdminAdminSuspendView,
    SuperAdminGlobalAuditView,
)
from .provider_views import (
    ProviderHubListView,
    ProviderHubDetailView,
    ProviderToggleView,
    ProviderTestView,
)
from .config_views import (
    ConfigListView,
    ConfigUpdateView,
    ConfigCreateView,
)

from .monitoring_views import (
    ApiActivityMetricsView,
    ApiOperationalLogsView,
)

urlpatterns = [
    # ── Auth ─────────────────────────────────────────────────────────────────
    path('auth/register/', AdminRegisterView.as_view(), name='admin-register'),
    path('auth/verify-email/', AdminVerifyEmailView.as_view(), name='admin-verify-email'),
    path('auth/login/',    AdminLoginView.as_view(),    name='admin-login'),

    # ── Dashboard Stats ───────────────────────────────────────────────────────
    path('stats/',        AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('group-stats/',  AdminGroupStatsView.as_view(),     name='admin-group-stats'),
    path('analytics/',    AdminAnalyticsView.as_view(),      name='admin-analytics'),

    # ── KYC ──────────────────────────────────────────────────────────────────
    path('kyc/queue/',                AdminKYCQueueView.as_view(),  name='admin-kyc-queue'),
    path('kyc/<uuid:kyc_id>/review/', AdminKYCReviewView.as_view(), name='admin-kyc-review'),

    # ── Users ─────────────────────────────────────────────────────────────────
    path('users/',                        AdminUserListView.as_view(),      name='admin-users'),
    path('users/<uuid:user_id>/',         AdminUserDetailView.as_view(),    name='admin-user-detail'),
    path('users/<uuid:user_id>/suspend/', AdminUserSuspendView.as_view(),   name='admin-user-suspend'),
    path('platform-admins/',              AdminPlatformAdminListView.as_view(), name='admin-platform-admins'),

    # ── Groups ────────────────────────────────────────────────────────────────
    path('groups/',                              AdminGroupListView.as_view(),         name='admin-groups'),
    path('groups/<uuid:group_id>/',              AdminGroupDetailView.as_view(),       name='admin-group-detail'),
    path('groups/<uuid:group_id>/verify/',       AdminGroupVerifyView.as_view(),       name='admin-group-verify'),
    path('groups/<uuid:group_id>/members/',      AdminGroupMembersView.as_view(),      name='admin-group-members'),
    path('groups/<uuid:group_id>/contributions/',AdminGroupContributionsView.as_view(),name='admin-group-contributions'),
    path('groups/<uuid:group_id>/loans/',        AdminGroupLoansView.as_view(),        name='admin-group-loans'),
    path('groups/<uuid:group_id>/ledger/',       AdminGroupLedgerView.as_view(),       name='admin-group-ledger'),

    # ── Loans ─────────────────────────────────────────────────────────────────
    path('loans/',                       AdminLoanListView.as_view(),    name='admin-loans'),
    path('loans/<uuid:loan_id>/action/', AdminLoanApproveView.as_view(), name='admin-loan-action'),

    # ── Contributions ─────────────────────────────────────────────────────────
    path('contributions/', AdminContributionsView.as_view(), name='admin-contributions'),

    # ── Audit Trail ───────────────────────────────────────────────────────────
    path('audit/', AdminAuditView.as_view(), name='admin-audit'),

    # ── Trust Account ─────────────────────────────────────────────────────────
    path('trust-account/', AdminTrustAccountView.as_view(), name='admin-trust-account'),

    # ─────────────────────────────────────────────────────────────────────────
    # SUPER ADMIN ONLY
    # ─────────────────────────────────────────────────────────────────────────
    path('superadmin/overview/',       SuperAdminOverviewView.as_view(),    name='superadmin-overview'),
    path('superadmin/country/<str:country>/', SuperAdminCountryView.as_view(), name='superadmin-country'),
    path('superadmin/system-health/',  SuperAdminSystemHealthView.as_view(), name='superadmin-health'),
    path('superadmin/audit/',          SuperAdminGlobalAuditView.as_view(), name='superadmin-audit'),

    # Provider Hub
    path('superadmin/payment-providers/',                       ProviderHubListView.as_view(),   name='provider-list'),
    path('superadmin/payment-providers/<uuid:provider_id>/',    ProviderHubDetailView.as_view(), name='provider-detail'),
    path('superadmin/payment-providers/<uuid:provider_id>/toggle/', ProviderToggleView.as_view(), name='provider-toggle'),
    path('superadmin/payment-providers/<uuid:provider_id>/test/',   ProviderTestView.as_view(),   name='provider-test'),

    # Platform Settings
    path('superadmin/settings/',                       ConfigListView.as_view(),   name='config-list'),
    path('superadmin/settings/create/',                ConfigCreateView.as_view(), name='config-create'),
    path('superadmin/settings/<uuid:config_id>/',      ConfigUpdateView.as_view(), name='config-update'),

    # Monitoring & Observability
    path('superadmin/monitoring/metrics/', ApiActivityMetricsView.as_view(),  name='monitoring-metrics'),
    path('superadmin/monitoring/logs/',    ApiOperationalLogsView.as_view(), name='monitoring-logs'),

    # Admin management
    path('superadmin/admins/',                           SuperAdminAdminListView.as_view(),   name='superadmin-admins'),
    path('superadmin/admins/<uuid:admin_id>/',           SuperAdminAdminDetailView.as_view(), name='superadmin-admin-detail'),
    path('superadmin/admins/<uuid:admin_id>/toggle-status/', SuperAdminAdminSuspendView.as_view(), name='superadmin-admin-toggle'),
]
