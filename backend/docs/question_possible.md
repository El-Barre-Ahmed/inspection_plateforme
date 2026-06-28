# Questions possibles et réponses

## 1. Quelle est la fonctionnalité principale de Inspection Platform ?
Inspection Platform permet de gérer des dossiers d'inspection pour la CNSS, avec attribution d'inspecteurs, suivi des statuts, commentaires et tableau de bord analytique.

## 2. Quels rôles existent dans l'application ?
- `INSPECTEUR` : accède à ses dossiers assignés, peut consulter et commenter.
- `DIRECTEUR` : accède au tableau de bord décisionnel, peut assigner des inspecteurs et voir les performances.
- `ADMIN` : accès similaire au directeur, avec droits administratifs étendus.

## 3. Comment l'utilisateur s'authentifie ?
L'authentification utilise un token JWT via l'endpoint `POST /api/auth/token/`. Le frontend stocke le token et l'envoie dans l'en-tête `Authorization: Bearer <token>`.

## 4. Que fait le tableau de bord ?
- Inspecteurs : affichage des dossiers assignés, alertes critiques et accès rapide aux dossiers.
- Directeurs/Admin : indicateurs globaux, répartition par région, performance des inspecteurs.

## 5. Où sont gérées les actions sur les dossiers ?
Les actions sont dans `dossiers/views.py` : assignation d'inspecteur, changement de statut, marquage traité, statistiques.

## 6. Comment chercher un dossier spécifique ?
Le frontend propose une recherche par texte et des filtres. La recherche se base notamment sur `id_emp_hash` et d'autres champs métiers exposés par `dossiers/filters.py`.

## 7. Comment ajouter ou lire un commentaire ?
Le backend expose ces endpoints :
- `GET /api/dossiers/{id_emp_hash}/comments/`
- `POST /api/dossiers/{id_emp_hash}/comments/`
Les commentaires sont liés au dossier et peuvent être internes ou publics.

## 8. Comment fonctionnent les notifications ?
Les notifications sont implémentées via des commentaires de type `ALERTE`. Elles sont visibles dans l'interface sous forme de messages que l'inspecteur peut marquer comme lus.

## 9. Quels fichiers sont essentiels pour le frontend ?
- `frontend/src/App.tsx` : routes et contexte d'authentification.
- `frontend/src/api/api.ts` : gestion des appels HTTP et rafraîchissement de token.
- `frontend/src/context/AuthContext.tsx` : stockage du token et rôle.
- `frontend/src/pages/DashboardPage.tsx` : affichage du tableau de bord.
- `frontend/src/pages/DossiersPage.tsx` : interface de liste des dossiers.

## 10. Quel est le format attendu des données du dashboard ?
Le endpoint `GET /api/dashboard/` retourne un objet contenant des KPI (`kpis`), `repartition_risque` et éventuellement d'autres métriques analytiques.

## 11. Quelles erreurs peut-on rencontrer sur le frontend ?
- `401 Unauthorized` : token expiré ou absent.
- `403 Forbidden` : accès refusé à une ressource réservé à un autre rôle.
- `404 Not Found` : ressource ou route introuvable.

## 12. Comment corriger un dashboard vide après refresh ?
Il faut s'assurer que le rôle et le token sont bien restaurés depuis le stockage local (`localStorage`) au montage de l'application, puis déclencher le fetch de données uniquement lorsque ces valeurs sont présentes.

## 13. Comment exécuter le projet en local ?
- Backend : `python manage.py runserver` depuis la racine du projet.
- Frontend : `cd frontend && npm install && npm run dev`.

## 14. Quelle est la base de données utilisée ?
En développement, le projet utilise `SQLite` (`db.sqlite3`). En production, il est prévu d'utiliser `PostgreSQL`.

## 15. Où sont définies les routes Django principales ?
Dans `config/urls.py`, qui inclut les routes des applications `dossiers`, `comments`, `workflow`, `analytics`, `users`.

## 16. Comment ajouter un nouvel inspecteur dans l'application ?
Les utilisateurs sont gérés via le modèle Django `User` et un profil métier `UserProfile`. Ajouter un inspecteur revient à créer un `User` avec `profile.role = 'INSPECTEUR'`.

## 17. Que surveiller pour le débogage ?
- Vérifier les permissions sur les endpoints.
- Vérifier les données du token JWT et les claims `username`/`role`.
- Vérifier les réponses API dans `Network` du navigateur.
- Vérifier le build frontend pour erreurs TypeScript.

## 18. Est-ce que l'URL `/analytics` est protégée ?
Oui, elle est accessible seulement aux rôles `DIRECTEUR` et `ADMIN` dans `frontend/src/App.tsx` via `ProtectedRoute`.

## 19. Quel est le rôle de `dossiers/filters.py` ?
Il expose les filtres métier pour la recherche de dossiers, y compris `traite` et `id_emp_hash`, afin de rendre la recherche plus précise.

## 20. Comment retrouver une ancienne version fonctionnelle ?
Idéalement avec Git (`git checkout` ou `git reset`). Si le repo n'est pas initialisé, il faut revenir aux fichiers sauvegardés localement ou créer un backup avant modifications.

## Questions liées au code

### 21. Pourquoi `DossierViewSet` utilise `get_queryset()` ?
Parce que l'accès aux dossiers dépend du rôle de l'utilisateur. Le code applique un principe de sécurité "default deny" : si l'utilisateur n'est pas inspecteur, directeur, admin ou superuser, il n'a aucun accès. Les inspecteurs ne voient que leurs dossiers.

### 22. Pourquoi `DossierViewSet` est un `ReadOnlyModelViewSet` avec `DestroyModelMixin` ?
Parce que l'API ne propose que la lecture des dossiers par défaut (liste et détail), tout en autorisant la suppression explicite via `destroy` si besoin.

### 23. Pourquoi `filterset_class = DossierFilter` ?
Pour centraliser les filtres métiers (statut, niveau_risque, quadrant, inspecteur, id_emp_hash, traité, etc.) et permettre des requêtes complexes sur `/api/dossiers/`.

### 24. Pourquoi `DossierFilter` utilise une méthode custom `filter_quadrant()` ?
Parce que le projet accepte des alias métier pour les quadrants (`Q4_LOW_RISK_LOW_ANOMALY` → `Q4_normal`, etc.), ce qui améliore l'interprétation des requêtes utilisateur et la compatibilité avec différents codes.

### 25. Pourquoi `CommentViewSet.get_queryset()` gère à la fois `?dossier=` et `id_emp_hash` en URL ?
Pour supporter deux modes d'accès : recherche directe par paramètre et route imbriquée dans `/api/dossiers/{id_emp_hash}/comments/`, ce qui rend l'API plus flexible.

### 26. Pourquoi `NotificationsView` retourne des commentaires de type `ALERTE` ?
Parce que les notifications sont implémentées comme des commentaires métier. Cela évite de dupliquer la logique et permet de lisser le modèle entre commentaires et alertes.

### 27. Pourquoi `MyTokenObtainPairSerializer` ajoute `username` et `role` au JWT ?
Pour que le frontend puisse connaître le rôle de l'utilisateur dès l'authentification et afficher la bonne interface (`/dossiers` pour inspecteur, `/dashboard` pour direction/admin).

### 28. Pourquoi l'API utilise `credentials: 'include'` dans les requêtes ?
Pour conserver les cookies éventuels de session ou de rafraîchissement, notamment si des mécanismes de refresh token reposent sur des cookies côté serveur.

### 29. Pourquoi `createRequest()` rafraîchit le token sur 401 ?
Pour rendre l'application plus robuste : si le token d'accès a expiré, l'appel tente un refresh avec `refreshToken` puis recommence la requête automatiquement.

### 30. Pourquoi `ProtectedRoute` redirige vers `/403` pour certains rôles ?
Parce que certaines pages sont réservées : `/analytics` est spécifique à `DIRECTEUR` et `ADMIN`, et le rôle `INSPECTEUR` ne doit pas y accéder.

### 31. Pourquoi le frontend sépare `DashboardPage` et `DossiersPage` ?
Parce que l'expérience métier diffère : les inspecteurs ont besoin d'une vue opérationnelle de leurs dossiers, tandis que la direction a besoin d'un tableau de bord analytique.

### 32. Pourquoi `AuthContext` stocke `token`, `refreshToken`, `username` et `role` ?
Pour que toutes les pages et composants puissent accéder à l'état d'authentification, appliquer les permissions et afficher le bon menu selon le rôle.

### 33. Pourquoi `App.tsx` utilise `useMemo` pour le contexte auth ?
Pour éviter de recréer inutilement l'objet de contexte à chaque rendu, ce qui peut provoquer des rerenders en cascade dans les composants consommateurs.

### 34. Pourquoi existe-t-il un `InspecteurListView` ?
Pour fournir la liste des inspecteurs aux directeurs/admins, notamment lors de l'assignation d'un inspecteur depuis l'interface d'un dossier.

### 35. Pourquoi `assigner_inspecteur` supporte `inspecteur_id` et `inspecteur_username` ?
Pour rendre l'endpoint compatible avec deux modes d'appel : sélection par identifiant ou saisie par nom d'utilisateur.

### 36. Pourquoi `marquer-traite` est un endpoint séparé ?
Parce que le traitement d'un dossier est une action métier distincte qui n'est pas simplement une mise à jour partielle du modèle.

### 37. Pourquoi `WorkflowService` est utilisé dans `changer_statut` ?
Pour isoler la logique de transition de statut et garantir que les règles métiers restent centralisées, testables et réutilisables.

### 38. Pourquoi `CommentViewSet.perform_create()` attache automatiquement `auteur` ?
Pour s'assurer que chaque commentaire est toujours lié à l'utilisateur authentifié et éviter des créations non autorisées.

### 39. Pourquoi le code de notification marque le champ `read_at` ?
Pour conserver l'historique de lecture et pouvoir filtrer les alertes non lues, sans simplement basculer un booléen.

### 40. Pourquoi les filtres utilisent `lookup_expr='iexact'` et `icontains` ?
Pour rendre la recherche plus tolérante : `iexact` ignore la casse pour les champs exacts, tandis que `icontains` autorise la recherche partielle sur le secteur.

### 41. Pourquoi `App.tsx` a la fonction `readStored()` avant les `useState` ?
Pour éviter que `localStorage.getItem()` retourne la chaîne `'null'` ou `'undefined'` et pour restaurer proprement l'état initial sans valeurs invalides.

### 42. Pourquoi `setToken()` dans `App.tsx` décode le token si `userVal` et `roleVal` ne sont pas fournis ?
Parce que le frontend peut recevoir un token depuis `localStorage` au rechargement, et il doit extraire le `username` et le `role` du payload JWT pour reconstruire l'état utilisateur.

### 43. Pourquoi la route `/` vérifie `token` avant de rediriger ?
Pour ne pas envoyer un visiteur non authentifié vers `/dossiers` ou `/dashboard`; il doit d'abord aller à `/login` si le token est absent.

### 44. Pourquoi `createRequest()` conserve `suppressGlobalError` ?
Pour permettre à certains appels, comme la suppression de commentaire ou de dossier, de gérer l'erreur localement sans déclencher l'erreur globale de l'application.

### 45. Pourquoi `createRequest()` essaye de rafraîchir le token sur erreur 401 ?
Pour que l'utilisateur reste connecté sans interruption : si le token d'accès expire, la requête essaie un refresh et réessaie la même API.

### 46. Pourquoi `ProtectedRoute` renvoie `<Navigate to="/403" replace />` quand le rôle ne correspond pas ?
Pour séparer l'autorisation des pages sécurisées : l'utilisateur authentifié voit un message d'accès refusé au lieu d'une simple redirection vers login.

### 47. Pourquoi `DossierDetailPage` utilise `Promise.all()` pour charger `workflow-events`, `comments` et `inspecteurs` ?
Pour paralléliser les appels API et réduire le temps de chargement de la page, tout en attendant que toutes les données auxiliaires soient disponibles.

### 48. Pourquoi `DossierDetailPage` utilise `dossier.id_emp_hash` pour charger les commentaires ?
Parce que l'API de commentaires est conçue pour être accessible via l'identifiant métier `id_emp_hash` du dossier, et non seulement via le PK de Django.

### 49. Pourquoi `deleteComment()` passe `suppressGlobalError: true` ?
Pour éviter l'affichage d'une erreur globable si la suppression échoue, car l'UI gère localement l'état des commentaires.

### 50. Pourquoi `handleAssignInspecteur()` convertit `inspecteurUsername` en `parseInt()` ?
Parce que le formulaire stocke en fait l'`id` de l'inspecteur, alors que le champ est nommé `inspecteurUsername`. C'est un choix d'implémentation qui peut être clarifié.

### 51. Pourquoi `handleMarkTreated()` vérifie `(role !== 'DIRECTEUR' && role !== 'ADMIN')` ?
Parce que seuls les directeurs et admins sont autorisés à marquer un dossier comme traité, ce qui correspond aux règles métier du projet.

### 52. Pourquoi `DossierDetailPage` recharge le dossier après `changer-statut` ?
Pour s'assurer que l'affichage reflète l'état réel du backend après la transition de statut, y compris les mises à jour calculées côté serveur.

## Questions liées à l'architecture

### 41. Pourquoi utiliser Django REST Framework côté backend ?
Parce qu'il facilite la création d'API REST standardisées, la gestion des permissions, des sérializers, des filtres et des actions personnalisées.

### 42. Pourquoi utiliser React + TypeScript côté frontend ?
Pour bénéficier d'une interface réactive performante tout en obtenant une vérification statique des types et une meilleure maintenabilité.

### 43. Pourquoi séparer les apps Django en `dossiers`, `comments`, `workflow`, `analytics`, `users` ?
Pour respecter le principe de séparation des responsabilités : chaque app gère un domaine fonctionnel clair et peut être développée/testée indépendamment.

### 44. Pourquoi le projet utilise JWT ?
Pour accompagner une architecture frontend/backend découplée où le client stocke un token et l'envoie ensuite à chaque requête API.

### 45. Pourquoi stocker `role` dans le token plutôt qu'interroger l'API à chaque page ?
Pour réduire les appels réseau et permettre au frontend de déterminer rapidement l'autorisation et la navigation par rôle.

### 46. Pourquoi `config/urls.py` inclut `api/` et des routes pour la documentation Swagger ?
Pour exposer toutes les API sous un même préfixe, gérer l'authentification, et fournir une documentation interactive pendant le développement.

### 47. Pourquoi utiliser `django_filters` pour les dossiers ?
Parce que la liste de dossiers nécessite des recherches fines sur de multiples champs métiers, et `django_filters` facilite cette implémentation propre.

### 48. Pourquoi le backend envoie un email lors de l'assignation d'un inspecteur ?
Pour notifier l'utilisateur de l'assignation en dehors de l'application, même s'il ne consulte pas immédiatement la plateforme.

### 49. Pourquoi le frontend garde `token` en `localStorage` ?
Pour persister la session après rafraîchissement de page. Attention : cela doit être sécurisé et protégé côté serveur contre l'usurpation.

### 50. Pourquoi le projet peut utiliser SQLite en dev et PostgreSQL en prod ?
Parce que SQLite est simple à configurer pour le développement local, tandis que PostgreSQL est plus robuste pour la production.

---

Ces questions couvrent les interrogations techniques issues du code, de l'architecture et du fonctionnement réel du projet.