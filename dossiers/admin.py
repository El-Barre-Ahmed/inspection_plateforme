# Register your models here.
from django.contrib import admin
from .models import Dossier

@admin.register(Dossier)
class DossierAdmin(admin.ModelAdmin):
    # Cela permet de voir ces colonnes dans la liste sur l'interface admin
    list_display = ('forme_nom', 'id_emp_hash', 'niveau_risque', 'statut', 'inspecteur')
    # Cela ajoute des filtres sur la droite de l'écran
    list_filter = ('statut', 'niveau_risque', 'reg_key', 'inspecteur', 'quadrant')
    # Cela ajoute une barre de recherche
    search_fields = ('forme_nom', 'id_emp_hash')