# Quick Start - Inspection Platform

## ⚡ 30 secondes pour démarrer

### 1️⃣ Installation (première fois uniquement)

```bash
# À la racine du projet
bash setup.sh
```

Cela va :
- ✅ Créer l'environnement virtuel Python
- ✅ Installer toutes les dépendances backend et frontend
- ✅ Appliquer les migrations BD
- ✅ Créer un superuser (optionnel)

### 2️⃣ Démarrage local

**Option A - Les deux services en parallèle (recommandé)**
```bash
bash start_all.sh
```

**Option B - Séparément (pour le debug)**

Terminal 1 - Backend:
```bash
bash start_backend.sh
```

Terminal 2 - Frontend:
```bash
bash start_frontend.sh
```

### 3️⃣ Accès à l'application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Swagger Docs**: http://localhost:8000/api/docs
- **Admin Django**: http://localhost:8000/admin

### 4️⃣ Identifiants de test

- **Username**: `admin` (créé lors du setup)
- **Password**: Entrez lors du setup

## 🔑 Commandes utiles

```bash
# Depuis la racine avec venv activé:

# Backend
python manage.py runserver              # Démarrer le serveur
python manage.py makemigrations         # Créer migration
python manage.py migrate                # Appliquer migration
python manage.py createsuperuser        # Créer admin
python manage.py import_dossiers        # Importer données
python manage.py shell                  # Shell Python interactif
python manage.py test                   # Lancer tests

# Frontend
cd frontend
npm run dev                              # Démarrer dev
npm run build                            # Build prod
npm run preview                          # Prévisualiser build
npm run lint                             # Linter
```

## 📁 Structure (résumé)

```
inspection_platform/
├── backend/          # Django REST API
├── frontend/         # React + TypeScript
├── venv/             # Python env (JAMAIS supprimer)
└── manage.py         # Wrapper Django
```

**Docs détaillées**: Voir [STRUCTURE.md](STRUCTURE.md) et [README.md](README.md)

## 🐛 Troubleshooting

### ❌ "Command 'python' not found"
**Solution**: Activez venv : `source venv/bin/activate`

### ❌ "Module not found" en backend
**Solution**: Assurez-vous d'être dans `/backend` ou d'utiliser le wrapper `manage.py` à la racine

### ❌ "PORT 8000 already in use"
**Solution**: Changez le port : `python manage.py runserver 8001`

### ❌ "PORT 5173 already in use"
**Solution**: Vite changera automatiquement le port (5174, 5175, etc.)

### ❌ "CORS error" en frontend
**Solution**: Vérifiez `backend/config/settings.py` - CORS_ALLOWED_ORIGINS

### ❌ "npm: command not found"
**Solution**: Installez Node.js depuis https://nodejs.org

## 🔄 Flux d'authentification

1. Allez à http://localhost:5173
2. Login avec vos identifiants
3. Les tokens JWT sont stockés dans `localStorage`
4. Accédez à l'application selon votre rôle:
   - **INSPECTEUR**: Voir ses dossiers assignés
   - **DIRECTEUR**: Vue de bord + gestion des inspecteurs
   - **ADMIN**: Accès complet

## 📚 Documentation

- **[README.md](README.md)** - Vue d'ensemble projet
- **[STRUCTURE.md](STRUCTURE.md)** - Architecture détaillée
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guide production
- **[backend/docs/question_possible.md](backend/docs/question_possible.md)** - FAQ 50+ questions

## 💡 Tips

- **VS Code**: Installez les extensions:
  - `Python` (Microsoft)
  - `Pylance` (Microsoft)
  - `ES7+ React/Redux/React-Native snippets` (dsznajder)

- **Database**: 
  - Dev: SQLite (fichier `backend/db.sqlite3`)
  - Prod: PostgreSQL (voir `DEPLOYMENT.md`)

- **Hot reload**:
  - Backend: Gunicorn recharge automatiquement
  - Frontend: Vite recharge automatiquement les composants

## 🚀 Prêt à coder ?

```bash
# C'est parti !
bash start_all.sh
```

Vous avez besoin d'aide? Consultez la FAQ ou ouvrez une issue.

---

**Dernière mise à jour**: Juin 2026  
**Version**: 2.0  
**Statut**: ✅ Production-ready
