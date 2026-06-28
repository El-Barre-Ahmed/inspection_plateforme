#!/bin/bash
# Configuration initiale du projet

cd "$(dirname "$0")"

echo "📦 Setup Inspection Platform..."
echo ""

# Créer et activer venv si nécessaire
if [ ! -d "venv" ]; then
    echo "Création de l'environnement virtuel..."
    python3 -m venv venv
fi

source venv/bin/activate

# Installer les dépendances Python
echo "Installation des dépendances Python..."
pip install -q -r backend/requirements.txt

# Appliquer les migrations
echo "Application des migrations..."
python manage.py migrate --quiet

# Créer un superuser (optionnel)
echo ""
echo "Créer un superutilisateur ? (y/n)"
read -r response
if [ "$response" = "y" ]; then
    python manage.py createsuperuser
fi

# Installer les dépendances frontend
echo "Installation des dépendances frontend..."
cd frontend && npm install --silent
cd ..

echo ""
echo "✅ Setup terminé !"
echo ""
echo "Pour démarrer :"
echo "  - Backend:  bash start_backend.sh"
echo "  - Frontend: bash start_frontend.sh"
echo "  - Les deux: bash start_all.sh"
echo ""
echo "Documentation : voir README.md"
