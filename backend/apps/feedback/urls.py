from rest_framework.routers import SimpleRouter

from .views import MemberFeedbackViewSet

router = SimpleRouter()
router.register('', MemberFeedbackViewSet, basename='feedback')

urlpatterns = router.urls
