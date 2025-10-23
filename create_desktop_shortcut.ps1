# Create Desktop Shortcut for Crypto Trading Bot
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Creating Desktop Shortcut" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Start Crypto Bot.lnk"
$targetPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$scriptPath = "c:\dev-projects\crypto_bot_ui\START_ALL_ENHANCED.ps1"

# Create shortcut
$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = "-ExecutionPolicy Bypass -NoProfile -File `"$scriptPath`""
$shortcut.WorkingDirectory = "c:\dev-projects\crypto_bot_ui"
$shortcut.Description = "Start Crypto Trading Bot - All Services"
$shortcut.IconLocation = "powershell.exe,0"
$shortcut.WindowStyle = 1  # Normal window
$shortcut.Save()

Write-Host "[OK] Desktop shortcut created!" -ForegroundColor Green
Write-Host ""
Write-Host "Shortcut Location: $shortcutPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Double-click 'Start Crypto Bot' on your desktop to:" -ForegroundColor Yellow
Write-Host "  1. Start Redis Server" -ForegroundColor White
Write-Host "  2. Start Bot API (Port 8002)" -ForegroundColor White
Write-Host "  3. Start Daphne Dashboard (Port 8001)" -ForegroundColor White
Write-Host "  4. Verify all services are running" -ForegroundColor White
Write-Host "  5. Show dashboard URL" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
