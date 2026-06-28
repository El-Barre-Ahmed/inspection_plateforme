# 📑 Index - Inspection Platform

**Navigation rapide pour naviguer dans le projet**

---

## 📖 Documentation (À lire en priorité)

| Fichier | Durée | Contenu |
|---------|-------|---------|
| [QUICK_START.md](QUICK_START.md) | ⏱️ 5 min | Démarrage en 30 secondes |
| [README.md](README.md) | ⏱️ 10 min | Vue d'ensemble complète |
| [STRUCTURE.md](STRUCTURE.md) | ⏱️ 15 min | Architecture détaillée |
| [FINAL_CHECKLIST.md](FINAL_CHECKLIST.md) | ⏱️ 5 min | Vérification - tout fonctionne ✅ |
| [RESTRUCTURING_SUMMARY.md](RESTRUCTURING_SUMMARY.md) | ⏱️ 10 min | Changements apportés |
| [DEPLOYMENT.md](DEPLOYMENT.md) | ⏱️ 15 min | Guide de déploiement production |
| [workflow.md](workflow.md) | ⏱️ 5 min | Workflow métier |

---

## 🚀 Scripts de démarrage

| Script | Effet |
|--------|--------|
| [setup.sh](setup.sh) | 1️⃣ Installation initiale (pip + npm + migrations) |
| [start_all.sh](start_all.sh) | 2️⃣ Démarrer backend + frontend ensemble |
| [start_backend.sh](start_backend.sh) | Backend seul (Django sur 8000) |
| [start_frontend.sh](start_frontend.sh) | Frontend seul (React sur 5173) |

**Utilisation**:
```bash
# 1️⃣ Première fois
bash setup.sh

# 2️⃣ Chaque jour de dev
bash start_all.sh
```

---

## 📁 Backend Django (`/backend`)

### Configuration
- [config/settings.py](backend/config/settings.py) - Paramètres Django centraux
- [config/urls.py](backend/config/urls.py) - Routes API globales
- [config/wsgi.py](backend/config/wsgi.py) - Gunicorn entry point
- [.env.example](.env.example) - Modèle variables d'environnement

### Authentification
- [users/views.py](backend/users/views.py) - JWT login/refresh
- [users/serializers.py](backend/users/serializers.py) - Token serialization
- [users/models.py](backend/users/models.py) - UserProfile avec rôles

### Core Métier
- [dossiers/models.py](backend/dossiers/models.py) - Modèle Dossier (cœur)
- [dossiers/views.py](backend/dossiers/views.py) - DossierViewSet avec RBAC
- [dossiers/filters.py](backend/dossiers/filters.py) - Filtres avancés
- [dossiers/serializers.py](backend/dossiers/serializers.py) - API serialization
- [dossiers/permissions.py](backend/dossiers/permissions.py) - Permissions RBAC

### Features
- [comments/views.py](backend/comments/views.py) - Commentaires + Notifications
- [comments/models.py](backend/comments/models.py) - Types: OBSERVATION, ALERTE, DECISION
- [workflow/services.py](backend/workflow/services.py) - WorkflowService (transitions)
- [analytics/views.py](backend/analytics/views.py) - Dashboard KPIs

### Data & ETL
- [etl/importers.py](backend/etl/importers.py) - Logique d'import Excel
- [etl/management/commands/import_dossiers.py](backend/etl/management/commands/import_dossiers.py) - Commande import
- [data/cnss_hybrid.xlsx](backend/data/cnss_hybrid.xlsx) - Fichier source données

### Documentation interne
- [backend/docs/question_possible.md](backend/docs/question_possible.md) - FAQ 50+ questions réponses

---

## 💻 Frontend React (`/frontend`)

### Configuration
- [frontend/vite.config.ts](frontend/vite.config.ts) - Config Vite (build tool)
- [frontend/tsconfig.json](frontend/tsconfig.json) - Config TypeScript
- [frontend/tailwind.config.js](frontend/tailwind.config.js) - Config Tailwind CSS
- [frontend/package.json](frontend/package.json) - Dépendances npm

### Application Root
- [frontend/src/App.tsx](frontend/src/App.tsx) - Routage + AuthContext
- [frontend/src/main.tsx](frontend/src/main.tsx) - Point d'entrée
- [frontend/src/index.css](frontend/src/index.css) - Styles globaux

### State & API
- [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx) - État d'authentification
- [frontend/src/api/api.ts](frontend/src/api/api.ts) - Client HTTP avec JWT + auto-refresh
- [frontend/src/types.ts](frontend/src/types.ts) - Types TypeScript globaux

### Pages
- [frontend/src/pages/LoginPage.tsx](frontend/src/pages/LoginPage.tsx) - Login
- [frontend/src/pages/DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx) - Dashboard (DIRECTEUR/INSPECTEUR)
- [frontend/src/pages/DossiersPage.tsx](frontend/src/pages/DossiersPage.tsx) - Liste filtrée
- [frontend/src/pages/DossierDetailPage.tsx](frontend/src/pages/DossierDetailPage.tsx) - Détail + Actions

### Composants réutilisables
- [frontend/src/components/Header.tsx](frontend/src/components/Header.tsx) - Navigation
- [frontend/src/components/Footer.tsx](frontend/src/components/Footer.tsx) - Pied de page
- [frontend/src/components/ProtectedRoute.tsx](frontend/src/components/ProtectedRoute.tsx) - Route authentifiée
- [frontend/src/components/PrivateRoute.tsx](frontend/src/components/PrivateRoute.tsx) - Route privée par rôle

---

## 🔧 Fichiers de Configuration

| Fichier | Rôle |
|---------|------|
| [.env](.env) | Variables d'env (local, ignoré git) |
| [.env.example](.env.example) | Modèle .env (tracké git) |
| [.gitignore](.gitignore) | Fichiers ignorés git |
| [manage.py](manage.py) | Django wrapper (racine) |
| [backend/gunicorn.conf.py](backend/gunicorn.conf.py) | Config Gunicorn (production) |
| [backend/nginx.conf](backend/nginx.conf) | Config Nginx (reverse proxy prod) |
| [backend/deploy.sh](backend/deploy.sh) | Script déploiement production |

---

## 📊 Statistiques Projet

```
Structure:
├── Backend Django: 145 fichiers
├── Frontend React: 3825 fichiers (includes build)
├── Documentation: 7 fichiers .md
├── Scripts: 4 fichiers .sh
└── Config: 5 fichiers

Database:
├── Migrations: 14 appliquées ✅
├── Models: 8 apps
└── Tables: ~25 tables

Endpoints API:
├── Auth: 2 endpoints
├── Dossiers: 6 endpoints
├── Comments: 3 endpoints
└── Analytics: 3 endpoints
```

---

## 🎯 Workflows courants

### 🆕 Nouveau développeur
1. Lire: [QUICK_START.md](QUICK_START.md) (5 min)
2. Exécuter: `bash setup.sh` (5 min)
3. Lancer: `bash start_all.sh` (2 min)
4. Tester: `http://localhost:5173` ✅

### 🐛 Debugger un problème
1. Consulter: [FINAL_CHECKLIST.md](FINAL_CHECKLIST.md) - Vérifications
2. Lire: [STRUCTURE.md](STRUCTURE.md) - Architecture
3. Chercher: [backend/docs/question_possible.md](backend/docs/question_possible.md) - FAQ

### 🚀 Déployer en prod
1. Lire: [DEPLOYMENT.md](DEPLOYMENT.md)
2. Modifier: [.env.example](.env.example) pour production
3. Exécuter: [backend/deploy.sh](backend/deploy.sh)

### 📝 Ajouter une feature
1. **Backend**:
   - Créer model dans [backend/dossiers/models.py](backend/dossiers/models.py)
   - Créer serializer dans [backend/dossiers/serializers.py](backend/dossiers/serializers.py)
   - Créer viewset dans [backend/dossiers/views.py](backend/dossiers/views.py)
   - Créer migration: `python manage.py makemigrations`
2. **Frontend**:
   - Créer composant dans [frontend/src/components/](frontend/src/components/)
   - Utiliser API dans [frontend/src/api/api.ts](frontend/src/api/api.ts)
   - Ajouter route dans [frontend/src/App.tsx](frontend/src/App.tsx)

---

## 🔗 Liens rapides

### Accès local (en dev)
- 🌐 Frontend: http://localhost:5173
- 📡 API: http://localhost:8000/api
- 📚 Swagger: http://localhost:8000/api/docs
- 🔧 Admin Django: http://localhost:8000/admin

### Ressources externes
- [Django Docs](https://docs.djangoproject.com/)
- [DRF Docs](https://www.django-rest-framework.org/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## ✅ Vérification rapide

```bash
# Vérifier que tout est OK
cd /home/barre/projects/inspection_platform

# Check Django
source venv/bin/activate
python manage.py check
# → "System check identified no issues (0 silenced)"

# Check Frontend
cd frontend
npm run build
# → "✓ built in X.XXs"

# Tout fonctionne ? ✅
```

---

## 📞 Besoin d'aide?

| Question | Voir |
|----------|------|
| "Comment démarrer?" | [QUICK_START.md](QUICK_START.md) |
| "Quelle est l'architecture?" | [STRUCTURE.md](STRUCTURE.md) |
| "Où est le code X?" | Ce fichier (INDEX.md) |
| "Comment déployer?" | [DEPLOYMENT.md](DEPLOYMENT.md) |
| "C'est quoi ce changement?" | [RESTRUCTURING_SUMMARY.md](RESTRUCTURING_SUMMARY.md) |
| "Comment vérifier?" | [FINAL_CHECKLIST.md](FINAL_CHECKLIST.md) |
| "J'ai une question générale" | [backend/docs/question_possible.md](backend/docs/question_possible.md) |

---

**Document**: INDEX.md  
**Statut**: ✅ READY  
**Mise à jour**: Juin 2026  
**Version**: 2.0
