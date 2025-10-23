# Alternative Redis Startup - Uses Memurai (Redis-compatible for Windows)
# Or tries to find existing Redis installation

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Redis Server Startup" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# Clear environment variable
$env:DJANGO_SETTINGS_MODULE = $null

# Try common Redis installation locations
$possiblePaths = @(
    "C:\Program Files\Redis\redis-server.exe",
    "C:\redis\redis-server.exe",
    "$env:USERPROFILE\Downloads\Redis-x64-5.0.14.1\redis-server.exe",
    "$env:USERPROFILE\redis\redis-server.exe",
    "C:\Program Files\Memurai\memurai.exe"
)

$redisPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $redisPath = $path
        Write-Host "[OK] Found Redis at: $path" -ForegroundColor Green
        break
    }
}

if ($null -eq $redisPath) {
    Write-Host "[WARNING] Redis not found in common locations" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install Redis manually:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 1 - Memurai (Recommended for Windows):" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.memurai.com/get-memurai" -ForegroundColor White
    Write-Host "  2. Install and start Memurai service" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Redis for Windows:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://github.com/tporadowski/redis/releases" -ForegroundColor White
    Write-Host "  2. Extract to C:\redis or your Downloads folder" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3 - Docker:" -ForegroundColor Yellow
    Write-Host "  docker run -d -p 6379:6379 redis" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Start Redis
Write-Host ""
Write-Host "[START] Starting Redis Server..." -ForegroundColor Green
Write-Host "Redis Path: $redisPath" -ForegroundColor Cyan
Write-Host "Port: 6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop Redis server" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get the directory of the Redis executable
$redisDir = Split-Path -Parent $redisPath
Set-Location $redisDir

# Try to find config file
$configFile = Join-Path $redisDir "redis.windows.conf"
if (-not (Test-Path $configFile)) {
    $configFile = Join-Path $redisDir "redis.conf"
}

# Start Redis with or without config
if (Test-Path $configFile) {
    & $redisPath $configFile
} else {
    & $redisPath
}
