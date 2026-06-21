# Workflow Inspection Platform

## Objectif
Ce document décrit le flux principal de l’application, les points d’entrée API, et la manière dont les dossiers, les commentaires et l’authentification sont liés.

## 1. Authentification

- L’utilisateur se connecte via JWT.
- Endpoint : `POST /api/auth/token/`
- Corps :
  ```json
  {
    "username": "utilisateur",
    "password": "motdepasse"
  }
  ```
- Réponse : `access` et `refresh` tokens.
- Pour chaque requête API protégée, envoyer :
  - `Authorization: Bearer <access_token>`

## 2. Gestion des dossiers

- Application principale : `dossiers`
- Modèle clé : `Dossier`
- Identifiant exposé : `id_emp_hash`
- Endpoint principal : `GET /api/dossiers/`
- Détails d’un dossier : `GET /api/dossiers/{id_emp_hash}/`

### Lien dossier / commentaire

- Les commentaires sont liés au dossier via `id_emp_hash`.
- Le front-end ne doit pas transmettre l’ID numérique interne.
- Exemple d’utilisation :
  - URL de création : `/api/dossiers/{id_emp_hash}/comments/`

## 3. Création de commentaire

- Application : `comments`
- Endpoint : `POST /api/dossiers/{id_emp_hash}/comments/`
- Corps :
  ```json
  {
    "texte": "Contenu du commentaire"
  }
  ```
- Le dossier est identifié par `id_emp_hash`, pas par l’ID interne.
- L’utilisateur connecté est automatiquement défini comme auteur.

## 4. Structure de l’API

- Routes communes :
  - `GET /api/dossiers/`
  - `GET /api/dossiers/{id_emp_hash}/`
  - `POST /api/dossiers/{id_emp_hash}/comments/`
- Auth : JWT via `rest_framework_simplejwt`
- Schema / docs : `drf_spectacular`

## 5. Configuration locale et production

- Fichier de configuration : `config/settings.py`
- Valeurs sensibles en `.env`
- Exemple :
  - `SECRET_KEY`
  - `DEBUG`
  - `DB_ENGINE`
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_HOST`
  - `DB_PORT`

### Environnement local
- Par défaut, SQLite est utilisé si `DB_ENGINE` n’est pas `django.db.backends.postgresql`.
- Fichier `.env` à placer à la racine du projet.

### En production
- Utiliser PostgreSQL.
- Ne pas conserver de secrets dans `config/settings.py`.
- Définir `SECRET_KEY` uniquement via `.env`.

## 6. Bonnes pratiques front-end

- Ne pas stocker `id` interne du dossier.
- Utiliser `id_emp_hash` comme identifiant public.
- Gérer les erreurs d’authentification : `401` si pas de token valide.
- Afficher le formulaire de commentaire seulement si l’utilisateur est connecté.

## 7. Récapitulatif du flux utilisateur

1. L’utilisateur se connecte et reçoit un token JWT.
2. Le front récupère la liste des dossiers.
3. L’utilisateur ouvre un dossier.
4. Pour ajouter un commentaire, le front envoie le dossier `id_emp_hash`.
5. Le backend lie le commentaire au dossier et à l’auteur.
6. Le frontend affiche les commentaires du dossier.

## 8. Fichiers clés

- `config/settings.py`
- `dossiers/serializers.py`
- `comments/serializers.py`
- `comments/views.py`
- `dossiers/views.py`
- `.env` ou `.env.example`
