#!/bin/bash

# RiskGRC Quick Start Script
# Starts both backend and frontend

echo "============================================"
echo "🚀 RiskGRC Startup Script"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if both processes should run
if [ "$1" == "backend-only" ]; then
    echo "Starting Backend Only..."
    cd backend
    python manage.py runserver 0.0.0.0:8000
elif [ "$1" == "frontend-only" ]; then
    echo "Starting Frontend Only..."
    cd mobile/RiskGRC
    npx expo start --web
else
    echo "Starting Backend..."
    cd backend
    python manage.py runserver 0.0.0.0:8000 &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    sleep 2
    
    echo ""
    echo "Starting Frontend..."
    cd ../mobile/RiskGRC
    npx expo start --web &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend starting (PID: $FRONTEND_PID)${NC}"
    
    echo ""
    echo "============================================"
    echo -e "${GREEN}✓ RiskGRC is running!${NC}"
    echo "============================================"
    echo ""
    echo -e "${BLUE}Backend:${NC}  http://localhost:8000/api"
    echo -e "${BLUE}Frontend:${NC} http://localhost:19006"
    echo ""
    echo -e "${YELLOW}Login Credentials:${NC}"
    echo "  Email: demo@example.com"
    echo "  Password: Demo1234!"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    echo ""
    
    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
fi
