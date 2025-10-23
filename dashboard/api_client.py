import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class BotAPIClient:
    """Client for communicating with the trading bot API"""
    
    def __init__(self):
        self.base_url = settings.BOT_API_URL
        self.timeout = getattr(settings, 'BOT_API_TIMEOUT', 5)
    
    def get_status(self):
        """Get current bot status"""
        try:
            response = requests.get(f"{self.base_url}/status", timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting bot status: {e}")
            return None
    
    def get_stats(self):
        """Get trading statistics"""
        try:
            response = requests.get(f"{self.base_url}/stats", timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting bot stats: {e}")
            return None
    
    def get_recent_trades(self):
        """Get recent trades"""
        try:
            response = requests.get(f"{self.base_url}/trades/recent", timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting recent trades: {e}")
            return []
    
    def start_bot(self):
        """Start the trading bot"""
        try:
            response = requests.post(f"{self.base_url}/bot/start", timeout=self.timeout)
            response.raise_for_status()
            logger.info("Bot started successfully")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error starting bot: {e}")
            return False
    
    def stop_bot(self):
        """Stop the trading bot"""
        try:
            response = requests.post(f"{self.base_url}/bot/stop", timeout=self.timeout)
            response.raise_for_status()
            logger.info("Bot stopped successfully")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error stopping bot: {e}")
            return False
    
    def update_settings(self, settings_dict):
        """Update bot settings"""
        try:
            response = requests.post(f"{self.base_url}/settings", 
                                   json=settings_dict, 
                                   timeout=self.timeout)
            response.raise_for_status()
            logger.info("Bot settings updated successfully")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error updating bot settings: {e}")
            return False