# Redis Setup Helper - Extracts and Starts Redis from Downloads
# This script finds your downloaded Redis ZIP and sets it up

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Redis Setup Helper" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Clear environment variable
$env:DJANGO_SETTINGS_MODULE = $null

# Look for Redis ZIP in Downloads
$downloadsPath = "$env:USERPROFILE\Downloads"
Write-Host "[INFO] Searching for Redis in Downloads folder..." -ForegroundColor Yellow

$redisZips = Get-ChildItem -Path $downloadsPath -Filter "Redis*.zip" -ErrorAction SilentlyContinue

if ($redisZips.Count -eq 0) {
    Write-Host "[ERROR] No Redis ZIP file found in Downloads" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download Redis from:" -ForegroundColor Yellow
    Write-Host "https://github.com/tporadowski/redis/releases" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Download: Redis-x64-5.0.14.1.zip" -ForegroundColor White
    Write-Host "Save to: $downloadsPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Use the first Redis ZIP found
$redisZip = $redisZips[0]
Write-Host "[OK] Found: $($redisZip.Name)" -ForegroundColor Green

# Extract to user's Downloads folder (no admin rights needed)
$extractPath = Join-Path $downloadsPath "Redis"
Write-Host "[INFO] Extracting to: $extractPath" -ForegroundColor Yellow

try {
    # Create directory if it doesn't exist
    if (-not (Test-Path $extractPath)) {
        New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
    }
    
    # Extract ZIP
    Expand-Archive -Path $redisZip.FullName -DestinationPath $extractPath -Force
    Write-Host "[OK] Extracted successfully" -ForegroundColor Green
    
    # Find redis-server.exe in the extracted folder
    $redisExe = Get-ChildItem -Path $extractPath -Filter "redis-server.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($null -eq $redisExe) {
        Write-Host "[ERROR] Could not find redis-server.exe in extracted files" -ForegroundColor Red
        Write-Host "Extracted to: $extractPath" -ForegroundColor Yellow
        Write-Host "Please check the folder manually" -ForegroundColor Yellow
        exit 1
    }
    
    $redisDir = $redisExe.DirectoryName
    Write-Host "[OK] Found redis-server.exe at: $redisDir" -ForegroundColor Green
    
} catch {
    Write-Host "[ERROR] Failed to extract: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual extraction:" -ForegroundColor Yellow
    Write-Host "1. Right-click on $($redisZip.Name)" -ForegroundColor White
    Write-Host "2. Select 'Extract All...'" -ForegroundColor White
    Write-Host "3. Extract to Downloads\Redis" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Change to Redis directory
Set-Location $redisDir

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[START] Starting Redis Server" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Redis Directory: $redisDir" -ForegroundColor Cyan
Write-Host "Port: 6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Redis is now running!" -ForegroundColor Green
Write-Host "[INFO] Keep this window open while using the dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop Redis" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if config file exists
$configFile = Join-Path $redisDir "redis.windows.conf"
if (-not (Test-Path $configFile)) {
    $configFile = Join-Path $redisDir "redis.conf"
}

# Start Redis
if (Test-Path $configFile) {
    Write-Host "[INFO] Starting with config file: $configFile" -ForegroundColor Cyan
    & ".\redis-server.exe" $configFile
} else {
    Write-Host "[INFO] Starting without config file (using defaults)" -ForegroundColor Cyan
    & ".\redis-server.exe"
}
