from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .repayment_views import InitiateRepaymentView, RepaymentWebhookView
from .views import LoanViewSet

router = DefaultRouter()
router.register(r'', LoanViewSet, basename='loan')

urlpatterns = [
    # Provider settlement callback for loan repayments (same contract as the
    # contributions webhook — signature-verified, idempotent, fail-closed).
    path('webhook/<str:country>/<str:provider_id>/', RepaymentWebhookView.as_view(), name='loan_repayment_webhook'),

    path('<uuid:loan_pk>/repayments/<uuid:repayment_pk>/pay/', InitiateRepaymentView.as_view(), name='loan_repayment_pay'),
    # /loans/{pk}/approve/ and /reject/ are served by the LoanViewSet actions.
    path('', include(router.urls)),
]
