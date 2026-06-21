# dossiers/views.py

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

class DossierViewSet(mixins.DestroyModelMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet principal gérant l'accès aux dossiers d'inspection de la CNSS.
    Autorise la suppression des dossiers tout en conservant la lecture seule
    pour les autres opérations REST.
    """
    permission_classes = [IsAuthenticated, IsDossierOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DossierFilter
    search_fields = ['forme_nom', 'reg_key', 'emp_secteur', 'id_emp_hash']
    ordering_fields = ['score_global', 'score_anomalie', 'montant_dette_total']
    ordering = ['-score_global']

    # =========================================================================
    # VOTRE NOUVELLE MÉTHODE GET_QUERYSET SÉCURISÉE (À PLACER ICI)
    # =========================================================================
    def get_queryset(self):
        """
        Détermine l'ensemble des dossiers accessibles par l'utilisateur connecté.
        Sécurisé avec un principe de 'Default Deny' pour bloquer tout accès non autorisé.
        """
        user = self.request.user

        # 1. Sécurité de base : Si l'utilisateur n'est pas connecté, aucun accès
        if not user or user.is_anonymous:
            return Dossier.objects.none()

        # On récupère le profil de manière sécurisée pour éviter les crashs
        profile = getattr(user, 'profile', None)
        if not profile:
            # Si un utilisateur n'a pas de profil associé, aucun accès
            return Dossier.objects.none()

        # Optimisation SQL : pré-charge l'inspecteur pour éviter le problème de requêtes N+1
        base_queryset = Dossier.objects.select_related('inspecteur')

        # 2. Droits d'accès élargis : Directeur, Administrateur ou Superutilisateur Django
        if profile.role in ["DIRECTEUR", "ADMIN"] or user.is_superuser:
            return base_queryset.all()

        # 3. Droits d'accès restreints : Inspecteur (uniquement ses propres dossiers)
        if profile.role == "INSPECTEUR":
            return base_queryset.filter(inspecteur=user)

        # 4. Sécurité passive (Default Deny) : En cas de rôle non configuré, aucun accès
        return base_queryset.none()

    # =========================================================================
    # LES AUTRES MÉTHODES ET ACTIONS DE VOTRE VIEWSET
    # =========================================================================

    def get_serializer_class(self):
        """
        Retourne DossierDetailSerializer pour les détails d'un dossier,
        et DossierListSerializer pour l'affichage en liste.
        """
        if self.action == 'retrieve':
            return DossierDetailSerializer
        return DossierListSerializer

    def destroy(self, request, *args, **kwargs):
        """Supprime un dossier accessible et renvoie 204 quand la suppression est réussie."""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=['post'], url_path='changer-statut')
    def changer_statut(self, request, pk=None):
        """
        Action personnalisée pour changer l'état d'avancement d'un dossier.
        Exemple d'appel : POST /api/dossiers/{id}/changer-statut/
        """
        dossier = self.get_object()
        serializer = WorkflowStatutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Appel de la machine à états métiers
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
        # Create an internal alert/comment for the assigned inspector with a quick access link
        try:
            Comment.objects.create(
                dossier=dossier,
                auteur=request.user,
                contenu=f"Vous avez été assigné au dossier #{dossier.id}. Accéder: /dossiers/{dossier.id}",
                type_commentaire='ALERTE',
                is_interne=True
            )
        except Exception:
            # Non blocking: don't fail the assignment if comment creation fails
            pass
        # Send an email notification to the assigned inspector (non-blocking)
        try:
            inspector_email = inspecteur.email
            if inspector_email:
                subject = f"Nouvelle assignation: Dossier #{dossier.id}"
                message = (
                    f"Bonjour {inspecteur.get_full_name() or inspecteur.username},\n\n"
                    f"Vous avez été assigné au dossier #{dossier.id} ({dossier.forme_nom}).\n"
                    f"Accéder: {request.build_absolute_uri(f'/dossiers/{dossier.id}')}\n\nCordialement,\nCNSS"
                )
                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
                # send_mail will use Django EMAIL_* settings; swallow errors
                if from_email:
                    send_mail(subject, message, from_email, [inspector_email], fail_silently=True)
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
        """
        Fournit des métriques rapides à l'inspecteur sur ses dossiers assignés.
        """
        qs = self.get_queryset()
        stats = qs.values('statut').annotate(total=Count('id'))
        return Response({
            'dossiers_par_statut': list(stats)
        })