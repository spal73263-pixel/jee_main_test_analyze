#!/bin/bash
set -e

echo "========================================================"
echo "  JEE Main Performance Analyzer - Starting Production"
echo "========================================================"

echo "[1/3] Building Frontend Production Distribution..."
cd frontend
npm install
npm run build
cd ..

echo "[2/3] Verifying Backend Dependencies & Seeding Database..."
cd backend
pip install -r requirements.txt
python seed_data.py

echo "[3/3] Launching Full-Stack Production Server on port ${PORT:-8000}..."
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
