from django.urls import path
from .views import InitiateContributionView, ContributionWebhookView

urlpatterns = [
    # Explicit webhook receiver scoped dynamically by geography and telecom mapping
    path('webhook/<str:country>/<str:provider_id>/', ContributionWebhookView.as_view(), name='contrib_webhook'),
    
    # User-triggered initiation logic
    path('<uuid:group_pk>/initiate/', InitiateContributionView.as_view(), name='contrib_initiate'),
]
