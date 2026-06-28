from django.shortcuts import render
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from core.permissions import IsDirecteurOrAdmin

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        profile = getattr(user, 'profile', None)
        token['role'] = profile.role if profile else 'INSPECTEUR'
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        profile = getattr(self.user, 'profile', None)
        data['role'] = profile.role if profile else 'INSPECTEUR'
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class InspecteurListView(APIView):
    """
    API pour récupérer la liste des inspecteurs disponibles.
    Accessible uniquement aux Directeurs et Admins.
    Endpoint: GET /api/inspecteurs/
    """
    permission_classes = [IsAuthenticated, IsDirecteurOrAdmin]

    def get(self, request):
        """Retourne la liste des inspecteurs avec leurs infos."""
        inspecteurs = User.objects.filter(
            profile__role='INSPECTEUR'
        ).values('id', 'username', 'first_name', 'last_name').order_by('first_name', 'last_name')
        
        return Response([
            {
                'id': u['id'],
                'username': u['username'],
                'full_name': f"{u['first_name']} {u['last_name']}".strip() or u['username']
            }
            for u in inspecteurs
        ])
