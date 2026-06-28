#!/bin/bash
# Démarrer backend et frontend en parallèle

cd "$(dirname "$0")"

echo "🚀 Démarrage de Inspection Platform..."
echo ""
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   Docs:     http://localhost:8000/api/docs"
echo ""
echo "Tapez Ctrl+C pour arrêter les deux serveurs"
echo ""

# Démarrer backend en arrière-plan
bash start_backend.sh &
BACKEND_PID=$!

# Attendre un peu pour que le backend démarre
sleep 2

# Démarrer frontend
bash start_frontend.sh &
FRONTEND_PID=$!

# Attendre que l'un des deux s'arrête
wait $BACKEND_PID $FRONTEND_PID

# Nettoyer les processus restants
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
echo "✅ Inspection Platform arrêtée"
