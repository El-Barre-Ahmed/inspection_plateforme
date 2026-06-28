# Structure du Projet Inspection Platform

## Vue d'ensemble

Le projet Inspection Platform a été restructuré pour séparer clairement le **backend Django** (API REST) et le **frontend React** (interface utilisateur). Cette séparation facilite le développement, le déploiement et la maintenance.

## Architecture de dossiers

```
inspection_platform/
├── backend/                      # Backend Django (API REST)
│   ├── manage.py                # Django CLI (local au backend)
│   ├── requirements.txt          # Dépendances Python
│   ├── db.sqlite3               # BD SQLite (dev uniquement)
│   ├── gunicorn.conf.py         # Config Gunicorn (prod)
│   ├── nginx.conf               # Config Nginx (prod)
│   ├── deploy.sh                # Script de déploiement
│   │
│   ├── config/                  # Configuration Django
│   │   ├── __init__.py
│   │   ├── settings.py          # Paramètres Django
│   │   ├── urls.py              # Routage API
│   │   ├── wsgi.py              # Gunicorn entry point
│   │   └── asgi.py              # ASGI entry point
│   │
│   ├── users/                   # Authentification & utilisateurs
│   │   ├── __init__.py
│   │   ├── models.py            # UserProfile avec rôles
│   │   ├── views.py             # JWT auth (login/refresh)
│   │   ├── serializers.py       # Sérialisation JSON
│   │   ├── admin.py             # Admin Django
│   │   ├── urls.py              # Routes /api/auth/
│   │   └── migrations/
│   │
│   ├── dossiers/                # Gestion des dossiers
│   │   ├── __init__.py
│   │   ├── models.py            # Dossier + WF transitions
│   │   ├── views.py             # DossierViewSet (CRUD)
│   │   ├── serializers.py       # DossierSerializer, etc.
│   │   ├── filters.py           # Filtres avancés
│   │   ├── permissions.py       # Permissions RBAC
│   │   ├── admin.py
│   │   ├── urls.py              # Routes /api/dossiers/
│   │   ├── services.py          # Logique métier
│   │   └── migrations/
│   │
│   ├── comments/                # Commentaires & alertes
│   │   ├── __init__.py
│   │   ├── models.py            # Comment (OBSERVATION, ALERTE, DECISION)
│   │   ├── views.py             # CommentViewSet
│   │   ├── serializers.py
│   │   ├── admin.py
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── workflow/                # Workflow & transitions
│   │   ├── __init__.py
│   │   ├── models.py            # WorkflowEvent
│   │   ├── views.py
│   │   ├── services.py          # WorkflowService (transitions)
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── analytics/               # Dashboard & statistiques
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py             # DashboardView, TopRegionsView, etc.
│   │   └── urls.py
│   │
│   ├── core/                    # Utilitaires globaux
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── permissions.py       # Permissions générales
│   │   └── views.py
│   │
│   ├── etl/                     # ETL - Import de données
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── importers.py         # Logique d'import Excel
│   │   └── management/
│   │       └── commands/
│   │           └── import_dossiers.py
│   │
│   ├── data/                    # Fichiers de données
│   │   └── cnss_hybrid.xlsx
│   │
│   ├── docs/                    # Documentation interne
│   │   ├── question_possible.md # FAQ 50+ questions
│   │   └── ...
│   │
│   └── .env                     # Variables d'env (local uniquement)
│
├── frontend/                     # Frontend React (Vite + TS)
│   ├── package.json             # Dépendances npm
│   ├── vite.config.ts           # Config Vite
│   ├── tsconfig.json            # Config TypeScript
│   ├── tsconfig.node.json
│   ├── tailwind.config.js       # Config Tailwind CSS
│   ├── postcss.config.cjs       # Config PostCSS
│   │
│   ├── index.html               # HTML racine
│   ├── src/
│   │   ├── main.tsx             # Point d'entrée
│   │   ├── App.tsx              # Composant racine (routage)
│   │   ├── index.css            # Styles globaux
│   │   ├── types.ts             # Types TypeScript globaux
│   │   │
│   │   ├── api/
│   │   │   ├── api.ts           # Client API HTTP
│   │   │   └── types.ts         # Types d'API
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Contexte authentification
│   │   │
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── PrivateRoute.tsx
│   │   │   └── ... (autres composants)
│   │   │
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── DashboardPage.tsx      # Vue director
│   │       ├── DossiersPage.tsx       # Liste filtrée
│   │       └── DossierDetailPage.tsx  # Vue détail
│   │
│   ├── dist/                    # Build production (généré)
│   └── node_modules/            # Dépendances npm (ignoré git)
│
├── venv/                         # Environnement virtuel Python
│                                # (à la racine, JAMAIS à déplacer)
│
├── manage.py                     # Django wrapper (à la racine)
│                                # Permet: python manage.py ... (depuis racine)
│
├── .env                          # Variables d'environnement (ignoré git)
├── .env.example                  # Modèle .env
├── .gitignore                    # Fichiers ignorés git
├── setup.sh                      # Script d'installation initiale
├── start_backend.sh              # Démarrer Django
├── start_frontend.sh             # Démarrer React
├── start_all.sh                  # Démarrer les deux
├── README.md                     # Documentation principale
├── DEPLOYMENT.md                 # Guide de déploiement
└── STRUCTURE.md                  # Ce fichier
```

## Communication Backend ↔ Frontend

### Flux d'authentification

1. **Frontend (App.tsx)**: 
   - Utilisateur saisit login/mot de passe
   - POST `/api/auth/token/` 
   - Reçoit `access` + `refresh` + `username` + `role`
   - Stocke dans `localStorage`

2. **Backend (users/views.py)**:
   - Valide credentials
   - Génère JWT avec claims: `username`, `role`, `user_id`
   - MyTokenObtainPairView retourne tokens + metadata

3. **Frontend (api/api.ts)**:
   - Chaque requête inclut `Authorization: Bearer {access}`
   - Sur 401: appelle `/api/auth/token/refresh/`
   - Renouvelle access token, réessaye request

### Flux de données - Exemple: Vue Dossiers

```
Frontend (DossiersPage.tsx)
  ↓
  GET /api/dossiers/?statut=EN_COURS&inspecteur=5&page=1
  ↓
Backend (dossiers/views.py::DossierViewSet)
  ├─ Vérifie authorization (IsAuthenticated)
  ├─ Applique get_queryset() (filtre par rôle)
  ├─ Filtre params: DossierFilter
  ├─ Paginate: 20 par défaut
  └─ Retourne JSON sérialisé
  ↓
Frontend (state)
  └─ Affiche tableau, pagination, filtres
```

## Points clés de la structure

### ✅ Avantages de cette séparation

1. **Déploiement indépendant**
   - Backend: Gunicorn + Nginx
   - Frontend: CDN ou static files
   - Peuvent scaling séparément

2. **Développement parallèle**
   - Backend dev: `cd backend && python manage.py runserver`
   - Frontend dev: `cd frontend && npm run dev`
   - Chacun a son port, son env

3. **Maintenabilité**
   - Code organisé par domaine (users, dossiers, comments, etc.)
   - Chaque app Django est une feature complète
   - Frontend composants réutilisables

4. **Sécurité**
   - Backend API-only, pas de serveur template
   - CORS strictement contrôlé
   - JWT avec expiration
   - RBAC au niveau base de données (get_queryset)

### ⚠️ Points d'attention

1. **venv à la racine**
   - NE JAMAIS supprimer ou déplacer `/venv`
   - Très volumineux, spécifique à l'OS
   - Toujours dans `.gitignore`

2. **manage.py wrapper**
   - Wrapper à racine qui reroute vers `/backend`
   - Permet `python manage.py` depuis n'importe où
   - Les apps Django sont cherchées en `/backend`

3. **Variables d'env**
   - `backend/.env` chargé dans `settings.py` (django)
   - `frontend/.env` non utilisé (Vite compile en dur)
   - Toutes les deux dans `.gitignore`

4. **Dépendances**
   - Python: `backend/requirements.txt`
   - Node: `frontend/package.json`
   - Installation: `pip install -r backend/requirements.txt` et `npm install` (dans frontend)

## Workflows courants

### Installation initiale
```bash
bash setup.sh
```

### Développement
```bash
# Terminal 1
bash start_backend.sh

# Terminal 2
bash start_frontend.sh
```

### Production
```bash
cd backend
gunicorn config.wsgi:application --config gunicorn.conf.py
# + Nginx reverse proxy
```

### Migrations BD
```bash
python manage.py makemigrations
python manage.py migrate
```

### Import de données
```bash
python manage.py import_dossiers
```

## Fichiers importants à connaître

| Fichier | Rôle |
|---------|------|
| `backend/config/settings.py` | Configuration Django centrale |
| `backend/config/urls.py` | Routage API global |
| `frontend/src/App.tsx` | Routage et contexte global React |
| `frontend/src/api/api.ts` | Client HTTP avec JWT |
| `frontend/src/context/AuthContext.tsx` | État d'authentification |
| `backend/dossiers/views.py` | ViewSet dossiers (core) |
| `backend/users/views.py` | Authentification JWT |
| `backend/comments/views.py` | Commentaires et notifications |

---

**Structure établie**: Juin 2026  
**Version**: 2.0 (Backend/Frontend séparés)  
**Statut**: Production-ready
