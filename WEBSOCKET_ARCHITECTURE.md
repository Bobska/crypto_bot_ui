# WebSocket Push Architecture

## Overview
Pure server-push architecture with NO polling. Updates flow from trading bot → bot API → Django consumer → frontend in real-time.

## Message Flow

```
Trading Bot (bot.py)
    ↓ _broadcast_update()
Bot API Manager (bot_api.py)
    ↓ ConnectionManager.broadcast()
Django Consumer (consumers.py)
    ↓ bot_update() method
Frontend WebSocket (websocket.js)
    ↓ onMessage()
Dashboard UI Updates
```

## Components

### 1. Trading Bot (bot.py)
**Location:** `c:\dev-projects\crypto-trading-bot\bot.py`

**Broadcasts:**
- `trade_executed` - After BUY/SELL with profit calculations
- `status_change` - When bot starts/stops
- `price_update` - Every 10 iterations (configurable)

**Method:**
```python
def _broadcast_update(self, message_type: str, data: dict):
    """Push updates to all connected clients via bot_api manager"""
    try:
        from bot_api import manager
        asyncio.run(manager.broadcast({
            "type": message_type,
            "data": data
        }))
    except Exception as e:
        self.logger.error(f"Broadcast failed: {e}")
```

### 2. Bot API Manager (bot_api.py)
**Location:** `c:\dev-projects\crypto-trading-bot\bot_api.py`

**Class:** `ConnectionManager`
- `active_connections: List[WebSocket]` - All connected clients
- `connect(websocket)` - Add new WebSocket connection
- `disconnect(websocket)` - Remove and cleanup
- `broadcast(message)` - Send to all clients, cleanup dead connections

**WebSocket Endpoint:** `ws://localhost:8002/ws`

**Log Output:**
```
📡 Broadcast to 2 clients: trade_executed
📡 Broadcast to 2 clients: status_change
```

### 3. Django Consumer (consumers.py)
**Location:** `c:\dev-projects\crypto_bot_ui\dashboard\consumers.py`

**Role:** Relay between bot_api and frontend (NO POLLING)

**Methods:**
- `connect()` - Send initial status once, then wait for pushes
- `receive()` - Handle commands: `request_status`, `start_bot`, `stop_bot`
- `bot_update(event)` - **Relay method** - receives broadcasts and forwards to frontend

**No polling timers or intervals** - purely reactive to incoming messages

### 4. Frontend WebSocket (websocket.js)
**Location:** `c:\dev-projects\crypto_bot_ui\dashboard\static\js\websocket.js`

**Behavior:**
- Connect and request initial status ONCE
- Listen for pushed updates
- NO automatic polling (removed 2-second interval)
- Only requests status on explicit user command

**Message Types:**
- `status` - Bot status, position, balance, price
- `trade` - New trade notification with flash/sound
- `price` - Price update with flash animation
- `stats` - Trading statistics update
- `status_change` - Bot started/stopped
- `bot_control` - Response to start/stop commands
- `error` - Error messages

## Broadcast Triggers

### From bot.py to frontend:

1. **Trade Execution**
   ```
   BUY/SELL → bot.py._broadcast_update("trade_executed", {...})
   → bot_api.manager.broadcast()
   → consumers.bot_update()
   → frontend.onMessage("trade")
   → Show notification + flash screen
   ```

2. **Status Changes**
   ```
   Bot Start/Stop → bot.py._broadcast_update("status_change", {...})
   → bot_api.manager.broadcast()
   → consumers.bot_update()
   → frontend.onMessage("status_change")
   → Update status badge
   ```

3. **Price Updates**
   ```
   Every 10 iterations → bot.py._broadcast_update("price_update", {...})
   → bot_api.manager.broadcast()
   → consumers.bot_update()
   → frontend.onMessage("price")
   → Update price with flash animation
   ```

## Configuration

### No Polling Configuration Needed
- **Before:** `setInterval(() => { poll status }, 2000)`
- **After:** Just listen for push events

### Environment
- Redis: `redis://127.0.0.1:6379` (for Django Channels)
- Bot API: `http://localhost:8002`
- Dashboard: `http://localhost:8001`

## Testing the Push Flow

### 1. Check Bot API Broadcasts
Watch bot_api terminal for:
```
📡 Broadcast to X clients: trade_executed
📡 Broadcast to X clients: status_change
📡 Broadcast to X clients: price_update
```

### 2. Check Frontend Console (F12)
Watch browser console for:
```
📊 New trade pushed from bot: {...}
📡 Listening for pushed updates from bot...
```

### 3. Monitor Real-Time Updates
- Start trading bot → Status badge updates immediately
- Trade executes → Notification pops up instantly
- Price changes → Updates with flash animation (no polling delay)
- Stop bot → Status changes immediately

## Advantages

1. **Lower Latency** - Updates arrive within milliseconds of events
2. **Reduced Load** - No constant polling requests every 2 seconds
3. **Scalability** - Server pushes only when there's new data
4. **Efficiency** - No wasted bandwidth on "no change" responses
5. **Cleaner Code** - No polling intervals or timers to manage

## Commands

### Frontend → Consumer
```javascript
ws.send({ command: 'request_status' })  // One-time status request
ws.send({ command: 'start_bot' })       // Start trading bot
ws.send({ command: 'stop_bot' })        // Stop trading bot
```

### Consumer → Frontend (Pushed)
```python
# Automatically pushed when events occur in bot.py
await self.send({
    'type': 'trade_executed',
    'data': { action: 'BUY', price: 45000, ... }
})
```

## Startup Sequence

1. **Redis** (port 6379) - Must start first
2. **Trading Bot** (main.py) - Executes trades, pushes updates
3. **Bot API** (port 8002) - WebSocket manager, broadcasts to all
4. **Daphne** (port 8001) - Django Channels, relays to frontend
5. **Frontend** - Opens WebSocket, listens for pushes

Use: `.\START_ALL_ENHANCED.ps1` to start all services

---

**Result:** Real-time dashboard with sub-second update latency, zero polling overhead, and clean event-driven architecture.
