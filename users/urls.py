from django.urls import path
from .views import InspecteurListView

urlpatterns = [
    path('inspecteurs/', InspecteurListView.as_view(), name='inspecteur-list'),
]
