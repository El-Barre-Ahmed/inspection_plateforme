# Create your models here.
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    """
    Profil étendu rattaché à chaque utilisateur Django.
    Permet de définir le rôle métier, la région administrative et le matricule.
    """
    ROLE_CHOICES = [
        ('INSPECTEUR', 'Inspecteur'),
        ('DIRECTEUR', 'Directeur'),
        ('ADMIN', 'Administrateur'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='INSPECTEUR')
    region = models.CharField(max_length=100, blank=True, null=True, help_text="Région CNSS d'affectation")
    service = models.CharField(max_length=100, blank=True, null=True, help_text="Service administratif")
    badge_id = models.CharField(max_length=50, blank=True, null=True, unique=True, help_text="Numéro de carte professionnelle")

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

# --- SIGNALS ---
# Ces récepteurs créent ou mettent à jour automatiquement le profil
# lorsqu'un modèle User standard est enregistré.

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()