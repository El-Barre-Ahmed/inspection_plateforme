# comments/models.py
from django.db import models
from django.contrib.auth.models import User
from dossiers.models import Dossier

class Comment(models.Model):
    """
    Commentaires ajoutés sur les dossiers par les inspecteurs ou les directeurs
    pour documenter le contrôle ou justifier des décisions.
    """
    TYPE_CHOICES = [
        ('OBSERVATION', 'Observation'),
        ('ALERTE', 'Alerte'),
        ('DECISION', 'Décision'),
    ]

    dossier = models.ForeignKey(Dossier, on_delete=models.CASCADE, related_name='commentaires')
    auteur = models.ForeignKey(User, on_delete=models.CASCADE)
    contenu = models.TextField(help_text="Texte du commentaire")
    type_commentaire = models.CharField(max_length=20, choices=TYPE_CHOICES, default='OBSERVATION')
    created_at = models.DateTimeField(auto_now_add=True)
    is_interne = models.BooleanField(default=True, help_text="Visibilité interne uniquement")
    is_read = models.BooleanField(default=False, help_text="Indique si la notification a été lue (applicable pour ALERTE)")
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at',]

    def __str__(self):
        return f"Commentaire de {self.auteur.username} sur {self.dossier.forme_nom}"

