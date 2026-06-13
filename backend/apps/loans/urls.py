from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoanApprovalView, LoanViewSet

router = DefaultRouter()
router.register(r'', LoanViewSet, basename='loan')

urlpatterns = [
    # Strictly isolated endpoints fundamentally removing typical CRUD assumptions
    path('<uuid:loan_pk>/approve/', LoanApprovalView.as_view(), name='loan_approve'),
    path('', include(router.urls)),
]
