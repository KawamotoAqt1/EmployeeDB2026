@echo off
echo ========================================
echo   Employee DB Backend - Dev Server
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo Error: npm install failed
        pause
        exit /b 1
    )
)

echo [2/3] Generating Prisma client...
call npm run prisma:generate
if errorlevel 1 (
    echo Error: Prisma generate failed
    pause
    exit /b 1
)

echo [3/3] Starting dev server...
echo.
echo Server URL: http://localhost:3001
echo Press Ctrl+C to stop
echo ========================================
echo.

call npm run dev
