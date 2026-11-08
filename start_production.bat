@echo off
echo ========================================================
echo   JEE Main Performance Analyzer - Starting Production Server
echo ========================================================

echo [1/3] Building Frontend Production Distribution...
cd frontend
call npm install
call npm run build
cd ..

echo [2/3] Verifying Backend Dependencies and Seeding Data...
cd backend
python -m pip install -r requirements.txt
python seed_data.py

echo [3/3] Launching Full-Stack Production Server on http://localhost:8000 ...
python -m uvicorn main:app --host 0.0.0.0 --port 8000

pause
