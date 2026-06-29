# dossiers/views.py

import threading
from django.contrib.auth.models import User
from rest_framework import viewsets, filters, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from django.core.exceptions import ValidationError

from .models import Dossier
from .serializers import (
    DossierListSerializer, DossierDetailSerializer, 
    WorkflowStatutSerializer, CommentaireSerializer
)
from .filters import DossierFilter
from .services import WorkflowService
from core.permissions import IsDossierOwnerOrAdmin, IsDirecteurOrAdmin
from comments.models import Comment
from django.core.mail import send_mail
from django.conf import settings


def _send_assignment_email(subject, message, from_email, recipient):
    import logging
    logger = logging.getLogger(__name__)
    try:
        logger.info(f"Sending email to {recipient} from {from_email}")
        send_mail(subject, message, from_email, [recipient], fail_silently=False)
        logger.info(f"Email sent successfully to {recipient}")
    except Exception as e:
        logger.error(f"Email error: {str(e)}")


class DossierViewSet(mixins.DestroyModelMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsDossierOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DossierFilter
    search_fields = ['forme_nom', 'reg_key', 'emp_secteur', 'id_emp_hash']
    ordering_fields = ['score_global', 'score_anomalie', 'montant_dette_total']
    ordering = ['-score_global']

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Dossier.objects.none()
        profile = getattr(user, 'profile', None)
        if not profile:
            return Dossier.objects.none()
        base_queryset = Dossier.objects.select_related('inspecteur')
        if profile.role in ["DIRECTEUR", "ADMIN"] or user.is_superuser:
            return base_queryset.all()
        if profile.role == "INSPECTEUR":
            return base_queryset.filter(inspecteur=user)
        return base_queryset.none()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DossierDetailSerializer
        return DossierListSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=['post'], url_path='changer-statut')
    def changer_statut(self, request, pk=None):
        dossier = self.get_object()
        serializer = WorkflowStatutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            WorkflowService().changer_statut(
                dossier=dossier,
                nouveau_statut=serializer.validated_data['statut'],
                user=request.user,
                commentaire=serializer.validated_data.get('commentaire', '')
            )
            return Response({
                'status': 'success',
                'nouveau_statut': dossier.statut,
                'message': 'Le statut du dossier a été mis à jour avec succès.'
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({
                'status': 'error',
                'detail': e.message if hasattr(e, 'message') else str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='assigner-inspecteur')
    def assigner_inspecteur(self, request, pk=None):
        dossier = self.get_object()
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.role not in ['DIRECTEUR', 'ADMIN']:
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

        inspecteur_id = request.data.get('inspecteur_id')
        inspecteur_username = request.data.get('inspecteur_username')
        if not inspecteur_id and not inspecteur_username:
            raise ValidationError({'inspecteur': 'inspecteur_id ou inspecteur_username est requis.'})

        inspecteur = None
        if inspecteur_id:
            inspecteur = User.objects.filter(pk=inspecteur_id, profile__role='INSPECTEUR').first()
        elif inspecteur_username:
            inspecteur = User.objects.filter(username__iexact=inspecteur_username, profile__role='INSPECTEUR').first()

        if not inspecteur:
            raise ValidationError({'inspecteur': 'Inspecteur introuvable ou rôle invalide.'})

        dossier.inspecteur = inspecteur
        dossier.save(update_fields=['inspecteur'])

        try:
            Comment.objects.create(
                dossier=dossier,
                auteur=request.user,
                contenu=f"Vous avez été assigné au dossier #{dossier.id}. Accéder: /dossiers/{dossier.id}",
                type_commentaire='ALERTE',
                is_interne=True
            )
        except Exception:
            pass

        try:
    inspector_email = inspecteur.email
    if inspector_email:
        subject = f"Nouvelle assignation: Dossier #{dossier.id}"
        message = (
            f"Bonjour {inspecteur.get_full_name() or inspecteur.username},\n\n"
            f"Vous avez été assigné au dossier #{dossier.id} ({dossier.forme_nom}).\n"
            f"Accéder: /dossiers/{dossier.id}\n\nCordialement,\nCNSS"
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [inspector_email], fail_silently=True)
    except Exception:
        pass
        serializer = DossierDetailSerializer(dossier, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='marquer-traite')
    def marquer_traite(self, request, pk=None):
        dossier = self.get_object()
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.role not in ['DIRECTEUR', 'ADMIN']:
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        if 'traite' not in request.data:
            raise ValidationError({'traite': 'Le champ traite est requis.'})
        dossier.traite = bool(request.data.get('traite'))
        dossier.save(update_fields=['traite'])
        serializer = DossierDetailSerializer(dossier, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='mes-stats')
    def mes_stats(self, request):
        qs = self.get_queryset()
        stats = qs.values('statut').annotate(total=Count('id'))
        return Response({
            'dossiers_par_statut': list(stats)
        })