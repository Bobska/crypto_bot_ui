# Quick Start Guide - Crypto Trading Bot

## Desktop Shortcut (Easiest Way!)

**Double-click "Start Crypto Bot" on your desktop** - that's it! 

The shortcut will:
- ✅ Start Redis Server (Port 6379)
- ✅ Start Bot API (Port 8002)  
- ✅ Start Daphne Dashboard (Port 8001)
- ✅ Verify all services are running
- ✅ Show you the dashboard URL

## What You'll See

Three terminal windows will open showing live logs:
1. **Redis** - Message broker for real-time updates
2. **Bot API** - Trading bot backend
3. **Daphne** - Django dashboard server

A fourth window shows the startup status and verification.

## Access the Dashboard

Open your browser to: **http://localhost:8001**

You should see:
- ✅ Green "Connected" indicator in top-right
- ✅ Real-time price updates (flash green/red)
- ✅ Toast notifications for trades
- ✅ No page refreshes needed!

## Troubleshooting

### If services don't start:

**Check browser console (F12):**
- Should see: `[OK] WebSocket connected`
- No 404 errors for JavaScript files

**Manually restart:**
```powershell
cd c:\dev-projects\crypto_bot_ui
.\START_ALL_ENHANCED.ps1
```

**Check service status:**
```powershell
.\check_services.ps1
```

### If you see JavaScript errors:

Run collectstatic again:
```powershell
cd c:\dev-projects\crypto_bot_ui
python manage.py collectstatic --noinput
```

## Redis Location

Redis is permanently installed at: `C:\dev-projects\redis`

This location is safe from accidental deletion and doesn't require admin permissions.

## Stopping Services

Press **Ctrl+C** in each terminal window to stop the services gracefully.

## File Locations

- **Redis**: `c:\dev-projects\redis\`
- **Bot API**: `c:\dev-projects\crypto-trading-bot\`
- **Dashboard UI**: `c:\dev-projects\crypto_bot_ui\`
- **Startup Scripts**: `c:\dev-projects\crypto_bot_ui\*.ps1`

## What's Running?

| Service | Port | Purpose |
|---------|------|---------|
| Redis | 6379 | Message broker for real-time WebSocket updates |
| Bot API | 8002 | Trading bot backend & WebSocket endpoint |
| Daphne | 8001 | Django dashboard with WebSocket support |

## Features

✅ **Real-time updates** - No page refresh needed  
✅ **WebSocket connection** - Instant data push from bot  
✅ **Toast notifications** - Visual alerts for trades & events  
✅ **Connection status** - Know when you're connected  
✅ **Visual feedback** - Price changes flash green/red  

## Next Steps

1. Configure your trading strategy in the dashboard
2. Monitor real-time price feeds
3. Watch for trade notifications
4. Check bot status without refreshing

---

**Need help?** Check the terminal windows for error messages or review the README files in each project folder.
