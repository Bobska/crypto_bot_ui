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

# Start Redis
Write-Host "[1/3] Starting Redis Server..." -ForegroundColor Yellow
$redisScript = Join-Path $PSScriptRoot "start_redis_direct.ps1"
if (Test-Path $redisScript) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $redisScript
    Write-Host "      [OK] Redis terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] Redis script not found: $redisScript" -ForegroundColor Red
}
Start-Sleep -Seconds 3

# Start Bot API
Write-Host "[2/3] Starting Bot API (Port 8002)..." -ForegroundColor Yellow
$botApiScript = "c:\dev-projects\crypto-trading-bot\start_bot_api.ps1"
if (Test-Path $botApiScript) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $botApiScript
    Write-Host "      [OK] Bot API terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] Bot API script not found: $botApiScript" -ForegroundColor Red
}
Start-Sleep -Seconds 3

# Start Daphne
Write-Host "[3/3] Starting Daphne (Port 8001)..." -ForegroundColor Yellow
$daphneScript = Join-Path $PSScriptRoot "start_daphne.ps1"
if (Test-Path $daphneScript) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", $daphneScript
    Write-Host "      [OK] Daphne terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] Daphne script not found: $daphneScript" -ForegroundColor Red
}

Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

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
