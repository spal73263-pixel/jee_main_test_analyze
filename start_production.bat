@echo off
echo ========================================================
echo   JEE Main Performance Analyzer (MERN) - Starting Server
echo ========================================================

echo [1/3] Building Frontend Production Distribution...
cd frontend
call npm install
call npm run build
cd ..

echo [2/3] Installing Backend Dependencies & Verifying Seed...
cd backend
call npm install

echo [3/3] Launching Full-Stack MERN Server on http://localhost:8000 ...
node server.js

pause
