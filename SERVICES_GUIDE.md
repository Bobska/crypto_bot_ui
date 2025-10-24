# Trading Terminal - Service Requirements

## Required Services

### 1. **Bot API Server** (Port 8002)
```bash
cd c:\dev-projects\crypto-trading-bot
python bot_api.py
```

**Provides:**
- `/api/position/pnl` - Real-time position and P&L data
- `/api/grid/levels` - Grid trading buy/sell levels
- `/api/ai/advice` - AI trading advice (POST)
- `/api/candles/{symbol}/{timeframe}` - Historical OHLCV data
- `/api/manual-trade` - Manual trade execution (POST)
- `/api/orders/history` - Trade history with filters
- `/api/bot/mode` - Bot mode control (PUT)
- `ws://localhost:8002/ws` - WebSocket for real-time updates

**Status:** ✅ Running (check console output)

---

### 2. **Django UI Server** (Port 8000/8001)
```bash
cd c:\dev-projects\crypto_bot_ui
python manage.py runserver
```

**Provides:**
- Trading Terminal UI
- Dashboard views
- Order history page
- Static files (CSS, JS)

**Status:** ✅ Running

---

### 3. **Redis Server** (Port 6379)
```bash
redis-server
```

**Required for:**
- Django Channels WebSocket support
- Session management
- Caching

**Status:** ✅ Running (via START_ALL_ENHANCED.ps1)

---

### 4. **Daphne ASGI Server** (Port 8001)
```bash
cd c:\dev-projects\crypto_bot_ui
daphne -p 8001 crypto_bot_ui.asgi:application
```

**Required for:**
- WebSocket connections to Django
- Real-time updates from Django backend

**Status:** ✅ Running (via START_ALL_ENHANCED.ps1)

---

## Quick Start

### Option 1: Use Enhanced Startup Script
```powershell
cd c:\dev-projects\crypto_bot_ui
.\START_ALL_ENHANCED.ps1
```

This starts:
- ✅ Redis Server
- ✅ Django (port 8000)
- ✅ Daphne (port 8001)

**Then manually start:**
```powershell
cd c:\dev-projects\crypto-trading-bot
python bot_api.py
```

---

### Option 2: Manual Start (Recommended for Development)

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Django:**
```bash
cd c:\dev-projects\crypto_bot_ui
python manage.py runserver
```

**Terminal 3 - Daphne:**
```bash
cd c:\dev-projects\crypto_bot_ui
daphne -p 8001 crypto_bot_ui.asgi:application
```

**Terminal 4 - Bot API:**
```bash
cd c:\dev-projects\crypto-trading-bot
python bot_api.py
```

---

## Verification

### Check if services are running:

**1. Bot API (Port 8002):**
```
http://localhost:8002/
```
Should show API endpoints list

**2. Django UI (Port 8000):**
```
http://localhost:8000/
```
Should show dashboard

**3. Trading Terminal:**
```
http://localhost:8000/trading-terminal/
```
Should load with chart and all components

**4. WebSocket Connection:**
Open browser console on trading terminal:
- Should see: `✅ WebSocket connected`
- Should see: `🎉 Trading Terminal ready!`

---

## Console Output Guide

### ✅ Successful Initialization:
```
🚀 Initializing Trading Terminal...
✅ Chart initialized
✅ Position data loaded
✅ P&L Calculator initialized
✅ Manual Trading initialized
✅ AI Co-Pilot initialized
🔌 Connecting to WebSocket: ws://localhost:8002/ws
✅ WebSocket connected
✅ Event listeners registered
✅ Background tasks started
✅ Grid levels loaded
🎉 Trading Terminal ready! (1234ms)
```

### ⚠️ Common Warnings (OK to ignore):
```
⚠️ Using fallback position data
  → No active position, using defaults

⚠️ WebSocket timeout, continuing without real-time updates
  → Bot API not running on port 8002

P&L container not found, skipping initialization
  → Fixed in latest commit

AI advice request failed
  → AI service not configured (optional feature)
```

### ❌ Critical Errors:
```
404 on /api/position/pnl
  → Bot API not running on port 8002
  → Solution: Start bot_api.py

Chart initialization failed
  → LightweightCharts not loaded
  → Check CDN connection

WebSocket connection refused
  → Daphne not running on port 8001
  → Solution: Start Daphne server
```

---

## Port Summary

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Django | 8000 | HTTP | UI Server |
| Daphne | 8001 | HTTP/WS | Django WebSocket |
| Bot API | 8002 | HTTP/WS | Trading Bot API |
| Redis | 6379 | TCP | Caching/Channels |

---

## Troubleshooting

### Issue: "404 on /api/position/pnl"
**Solution:** Start Bot API server
```bash
cd c:\dev-projects\crypto-trading-bot
python bot_api.py
```

### Issue: "WebSocket connection failed"
**Solution:** Ensure Daphne is running
```bash
cd c:\dev-projects\crypto_bot_ui
daphne -p 8001 crypto_bot_ui.asgi:application
```

### Issue: "Chart not loading"
**Solution:** Check browser console for CDN errors
- Clear browser cache
- Check internet connection for CDN

### Issue: "AI advice failing"
**Solution:** This is optional - AI service requires configuration
- Set AI_ENABLED=True in config.py
- Configure AI_API_URL

---

## Next Steps

1. ✅ All services running
2. ✅ Terminal initializes successfully
3. 🔄 Test manual trading
4. 🔄 Test AI co-pilot
5. 🔄 Verify WebSocket updates
6. 🔄 Check order history page

---

## Development Tips

- **Hot reload:** Django auto-reloads on file changes
- **Console logs:** Keep browser console open during development
- **WebSocket status:** Check for green "RUNNING" badge in terminal header
- **API docs:** http://localhost:8002/docs (FastAPI Swagger)

---

Last Updated: 2025-10-24
