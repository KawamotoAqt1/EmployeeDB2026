@echo off
echo ========================================
echo   Employee Import from Excel
echo ========================================
echo.

cd /d "%~dp0"

echo Checking dependencies...
if not exist "node_modules" (
    echo node_modules not found. Running npm install...
    call npm install
)

echo.
echo Running import script...
echo.

npx ts-node prisma/import-employees.ts

echo.
echo ========================================
echo   Import Complete
echo ========================================
pause
