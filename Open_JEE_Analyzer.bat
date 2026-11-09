@echo off
title JEE Main & HSC Test Analyzer
cd /d "%~dp0"

if not exist "frontend\dist\index.html" (
    echo Building frontend for first-time launch...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

echo Starting server and opening http://localhost:8000 in your browser...
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
