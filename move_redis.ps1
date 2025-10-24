# Move Redis to permanent location in dev-projects
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Moving Redis to Dev Projects Folder" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Stop Redis if running
Write-Host "Stopping Redis..." -ForegroundColor Yellow
$redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
if ($redisProcess) {
    Stop-Process -Name "redis-server" -Force
    Start-Sleep -Seconds 2
    Write-Host "[OK] Redis stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] Redis was not running" -ForegroundColor Gray
}

# Check if source exists
$sourcePath = "C:\Users\Dmitry\Downloads\Redis-x64-5.0.14.1"
$destPath = "C:\dev-projects\redis"

if (-not (Test-Path $sourcePath)) {
    Write-Host "[ERROR] Redis not found at $sourcePath" -ForegroundColor Red
    exit 1
}

# Remove destination if it exists
if (Test-Path $destPath) {
    Write-Host "Removing old Redis installation..." -ForegroundColor Yellow
    Remove-Item -Path $destPath -Recurse -Force
}

# Move Redis
Write-Host "Moving Redis..." -ForegroundColor Yellow
try {
    Move-Item -Path $sourcePath -Destination $destPath -Force
    Write-Host "[OK] Redis moved to: $destPath" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to move Redis: $_" -ForegroundColor Red
    exit 1
}

# Verify
if (Test-Path "$destPath\redis-server.exe") {
    Write-Host "[OK] Redis successfully installed at $destPath" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Redis executable not found after move" -ForegroundColor Red
    exit 1
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Redis is now at: C:\dev-projects\redis" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
