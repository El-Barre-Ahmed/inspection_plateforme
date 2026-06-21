from django.db import models
from django.contrib.auth.models import User
from dossiers.models import Dossier

class WorkflowEvent(models.Model):
    """
    Enregistrement d'historique (audit trail) traçant chaque transition
    de statut de traitement d'un dossier.
    """
    dossier = models.ForeignKey(Dossier, on_delete=models.CASCADE, related_name='historique_workflow')
    acteur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    ancien_statut = models.CharField(max_length=50)
    nouveau_statut = models.CharField(max_length=50)
    commentaire = models.TextField(blank=True, null=True, help_text="Justification du changement de statut")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.dossier.forme_nom} : {self.ancien_statut} -> {self.nouveau_statut}"
