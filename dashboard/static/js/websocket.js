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
        console.log('✅ Connected - listening for real-time updates');
        this.reconnectAttempts = 0;
        
        // Update connection status indicator
        this.updateConnectionStatus('live');
        
        // ONE-TIME initial status request - then rely on pushed updates only
        this.send({ command: 'request_status' });
        
        console.log('📡 Push mode active - NO POLLING');
    }

    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('📨 Pushed update received:', message.type);
            
            // Route pushed messages by type - NO POLLING
            switch (message.type) {
                case 'status':
                    this.updateDashboard(message.data);
                    break;
                    
                case 'trade_executed':
                    // Real-time trade notification from bot
                    this.handleNewTrade(message.data);
                    break;
                    
                case 'price_update':
                    // Real-time price update from bot
                    this.updatePrice(message.data);
                    break;
                    
                case 'stats':
                    this.updateStats(message.data);
                    break;
                    
                case 'status_change':
                    // Bot started/stopped
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
        this.updateConnectionStatus('disconnected');
        
        // NO POLLING - will reconnect and rely on push updates
        this.handleReconnect();
    }

    onError(error) {
        console.error('⚠️ WebSocket error:', error);
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            this.updateConnectionStatus('reconnecting');
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateConnectionStatus('failed');
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            switch(status) {
                case 'live':
                    statusElement.innerHTML = '🟢 Live';
                    statusElement.className = 'connection-status connected';
                    break;
                case 'reconnecting':
                    statusElement.innerHTML = '🟡 Reconnecting...';
                    statusElement.className = 'connection-status reconnecting';
                    break;
                case 'disconnected':
                    statusElement.innerHTML = '🔴 Disconnected';
                    statusElement.className = 'connection-status disconnected';
                    break;
                case 'failed':
                    statusElement.innerHTML = '🔴 Connection Failed';
                    statusElement.className = 'connection-status disconnected';
                    break;
            }
        }
    }

    updateDashboard(data) {
        console.log('📊 Dashboard update:', data);
        
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
        const action = data.action || 'TRADE';
        const price = data.price || 0;
        const amount = data.amount || 0;
        const position = data.position || 'UNKNOWN';
        
        console.log(`🔔 Trade Executed: ${action} at $${price.toLocaleString()}`);
        
        // Show prominent toast notification (10 seconds)
        showNotification(
            '🔔 Trade Executed!', 
            `${action} ${amount} BTC at $${price.toLocaleString()}`, 
            action === 'BUY' ? 'success' : 'info',
            10000
        );
        
        // Flash entire page green (buy) or red (sell)
        this.flashScreen(action === 'BUY' ? 'green' : 'red');
        
        // Update position indicator immediately
        const positionElement = document.querySelector('[data-position]');
        if (positionElement) {
            positionElement.textContent = position;
            positionElement.setAttribute('data-position', position);
        }
        
        // Update balance display if provided
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
        
        // Prepend to trade history table (if exists)
        this.prependTradeToTable(data);
        
        // Request fresh stats after trade
        this.send({ command: 'request_stats' });
        
        // Play notification sound (optional - uncomment to enable)
        // this.playNotificationSound();
    }

    updatePrice(data) {
        const priceElement = document.querySelector('[data-price]');
        if (priceElement && data.price) {
            const oldPrice = parseFloat(priceElement.getAttribute('data-price') || 0);
            const newPrice = parseFloat(data.price);
            
            // Update price display with animation
            priceElement.textContent = `$${newPrice.toLocaleString()}`;
            priceElement.setAttribute('data-price', newPrice);
            
            // Show price direction indicator with flash
            if (oldPrice > 0) {
                const direction = newPrice > oldPrice ? '↑' : newPrice < oldPrice ? '↓' : '→';
                const directionClass = newPrice > oldPrice ? 'flash-green' : newPrice < oldPrice ? 'flash-red' : '';
                
                // Flash animation based on direction
                if (directionClass) {
                    this.flashElement(priceElement, directionClass);
                }
                
                // Show direction indicator (optional)
                const directionElement = document.querySelector('[data-price-direction]');
                if (directionElement) {
                    directionElement.textContent = direction;
                    directionElement.className = newPrice > oldPrice ? 'text-success' : newPrice < oldPrice ? 'text-danger' : '';
                }
            }
            
            console.log(`💰 Price update: $${newPrice.toLocaleString()}`);
        }
        
        // Update "Last Updated" timestamp
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
        const status = data.status || (data.bot_running ? 'running' : 'stopped');
        const isRunning = status === 'running';
        
        console.log(`⚡ Status Change: Bot ${status.toUpperCase()}`);
        
        // Update bot status indicator
        const botStatusElement = document.querySelector('[data-bot-status]');
        if (botStatusElement) {
            botStatusElement.textContent = isRunning ? 'Running' : 'Stopped';
            botStatusElement.className = `badge ${isRunning ? 'badge-success' : 'badge-secondary'}`;
            botStatusElement.setAttribute('data-bot-status', isRunning);
        }
        
        // Show notification about status change
        const message = isRunning ? '✅ Bot Started' : '⏹️ Bot Stopped';
        showNotification('Status Change', message, isRunning ? 'success' : 'warning', 5000);
        
        // NO POLLING - status updates will be pushed automatically
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

    prependTradeToTable(tradeData) {
        const tradeTableBody = document.querySelector('#trades-table tbody');
        if (!tradeTableBody) return;
        
        const row = document.createElement('tr');
        row.className = 'trade-row-new';
        
        const timestamp = new Date().toLocaleString();
        const action = tradeData.action || 'N/A';
        const price = tradeData.price ? `$${parseFloat(tradeData.price).toLocaleString()}` : 'N/A';
        const amount = tradeData.amount ? parseFloat(tradeData.amount).toFixed(6) : 'N/A';
        const profit = tradeData.profit_pct ? `${parseFloat(tradeData.profit_pct).toFixed(2)}%` : '-';
        
        row.innerHTML = `
            <td>${timestamp}</td>
            <td><span class="badge badge-${action === 'BUY' ? 'success' : 'info'}">${action}</span></td>
            <td>${price}</td>
            <td>${amount}</td>
            <td class="${parseFloat(tradeData.profit_pct || 0) >= 0 ? 'text-success' : 'text-danger'}">${profit}</td>
        `;
        
        // Insert at the top
        tradeTableBody.insertBefore(row, tradeTableBody.firstChild);
        
        // Highlight animation
        setTimeout(() => row.classList.remove('trade-row-new'), 2000);
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

    playNotificationSound() {
        // Optional: Play notification sound for trades
        // Uncomment and customize as needed
        try {
            const audio = new Audio('/static/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Audio play failed:', err));
        } catch (err) {
            console.log('Notification sound not available');
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

