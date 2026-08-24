@echo off
setlocal enableextensions enabledelayedexpansion

:: Navigate to script directory
cd /d "%~dp0"

echo ===================================
echo 1. Starting Docker Containers...
echo ===================================
docker compose up -d

if %ERRORLEVEL% neq 0 (
    echo Error: Failed to start Docker containers.
    exit /b %ERRORLEVEL%
)

echo.
echo Waiting 60 seconds for services to initialize...
timeout /t 60 /nobreak >nul

echo.
echo ===================================
echo 2. Sending GET API Request...
echo ===================================
echo Requesting http://localhost:8080/scrape_companies ...
echo.

:: Send GET API request using curl or PowerShell fallback
where curl >nul 2>nul
if %ERRORLEVEL% equ 0 (
    curl -X GET "http://localhost:8080/scrape_ats"
) else (
    powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8080/scrape_ats' -Method Get | ConvertTo-Json"
)

echo.
echo.
echo ===================================
echo Done!
echo ===================================
