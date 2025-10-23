# Start Redis from Downloads folder
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting Redis Server" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

$env:DJANGO_SETTINGS_MODULE = $null

$redisPath = "C:\dev-projects\redis"

if (Test-Path "$redisPath\redis-server.exe") {
    Set-Location $redisPath
    
    Write-Host ""
    Write-Host "[OK] Found Redis at: $redisPath" -ForegroundColor Green
    Write-Host "[INFO] Starting Redis on port 6379..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[INFO] Keep this window open!" -ForegroundColor Cyan
    Write-Host "[INFO] Press Ctrl+C to stop Redis" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Start Redis with config if available, otherwise use defaults
    if (Test-Path ".\redis.windows.conf") {
        .\redis-server.exe redis.windows.conf
    } else {
        .\redis-server.exe
    }
} else {
    Write-Host "[ERROR] Redis not found at expected location" -ForegroundColor Red
    Write-Host "Expected: $redisPath\redis-server.exe" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
