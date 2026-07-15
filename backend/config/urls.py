from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from apps.admin_portal.branding_views import PlatformBrandingView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Public: all three frontends read this, including pre-login pages —
    # doesn't live under admin-portal/ since it isn't an admin-only concern.
    path('api/v1/platform-branding/', PlatformBrandingView.as_view(), name='platform-branding'),
    path('api/v1/auth/', include('apps.accounts.urls', namespace='accounts')),
    path('api/v1/groups/', include('apps.groups.urls')),
    path('api/v1/invites/', include('apps.groups.invite_urls_global')),
    path('api/v1/contributions/', include('apps.contributions.urls')),
    path('api/v1/payouts/', include('apps.payouts.urls')),
    path('api/v1/loans/', include('apps.loans.urls')),
    path('api/v1/meetings/', include('apps.meetings.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/admin-portal/', include('apps.admin_portal.urls')),
]

if settings.DEBUG:
    # Production serves MEDIA_ROOT via S3/nginx (see USE_S3 in settings) —
    # this dev-only fallback is what makes uploaded branding/KYC/avatar
    # images actually viewable when running locally.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
