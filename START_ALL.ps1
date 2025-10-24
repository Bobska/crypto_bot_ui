# Master Startup Script - Launches All Services in Separate Terminals
# This script starts Redis, Bot API, and Daphne in new PowerShell windows

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "CRYPTO TRADING BOT - MASTER STARTUP" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Clear the problematic environment variable
$env:DJANGO_SETTINGS_MODULE = $null

# Define script paths
$redisScript = "c:\dev-projects\crypto_bot_ui\start_redis.ps1"
$botApiScript = "c:\dev-projects\crypto-trading-bot\start_bot_api.ps1"
$daphneScript = "c:\dev-projects\crypto_bot_ui\start_daphne.ps1"

Write-Host "Starting services in new terminals..." -ForegroundColor Yellow
Write-Host ""

# Terminal 1: Start Redis
Write-Host "[1/3] Starting Redis Server..." -ForegroundColor Cyan
try {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $redisScript
    Write-Host "      [OK] Redis terminal launched" -ForegroundColor Green
    Start-Sleep -Seconds 3
} catch {
    Write-Host "      [WARNING] Could not start Redis: $_" -ForegroundColor Yellow
    Write-Host "      Continuing anyway..." -ForegroundColor Yellow
}

# Terminal 2: Start Bot API
Write-Host "[2/3] Starting Bot API Server..." -ForegroundColor Cyan
try {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $botApiScript
    Write-Host "      [OK] Bot API terminal launched" -ForegroundColor Green
    Start-Sleep -Seconds 3
} catch {
    Write-Host "      [ERROR] Failed to start Bot API: $_" -ForegroundColor Red
}

# Terminal 3: Start Daphne (Django Channels)
Write-Host "[3/3] Starting Daphne (Django Channels)..." -ForegroundColor Cyan
try {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $daphneScript
    Write-Host "      [OK] Daphne terminal launched" -ForegroundColor Green
    Start-Sleep -Seconds 3
} catch {
    Write-Host "      [ERROR] Failed to start Daphne: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "ALL SERVICES LAUNCHED!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "   Dashboard:  http://localhost:8001" -ForegroundColor Cyan
Write-Host "   Bot API:    http://localhost:8002" -ForegroundColor Cyan
Write-Host "   API Docs:   http://localhost:8002/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "WebSocket Endpoints:" -ForegroundColor Yellow
Write-Host "   Dashboard:  ws://localhost:8001/ws/dashboard/" -ForegroundColor Cyan
Write-Host "   Bot API:    ws://localhost:8002/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "Wait 10 seconds for all services to initialize..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening dashboard in browser..." -ForegroundColor Green
Start-Sleep -Seconds 10

# Open the dashboard in default browser
Start-Process "http://localhost:8001"

Write-Host ""
Write-Host "[OK] Dashboard opened in browser!" -ForegroundColor Green
Write-Host ""
Write-Host "To verify WebSocket connection:" -ForegroundColor Yellow
Write-Host "  1. Press F12 in browser" -ForegroundColor White
Write-Host "  2. Go to Console tab" -ForegroundColor White
Write-Host "  3. Look for: '[OK] WebSocket connected'" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "  Close each PowerShell terminal window" -ForegroundColor White
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
