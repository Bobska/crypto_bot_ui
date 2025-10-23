# Enhanced START_ALL Script with Visual Feedback
# Launches all services in separate terminal windows

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   CRYPTO TRADING BOT - STARTING ALL SERVICES" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Stop any running services first
Write-Host "Checking for running services..." -ForegroundColor Yellow
$servicesToStop = @(
    @{Name="redis-server"; Display="Redis"},
    @{Name="python"; Display="Python (Bot API / Daphne)"},
    @{Name="daphne"; Display="Daphne"}
)

foreach ($service in $servicesToStop) {
    $processes = Get-Process -Name $service.Name -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "  [INFO] Stopping existing $($service.Display) processes..." -ForegroundColor Yellow
        Stop-Process -Name $service.Name -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

Write-Host ""
Write-Host "Starting services in separate terminals..." -ForegroundColor Cyan
Write-Host ""

# STARTUP ORDER:
# 1. Redis (dependency for Daphne's channels)
# 2. Bot API (independent service)
# 3. AI Bot (independent service)  
# 4. Daphne (depends on Redis)

# Start Redis
Write-Host "[1/4] Starting Redis Server..." -ForegroundColor Yellow
Write-Host "      Redis must start first (required by Daphne)" -ForegroundColor Gray
$redisScript = Join-Path $PSScriptRoot "start_redis_direct.ps1"
if (Test-Path $redisScript) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $redisScript
    Write-Host "      [OK] Redis terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] Redis script not found: $redisScript" -ForegroundColor Red
}
Write-Host "      Waiting for Redis to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 4

# Start Bot API
Write-Host "[2/4] Starting Bot API (Port 8002)..." -ForegroundColor Yellow
$botApiScript = "c:\dev-projects\crypto-trading-bot\start_bot_api.ps1"
if (Test-Path $botApiScript) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $botApiScript
    Write-Host "      [OK] Bot API terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] Bot API script not found: $botApiScript" -ForegroundColor Red
}
Start-Sleep -Seconds 2

# Start AI Bot
Write-Host "[3/4] Starting AI Bot..." -ForegroundColor Yellow
$aiBotScript = Join-Path $PSScriptRoot "start_ai_bot.ps1"
if (Test-Path $aiBotScript) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $aiBotScript
    Write-Host "      [OK] AI Bot terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [WARNING] AI Bot script not found (optional): $aiBotScript" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# Start Daphne (depends on Redis being ready)
Write-Host "[4/4] Starting Daphne (Port 8001)..." -ForegroundColor Yellow
Write-Host "      Daphne requires Redis for WebSocket channels" -ForegroundColor Gray
$daphneScript = Join-Path $PSScriptRoot "start_daphne.ps1"
if (Test-Path $daphneScript) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $daphneScript
    Write-Host "      [OK] Daphne terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] Daphne script not found: $daphneScript" -ForegroundColor Red
}
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Waiting for all services to fully initialize..." -ForegroundColor Yellow
Write-Host "(Redis, Bot API, AI Bot, Daphne)" -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   SERVICE STATUS CHECK" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check service status
$services = @(
    @{Name="Redis"; Port=6379},
    @{Name="Bot API"; Port=8002},
    @{Name="Daphne"; Port=8001}
)

$allRunning = $true
foreach ($service in $services) {
    Write-Host "Checking $($service.Name) (port $($service.Port))..." -NoNewline
    if (Test-Port -Port $service.Port) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [ERROR]" -ForegroundColor Red
        $allRunning = $false
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
if ($allRunning) {
    Write-Host "   ALL SERVICES RUNNING!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Dashboard: http://localhost:8001" -ForegroundColor Cyan
    Write-Host "   Bot API:   http://localhost:8002" -ForegroundColor Cyan
    Write-Host "   AI Bot:    Check terminal for status" -ForegroundColor Cyan
    Write-Host ""
    
    # Open browsers automatically
    Write-Host "   Opening browsers..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    # Open Crypto Bot Dashboard
    Start-Process "http://localhost:8001"
    Write-Host "   [OK] Crypto Bot Dashboard opened" -ForegroundColor Green
    
    # Check if AI bot is running and open its UI
    $aiBotRunning = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*ai*" }
    if ($aiBotRunning -or (Test-Path "c:\dev-projects\ai\start_with_restart.bat")) {
        Start-Sleep -Seconds 1
        # Assuming AI bot runs on a different port - adjust if needed
        Start-Process "http://localhost:7860"  # Common port for Gradio/Streamlit AI apps
        Write-Host "   [OK] AI Bot UI opened" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "   Press Ctrl+C in each terminal window to stop services" -ForegroundColor Yellow
} else {
    Write-Host "   SOME SERVICES FAILED TO START" -ForegroundColor Red
    Write-Host "   Check the terminal windows for error messages" -ForegroundColor Yellow
}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
