# Redis Installation and Startup Script for Windows
# Downloads and runs Redis for Windows

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Redis Setup for Windows" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan

$redisDir = "C:\redis"
$redisZip = "C:\redis.zip"
$redisUrl = "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip"

# Check if Redis is already installed
if (Test-Path "$redisDir\redis-server.exe") {
    Write-Host "[OK] Redis already installed at $redisDir" -ForegroundColor Green
} else {
    Write-Host "[INFO] Downloading Redis for Windows..." -ForegroundColor Yellow
    
    # Create directory
    New-Item -ItemType Directory -Force -Path $redisDir | Out-Null
    
    # Download Redis
    try {
        Invoke-WebRequest -Uri $redisUrl -OutFile $redisZip -UseBasicParsing
        Write-Host "[OK] Downloaded Redis" -ForegroundColor Green
        
        # Extract
        Write-Host "[INFO] Extracting Redis..." -ForegroundColor Yellow
        Expand-Archive -Path $redisZip -DestinationPath $redisDir -Force
        Remove-Item $redisZip
        Write-Host "[OK] Redis extracted to $redisDir" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Error downloading Redis: $_" -ForegroundColor Red
        Write-Host "" 
        Write-Host "Please download Redis manually from:" -ForegroundColor Yellow
        Write-Host "https://github.com/tporadowski/redis/releases" -ForegroundColor Cyan
        exit 1
    }
}

# Start Redis
Write-Host ""
Write-Host "[START] Starting Redis Server..." -ForegroundColor Green
Write-Host "Redis Directory: $redisDir" -ForegroundColor Cyan
Write-Host "Port: 6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop Redis server" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Change to Redis directory and start server
Set-Location $redisDir
.\redis-server.exe redis.windows.conf
