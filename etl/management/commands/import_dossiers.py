import os
from django.core.management.base import BaseCommand, CommandError
from etl.importers import ExcelImporter

class Command(BaseCommand):
    """
    Commande personnalisée Django d'administration.
    Usage : python manage.py import_dossiers /chemin/vers/votre_fichier.xlsx
    """
    help = "Importe les données des dossiers d'audit depuis un fichier Excel (.xlsx)"

    def add_arguments(self, parser):
        # Argument obligatoire : le chemin absolu ou relatif du fichier excel
        parser.add_argument('file_path', type=str, help="Le chemin d'accès au fichier Excel (.xlsx)")

    def handle(self, *args, **options):
        file_path = options['file_path']

        # Vérification préalable de la présence physique du fichier
        if not os.path.exists(file_path):
            raise CommandError(f"Le fichier spécifié à l'emplacement '{file_path}' est introuvable.")

        self.stdout.write(self.style.WARNING(f"Début de l'analyse du fichier : {file_path}..."))

        try:
            # Initialisation et exécution de l'importateur
            importer = ExcelImporter(filepath=file_path)
            total_importes = importer.run()
            
            # Message de succès affiché dans la console
            self.stdout.write(
                self.style.SUCCESS(
                    f"Succès : {total_importes} dossiers ont été traités et intégrés avec succès en base de données."
                )
            )
        except Exception as e:
            # En cas de problème critique durant la lecture ou l'écriture
            raise CommandError(f"Une erreur est survenue lors de l'importation : {str(e)}")