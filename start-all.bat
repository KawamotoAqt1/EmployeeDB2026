@echo off
echo ========================================
echo   Employee DB - Full Stack Startup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting PostgreSQL (Docker)...
docker-compose up -d
if errorlevel 1 (
    echo Error: Docker Compose failed
    echo Make sure Docker Desktop is running
    pause
    exit /b 1
)

echo Waiting for PostgreSQL to be ready...
timeout /t 3 /nobreak > nul

echo [2/2] Starting Backend...
cd backend
call start-dev.bat
