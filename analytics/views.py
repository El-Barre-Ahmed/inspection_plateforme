from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncMonth

from core.permissions import IsDirecteurOrAdmin
from dossiers.models import Dossier

class DashboardView(APIView):
    """
    Fournit les données consolidées pour le tableau de bord décisionnel
    du Directeur de la CNSS en une seule requête d'agrégation.
    """
    permission_classes = [IsAuthenticated, IsDirecteurOrAdmin]

    def get(self, request):
        total_dossiers = Dossier.objects.count()
        
        # Agrégation globale
        aggregates = Dossier.objects.aggregate(
            dossiers_critiques=Count('id', filter=Q(niveau_risque='CRITIQUE')),
            dossiers_en_cours=Count('id', filter=Q(statut='EN_COURS')),
            dossiers_clotures=Count('id', filter=Q(statut='CLOTURE')),
            dossiers_traites=Count('id', filter=Q(traite=True) | Q(statut='CLOTURE')),
            dossiers_non_traites=Count('id', filter=~(Q(traite=True) | Q(statut='CLOTURE'))),
            dette_totale=Sum('montant_dette_total'),
            fraudes_confirmees=Count('id', filter=Q(flag_fraude_confirmee_ever=True))
        )

        # Calcul du taux de traitement
        traite_count = aggregates['dossiers_traites'] or 0
        taux_traitement = round(traite_count / total_dossiers, 2) if total_dossiers > 0 else 0.0

        # Distribution par quadrants analytiques
        repartition_quadrant = Dossier.objects.values('quadrant').annotate(count=Count('id'))
        # Distribution par niveau de risque
        repartition_risque = Dossier.objects.values('niveau_risque').annotate(count=Count('id'))

        return Response({
            'kpis': {
                'total_dossiers': total_dossiers,
                'dossiers_critiques': aggregates['dossiers_critiques'] or 0,
                'dossiers_en_cours': aggregates['dossiers_en_cours'] or 0,
                'dossiers_clotures': aggregates['dossiers_clotures'] or 0,
                'dossiers_traites': aggregates['dossiers_traites'] or 0,
                'dossiers_non_traites': aggregates['dossiers_non_traites'] or 0,
                'taux_traitement': taux_traitement,
                'montant_dette_total': aggregates['dette_totale'] or 0.0,
                'nb_fraudes_confirmees': aggregates['fraudes_confirmees'] or 0
            },
            'repartition_quadrant': {item['quadrant']: item['count'] for item in repartition_quadrant},
            'repartition_risque': {item['niveau_risque']: item['count'] for item in repartition_risque}
        })

class TopRegionsView(APIView):
    """Identifie les régions concentrant le plus fort volume financier de dettes et de risques."""
    permission_classes = [IsAuthenticated, IsDirecteurOrAdmin]

    def get(self, request):
        stats = Dossier.objects.values('reg_key').annotate(
            nb_dossiers=Count('id'),
            avg_score_global=Avg('score_global'),
            nb_critiques=Count('id', filter=Q(niveau_risque='CRITIQUE')),
            montant_dette=Sum('montant_dette_total')
        ).order_by('-montant_dette')[:10] # Top 10 régions à risque financier

        return Response(stats)

class PerformanceInspecteursView(APIView):
    """Calcule l'efficacité du traitement des dossiers par inspecteur."""
    permission_classes = [IsAuthenticated, IsDirecteurOrAdmin]

    def get(self, request):
        inspecteurs_stats = Dossier.objects.filter(inspecteur__isnull=False).values(
            'inspecteur__id', 'inspecteur__username'
        ).annotate(
            nb_dossiers_assignes=Count('id'),
            nb_traites=Count('id', filter=Q(statut='CLOTURE')),
            nb_en_cours=Count('id', filter=Q(statut='EN_COURS')),
            score_moyen_portefeuille=Avg('score_global')
        )
        
        # Ajout du taux de complétion calculé en Python
        for item in inspecteurs_stats:
            assignes = item['nb_dossiers_assignes']
            traites = item['nb_traites']
            item['taux_traitement'] = round(traites / assignes, 2) if assignes > 0 else 0.0

        return Response(inspecteurs_stats)