from django.db import models
from django.utils import timezone


class Trade(models.Model):
    """Model for storing trade history"""
    
    ACTION_CHOICES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]
    
    RESULT_CHOICES = [
        ('WIN', 'Win'),
        ('LOSS', 'Loss'),
    ]
    
    timestamp = models.DateTimeField(default=timezone.now)
    symbol = models.CharField(max_length=20, default='BTC/USDT')
    action = models.CharField(max_length=4, choices=ACTION_CHOICES)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=6)
    profit_loss_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    result = models.CharField(max_length=4, choices=RESULT_CHOICES, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']  # Most recent first
    
    def __str__(self):
        return f"{self.action} {self.amount} {self.symbol} @ ${self.price}"
    
    def is_win(self):
        return self.result == 'WIN'


class BotSettings(models.Model):
    """Model for storing bot configuration settings"""
    
    buy_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    sell_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    trade_amount = models.DecimalField(max_digits=10, decimal_places=6, default=0.001)
    stop_loss_enabled = models.BooleanField(default=True)
    stop_loss_pct = models.DecimalField(max_digits=5, decimal_places=2, default=3.0)
    trailing_stop_enabled = models.BooleanField(default=False)
    trailing_stop_pct = models.DecimalField(max_digits=5, decimal_places=2, default=2.0)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        """Override save to ensure only one instance exists"""
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Returns singleton instance"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
    
    class Meta:
        verbose_name = "Bot Settings"
        verbose_name_plural = "Bot Settings"
