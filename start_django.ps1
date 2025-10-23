# Start Regular Django Server (Without WebSocket)
# Use this if you want to run without Redis/WebSocket features

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "🚀 Starting Django Development Server" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Clear any existing Django settings environment variable
$env:DJANGO_SETTINGS_MODULE = $null
Write-Host "✅ Cleared DJANGO_SETTINGS_MODULE environment variable" -ForegroundColor Yellow

# Navigate to project directory
Set-Location "c:\dev-projects\crypto_bot_ui"

Write-Host ""
Write-Host "⚠️  Note: This runs WITHOUT WebSocket support" -ForegroundColor Red
Write-Host "   - No real-time updates" -ForegroundColor Yellow
Write-Host "   - Page will auto-refresh every 30 seconds" -ForegroundColor Yellow
Write-Host ""
Write-Host "To use WebSocket features, use start_daphne.ps1 instead" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server starting on http://localhost:8001" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Start Django
python manage.py runserver 8001
