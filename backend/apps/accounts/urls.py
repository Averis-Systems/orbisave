from django.urls import path
from .pin_views import TransactionPinView
from .views import RegisterView, TokenObtainPairView, UserMeView

app_name = 'accounts'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('me/', UserMeView.as_view(), name='me'),
    path('transaction-pin/', TransactionPinView.as_view(), name='transaction_pin'),
]
