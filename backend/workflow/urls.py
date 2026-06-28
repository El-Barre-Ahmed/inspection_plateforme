from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowEventViewSet

router = DefaultRouter()
router.register(r'workflow-events', WorkflowEventViewSet, basename='workflowevent')

urlpatterns = [
    path('', include(router.urls)),
]
