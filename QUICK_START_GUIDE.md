# 🚀 Quick Start Guide - Real-Time WebSocket Trading Bot

## ✅ Prerequisites Installed
- Django Channels ✓
- channels-redis ✓
- daphne ✓

## ⚠️ IMPORTANT: Clear Environment Variable
Before running, make sure to clear the old Django settings in **every new PowerShell terminal**:
```powershell
$env:DJANGO_SETTINGS_MODULE = $null
```

## 📋 Step-by-Step Startup

### Step 1: Install & Start Redis

**Option A - Using WSL2 (Recommended for Windows):**
```powershell
# In WSL2 Ubuntu terminal
sudo apt-get update
sudo apt-get install redis-server
redis-server
```

**Option B - Windows Redis:**
Download from: https://github.com/microsoftarchive/redis/releases
Then run: `redis-server.exe`

**Test Redis is Running:**
```powershell
# In a new terminal
redis-cli ping
# Should respond with: PONG
```

---

### Step 2: Start Bot API (Terminal 1)

```powershell
cd c:\dev-projects\crypto-trading-bot
$env:DJANGO_SETTINGS_MODULE = $null
python bot_api.py
```

**Expected output:**
```
============================================================
🚀 Trading Bot API Server Starting
============================================================
Server: http://localhost:8002
Docs: http://localhost:8002/docs
============================================================
```

---

### Step 3: Start Django Channels Server (Terminal 2)

```powershell
cd c:\dev-projects\crypto_bot_ui
$env:DJANGO_SETTINGS_MODULE = $null
daphne -p 8001 crypto_bot_ui.asgi:application
```

**Expected output:**
```
2025-10-24 12:00:00 INFO     Starting server at tcp:port=8001:interface=127.0.0.1
2025-10-24 12:00:00 INFO     HTTP/2 support not enabled (install the http2 package)
2025-10-24 12:00:00 INFO     Configuring endpoint tcp:port=8001:interface=127.0.0.1
2025-10-24 12:00:00 INFO     Listening on TCP address 127.0.0.1:8001
```

---

### Step 4: Open Dashboard

**Navigate to:** http://localhost:8001

**You should see:**
- 🟢 Connected (green indicator in top-right)
- Real-time price updates
- Live bot status

---

### Step 5: (Optional) Start Trading Bot (Terminal 3)

```powershell
cd c:\dev-projects\crypto-trading-bot
$env:DJANGO_SETTINGS_MODULE = $null
python main.py
```

---

## 🧪 Testing WebSocket Features

1. **Check Connection Status:**
   - Should see "🟢 Connected" in top-right corner
   - If not, check browser console (F12)

2. **Test Real-Time Updates:**
   - Open browser console (F12)
   - Should see: "✅ WebSocket connected"
   - Should receive status updates automatically

3. **Test Trade Notifications:**
   - Execute a test trade (via bot or API)
   - Should see:
     - Toast notification pop up
     - Screen flash (green/blue)
     - Stats update instantly
     - No page refresh!

4. **Test Reconnection:**
   - Stop Daphne server
   - Should see "🔴 Reconnecting..."
   - Restart Daphne
   - Should auto-reconnect: "🟢 Connected"

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'famlyportal'"
**Solution:** Clear environment variable in your terminal:
```powershell
$env:DJANGO_SETTINGS_MODULE = $null
```

### Error: "Connection to Redis refused"
**Check:**
1. Is Redis running? `redis-cli ping`
2. Redis port: Should be 6379
3. Check settings.py: `'hosts': [('127.0.0.1', 6379)]`

### Error: "WebSocket failed to connect"
**Check:**
1. Is Daphne running on port 8001?
2. Browser console for detailed error
3. Check asgi.py configuration

### Error: "Import 'channels' could not be resolved"
**Solution:**
```powershell
pip install channels channels-redis daphne
```

### Dashboard shows "🔴 Disconnected"
**Check:**
1. Daphne server is running
2. Browser console for errors
3. WebSocket URL is correct: `ws://localhost:8001/ws/dashboard/`

---

## 📊 What You Should See

### Without WebSocket (Old):
- Page refreshes every 30 seconds
- No instant updates
- No notifications

### With WebSocket (New):
- ✅ Instant price updates (no refresh)
- ✅ Real-time status changes
- ✅ Toast notifications for trades
- ✅ Flash animations
- ✅ Live counter updates
- ✅ Connection status indicator
- ✅ Auto-reconnect on disconnect

---

## 🔧 Alternative: Run with Regular Django (Without WebSockets)

If you want to skip WebSocket for now:

```powershell
cd c:\dev-projects\crypto_bot_ui
$env:DJANGO_SETTINGS_MODULE = $null
python manage.py runserver 8001
```

**Note:** This will work but WITHOUT real-time features. Page will still auto-refresh every 30 seconds.

---

## 📝 Terminal Setup Summary

**3 Required Terminals:**

| Terminal | Command | Port |
|----------|---------|------|
| 1 | `redis-server` | 6379 |
| 2 | `python bot_api.py` | 8002 |
| 3 | `daphne -p 8001 crypto_bot_ui.asgi:application` | 8001 |

**Optional 4th Terminal:**
| Terminal | Command | Purpose |
|----------|---------|---------|
| 4 | `python main.py` | Run actual trading bot |

---

## ✨ Features Enabled

- [x] Real-time WebSocket connection
- [x] Instant price updates
- [x] Trade notifications (toast popups)
- [x] Flash animations
- [x] Live stats updates
- [x] Connection status indicator
- [x] Auto-reconnect (5 attempts)
- [x] No page refresh needed

---

**Need Help?** Check browser console (F12) for detailed error messages.
