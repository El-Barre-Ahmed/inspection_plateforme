from rest_framework import permissions

class IsInspecteur(permissions.BasePermission):
    """
    Permission d'accès réservée uniquement aux utilisateurs 
    ayant le rôle 'INSPECTEUR' dans leur profil.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role == 'INSPECTEUR'
        )

class IsDirecteur(permissions.BasePermission):
    """
    Permission d'accès réservée uniquement aux utilisateurs 
    ayant le rôle 'DIRECTEUR' dans leur profil (visualisation globale).
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role == 'DIRECTEUR'
        )

class IsDirecteurOrAdmin(permissions.BasePermission):
    """
    Permission d'accès pour les profils à haut niveau de responsabilité
    (Directeurs et Administrateurs système).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Un superutilisateur Django a toujours accès
        if request.user.is_superuser:
            return True
            
        return (
            hasattr(request.user, 'profile') and 
            request.user.profile.role in ['DIRECTEUR', 'ADMIN']
        )

class IsDossierOwnerOrAdmin(permissions.BasePermission):
    """
    Règle de cloisonnement de sécurité :
    - Un inspecteur ne peut lire ou modifier que les dossiers qui lui sont assignés.
    - Les directeurs et administrateurs peuvent accéder à tous les dossiers.
    """
    def has_permission(self, request, view):
        # L'utilisateur doit d'abord être authentifié
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Vérification du profil utilisateur
        if not hasattr(request.user, 'profile'):
            return False
            
        role = request.user.profile.role
        
        # Accès illimité pour Directeur et Admin
        if role in ['DIRECTEUR', 'ADMIN'] or request.user.is_superuser:
            return True
            
        # Cloisonnement strict pour l'Inspecteur
        return obj.inspecteur == request.user