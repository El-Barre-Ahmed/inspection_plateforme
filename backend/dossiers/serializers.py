from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Dossier
from comments.models import Comment

class UserMiniSerializer(serializers.ModelSerializer):
    """Représentation simplifiée d'un inspecteur."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class DossierListSerializer(serializers.ModelSerializer):
    """
    Serializer léger conçu pour les vues en listes de l'application.
    Optimise les temps de réponse de l'API.
    """
    inspecteur = UserMiniSerializer(read_only=True)

    class Meta:
        model = Dossier
        fields = [
            'id', 'id_emp_hash', 'forme_nom', 'emp_secteur', 'reg_key', 
            'score_global', 'niveau_risque', 'niveau_anomalie', 
            'quadrant', 'statut', 'priorite', 'traite', 'inspecteur', 'montant_dette_total'
        ]

class DossierDetailSerializer(serializers.ModelSerializer):
    """
    Serializer exhaustif regroupant toutes les couches d'analyse (Risque, Règles, Anomalie).
    Restructure les champs plats du modèle en objets JSON structurés et ordonnés.
    """
    inspecteur = UserMiniSerializer(read_only=True)
    risk = serializers.SerializerMethodField()
    regles = serializers.SerializerMethodField()
    anomalie = serializers.SerializerMethodField()
    recent_comments = serializers.SerializerMethodField()
    # expose id_emp_hash and provide a ready-to-use comments URL for the frontend
    id_emp_hash = serializers.CharField(read_only=True)
    comments_url = serializers.SerializerMethodField()
    fraude_confirmee = serializers.BooleanField(source='flag_fraude_confirmee_ever', read_only=True)
    non_respect = serializers.BooleanField(source='flag_non_respect_ever', read_only=True)
    redressement = serializers.BooleanField(source='flag_redressement_ever', read_only=True)

    class Meta:
        model = Dossier
        fields = [
            'id', 'id_emp_hash', 'forme_nom', 'emp_secteur', 'reg_key', 'anciennete_annees',
            'emp_effectif', 'emp_stop_co', 'activity_status', 'has_declaration',
            'has_payment', 'montant_dette_total', 'fraude_confirmee', 
            'non_respect', 'redressement', 'quadrant', 'statut', 'priorite', 'traite',
            'inspecteur', 'risk', 'regles', 'anomalie', 'recent_comments', 'comments_url'
        ]

    def get_risk(self, obj):
        return {
            'score_global': obj.score_global,
            'niveau_risque': obj.niveau_risque,
            'score_employeur': obj.score_employeur,
            'score_declaration': obj.score_declaration,
            'score_recouvrement': obj.score_recouvrement,
            'score_controle': obj.score_controle,
            'score_protocole': obj.score_protocole
        }

    def get_comments_url(self, obj):
        return f"/api/dossiers/{obj.id_emp_hash}/comments/"

    def get_regles(self, obj):
        return {
            'regles_declenchees': obj.regles_declenchees,
            'nb_regles': obj.nb_regles,
            'interactions_detectees': obj.interactions_detectees,
            'top_feature_1': obj.top_feature_1,
            'top_feature_2': obj.top_feature_2,
            'top_feature_3': obj.top_feature_3,
            'recommandation_1': obj.recommandation_1
        }

    def get_anomalie(self, obj):
        return {
            'score_anomalie': obj.score_anomalie,
            'niveau_anomalie': obj.niveau_anomalie,
            'is_outlier_iforest': obj.is_outlier_iforest,
            'anomalie_top_1': obj.anomalie_top_1,
            'anomalie_top_2': obj.anomalie_top_2,
            'anomalie_top_3': obj.anomalie_top_3,
            'recommandation_2': obj.recommandation_2
        }

    def get_recent_comments(self, obj):
        # Récupère les 3 derniers commentaires associés
        comments = obj.commentaires.all()[:3]
        return CommentaireSerializer(comments, many=True).data

class WorkflowStatutSerializer(serializers.Serializer):
    """Validation de payload pour la mise à jour du statut."""
    statut = serializers.ChoiceField(choices=Dossier.STATUS_CHOICES)
    commentaire = serializers.CharField(required=False, allow_blank=True, max_length=1000)

class CommentaireSerializer(serializers.ModelSerializer):
    """CRUD et sérialisation des commentaires."""
    auteur_name = serializers.ReadOnlyField(source='auteur.username')

    class Meta:
        model = Comment
        fields = ['id', 'auteur', 'auteur_name', 'contenu', 'type_commentaire', 'created_at', 'is_interne']
        read_only_fields = ['auteur']