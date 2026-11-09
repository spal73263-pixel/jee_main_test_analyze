@echo off
echo ========================================================
echo   JEE Main Performance Analyzer - Starting Web Server
echo ========================================================

echo [1/3] Building Frontend Production Distribution...
cd frontend
call npm install
call npm run build
cd ..

echo [2/3] Installing Backend Stateless File-Parser Dependencies...
cd backend
call npm install

echo [3/3] Launching Server on http://localhost:8000 ...
node server.js

pause
