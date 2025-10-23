# Start AI Bot Script
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting AI Bot" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

$env:DJANGO_SETTINGS_MODULE = $null

$aiBotPath = "c:\dev-projects\ai"
$startScript = Join-Path $aiBotPath "start_with_restart.bat"

if (Test-Path $startScript) {
    Set-Location $aiBotPath
    
    Write-Host ""
    Write-Host "[OK] Found AI Bot at: $aiBotPath" -ForegroundColor Green
    Write-Host "[INFO] Starting AI Bot..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[INFO] Keep this window open!" -ForegroundColor Cyan
    Write-Host "[INFO] Press Ctrl+C to stop AI Bot" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Run the batch file
    cmd /c "start_with_restart.bat"
} else {
    Write-Host "[ERROR] AI Bot start script not found" -ForegroundColor Red
    Write-Host "Expected: $startScript" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
