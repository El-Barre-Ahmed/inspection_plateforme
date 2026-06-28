# Inspection Platform - CNSS (dans Le Cadre Du Stage PFE) 

Plateforme de gestion des dossiers d'inspection pour la CNSS avec dashboard analytique, gestion des inspecteurs et suivi des anomalies.

## Structure du Projet

```
inspection_platform/
├── backend/                    # Django backend + configuration
│   ├── manage.py              # Django management (à lancer depuis /backend)
│   ├── requirements.txt        # Dépendances Python
│   ├── db.sqlite3             # Base de données (développement)
│   ├── config/                # Configuration Django
│   │   ├── settings.py        # Paramètres globaux
│   │   ├── urls.py            # Routes API
│   │   ├── wsgi.py            # Serveur WSGI
│   │   └── asgi.py            # Serveur ASGI
│   ├── users/                 # Gestion des utilisateurs + authentification JWT
│   ├── dossiers/              # Gestion des dossiers d'inspection
│   ├── comments/              # Commentaires et notifications
│   ├── workflow/              # Workflow et transitions de statut
│   ├── analytics/             # Dashboard et statistiques
│   ├── core/                  # Permissions et utilitaires globaux
│   ├── etl/                   # Import de données Excel
│   ├── docs/                  # Documentation du projet
│   ├── data/                  # Fichiers de données (Excel, etc.)
│   ├── gunicorn.conf.py       # Configuration Gunicorn (prod)
│   ├── nginx.conf             # Configuration Nginx (prod)
│   ├── deploy.sh              # Script de déploiement
│   └── .env                   # Variables d'environnement (local)
├── frontend/                   # React + TypeScript (Vite)
│   ├── src/
│   │   ├── App.tsx            # Route principale
│   │   ├── main.tsx           # Point d'entrée
│   │   ├── api/               # Clients API
│   │   ├── components/        # Composants réutilisables
│   │   ├── pages/             # Pages de l'application
│   │   ├── context/           # Contexte d'authentification
│   │   └── types.ts           # Types TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
├── venv/                       # Environnement virtuel Python
├── manage.py                   # Django wrapper pour démarrer depuis la racine
├── .gitignore                  # Fichiers ignorés
├── DEPLOYMENT.md               # Guide de déploiement
└── README.md                   # Ce fichier

```

## Démarrage Rapide

### Backend (Django)

```bash
# Activer l'environnement virtuel
source venv/bin/activate

# Installer les dépendances
pip install -r backend/requirements.txt

# Migration de la base de données
python manage.py migrate

# Démarrer le serveur (depuis la racine)
python manage.py runserver

# OU depuis /backend directement
cd backend
python manage.py runserver
```

Le backend est accessible à `http://localhost:8000/api/`

**Documentation Swagger**: `http://localhost:8000/api/docs/`

### Frontend (React)

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Build pour la production
npm run build
```

Le frontend est accessible à `http://localhost:5173/`

### ETL (Import de données)

```bash
# Depuis le backend (ou depuis la racine avec manage.py)
python manage.py import_dossiers
```

## Authentification

L'application utilise **JWT (JSON Web Tokens)** via `rest_framework_simplejwt`.

### Endpoint de login

```bash
POST /api/auth/token/
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

Réponse:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "username": "admin",
  "role": "ADMIN"
}
```

## Rôles et Permissions

- **INSPECTEUR**: Accès à ses dossiers assignés
- **DIRECTEUR**: Vue d'ensemble, assignation d'inspecteurs, tableau de bord analytique
- **ADMIN**: Accès complet

## API Endpoints Principaux

### Dossiers
- `GET /api/dossiers/` - Liste des dossiers (paginée, filtrée)
- `GET /api/dossiers/{id}/` - Détail d'un dossier
- `POST /api/dossiers/{id}/assigner-inspecteur/` - Assigner un inspecteur
- `POST /api/dossiers/{id}/changer-statut/` - Changer le statut
- `POST /api/dossiers/{id}/marquer-traite/` - Marquer comme traité
- `GET /api/dossiers/mes-stats/` - Statistiques de l'inspecteur

### Commentaires & Notifications
- `GET/POST /api/dossiers/{id_emp_hash}/comments/` - Commentaires d'un dossier
- `GET /api/notifications/` - Notifications de l'utilisateur
- `POST /api/notifications/{id}/read/` - Marquer une notification comme lue

### Dashboard (Direction)
- `GET /api/dashboard/` - KPIs globaux
- `GET /api/top-regions/` - Régions à risque
- `GET /api/performance-inspecteurs/` - Performance des inspecteurs

## Configuration

### Variables d'environnement (`.env`)

```
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3

# Email (optionnel)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@cnss.mr

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Technologies Utilisées

### Backend
- Django 5.2
- Django REST Framework
- Simple JWT (JSON Web Tokens)
- PostgreSQL / SQLite
- django-filters

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS

### Infrastructure
- Gunicorn (serveur WSGI)
- Nginx (reverse proxy)
- PostgreSQL (production)

## Documentation Complète

- [Guide de Déploiement](DEPLOYMENT.md)
- [Workflow de l'Application](workflow.md)
- [Questions Fréquentes](question_possible.md)

## Développement

### Linter & Format

```bash
# Backend
pip install black flake8
black backend/
flake8 backend/

# Frontend
npm run lint
npm run format
```

### Tests

```bash
# Backend
python manage.py test

# Frontend
npm run test
```

## Support

Pour toute question ou problème, consultez la documentation ou les README locaux dans chaque dossier.

---

**Dernière mise à jour**: Juin 2026
**Projet**: Inspection Platform - CNSS
**Structure réorganisée**: Backend/Frontend séparés
