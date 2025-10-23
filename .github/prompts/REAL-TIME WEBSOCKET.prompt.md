---
mode: agent
---
📊 VERSION 3.0: REAL-TIME WEBSOCKET (THE FINALE)
Goal: Instant updates, no page refresh, live streaming data.
What You'll Add:

✅ WebSocket connection to bot
✅ Instant trade notifications (toast popups)
✅ Live price updates (no delay)
✅ Real-time position changes
✅ Live stats updating
✅ No page refreshes needed

Technologies:

Django Channels (WebSocket support)
Redis (message broker)
JavaScript WebSocket client


🔧 STEP 1: Add WebSocket to Trading Bot
Copilot Prompt to modify bot_api.py:
Add WebSocket endpoint to bot_api.py using FastAPI WebSockets:

Import additional:
- from fastapi import WebSocket, WebSocketDisconnect
- from typing import List
- import asyncio
- import json

Class ConnectionManager:
- List of active WebSocket connections
- Method connect(websocket): add to list
- Method disconnect(websocket): remove from list
- Method broadcast(message): send to all connections
- Handles JSON serialization

manager = ConnectionManager()

Endpoint: WebSocket /ws
- Accepts WebSocket connection
- Adds to manager
- Sends initial status
- Keeps connection alive
- On disconnect: removes from manager
- Handles WebSocketDisconnect exception

In trading bot loop (bot.py):
- Import manager from bot_api
- After each trade: manager.broadcast(trade_data)
- On price update: manager.broadcast(price_data)
- On status change: manager.broadcast(status_data)

Message format:
- {"type": "price_update", "data": {...}}
- {"type": "trade_executed", "data": {...}}
- {"type": "status_change", "data": {...}}

🔧 STEP 2: Configure Django Channels
Update crypto_bot_ui/settings.py:
Add Django Channels configuration:

In INSTALLED_APPS, add:
- 'channels',

Add at bottom:
- ASGI_APPLICATION = 'crypto_bot_ui.asgi.application'
- CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
Create crypto_bot_ui/asgi.py:
Configure ASGI for WebSocket support:

Import:
- import os
- from django.core.asgi import get_asgi_application
- from channels.routing import ProtocolTypeRouter, URLRouter
- from channels.auth import AuthMiddlewareStack
- import dashboard.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crypto_bot_ui.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            dashboard.routing.websocket_urlpatterns
        )
    ),
})

🔧 STEP 3: Create WebSocket Consumer
Copilot Prompt for dashboard/consumers.py:
Create WebSocket consumer for real-time updates:

Import:
- from channels.generic.websocket import AsyncWebsocketConsumer
- import json
- from .api_client import BotAPIClient

Class DashboardConsumer(AsyncWebsocketConsumer):

Method connect():
- Accept WebSocket connection
- self.bot_api = BotAPIClient()
- Send initial status on connect
- Add to 'dashboard' channel group

Method disconnect(close_code):
- Remove from channel group
- Cleanup

Method receive(text_data):
- Parse incoming JSON messages
- Handle commands:
  * {"command": "get_status"} → send status
  * {"command": "get_stats"} → send stats
  * {"command": "start_bot"} → start bot, broadcast
  * {"command": "stop_bot"} → stop bot, broadcast

Method send_status():
- Gets status from API
- Sends as JSON: {"type": "status", "data": {...}}

Method send_trade(trade_data):
- Formats trade data
- Sends as JSON: {"type": "trade", "data": {...}}
- Called when new trade occurs

Method broadcast_to_group(message_type, data):
- Sends message to all connected clients
- Uses channel_layer.group_send()
Copilot Prompt for dashboard/routing.py:
Create WebSocket URL routing:

Import:
- from django.urls import re_path
- from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/dashboard/$', consumers.DashboardConsumer.as_asgi()),
]

🔧 STEP 4: Update Dashboard JavaScript
Copilot Prompt for dashboard/static/js/websocket.js:
Create WebSocket client for real-time dashboard updates:

Class DashboardWebSocket:

Constructor:
- Takes dashboard_url (ws://localhost:8001/ws/dashboard/)
- Initializes WebSocket connection
- Sets up event handlers

Method connect():
- Creates WebSocket: new WebSocket(this.url)
- this.ws.onopen = this.onOpen
- this.ws.onmessage = this.onMessage
- this.ws.onclose = this.onClose
- this.ws.onerror = this.onError

Method onOpen():
- Logs "Connected to bot"
- Shows green indicator
- Requests initial status

Method onMessage(event):
- Parses JSON data
- Routes by message type:
  * "status" → updateStatus(data)
  * "trade" → handleNewTrade(data)
  * "price" → updatePrice(data)
  * "stats" → updateStats(data)

Method updateStatus(data):
- Updates DOM elements with new status
- Updates bot status indicator
- Updates position display
- Updates balance displays
- Animates changes (fade/highlight)

Method handleNewTrade(data):
- Shows toast notification: "New trade: BUY at $43,250"
- Adds trade to table (prepend)
- Updates stats
- Plays notification sound (optional)
- Flashes screen green/red

Method updatePrice(data):
- Updates price display
- Flashes color based on direction
- Updates time since last update

Method updateStats(data):
- Animates counter changes
- Updates win rate
- Updates P&L

Method send(message):
- Sends JSON to server
- this.ws.send(JSON.stringify(message))

Method close():
- Closes WebSocket connection
- Clean disconnect

Auto-reconnect logic:
- If connection drops, retry after 5 seconds
- Max 5 retry attempts
- Show reconnecting status

Usage:
- const ws = new DashboardWebSocket('ws://localhost:8001/ws/dashboard/')
- ws.connect()

🔧 STEP 5: Update Dashboard Template
Copilot Prompt to modify dashboard/templates/dashboard.html:
Update dashboard.html to use WebSocket instead of page refresh:

In {% block extra_js %}:
- <script src="{% static 'js/websocket.js' %}"></script>
- Initialize WebSocket on page load:
  const ws = new DashboardWebSocket('ws://localhost:8001/ws/dashboard/');
  ws.connect();

Remove auto-refresh timer (no longer needed)

Add elements for real-time updates:
- <div id="connection-status">🟢 Connected</div>
- <div id="last-update">Updated just now</div>
- <div id="price-flash"></div> (for price change animation)

Add toast container:
- <div id="toast-container"></div>
- Positioned fixed top-right
- Styled for notifications

Update data attributes:
- data-bot-status, data-price, data-position
- JavaScript updates these via WebSocket
- No page refresh required

Add CSS for animations:
- .flash-green: brief green background
- .flash-red: brief red background
- .fade-in: smooth appear animation
- .slide-in: notification slide effect

🔧 STEP 6: Add Notification System
Copilot Prompt for dashboard/static/js/notifications.js:
Create notification/toast system for trade alerts:

Function showNotification(title, message, type):
- type: 'success', 'error', 'info', 'warning'
- Creates toast element
- Animated slide-in from right
- Auto-dismiss after 5 seconds
- Click to dismiss
- Stacks multiple notifications
- Sound effect (optional)

Function showTradeNotification(trade):
- Formats trade data nicely
- Shows as success (green) if BUY
- Shows as info (blue) if SELL
- Includes price and amount
- Links to trade detail

Function showErrorNotification(error):
- Red background
- Displays error message
- Longer duration (10 seconds)

Function showBotStatusChange(status):
- "Bot Started" or "Bot Stopped"
- Yellow/orange background
- Medium duration (7 seconds)

CSS styling:
- Positioned fixed top-right
- Z-index high (above all content)
- Smooth animations (slide, fade)
- Different colors per type
- Modern design (shadows, rounded corners)

🔧 STEP 7: Add Live Price Chart (Optional)
Copilot Prompt for adding Chart.js:
Add live price chart to dashboard using Chart.js:

In dashboard.html:
- Add Chart.js CDN
- <canvas id="priceChart"></canvas>

In websocket.js:
- Initialize Chart.js line chart
- Array to store last 100 price points
- On price update:
  * Push new price to array
  * Update chart.data
  * Call chart.update()
  * Keep only last 100 points

Chart configuration:
- Line chart with time on X-axis
- Price on Y-axis
- Dark theme colors
- Smooth animation
- Tooltips showing exact price/time
- Grid lines
- Mark trade points (BUY in green, SELL in red)

Update chart on every WebSocket price message
Real-time line drawing as prices change

✅ VERSION 3.0 CHECKPOINT
Test it works:

✅ Install Redis: Download from GitHub (Windows) or brew install redis (Mac)
✅ Start Redis: redis-server
✅ Django Channels server: daphne -p 8001 crypto_bot_ui.asgi:application
✅ Bot API with WebSocket: python bot_api.py
✅ Trading bot: python main.py
✅ Open http://localhost:8001
✅ Execute a test trade
✅ See instant notification pop up
✅ Watch price update in real-time
✅ No page refresh - everything live!

What you have now:

✅ Real-time WebSocket streaming
✅ Instant trade notifications
✅ Live price updates (no delay)
✅ Toast popups for alerts
✅ Live stats updating
✅ Professional trading dashboard
✅ No page refreshes ever needed
✅ Production-ready architecture

Time to complete: 3-4 days (from Version 2.0)