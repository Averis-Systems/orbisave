from rest_framework.routers import SimpleRouter

from .views import AdminFeedbackViewSet

router = SimpleRouter()
router.register('', AdminFeedbackViewSet, basename='admin-feedback')

urlpatterns = router.urls
