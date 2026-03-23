from django.urls import path
from .views import LoanApprovalView

urlpatterns = [
    # Strictly isolated endpoints fundamentally removing typical CRUD assumptions
    path('<uuid:loan_pk>/approve/', LoanApprovalView.as_view(), name='loan_approve'),
]
