# Rapport de Soutenance - Inspection Platform

## Introduction

Ce document présente une analyse complète du projet `Inspection Platform`.
Il décrit l'architecture, le flux backend et frontend, la base de données, le système de notifications, ainsi que le parcours end-to-end depuis l'assignation d'un dossier jusqu'à la lecture de la notification.

## Architecture

Le projet utilise une architecture client-serveur.

- Backend : Django + Django REST Framework.
- Frontend : React + TypeScript.
- Authentification : JWT via `rest_framework_simplejwt`.
- Base de données : SQLite en développement, PostgreSQL en production.

Les applications métier principales sont : `users`, `dossiers`, `comments`, `workflow`, `analytics`, `etl`.

## Description UML (textuelle)

Le modèle principal est constitué de :

- `User` (utilisateur Django) avec profil `UserProfile`.
- `Dossier` : entité principale représentant un dossier d'inspection.
- `Comment` : entités liées aux dossiers pour les observations et notifications.

Relations :

- Un `Dossier` a un `inspecteur` (`User`).
- Un `Comment` appartient à un `Dossier` et a un `auteur` (`User`).
- Les notifications sont implémentées comme des `Comment` de type `ALERTE`.

## Conception de l'API

### Authentification

- `POST /api/auth/token/` : authentification et génération de token JWT.
- `POST /api/auth/token/refresh/` : renouvèlement du token.

### Dossiers

- `GET /api/dossiers/` : liste de dossiers filtrable et paginée.
- `GET /api/dossiers/{id}/` : détail d'un dossier.
- `POST /api/dossiers/{id}/assigner-inspecteur/` : assigner un inspecteur.
- `POST /api/dossiers/{id}/changer-statut/` : modifier le statut.
- `POST /api/dossiers/{id}/marquer-traite/` : marquer comme traité.
- `GET /api/dossiers/mes-stats/` : statistiques pour inspecteur.

### Commentaires et notifications

- `GET /api/comments/` : liste des commentaires.
- `GET /api/dossiers/{id_emp_hash}/comments/` : commentaires d'un dossier.
- `POST /api/dossiers/{id_emp_hash}/comments/` : créer un commentaire.
- `GET /api/notifications/` : récupérer les notifications d'un inspecteur.
- `POST /api/notifications/` : marquer plusieurs notifications comme lues.
- `POST /api/notifications/{id}/read/` : marquer une notification comme lue.

## Schéma de base de données

### Tables principales

- `auth_user` : utilisateurs Django.
- `users_userprofile` : profil métier, rôle, région, service, badge.
- `dossiers_dossier` : dossier d'inspection.
- `comments_comment` : commentaire associé au dossier.

### Champs importants de `Dossier`

- `id_emp_hash`, `forme_nom`, `emp_secteur`, `reg_key`.
- `score_global`, `niveau_risque`, `score_anomalie`, `niveau_anomalie`.
- `quadrant`, `statut`, `priorite`, `traite`.
- `inspecteur` : référence vers l'utilisateur assigné.
- `regles_declenchees`, `interactions_detectees` : données métiers en JSON.

### Champs importants de `Comment`

- `dossier`, `auteur`.
- `contenu`, `type_commentaire`.
- `created_at`, `is_interne`.
- `is_read`, `read_at` : états de lecture des notifications.

## Explication des fonctionnalités

### Filtrage des dossiers

Le frontend propose des filtres par :

- recherche texte.
- statut.
- niveau de risque.
- quadrant.
- inspecteur.
- traité / non traité.

Le backend applique ces filtres via `django_filters` et des champs spécifiques dans le modèle `Dossier`.

### Assignation d'inspecteur

Les directeurs et administrateurs peuvent assigner un inspecteur à un dossier.
Cette action met à jour le dossier, crée une notification interne et envoie un email.

### Notifications

Les notifications sont générées comme des commentaires de type `ALERTE`.
Elles sont accessibles via un endpoint dédié et peuvent être marquées comme lues.

### Tableau de bord

- Inspecteurs : Vue des dossiers assignés, alertes critiques, dossiers prioritaires.
- Directeurs / Admins : Indicateurs globaux, répartition par région et performance des inspecteurs.

## Outils et structure essentielle

Cette section présente les outils principaux utilisés dans le projet, ainsi que les fichiers clés pour comprendre la logique métier.

- Backend : Django, Django REST Framework, JWT (`rest_framework_simplejwt`), `django_filters`.
- Frontend : React, TypeScript, Vite.
- Base de données : SQLite en développement, PostgreSQL possible en production.

Fichiers essentiels (backend) :

- `config/settings.py` : configuration Django, base de données, authentification, CORS.
- `config/urls.py` : routes API principales.
- `dossiers/views.py` : logique des dossiers, assignation d'inspecteur, actions métier.
- `dossiers/serializers.py` : sérialisation des dossiers et des commentaires pour l'API.
- `comments/views.py` : gestion des commentaires, notifications et état lu/non lu.
- `comments/serializers.py` : format des commentaires renvoyés par l'API.
- `comments/models.py` : modèle de notification/commentaire.
- `dossiers/filters.py` : filtres métier pour les recherches de dossiers.

Fichiers essentiels (frontend) :

- `frontend/src/App.tsx` : routes de l'application et contexte d'authentification.
- `frontend/src/api/api.ts` : fonction centrale de requête HTTP vers l'API.
- `frontend/src/context/AuthContext.tsx` : stockage du token et rôle de l'utilisateur.
- `frontend/src/pages/DashboardPage.tsx` : affichage du tableau de bord et des notifications.
- `frontend/src/pages/DossiersPage.tsx` : interface de liste des dossiers et filtres.

Cette section cible uniquement le code principal de notre fonctionnalité : création d'API, gestion des dossiers, notifications, et interface utilisateur. Les détails des outils ou dépendances tierces sont réduits au minimum.

## Exemples de code par fonctionnalité

### 1. Exemple d'API principale

L'API principale est gérée dans `dossiers/views.py` avec un `ViewSet`.
Un exemple simple d'endpoint d'assignation :

```python
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError

@action(detail=True, methods=['post'], url_path='assigner-inspecteur')
def assigner_inspecteur(self, request, pk=None):
    dossier = self.get_object()
    inspecteur_id = request.data.get('inspecteur_id')
    if not inspecteur_id:
        raise ValidationError({'inspecteur': 'inspecteur_id requis.'})

    inspecteur = User.objects.filter(pk=inspecteur_id, profile__role='INSPECTEUR').first()
    if not inspecteur:
        raise ValidationError({'inspecteur': 'Inspecteur introuvable.'})

    dossier.inspecteur = inspecteur
    dossier.save(update_fields=['inspecteur'])
    return Response({'status': 'success', 'inspecteur': inspecteur.username})
```

Ce code montre la création d'une API métier dédiée sans entrer dans tous les détails d'infrastructure.

### 2. Exemple backend de notification

Le backend gère la création d'une alerte via `Comment` en conservant le modèle principal :

```python
from comments.models import Comment

Comment.objects.create(
    dossier=dossier,
    auteur=request.user,
    contenu=f"Vous avez été assigné au dossier #{dossier.id}.",
    type_commentaire='ALERTE',
    is_interne=True
)
```

Cette logique est simple : une notification est un commentaire de type `ALERTE` lié à un dossier.

### 3. Exemple frontend de requête API

Le frontend centralise les appels API via `frontend/src/api/api.ts` :

```ts
export function createRequest(token: string | null) {
  return async (path: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
    return response.json();
  };
}
```

Ce même principe permet d'appeler toutes les routes du backend depuis React.

### 4. Exemple frontend d'affichage et de filtre

La page `DossiersPage` utilise une seule fonction de requête pour récupérer la liste filtrée :

```ts
const request = createRequest(token);
const query = new URLSearchParams();
if (statut) query.set('statut', statut);
if (quadrant) query.set('quadrant', quadrant);
request(`/dossiers/?${query.toString()}`).then((data) => setDossiers(data.results));
```

Cela montre comment le frontend se limite à construire des paramètres et afficher la réponse.

### 5. Exemple de lecture de notification

Pour marquer une notification comme lue, le frontend appelle l'endpoint dédié :

```ts
await request(`/notifications/${notification.id}/read/`, { method: 'POST' });
```

Le backend met à jour alors `is_read` et `read_at` dans le modèle `Comment`.

## Créer 3 APIs principales et connecter le code

Pour le jury, il est utile de présenter trois APIs clés du projet et de montrer comment elles sont reliées du backend au frontend.

### API 1 : Liste des dossiers

- Backend : `dossiers/views.py` contient `DossierViewSet`.
- Routes : `dossiers/urls.py` enregistre le routeur DRF.
- Point d'entrée : `GET /api/dossiers/`.

Exemple backend :

```python
class DossierViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Dossier.objects.all()
    serializer_class = DossierListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DossierFilter
```

Exemple frontend :

```ts
const request = createRequest(token);
const query = new URLSearchParams();
query.set('statut', 'EN_COURS');
request(`/dossiers/?${query.toString()}`).then((data) => setDossiers(data.results));
```

Cette API est la plus importante : elle fournit les dossiers affichés dans `DossiersPage` et permet la recherche/filtrage.

### API 2 : Assigner un inspecteur

- Backend : action personnalisée `assigner_inspecteur` dans `DossierViewSet`.
- Route : `POST /api/dossiers/{id}/assigner-inspecteur/`.
- Logique : mise à jour du dossier, création d'un `Comment` de type `ALERTE`, envoi optionnel d'email.

Exemple backend :

```python
@action(detail=True, methods=['post'], url_path='assigner-inspecteur')
def assigner_inspecteur(self, request, pk=None):
    dossier = self.get_object()
    inspecteur = User.objects.get(pk=request.data['inspecteur_id'], profile__role='INSPECTEUR')
    dossier.inspecteur = inspecteur
    dossier.save(update_fields=['inspecteur'])
    Comment.objects.create(
        dossier=dossier,
        auteur=request.user,
        contenu=f"Vous avez été assigné au dossier #{dossier.id}.",
        type_commentaire='ALERTE',
        is_interne=True
    )
    return Response({'status': 'success'})
```

Exemple frontend :

```ts
await request(`/dossiers/${dossierId}/assigner-inspecteur/`, {
  method: 'POST',
  body: JSON.stringify({ inspecteur_id: selectedInspectorId }),
});
```

Cette API relie le formulaire d'assignation au modèle `Dossier` et au modèle `Comment`.

### API 3 : Notifications

- Backend : `comments/views.py` contient `NotificationsView` et `NotificationReadView`.
- Routes : `GET /api/notifications/` et `POST /api/notifications/{id}/read/`.
- Fonction : lire les alertes créées après assignation.

Exemple backend :

```python
class NotificationsView(APIView):
    def get(self, request):
        qs = Comment.objects.filter(type_commentaire='ALERTE', dossier__inspecteur=request.user)
        serializer = CommentaireSerializer(qs, many=True)
        return Response(serializer.data)
```

Exemple frontend :

```ts
const notifications = await request('/notifications/');
await request(`/notifications/${notification.id}/read/`, { method: 'POST' });
```

Ce chemin de bout en bout illustre la création de notifications et leur gestion côté utilisateur.

## Trois fonctions métier principales du backend

Pour aller au-delà des endpoints, voici trois fonctions métier clés du backend avec leur rôle et leur lien avec le frontend.

### Fonction 1 : adaptation du filtre de quadrant

- Fichier : `dossiers/filters.py`
- Fonction : `DossierFilter.filter_quadrant`
- Rôle : traduire le code reçu depuis l'interface (`Q4_LOW_RISK_LOW_ANOMALY`, etc.) en valeurs attendues par la base de données (`Q4_normal`, `Q3_risque_faible_anomalie_elevee`, ...).

Extrait :

```python
class DossierFilter(django_filters.FilterSet):
    QUADRANT_ALIAS = {
        'Q4_LOW_RISK_LOW_ANOMALY': 'Q4_normal',
        'Q3_HIGH_RISK_LOW_ANOMALY': 'Q3_risque_faible_anomalie_elevee',
        'Q2_HIGH_RISK_HIGH_ANOMALY': 'Q2_risque_eleve_anomalie_normale',
        'Q1_LOW_RISK_HIGH_ANOMALY': 'Q1_risque_eleve_anomalie_elevee'
    }

    def filter_quadrant(self, queryset, name, value):
        lookup_value = self.QUADRANT_ALIAS.get(value, value)
        return queryset.filter(quadrant__iexact=lookup_value)
```

Lien frontend : `DossiersPage` construit la requête en envoyant un paramètre `quadrant` qui est ensuite adapté par cette fonction.

### Fonction 2 : assigner un inspecteur

- Fichier : `dossiers/views.py`
- Fonction : `DossierViewSet.assigner_inspecteur`
- Rôle : appliquer la règle métier d'assignation, vérifier le rôle, mettre à jour le dossier, créer une alerte interne et envoyer un email.

Extrait :

```python
@action(detail=True, methods=['post'], url_path='assigner-inspecteur')
def assigner_inspecteur(self, request, pk=None):
    dossier = self.get_object()
    profile = getattr(request.user, 'profile', None)
    if not profile or profile.role not in ['DIRECTEUR', 'ADMIN']:
        return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    inspecteur = User.objects.filter(pk=request.data.get('inspecteur_id'), profile__role='INSPECTEUR').first()
    if not inspecteur:
        raise ValidationError({'inspecteur': 'Inspecteur introuvable ou rôle invalide.'})

    dossier.inspecteur = inspecteur
    dossier.save(update_fields=['inspecteur'])
    Comment.objects.create(...)
    send_mail(...)
    return Response(DossierDetailSerializer(dossier, context={'request': request}).data)
```

Lien frontend : le formulaire d'assignation envoie un `POST /api/dossiers/{id}/assigner-inspecteur/` depuis l'interface de gestion.

### Fonction 3 : marquer une notification comme lue

- Fichier : `comments/views.py`
- Fonction : `NotificationReadView.post`
- Rôle : persister l'état de lecture sur le commentaire de type `ALERTE`.

Extrait :

```python
class NotificationReadView(APIView):
    def post(self, request, pk):
        c = Comment.objects.get(pk=pk, type_commentaire='ALERTE', dossier__inspecteur=request.user)
        if not c.is_read:
            c.is_read = True
            c.read_at = timezone.now()
            c.save(update_fields=['is_read', 'read_at'])
        return Response({'id': pk, 'is_read': c.is_read})
```

Lien frontend : dans `DashboardPage`, l'appel `POST /api/notifications/{id}/read/` met à jour l'état de la notification pour l'utilisateur.

## Conclusion

Le projet est structuré et prêt pour une démonstration.

Points forts :

- séparation claire backend/frontend.
- API REST avec authentification JWT.
- système de notification persistant.
- filtres métier bien définis.

Prochaines améliorations possibles : tests automatiques, modèle de notification dédié, envoi d'emails asynchrone.
