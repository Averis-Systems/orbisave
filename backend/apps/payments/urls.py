from django.urls import path
from .views import JengaWebhookView

urlpatterns = [
    path('webhooks/jenga/', JengaWebhookView.as_view(), name='jenga_webhook'),
]
