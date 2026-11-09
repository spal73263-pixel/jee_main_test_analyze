#!/bin/bash
set -e

echo "========================================================"
echo "  JEE Main Performance Analyzer - Starting Web Server"
echo "========================================================"

echo "[1/3] Building Frontend Production Distribution..."
cd frontend
npm install
npm run build
cd ..

echo "[2/3] Installing Backend Stateless File-Parser Dependencies..."
cd backend
npm install

echo "[3/3] Launching Server on port ${PORT:-8000}..."
node server.js
