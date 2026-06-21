import django_filters
from django.contrib.auth.models import User
from .models import Dossier

class DossierFilter(django_filters.FilterSet):
    """
    Classe de filtrage avancée permettant à l'Inspecteur et au Directeur
    d'isoler les dossiers sur des critères métiers spécifiques.
    """
    QUADRANT_ALIAS = {
        'Q4_LOW_RISK_LOW_ANOMALY': 'Q4_normal',
        'Q3_HIGH_RISK_LOW_ANOMALY': 'Q3_risque_faible_anomalie_elevee',
        'Q2_HIGH_RISK_HIGH_ANOMALY': 'Q2_risque_eleve_anomalie_normale',
        'Q1_LOW_RISK_HIGH_ANOMALY': 'Q1_risque_eleve_anomalie_elevee'
    }

    niveau_risque = django_filters.CharFilter(lookup_expr='iexact')
    niveau_anomalie = django_filters.CharFilter(lookup_expr='iexact')
    quadrant = django_filters.CharFilter(method='filter_quadrant')
    inspecteur = django_filters.NumberFilter(field_name='inspecteur__id', lookup_expr='exact')
    emp_secteur = django_filters.CharFilter(lookup_expr='icontains')
    reg_key = django_filters.CharFilter(lookup_expr='iexact')
    statut = django_filters.CharFilter(lookup_expr='exact')
    traite = django_filters.BooleanFilter()
    id_emp_hash = django_filters.CharFilter(lookup_expr='iexact')
    fraude_confirmee = django_filters.BooleanFilter()

    # Filtres de seuils numériques
    score_global_min = django_filters.NumberFilter(field_name='score_global', lookup_expr='gte')
    score_global_max = django_filters.NumberFilter(field_name='score_global', lookup_expr='lte')
    dette_min = django_filters.NumberFilter(field_name='montant_dette_total', lookup_expr='gte')

    class Meta:
        model = Dossier
        fields = [
            'niveau_risque', 'niveau_anomalie', 'quadrant', 'inspecteur',
            'emp_secteur', 'reg_key', 'statut', 'traite', 'id_emp_hash', 'fraude_confirmee'
        ]

    def filter_quadrant(self, queryset, name, value):
        lookup_value = self.QUADRANT_ALIAS.get(value, value)
        return queryset.filter(quadrant__iexact=lookup_value)
