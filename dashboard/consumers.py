"""
WebSocket Consumer for Real-Time Dashboard Updates
"""
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .api_client import BotAPIClient


class DashboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time trading bot updates"""
    
    async def connect(self):
        """Accept WebSocket connection and send initial status once"""
        await self.accept()
        
        # Initialize API client
        self.bot_api = BotAPIClient()
        
        # Add to dashboard channel group for receiving bot broadcasts
        await self.channel_layer.group_add(
            'dashboard',
            self.channel_name
        )
        
        print("✅ Dashboard WebSocket connected - relay mode (no polling)")
        
        # Send initial status once only - no polling
        await self.send_status()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Remove from channel group
        await self.channel_layer.group_discard(
            'dashboard',
            self.channel_name
        )
        
        print(f"❌ Dashboard WebSocket disconnected (code: {close_code})")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages from frontend - NO POLLING"""
        try:
            data = json.loads(text_data)
            command = data.get('command')
            
            # Only respond to explicit requests - no automatic polling
            if command == 'request_status':
                # Send current status once on demand
                await self.send_status()
            
            elif command == 'request_stats':
                # Send current stats once on demand
                await self.send_stats()
            
            elif command == 'start_bot':
                # Forward command to bot API
                response = self.bot_api.start_bot()
                await self.send_json({
                    'type': 'bot_control',
                    'data': response
                })
            
            elif command == 'stop_bot':
                # Forward command to bot API
                response = self.bot_api.stop_bot()
                await self.send_json({
                    'type': 'bot_control',
                    'data': response
                })
        
        except json.JSONDecodeError:
            await self.send_json({
                'type': 'error',
                'data': {'message': 'Invalid JSON'}
            })
        except Exception as e:
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })
    
    async def send_status(self):
        """Get and send current bot status"""
        try:
            status = self.bot_api.get_status()
            await self.send_json({
                'type': 'status',
                'data': status
            })
        except Exception as e:
            await self.send_json({
                'type': 'error',
                'data': {'message': f'Error getting status: {str(e)}'}
            })
    
    async def send_stats(self):
        """Get and send trading statistics"""
        try:
            stats = self.bot_api.get_stats()
            await self.send_json({
                'type': 'stats',
                'data': stats
            })
        except Exception as e:
            await self.send_json({
                'type': 'error',
                'data': {'message': f'Error getting stats: {str(e)}'}
            })
    
    async def send_json(self, content):
        """Send JSON message to client"""
        await self.send(text_data=json.dumps(content))
    
    async def send_trade(self, trade_data):
        """Send new trade notification"""
        await self.send_json({
            'type': 'trade',
            'data': trade_data
        })
    
    async def broadcast_to_group(self, message_type, data):
        """Broadcast message to all clients in dashboard group"""
        await self.channel_layer.group_send(
            'dashboard',
            {
                'type': 'dashboard_message',
                'message_type': message_type,
                'data': data
            }
        )
    
    async def dashboard_message(self, event):
        """Receive message from channel layer and send to WebSocket"""
        await self.send_json({
            'type': event['message_type'],
            'data': event['data']
        })
    
    async def bot_update(self, event):
        """
        Receives broadcast messages from bot_api manager via channel layer
        This is the relay point - bot pushes updates, we forward to frontend
        """
        await self.send(text_data=json.dumps({
            'type': event['type'],
            'data': event['data']
        }))
