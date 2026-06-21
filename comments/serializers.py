from rest_framework import serializers

from .models import Comment
from dossiers.models import Dossier


class CommentaireSerializer(serializers.ModelSerializer):
    """CRUD et sérialisation des commentaires."""
    auteur_name = serializers.ReadOnlyField(source='auteur.username')

    # Use the dossier's `id_emp_hash` as the input/output identifier
    dossier = serializers.SlugRelatedField(slug_field='id_emp_hash', queryset=Dossier.objects.all(), required=False)

    class Meta:
        model = Comment
        fields = ['id', 'dossier', 'auteur', 'auteur_name', 'contenu', 'type_commentaire', 'created_at', 'is_interne', 'is_read', 'read_at']
        read_only_fields = ['id', 'auteur', 'created_at', 'read_at']
