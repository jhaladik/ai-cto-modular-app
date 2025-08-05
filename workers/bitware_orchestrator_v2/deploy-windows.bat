@echo off
echo =========================================
echo Orchestrator 2.0 Deployment Script (Windows)
echo =========================================

:: Set environment (default to staging)
set ENV=%1
if "%ENV%"=="" set ENV=staging

if "%ENV%"=="production" (
    echo WARNING: Deploying to PRODUCTION
    set /p confirmation="Are you sure? (yes/no): "
    if not "!confirmation!"=="yes" (
        echo Deployment cancelled
        exit /b 1
    )
    set ENV_FLAG=
    set ENV_NAME=production
) else (
    set ENV_FLAG=--env staging
    set ENV_NAME=staging
)

echo.
echo Deploying to: %ENV_NAME%
echo ================================

:: Step 1: Install dependencies
echo.
echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)
echo Dependencies installed successfully

:: Step 2: Build TypeScript
echo.
echo Step 2: Building TypeScript...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo TypeScript build failed
    exit /b 1
)
echo TypeScript build successful

:: Step 3: Create D1 database
echo.
echo Step 3: Setting up D1 database...
if "%ENV_NAME%"=="production" (
    set DB_NAME=orchestrator-v2-db
) else (
    set DB_NAME=orchestrator-v2-db-staging
)

:: Check if database exists (this will create it if it doesn't)
echo Creating/verifying database: %DB_NAME%
call wrangler d1 create %DB_NAME% 2>nul
echo Database ready

:: Step 4: Initialize database schema
echo.
echo Step 4: Initializing database schema...
echo Running orchestrator.sql...
call wrangler d1 execute %DB_NAME% --file=schema/orchestrator.sql %ENV_FLAG%
echo Running resources.sql...
call wrangler d1 execute %DB_NAME% --file=schema/resources.sql %ENV_FLAG%
echo Running execution.sql...
call wrangler d1 execute %DB_NAME% --file=schema/execution.sql %ENV_FLAG%
echo Schema initialized

:: Step 5: Seed initial data
echo.
echo Step 5: Seeding initial data...
call wrangler d1 execute %DB_NAME% --file=schema/seed.sql %ENV_FLAG%
echo Initial data seeded

:: Step 6: Deploy the worker
echo.
echo Step 6: Deploying Orchestrator 2.0...
call wrangler deploy %ENV_FLAG%
if %errorlevel% neq 0 (
    echo Deployment failed
    exit /b 1
)
echo Orchestrator 2.0 deployed successfully!

:: Step 7: Get worker URL
if "%ENV_NAME%"=="production" (
    set WORKER_URL=https://bitware-orchestrator-v2.workers.dev
) else (
    set WORKER_URL=https://bitware-orchestrator-v2-staging.workers.dev
)

echo.
echo =========================================
echo Deployment Complete!
echo =========================================
echo.
echo Worker URL: %WORKER_URL%
echo Environment: %ENV_NAME%
echo.
echo To test the deployment, run: test-windows.bat
echo To check logs, run: wrangler tail %ENV_FLAG%
echo.
pause