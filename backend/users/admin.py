from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import UserProfile

# On crée une petite fenêtre "Inline" pour voir le profil directement dans la page User
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False

# On ré-enregistre l'utilisateur avec notre nouvelle fenêtre
class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)