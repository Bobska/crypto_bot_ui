from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('trades/', views.trades_view, name='trades'),
    path('order-history/', views.order_history_view, name='order_history'),
    path('settings/', views.settings_view, name='settings'),
    path('controls/', views.controls_view, name='controls'),
    path('logs/', views.logs_view, name='logs'),
    path('terminal/', views.trading_terminal_view, name='trading_terminal'),
    
    # API endpoints
    path('api/status/', views.api_status, name='api_status'),
    path('api/logs/', views.api_logs, name='api_logs'),
]