@echo off
title SG Map Dev Launcher
color 0A

echo ========================================
echo  SG Map Dev Launcher
echo ========================================
echo.

REM ── Elasticsearch + Kibana (uncomment when ready) ──────────────
REM echo [1/3] Starting Elasticsearch + Kibana...
REM cd /d "%~dp0infra\elastic"
REM docker compose up -d
REM echo       Elasticsearch: http://localhost:9200
REM echo       Kibana:        http://localhost:5601
REM echo.

REM ── API ────────────────────────────────────────────────────────
echo [1/2] Starting Node API...
cd /d "%~dp0apps\api"
@REM start "SG Map API" cmd /k "nvm use 20 && npm run dev"
start "SG Map API" cmd /k "npm run dev"
echo       API: http://localhost:3001
echo.

REM ── Frontend ───────────────────────────────────────────────────
echo [2/2] Starting Frontend...
cd /d "%~dp0apps\extjs-app"
start "SG Map Frontend" cmd /k "npx serve ."
echo       Frontend: http://localhost:3000
echo.

REM ── Open browser after short delay ─────────────────────────────
echo Waiting for servers to start...
timeout /t 3 /noisy >nul
start http://localhost:3000

echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause