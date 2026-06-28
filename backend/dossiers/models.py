from django.db import models
from django.contrib.auth.models import User

class Dossier(models.Model):
    """
    Modèle Dossier mis à jour pour correspondre à 100% avec les 
    en-têtes de colonnes réels de votre fichier Excel.
    """
    STATUS_CHOICES = [
        ('NOUVEAU', 'Nouveau'),
        ('EN_COURS', 'En cours de traitement'),
        ('SUSPENDU', 'Suspendu / En attente'),
        ('CLOTURE', 'Clôturé'),
    ]

    PRIORITY_CHOICES = [
        ('BASSE', 'Basse'),
        ('MOYENNE', 'Moyenne'),
        ('HAUTE', 'Haute'),
        ('URGENTE', 'Urgente'),
    ]

    # --- 📋 IDENTIFICATION ---
    id_emp_hash = models.CharField(max_length=255, unique=True, db_index=True, help_text="ID unique hashé de l'employeur")

    # --- 📋 INFORMATIONS ENTREPRISE ---
    forme_nom = models.CharField(max_length=255, help_text="Raison sociale (FORME_NOM)")
    emp_secteur = models.CharField(max_length=150, help_text="Secteur d'activité (EMP_SECTEUR)")
    reg_key = models.CharField(max_length=50, help_text="Code région (REG_KEY)")
    anciennete_annees = models.PositiveIntegerField(default=0, help_text="Ancienneté en années")
    emp_effectif = models.PositiveIntegerField(default=0, help_text="Effectif d'employés (EMP_EFFECTIF)")
    emp_stop_co = models.BooleanField(default=False, help_text="Cotisation stoppée (EMP_STOP_CO)")
    activity_status = models.CharField(max_length=50, default="ACTIF", help_text="Statut activité (ACTIVITY_STATUS)")
    has_declaration = models.BooleanField(default=True)
    has_payment = models.BooleanField(default=True)
    montant_dette_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # --- 🚩 FLAGS HISTORIQUES MÉTIER ---
    flag_fraude_confirmee_ever = models.BooleanField(default=False, help_text="Flag fraude confirmée historique")
    flag_non_respect_ever = models.BooleanField(default=False, help_text="Flag non-conformité historique")
    flag_redressement_ever = models.BooleanField(default=False, help_text="Flag redressement historique")

    # --- 📊 SCORES DE RISQUE ---
    score_global = models.FloatField(default=0.0, help_text="Score global composite [0-1]")
    niveau_risque = models.CharField(max_length=20, default='FAIBLE')
    score_employeur = models.FloatField(default=0.0)
    score_declaration = models.FloatField(default=0.0)
    score_recouvrement = models.FloatField(default=0.0)
    score_controle = models.FloatField(default=0.0)
    score_protocole = models.FloatField(default=0.0)

    # --- 🔎 EXPLICABILITÉ & RÈGLES ---
    regles_declenchees = models.JSONField(default=list, blank=True)
    nb_regles = models.PositiveIntegerField(default=0)
    interactions_detectees = models.JSONField(default=dict, blank=True)
    nb_interactions = models.PositiveIntegerField(default=0, help_text="Nombre d'interactions détectées")
    top_feature_1 = models.CharField(max_length=100, blank=True, null=True)
    top_feature_2 = models.CharField(max_length=100, blank=True, null=True)
    top_feature_3 = models.CharField(max_length=100, blank=True, null=True)
    recommandation_1 = models.TextField(blank=True, null=True)

    # --- ⚠️ COUCHE ANOMALIE ---
    score_anomalie = models.FloatField(default=0.0)
    niveau_anomalie = models.CharField(max_length=50, default='NORMAL')
    is_outlier_iforest = models.BooleanField(default=False)
    anomalie_top_1 = models.CharField(max_length=150, blank=True, null=True)
    anomalie_top_2 = models.CharField(max_length=150, blank=True, null=True)
    anomalie_top_3 = models.CharField(max_length=150, blank=True, null=True)
    recommandation_2 = models.TextField(blank=True, null=True)

    # --- 🎯 FUSION & SEGMENTATION ---
    quadrant = models.CharField(max_length=50, default='Q4_LOW_RISK_LOW_ANOMALY')

    # --- ⚙️ SYSTÈME ---
    inspecteur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='dossiers_assignes')
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOUVEAU')
    priorite = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MOYENNE')
    traite = models.BooleanField(default=False, help_text="Indique si le dossier est traité (Traité / Non Traité)")
    date_import = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-score_global']
        indexes = [
            models.Index(fields=['id_emp_hash']),
            models.Index(fields=['score_global']),
            models.Index(fields=['statut']),
            models.Index(fields=['quadrant']),
        ]

    def __str__(self):
        return f"{self.forme_nom} ({self.id_emp_hash}) - {self.niveau_risque} - "