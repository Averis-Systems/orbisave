from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls', namespace='accounts')),
    path('api/v1/groups/', include('apps.groups.urls')),
    path('api/v1/invites/', include('apps.groups.invite_urls_global')),
    path('api/v1/contributions/', include('apps.contributions.urls')),
    path('api/v1/payouts/', include('apps.payouts.urls')),
    path('api/v1/loans/', include('apps.loans.urls')),
]
