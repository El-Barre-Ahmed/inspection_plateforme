from django.urls import path
from .views import DashboardView, TopRegionsView, PerformanceInspecteursView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('top-regions/', TopRegionsView.as_view(), name='top-regions'),
    path('performance-inspecteurs/', PerformanceInspecteursView.as_view(), name='performance-inspecteurs'),
]
