@echo off
echo ========================================
echo   Employee DB Backend - Database Setup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking dependencies...
if not exist "node_modules" (
    echo node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo Error: npm install failed
        pause
        exit /b 1
    )
)

echo [2/4] Generating Prisma client...
call npm run prisma:generate
if errorlevel 1 (
    echo Error: Prisma generate failed
    pause
    exit /b 1
)

echo [3/4] Running database migration...
call npm run prisma:migrate
if errorlevel 1 (
    echo Error: Migration failed
    pause
    exit /b 1
)

echo [4/4] Seeding database...
call npm run prisma:seed
if errorlevel 1 (
    echo Warning: Seed failed (data may already exist)
)

echo.
echo ========================================
echo   Setup Complete
echo ========================================
echo.
echo Run start-dev.bat to start the dev server
echo.
pause
