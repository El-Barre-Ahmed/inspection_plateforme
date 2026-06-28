from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from dossiers.views import DossierViewSet
from comments.views import NotificationsView
from dossiers.models import Dossier
from comments.models import Comment
import uuid


class Command(BaseCommand):
    help = 'Test assignment flow: create director, inspector, dossier, call assigner_inspecteur and verify results'

    def handle(self, *args, **options):
        # Create users
        director, _ = User.objects.get_or_create(username='test_director')
        if not director.pk:
            director.set_password('pass')
            director.save()
        director.profile.role = 'DIRECTEUR'
        director.profile.save()

        inspector, _ = User.objects.get_or_create(username='test_inspector', defaults={'email': 'inspector@example.com'})
        inspector.profile.role = 'INSPECTEUR'
        inspector.profile.save()

        # Create a dossier
        dossier = Dossier.objects.create(
            id_emp_hash=str(uuid.uuid4()),
            forme_nom='Test SARL',
            emp_secteur='AUTRE',
            reg_key='R1',
            anciennete_annees=1,
            emp_effectif=5,
            montant_dette_total=0
        )

        factory = APIRequestFactory()
        view = DossierViewSet.as_view({'post': 'assigner_inspecteur'})
        req = factory.post(f'/api/dossiers/{dossier.pk}/assigner-inspecteur/', {'inspecteur_id': inspector.id}, format='json')
        force_authenticate(req, user=director)
        resp = view(req, pk=dossier.pk)
        self.stdout.write(f'assigner_inspecteur status: {resp.status_code}')

        # Refresh and check
        dossier.refresh_from_db()
        self.stdout.write(f'dossier.inspecteur_id: {dossier.inspecteur_id}')

        alert_count = Comment.objects.filter(dossier=dossier, type_commentaire='ALERTE').count()
        self.stdout.write(f'alert_count: {alert_count}')

        # Call notifications endpoint as inspector
        view_notif = NotificationsView.as_view()
        req2 = factory.get('/api/notifications/?unread=true')
        force_authenticate(req2, user=inspector)
        resp2 = view_notif(req2)
        self.stdout.write(f'notifications (unread) count: {len(resp2.data)}')

        self.stdout.write('Done')
