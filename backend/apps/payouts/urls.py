from django.urls import path
from .views import PayoutExecutionView

urlpatterns = [
    path('<uuid:group_pk>/execute/', PayoutExecutionView.as_view(), name='payout_execute'),
]
