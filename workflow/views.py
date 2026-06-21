from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import WorkflowEvent
# Note: Si vous n'avez pas encore de serializer pour WorkflowEvent, 
# dites-le moi, je vous le donnerai.
# Pour l'instant, on peut utiliser un serializer simple :
from rest_framework import serializers

class WorkflowEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowEvent
        fields = '__all__'

class WorkflowEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowEvent.objects.all()
    serializer_class = WorkflowEventSerializer