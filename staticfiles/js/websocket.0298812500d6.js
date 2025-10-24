/**
 * WebSocket Client for Real-Time Dashboard Updates
 * Connects to Django Channels WebSocket for live trading bot data
 */

class DashboardWebSocket {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
    }

    connect() {
        try {
            console.log('🔌 Connecting to WebSocket:', this.url);
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = this.onOpen.bind(this);
            this.ws.onmessage = this.onMessage.bind(this);
            this.ws.onclose = this.onClose.bind(this);
            this.ws.onerror = this.onError.bind(this);
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleReconnect();
        }
    }

    onOpen(event) {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Update connection status indicator
        this.updateConnectionStatus(true);
        
        // Request initial status
        this.send({ command: 'get_status' });
        this.send({ command: 'get_stats' });
        
        // Start automatic status polling every 2 seconds
        this.startPolling();
    }
    
    startPolling() {
        // Clear any existing polling interval
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Poll for status updates every 2 seconds
        this.pollingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send({ command: 'get_status' });
                this.send({ command: 'get_stats' });
            }
        }, 2000);
        
        console.log('🔄 Started automatic status polling (every 2 seconds)');
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('⏸️ Stopped automatic status polling');
        }
    }

    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket message:', message);
            
            // Route message by type
            switch (message.type) {
                case 'status':
                    this.updateStatus(message.data);
                    break;
                case 'trade':
                    this.handleNewTrade(message.data);
                    break;
                case 'price':
                    this.updatePrice(message.data);
                    break;
                case 'stats':
                    this.updateStats(message.data);
                    break;
                case 'status_change':
                    this.handleStatusChange(message.data);
                    break;
                case 'bot_control':
                    this.handleBotControl(message.data);
                    break;
                case 'error':
                    this.handleError(message.data);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    onClose(event) {
        console.log('❌ WebSocket disconnected');
        this.updateConnectionStatus(false);
        
        // Stop polling when disconnected
        this.stopPolling();
        
        // Attempt to reconnect
        this.handleReconnect();
    }

    onError(error) {
        console.error('⚠️ WebSocket error:', error);
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            this.updateConnectionStatus(false, 'Reconnecting...');
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateConnectionStatus(false, 'Connection failed');
        }
    }

    updateConnectionStatus(isConnected, customMessage = null) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (isConnected) {
                statusElement.innerHTML = '🟢 Connected';
                statusElement.className = 'connection-status connected';
            } else {
                const message = customMessage || 'Disconnected';
                statusElement.innerHTML = `🔴 ${message}`;
                statusElement.className = 'connection-status disconnected';
            }
        }
    }

    updateStatus(data) {
        console.log('Updating status:', data);
        
        // Update bot status indicator
        const botStatusElement = document.querySelector('[data-bot-status]');
        if (botStatusElement) {
            const isRunning = data.bot_running;
            botStatusElement.textContent = isRunning ? 'Running' : 'Stopped';
            botStatusElement.className = `badge ${isRunning ? 'badge-success' : 'badge-secondary'}`;
            botStatusElement.setAttribute('data-bot-status', isRunning);
        }
        
        // Update current price with flash animation
        const priceElement = document.querySelector('[data-price]');
        if (priceElement && data.current_price) {
            const oldPrice = parseFloat(priceElement.getAttribute('data-price') || 0);
            const newPrice = parseFloat(data.current_price);
            
            priceElement.textContent = `$${newPrice.toLocaleString()}`;
            priceElement.setAttribute('data-price', newPrice);
            
            // Flash animation based on price change
            if (oldPrice > 0) {
                if (newPrice > oldPrice) {
                    this.flashElement(priceElement, 'flash-green');
                } else if (newPrice < oldPrice) {
                    this.flashElement(priceElement, 'flash-red');
                }
            }
        }
        
        // Update position
        const positionElement = document.querySelector('[data-position]');
        if (positionElement && data.position) {
            positionElement.textContent = data.position;
            positionElement.setAttribute('data-position', data.position);
        }
        
        // Update balance
        if (data.balance) {
            const btcBalanceElement = document.getElementById('btc-balance');
            const usdtBalanceElement = document.getElementById('usdt-balance');
            
            if (btcBalanceElement && data.balance.BTC) {
                btcBalanceElement.textContent = parseFloat(data.balance.BTC).toFixed(6);
            }
            if (usdtBalanceElement && data.balance.USDT) {
                usdtBalanceElement.textContent = parseFloat(data.balance.USDT).toFixed(2);
            }
        }
        
        // Update last update time
        this.updateLastUpdateTime();
    }

    handleNewTrade(data) {
        console.log('New trade:', data);
        
        // Show notification
        const action = data.action || 'TRADE';
        const price = data.price || 0;
        const message = `${action} at $${price.toLocaleString()}`;
        
        showNotification('New Trade!', message, action === 'BUY' ? 'success' : 'info');
        
        // Flash the screen
        this.flashScreen(action === 'BUY' ? 'green' : 'blue');
        
        // Request updated stats
        this.send({ command: 'get_stats' });
        this.send({ command: 'get_status' });
        
        // Optionally play sound
        // this.playNotificationSound();
    }

    updatePrice(data) {
        console.log('Price update:', data);
        
        const priceElement = document.querySelector('[data-price]');
        if (priceElement && data.price) {
            const oldPrice = parseFloat(priceElement.getAttribute('data-price') || 0);
            const newPrice = parseFloat(data.price);
            
            priceElement.textContent = `$${newPrice.toLocaleString()}`;
            priceElement.setAttribute('data-price', newPrice);
            
            // Flash based on direction
            if (oldPrice > 0) {
                if (newPrice > oldPrice) {
                    this.flashElement(priceElement, 'flash-green');
                } else if (newPrice < oldPrice) {
                    this.flashElement(priceElement, 'flash-red');
                }
            }
        }
        
        this.updateLastUpdateTime();
    }

    updateStats(data) {
        console.log('Updating stats:', data);
        
        // Update total trades with animation
        const totalTradesElement = document.getElementById('total-trades');
        if (totalTradesElement && data.total_trades !== undefined) {
            this.animateCounter(totalTradesElement, data.total_trades);
        }
        
        // Update wins
        const winsElement = document.getElementById('wins');
        if (winsElement && data.wins !== undefined) {
            this.animateCounter(winsElement, data.wins);
        }
        
        // Update losses
        const lossesElement = document.getElementById('losses');
        if (lossesElement && data.losses !== undefined) {
            this.animateCounter(lossesElement, data.losses);
        }
        
        // Update win rate
        const winRateElement = document.getElementById('win-rate');
        if (winRateElement && data.win_rate !== undefined) {
            winRateElement.textContent = `${data.win_rate}%`;
        }
    }

    handleStatusChange(data) {
        console.log('Status change:', data);
        
        const isRunning = data.bot_running;
        const message = isRunning ? 'Bot Started' : 'Bot Stopped';
        
        showNotification('Status Change', message, 'warning');
        
        // Request fresh status
        this.send({ command: 'get_status' });
    }

    handleBotControl(data) {
        console.log('Bot control response:', data);
        
        if (data.status) {
            showNotification('Bot Control', data.message || 'Command executed', 'success');
        } else if (data.error) {
            showNotification('Bot Control Error', data.error, 'error');
        }
    }

    handleError(data) {
        console.error('WebSocket error message:', data);
        showNotification('Error', data.message || 'An error occurred', 'error');
    }

    flashElement(element, className) {
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, 500);
    }

    flashScreen(color) {
        const flashDiv = document.getElementById('price-flash');
        if (flashDiv) {
            flashDiv.className = `flash-overlay flash-${color}`;
            flashDiv.style.display = 'block';
            
            setTimeout(() => {
                flashDiv.style.display = 'none';
                flashDiv.className = 'flash-overlay';
            }, 300);
        }
    }

    animateCounter(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const difference = targetValue - currentValue;
        const duration = 500; // milliseconds
        const steps = 20;
        const stepValue = difference / steps;
        const stepDuration = duration / steps;
        
        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            const newValue = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = newValue;
            
            if (currentStep >= steps) {
                element.textContent = targetValue;
                clearInterval(interval);
            }
        }, stepDuration);
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            const now = new Date();
            lastUpdateElement.textContent = `Updated ${now.toLocaleTimeString()}`;
        }
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected');
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
