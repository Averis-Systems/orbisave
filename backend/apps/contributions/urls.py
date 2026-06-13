from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import InitiateContributionView, ContributionWebhookView, ContributionViewSet, PenaltyViewSet

router = SimpleRouter()
router.register('history', ContributionViewSet, basename='contribution')
router.register('fines', PenaltyViewSet, basename='penalty')

urlpatterns = [
    # Explicit webhook receiver scoped dynamically by geography and telecom mapping
    path('webhook/<str:country>/<str:provider_id>/', ContributionWebhookView.as_view(), name='contrib_webhook'),
    
    # User-triggered initiation logic
    path('<uuid:group_pk>/initiate/', InitiateContributionView.as_view(), name='contrib_initiate'),

    path('', include(router.urls)),
]
