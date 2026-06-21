from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommentViewSet, NotificationsView
from .views import NotificationReadView

router = DefaultRouter()
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
    # nested endpoint to create/list comments for a dossier by id_emp_hash
    path('dossiers/<str:id_emp_hash>/comments/', CommentViewSet.as_view({'get': 'list', 'post': 'create'}), name='dossier-comments'),
    path('notifications/', NotificationsView.as_view(), name='notifications'),
    path('notifications/<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
]
