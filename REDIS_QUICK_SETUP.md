# QUICK FIX - Start Without Redis First!

You can test the dashboard RIGHT NOW without Redis. The real-time features won't work yet, but everything else will.

## Start Services Manually (Without Redis)

### Terminal 1 - Bot API
```powershell
cd c:\dev-projects\crypto-trading-bot
.\start_bot_api.ps1
```

### Terminal 2 - Daphne
```powershell
cd c:\dev-projects\crypto_bot_ui
.\start_daphne.ps1
```

### Open Browser
http://localhost:8001

---

## Then Install Redis (Choose ONE method)

### METHOD 1: Memurai (Easiest - Recommended)
1. Download: https://www.memurai.com/get-memurai
2. Install (runs as Windows service)
3. Done! Redis is now running automatically

### METHOD 2: Download Redis ZIP
1. Go to: https://github.com/tporadowski/redis/releases
2. Download: Redis-x64-5.0.14.1.zip
3. Extract to: `C:\Users\<YourUsername>\Downloads\Redis-x64-5.0.14.1`
4. Run: `.\start_redis_memurai.ps1` (it will find it)

### METHOD 3: Docker
```powershell
docker run -d -p 6379:6379 --name redis redis
```

---

## After Redis is Running

Just **refresh the dashboard** page (F5) and you'll see:
- "Connected" indicator turns green
- Real-time updates start working
- WebSocket connection active

---

## Current Status

Without Redis:
- ✅ Dashboard works
- ✅ Shows data
- ✅ All pages accessible
- ❌ No real-time updates (page refreshes every 30 seconds)

With Redis:
- ✅ Everything above PLUS
- ✅ Real-time WebSocket updates
- ✅ Instant notifications
- ✅ Live price updates
- ✅ No page refresh needed

**Redis is optional - dashboard works fine without it!**
