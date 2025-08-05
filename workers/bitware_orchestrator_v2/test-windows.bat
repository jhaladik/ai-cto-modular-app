@echo off
echo =========================================
echo Orchestrator 2.0 Test Suite (Windows)
echo =========================================

:: Configuration
set ENV=%1
if "%ENV%"=="prod" (
    set BASE_URL=https://bitware-orchestrator-v2.workers.dev
    echo Testing PRODUCTION environment
) else (
    set BASE_URL=http://localhost:8787
    echo Testing LOCAL environment
    echo Make sure to run: wrangler dev
)

:: Test counters
set /a TOTAL_TESTS=0
set /a PASSED_TESTS=0
set /a FAILED_TESTS=0

echo.
echo === Phase 1: Basic Health Checks ===
echo -------------------------------------

:: Test 1: Health Check
echo.
echo Test 1: Health Check
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/" > temp_response.txt
findstr /C:"healthy" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Health check passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Health check failed
    type temp_response.txt
    set /a FAILED_TESTS+=1
)

:: Test 2: Detailed Health
echo.
echo Test 2: Detailed Health
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/health" > temp_response.txt
findstr /C:"components" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Detailed health passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Detailed health failed
    set /a FAILED_TESTS+=1
)

:: Test 3: Help Documentation
echo.
echo Test 3: Help Documentation
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/help" > temp_response.txt
findstr /C:"orchestrator" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Help endpoint passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Help endpoint failed
    set /a FAILED_TESTS+=1
)

echo.
echo === Phase 2: Authentication Tests ===
echo -------------------------------------

:: Test 4: Get Workers (with auth)
echo.
echo Test 4: Get Workers List
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/workers" -H "Authorization: Bearer test-token" -H "X-Worker-ID: bitware_key_account_manager" > temp_response.txt
findstr /C:"workers" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Get workers passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Get workers failed
    set /a FAILED_TESTS+=1
)

:: Test 5: Unauthorized Access
echo.
echo Test 5: Unauthorized Access Check
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/workers" > temp_response.txt
findstr /C:"Unauthorized" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Auth enforcement working
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Should require authentication
    set /a FAILED_TESTS+=1
)

echo.
echo === Phase 3: Template Management ===
echo -------------------------------------

:: Test 6: Get Templates
echo.
echo Test 6: Get Templates
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/templates" -H "X-API-Key: test-key" > temp_response.txt
findstr /C:"templates" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Get templates passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Get templates failed
    set /a FAILED_TESTS+=1
)

echo.
echo === Phase 4: Resource Management ===
echo -------------------------------------

:: Test 7: Resource Status
echo.
echo Test 7: Resource Status
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/resources/status" -H "X-API-Key: test-key" > temp_response.txt
findstr /C:"pools" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Resource status passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Resource status failed
    set /a FAILED_TESTS+=1
)

:: Test 8: Resource Availability
echo.
echo Test 8: Resource Availability
set /a TOTAL_TESTS+=1
curl -s -X GET "%BASE_URL%/resources/availability" -H "X-API-Key: test-key" > temp_response.txt
findstr /C:"availability" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Resource availability passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Resource availability failed
    set /a FAILED_TESTS+=1
)

echo.
echo === Phase 5: Pipeline Operations ===
echo -------------------------------------

:: Test 9: Estimate Execution
echo.
echo Test 9: Estimate Execution Cost
set /a TOTAL_TESTS+=1
curl -s -X POST "%BASE_URL%/estimate" -H "Content-Type: application/json" -H "X-API-Key: test-key" -d "{\"template_name\":\"quick_research\",\"parameters\":{\"topic\":\"AI trends\"}}" > temp_response.txt
findstr /C:"estimated_cost_usd" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Estimate execution passed
    set /a PASSED_TESTS+=1
) else (
    echo [FAIL] Estimate execution failed
    type temp_response.txt
    set /a FAILED_TESTS+=1
)

:: Test 10: Execute Pipeline
echo.
echo Test 10: Execute Pipeline
set /a TOTAL_TESTS+=1
curl -s -X POST "%BASE_URL%/execute" -H "Content-Type: application/json" -H "X-API-Key: test-key" -d "{\"request_id\":\"test_123\",\"template_name\":\"quick_research\",\"parameters\":{\"topic\":\"Quantum computing\"},\"priority\":\"high\"}" > temp_response.txt
findstr /C:"execution_id" temp_response.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Execute pipeline passed
    set /a PASSED_TESTS+=1
    :: Extract execution ID for later tests
    for /f "tokens=4 delims=:," %%a in ('findstr /C:"execution_id" temp_response.txt') do set EXEC_ID=%%a
    set EXEC_ID=%EXEC_ID:"=%
    echo Execution ID: %EXEC_ID%
) else (
    echo [FAIL] Execute pipeline failed
    type temp_response.txt
    set /a FAILED_TESTS+=1
)

:: Clean up temp file
del temp_response.txt 2>nul

echo.
echo =========================================
echo Test Results Summary
echo =========================================
echo Total Tests: %TOTAL_TESTS%
echo Passed: %PASSED_TESTS%
echo Failed: %FAILED_TESTS%

:: Calculate success rate
set /a SUCCESS_RATE=%PASSED_TESTS%*100/%TOTAL_TESTS%
echo Success Rate: %SUCCESS_RATE%%%

echo.
if %SUCCESS_RATE% geq 80 (
    echo [SUCCESS] Orchestrator 2.0 is functioning well!
) else if %SUCCESS_RATE% geq 60 (
    echo [WARNING] Orchestrator 2.0 has some issues
) else (
    echo [ERROR] Orchestrator 2.0 needs attention
)

echo.
echo Note: Some tests may fail if:
echo 1. Workers are not deployed/running
echo 2. KAM service is not available  
echo 3. Database is not initialized
echo 4. Running against local dev without all services
echo.
pause