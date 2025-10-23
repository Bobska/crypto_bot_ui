# Check Services Status
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Checking Service Status" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Redis (port 6379)
Write-Host "Checking Redis (port 6379)..." -ForegroundColor Yellow
try {
    $redis = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($redis.TcpTestSucceeded) {
        Write-Host "[OK] Redis is running" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Redis is NOT running" -ForegroundColor Yellow
        Write-Host "         Dashboard will work but without real-time updates" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Redis is NOT running" -ForegroundColor Yellow
}

# Check Bot API (port 8002)
Write-Host "Checking Bot API (port 8002)..." -ForegroundColor Yellow
try {
    $botapi = Test-NetConnection -ComputerName localhost -Port 8002 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($botapi.TcpTestSucceeded) {
        Write-Host "[OK] Bot API is running" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Bot API is NOT running" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Bot API is NOT running" -ForegroundColor Red
}

# Check Daphne (port 8001)
Write-Host "Checking Daphne (port 8001)..." -ForegroundColor Yellow
try {
    $daphne = Test-NetConnection -ComputerName localhost -Port 8001 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($daphne.TcpTestSucceeded) {
        Write-Host "[OK] Daphne is running" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Daphne is NOT running" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Daphne is NOT running" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Dashboard URL: http://localhost:8001" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
