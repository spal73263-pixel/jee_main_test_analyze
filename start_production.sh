#!/bin/bash
set -e

echo "========================================================"
echo "  JEE Main Performance Analyzer (MERN) - Starting Server"
echo "========================================================"

echo "[1/3] Building Frontend Production Distribution..."
cd frontend
npm install
npm run build
cd ..

echo "[2/3] Installing Backend Dependencies..."
cd backend
npm install

echo "[3/3] Launching Full-Stack MERN Server on port ${PORT:-8000}..."
node server.js
