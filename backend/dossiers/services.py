from django.db import transaction
from django.core.exceptions import ValidationError
from workflow.models import WorkflowEvent

class WorkflowService:
    """
    Service centralisé pour gérer les transitions d'états d'un dossier.
    Garantit l'intégrité de l'audit trail en bdd sous forme de transaction atomique.
    """
    # Liste restrictive des transitions valides
    TRANSITIONS_VALIDES = {
        'NOUVEAU': ['EN_COURS'],
        'EN_COURS': ['SUSPENDU', 'CLOTURE'],
        'SUSPENDU': ['EN_COURS'],
        'CLOTURE': ['EN_COURS'], # La réouverture peut être restreinte via permissions
    }

    def changer_statut(self, dossier, nouveau_statut, user, commentaire=''):
        """
        Exécute la transition d'état d'un dossier de manière sécurisée.
        """
        ancien_statut = dossier.statut

        # Si l'état reste inchangé, met à jour le champ traite si nécessaire
        if ancien_statut == nouveau_statut:
            updated_traite = (nouveau_statut == 'CLOTURE')
            if dossier.traite != updated_traite:
                dossier.traite = updated_traite
                dossier.save(update_fields=['traite'])
            return

        # Validation de la transition théorique
        transitions_possibles = self.TRANSITIONS_VALIDES.get(ancien_statut, [])
        if nouveau_statut not in transitions_possibles:
            raise ValidationError(
                f"Transition impossible : Impossible de passer de '{ancien_statut}' à '{nouveau_statut}'."
            )

        # Les inspecteurs ordinaires ne peuvent pas rouvrir un dossier clôturé
        if ancien_statut == 'CLOTURE' and user.profile.role == 'INSPECTEUR':
            raise ValidationError("Seul un Administrateur ou Directeur peut rouvrir un dossier clôturé.")

        # Exécution de la transition de manière atomique
        with transaction.atomic():
            dossier.statut = nouveau_statut
            dossier.save()

            # Création automatique de l'événement d'audit
            WorkflowEvent.objects.create(
                dossier=dossier,
                acteur=user,
                ancien_statut=ancien_statut,
                nouveau_statut=nouveau_statut,
                commentaire=commentaire
            )