# Start Django Channels (Daphne) Server for WebSocket Support
# This script clears any conflicting environment variables and starts Daphne

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting Django Channels Server (Daphne)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# Clear any existing Django settings environment variable
$env:DJANGO_SETTINGS_MODULE = $null
Write-Host "[OK] Cleared DJANGO_SETTINGS_MODULE environment variable" -ForegroundColor Yellow

# Navigate to project directory
Set-Location "c:\dev-projects\crypto_bot_ui"

Write-Host ""
Write-Host "Starting Daphne on http://localhost:8001" -ForegroundColor Cyan
Write-Host "WebSocket endpoint: ws://localhost:8001/ws/dashboard/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Start Daphne
daphne -p 8001 crypto_bot_ui.asgi:application
