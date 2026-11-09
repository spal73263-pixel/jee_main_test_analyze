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

netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Server is already running on port 8000. Opening http://localhost:8000 ...
    start "" "http://localhost:8000"
    exit /b 0
)

echo Starting server and opening http://localhost:8000 in your browser...
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul && start http://localhost:8000"

cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server stopped or Python dependencies missing.
    echo Installing requirements and retrying...
    python -m pip install -r requirements.txt
    python -m uvicorn main:app --host 127.0.0.1 --port 8000
)
pause
