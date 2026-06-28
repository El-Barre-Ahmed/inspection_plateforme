#!/bin/bash
# Démarrer le backend Django

cd "$(dirname "$0")"

# Activer venv si disponible
if [ -d "venv" ]; then
    source venv/bin/activate
fi

echo "🚀 Démarrage du backend Django..."
echo "   URL: http://localhost:8000"
echo "   Docs: http://localhost:8000/api/docs"
echo ""

python manage.py runserver
