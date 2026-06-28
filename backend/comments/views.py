from django.shortcuts import render
from rest_framework import viewsets, serializers, permissions
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Comment
from .serializers import CommentaireSerializer


class IsCommentAuthorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'profile') and request.user.profile.role in ['ADMIN', 'DIRECTEUR']:
            return True
        return obj.auteur == request.user


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentaireSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsCommentAuthorOrAdmin]

    def get_queryset(self):
        qs = Comment.objects.select_related('auteur', 'dossier').all()
        # allow filtering by query param `?dossier=<id_emp_hash>`
        dossier_hash = self.request.query_params.get('dossier')
        # also support nested route providing `id_emp_hash` as URL kwarg
        if not dossier_hash:
            dossier_hash = self.kwargs.get('id_emp_hash')
        if dossier_hash:
            qs = qs.filter(dossier__id_emp_hash=dossier_hash)
        return qs

    def perform_create(self, serializer):
        # Assign the currently authenticated user as the author of the comment
        # If the request is nested under a dossier URL, bind that dossier automatically
        from dossiers.models import Dossier
        dossier_hash = self.kwargs.get('id_emp_hash')
        if dossier_hash:
            dossier = Dossier.objects.filter(id_emp_hash=dossier_hash).first()
            if not dossier:
                raise serializers.ValidationError({'dossier': 'Dossier introuvable'})
            serializer.save(auteur=self.request.user, dossier=dossier)
            return
        serializer.save(auteur=self.request.user)


class NotificationsView(APIView):
    """Retourne les notifications (commentaires de type ALERTE) pour l'inspecteur connecté."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Les alertes sont créées comme des commentaires de type 'ALERTE' liés au dossier
        qs = Comment.objects.select_related('dossier', 'auteur').filter(type_commentaire='ALERTE', dossier__inspecteur=user)
        # Optional query param: unread=true to return only non-lues
        unread = request.query_params.get('unread')
        if unread and unread.lower() in ['1', 'true', 'yes']:
            qs = qs.filter(is_read=False)
        qs = qs.order_by('-created_at')
        serializer = CommentaireSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        """Permet de marquer plusieurs notifications comme lues via payload { ids: [1,2,3] }"""
        ids = request.data.get('ids', [])
        updated = []
        for pk in ids:
            try:
                c = Comment.objects.get(pk=pk, type_commentaire='ALERTE', dossier__inspecteur=request.user)
                if not c.is_read:
                    c.is_read = True
                    from django.utils import timezone
                    c.read_at = timezone.now()
                    c.save(update_fields=['is_read', 'read_at'])
                updated.append(pk)
            except Comment.DoesNotExist:
                continue
        return Response({'marked': updated})


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            c = Comment.objects.get(pk=pk, type_commentaire='ALERTE', dossier__inspecteur=request.user)
        except Comment.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        if not c.is_read:
            c.is_read = True
            from django.utils import timezone
            c.read_at = timezone.now()
            c.save(update_fields=['is_read', 'read_at'])
        return Response({'id': pk, 'is_read': c.is_read})