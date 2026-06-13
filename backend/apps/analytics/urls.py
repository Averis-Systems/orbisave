from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GroupAnalyticsViewSet

router = DefaultRouter()
router.register(r'groups', GroupAnalyticsViewSet, basename='group-analytics')

urlpatterns = [
    path('', include(router.urls)),
]
