from django.shortcuts import render, redirect
from django.contrib import messages
from django.db.models import Q
from django.utils import timezone
from django.http import JsonResponse
from datetime import datetime, timedelta
from .api_client import BotAPIClient
from .models import Trade, BotSettings
import os
import re
import json


def dashboard_view(request):
    """Main dashboard view"""
    api_client = BotAPIClient()
    
    # Fetch data from bot API
    bot_status = api_client.get_status()
    stats = api_client.get_stats()
    recent_trades_api = api_client.get_recent_trades()
    
    # Get recent trades from API (last 5)
    recent_trades = recent_trades_api[:5] if recent_trades_api else []
    
    context = {
        'bot_status': bot_status,
        'stats': stats,
        'recent_trades': recent_trades,
        'page_title': 'Dashboard',
    }
    
    return render(request, 'dashboard.html', context)


def trades_view(request):
    """Trade history view with filtering"""
    # Start with all trades (last 100)
    trades = Trade.objects.all()[:100]
    
    # Apply filters if provided
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    action = request.GET.get('action')
    result = request.GET.get('result')
    
    if from_date:
        try:
            from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
            trades = trades.filter(timestamp__date__gte=from_date_obj)
        except ValueError:
            pass
    
    if to_date:
        try:
            to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
            trades = trades.filter(timestamp__date__lte=to_date_obj)
        except ValueError:
            pass
    
    if action and action in ['BUY', 'SELL']:
        trades = trades.filter(action=action)
    
    if result and result in ['WIN', 'LOSS']:
        trades = trades.filter(result=result)
    
    context = {
        'trades': trades,
        'total_trades': trades.count(),
        'page_title': 'Trade History',
        'filters': {
            'from_date': from_date,
            'to_date': to_date,
            'action': action,
            'result': result,
        }
    }
    
    return render(request, 'trades.html', context)


def settings_view(request):
    """Settings management view"""
    settings_obj = BotSettings.get_settings()
    
    if request.method == 'POST':
        # Update settings
        api_client = BotAPIClient()
        
        # Update database
        settings_obj.buy_threshold = float(request.POST.get('buy_threshold', 1.0))
        settings_obj.sell_threshold = float(request.POST.get('sell_threshold', 1.0))
        settings_obj.trade_amount = float(request.POST.get('trade_amount', 0.001))
        settings_obj.stop_loss_enabled = request.POST.get('stop_loss_enabled') == 'on'
        settings_obj.stop_loss_pct = float(request.POST.get('stop_loss_pct', 3.0))
        settings_obj.trailing_stop_enabled = request.POST.get('trailing_stop_enabled') == 'on'
        settings_obj.trailing_stop_pct = float(request.POST.get('trailing_stop_pct', 2.0))
        settings_obj.save()
        
        # Send to bot API
        settings_dict = {
            'buy_threshold': settings_obj.buy_threshold,
            'sell_threshold': settings_obj.sell_threshold,
            'trade_amount': settings_obj.trade_amount,
            'stop_loss_enabled': settings_obj.stop_loss_enabled,
            'stop_loss_pct': settings_obj.stop_loss_pct,
            'trailing_stop_enabled': settings_obj.trailing_stop_enabled,
            'trailing_stop_pct': settings_obj.trailing_stop_pct,
        }
        
        if api_client.update_settings(settings_dict):
            messages.success(request, 'Settings updated successfully!')
        else:
            messages.error(request, 'Failed to update bot settings.')
        
        return redirect('settings')
    
    context = {
        'settings': settings_obj,
        'page_title': 'Settings',
    }
    
    return render(request, 'settings.html', context)


def controls_view(request):
    """Bot control view (start/stop)"""
    if request.method == 'POST':
        api_client = BotAPIClient()
        action = request.POST.get('action')
        
        if action == 'start':
            if api_client.start_bot():
                messages.success(request, 'Bot started successfully!')
            else:
                messages.error(request, 'Failed to start bot.')
        elif action == 'stop':
            if api_client.stop_bot():
                messages.success(request, 'Bot stopped successfully!')
            else:
                messages.error(request, 'Failed to stop bot.')
        
        return redirect('dashboard')
    
    context = {
        'page_title': 'Bot Controls',
    }
    
    return render(request, 'controls.html', context)


def trading_terminal_view(request):
    """Professional trading terminal view"""
    api_client = BotAPIClient()
    
    # Fetch data from bot API
    bot_status = api_client.get_status()
    stats = api_client.get_stats()
    
    context = {
        'bot_status': bot_status,
        'stats': stats,
        'page_title': 'Trading Terminal',
    }
    
    return render(request, 'trading_terminal.html', context)


def logs_view(request):
    """Bot logs view"""
    log_lines = []
    
    try:
        # Read from the most recent log file
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'crypto-trading-bot', 'logs')
        log_files = [f for f in os.listdir(log_dir) if f.endswith('.log')]
        
        if log_files:
            latest_log = max(log_files, key=lambda f: os.path.getctime(os.path.join(log_dir, f)))
            log_path = os.path.join(log_dir, latest_log)
            
            with open(log_path, 'r', encoding='utf-8') as f:
                all_lines = f.readlines()
                # Get last 100 lines
                log_lines = all_lines[-100:] if len(all_lines) > 100 else all_lines
                # Reverse to show newest first
                log_lines.reverse()
    except Exception as e:
        log_lines = [f"Error reading log files: {str(e)}"]
    
    context = {
        'log_lines': log_lines,
        'page_title': 'Bot Logs',
    }
    
    return render(request, 'logs.html', context)


# API Endpoints for AJAX calls

def api_status(request):
    """API endpoint for bot status"""
    api_client = BotAPIClient()
    status = api_client.get_status()
    
    return JsonResponse({
        'bot_running': status.get('bot_running', False),
        'last_updated': status.get('last_updated', timezone.now().isoformat()),
        'uptime': status.get('uptime', 0),
        'last_action': status.get('last_action', 'None'),
    })


def api_logs(request):
    """API endpoint for bot logs"""
    lines_count = int(request.GET.get('lines', 100))
    level_filter = request.GET.get('level', '')
    search_filter = request.GET.get('search', '')
    
    logs = []
    stats = {'total': 0, 'info': 0, 'warning': 0, 'error': 0}
    
    try:
        # Read from the most recent log file
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'crypto-trading-bot', 'logs')
        
        if os.path.exists(log_dir):
            log_files = [f for f in os.listdir(log_dir) if f.endswith('.log')]
            
            if log_files:
                latest_log = max(log_files, key=lambda f: os.path.getctime(os.path.join(log_dir, f)))
                log_path = os.path.join(log_dir, latest_log)
                
                with open(log_path, 'r', encoding='utf-8') as f:
                    all_lines = f.readlines()
                    
                    # Get last N lines
                    recent_lines = all_lines[-lines_count:] if len(all_lines) > lines_count else all_lines
                    
                    for line in recent_lines:
                        line = line.strip()
                        if not line:
                            continue
                            
                        # Parse log line (assuming format: YYYY-MM-DD HH:MM:SS - LEVEL - MESSAGE)
                        log_match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ - (\w+) - (.+)', line)
                        
                        if log_match:
                            timestamp, level, message = log_match.groups()
                            
                            # Apply level filter
                            if level_filter and level != level_filter:
                                continue
                                
                            # Apply search filter
                            if search_filter and search_filter.lower() not in message.lower():
                                continue
                            
                            logs.append({
                                'time': timestamp,
                                'level': level,
                                'message': message
                            })
                            
                            # Update stats
                            stats['total'] += 1
                            if level == 'INFO':
                                stats['info'] += 1
                            elif level == 'WARNING':
                                stats['warning'] += 1
                            elif level in ['ERROR', 'CRITICAL']:
                                stats['error'] += 1
                        else:
                            # Fallback for lines that don't match the expected format
                            if not level_filter and (not search_filter or search_filter.lower() in line.lower()):
                                logs.append({
                                    'time': 'Unknown',
                                    'level': 'INFO',
                                    'message': line
                                })
                                stats['total'] += 1
                                stats['info'] += 1
                    
                    # Reverse to show newest first
                    logs.reverse()
    
    except Exception as e:
        logs = [{
            'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'level': 'ERROR',
            'message': f'Error reading log files: {str(e)}'
        }]
        stats = {'total': 1, 'info': 0, 'warning': 0, 'error': 1}
    
    return JsonResponse({
        'logs': logs,
        'stats': stats
    })
