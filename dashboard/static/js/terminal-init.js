/**
 * Trading Terminal Initialization
 * Orchestrates all components and manages dependencies
 */

const TerminalInit = {
    // Component instances
    chart: null,
    pnlCalc: null,
    manualTrading: null,
    aiCopilot: null,
    ws: null,
    
    // State
    currentPrice: 0,
    position: null,
    initStartTime: null,
    
    /**
     * Main initialization entry point
     */
    async init() {
        this.initStartTime = Date.now();
        console.log('🚀 Initializing Trading Terminal...');
        
        try {
            // 1. Initialize Chart first (visual feedback to user)
            await this.initChart();
            
            // 2. Fetch current position data
            await this.fetchPositionData();
            
            // 3. Initialize P&L Calculator with position data
            await this.initPnLCalculator();
            
            // 4. Initialize Manual Trading module
            await this.initManualTrading();
            
            // 5. Initialize AI Co-Pilot
            await this.initAICoPilot();
            
            // 6. Connect WebSocket for real-time updates
            await this.connectWebSocket();
            
            // 7. Set up UI event listeners
            this.setupEventListeners();
            
            // 8. Start background updates
            this.startBackgroundTasks();
            
            // 9. Load grid levels for chart markers
            await this.loadGridLevels();
            
            const elapsed = Date.now() - this.initStartTime;
            console.log(`🎉 Trading Terminal ready! (${elapsed}ms)`);
            
            // Show ready notification
            this.showNotification('Trading Terminal Ready', 'success');
            
        } catch (error) {
            console.error('❌ Terminal initialization failed:', error);
            this.showNotification('Initialization Error: ' + error.message, 'error');
        }
    },
    
    /**
     * Initialize TradingChart component
     */
    async initChart() {
        try {
            const chartContainer = document.getElementById('tradingChart');
            if (!chartContainer) {
                throw new Error('Chart container not found');
            }
            
            if (typeof TradingChart === 'undefined') {
                throw new Error('TradingChart class not loaded');
            }
            
            this.chart = new TradingChart('tradingChart');
            
            // Load historical data
            const symbol = 'BTC/USDT';
            const timeframe = localStorage.getItem('chartTimeframe') || '1h';
            
            await this.chart.loadHistoricalData(symbol, timeframe);
            
            console.log('✅ Chart initialized');
        } catch (error) {
            console.error('Chart initialization error:', error);
            throw new Error('Chart init failed: ' + error.message);
        }
    },
    
    /**
     * Fetch current position and balance data
     */
    async fetchPositionData() {
        try {
            const response = await fetch('http://localhost:8002/api/position/pnl');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.position = await response.json();
            this.currentPrice = this.position.current_price || 0;
            
            console.log('✅ Position data loaded:', this.position);
        } catch (error) {
            console.error('Position fetch error:', error);
            // Use fallback data
            this.position = {
                has_position: false,
                amount: 0,
                entry_price: 0,
                current_price: 0,
                unrealized_pnl: 0,
                unrealized_pnl_pct: 0
            };
            console.warn('⚠️ Using fallback position data');
        }
    },
    
    /**
     * Initialize P&L Calculator
     */
    async initPnLCalculator() {
        try {
            const container = document.getElementById('pnlContainer');
            if (!container) {
                console.warn('P&L container not found, skipping initialization');
                return;
            }
            
            if (typeof PnLCalculator === 'undefined') {
                throw new Error('PnLCalculator class not loaded');
            }
            
            this.pnlCalc = new PnLCalculator(
                this.position.amount || 0.1,
                this.position.entry_price || this.currentPrice,
                this.currentPrice
            );
            
            // Render to DOM
            this.pnlCalc.renderToDOM('pnlContainer');
            
            console.log('✅ P&L Calculator initialized');
        } catch (error) {
            console.error('P&L Calculator error:', error);
            throw new Error('PnL Calculator init failed: ' + error.message);
        }
    },
    
    /**
     * Initialize Manual Trading module
     */
    async initManualTrading() {
        try {
            if (typeof ManualTrading === 'undefined') {
                throw new Error('ManualTrading class not loaded');
            }
            
            this.manualTrading = new ManualTrading({
                maxTradeSize: 0.1,
                minTradeSize: 0.0001,
                feeRate: 0.001,
                chart: this.chart,
                onTradeExecuted: (trade) => {
                    console.log('Trade executed callback:', trade);
                    // Refresh position data after trade
                    this.fetchPositionData();
                }
            });
            
            console.log('✅ Manual Trading initialized');
        } catch (error) {
            console.error('Manual Trading error:', error);
            // Non-critical, continue initialization
            console.warn('⚠️ Manual Trading module unavailable');
        }
    },
    
    /**
     * Initialize AI Co-Pilot
     */
    async initAICoPilot() {
        try {
            if (typeof AICoPilot === 'undefined') {
                throw new Error('AICoPilot class not loaded');
            }
            
            // Get saved mode or default to 'opinion'
            const savedMode = localStorage.getItem('aiMode') || 'opinion';
            
            this.aiCopilot = new AICoPilot(savedMode, this.manualTrading);
            
            // Request initial advice (non-blocking, let it fail gracefully)
            const context = this.getMarketContext();
            this.aiCopilot.requestAdvice(context).catch(err => {
                console.warn('Initial AI advice failed:', err.message);
            });
            
            console.log('✅ AI Co-Pilot initialized');
        } catch (error) {
            console.error('AI Co-Pilot error:', error);
            // Non-critical, continue initialization
            console.warn('⚠️ AI Co-Pilot module unavailable');
        }
    },
    
    /**
     * Connect WebSocket for real-time updates
     */
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = 'ws://localhost:8002/ws';
                console.log('🔌 Connecting to WebSocket:', wsUrl);
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.setupWebSocketHandlers();
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };
                
                this.ws.onclose = () => {
                    console.warn('⚠️ WebSocket disconnected, attempting reconnect...');
                    setTimeout(() => this.reconnectWebSocket(), 5000);
                };
                
                // Timeout if connection takes too long
                setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        console.warn('⚠️ WebSocket timeout, continuing without real-time updates');
                        resolve(); // Don't block initialization
                    }
                }, 3000);
                
            } catch (error) {
                console.error('WebSocket setup error:', error);
                resolve(); // Don't block initialization
            }
        });
    },
    
    /**
     * Set up WebSocket message handlers
     */
    setupWebSocketHandlers() {
        if (!this.ws) return;
        
        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                
                switch (msg.type) {
                    case 'price_update':
                        this.handlePriceUpdate(msg.data);
                        break;
                        
                    case 'trade_executed':
                        this.handleTradeExecuted(msg.data);
                        break;
                        
                    case 'status_change':
                    case 'bot_status_change':
                        this.handleStatusChange(msg.data);
                        break;
                        
                    case 'ai_advice':
                        this.handleAIAdvice(msg.data);
                        break;
                        
                    case 'mode_change':
                        this.handleModeChange(msg.data);
                        break;
                        
                    case 'status':
                        // Initial status message on connect
                        this.handleStatusChange(msg.data);
                        break;
                        
                    case 'heartbeat':
                        // Silent heartbeat
                        break;
                        
                    default:
                        console.log('Unhandled WebSocket message:', msg.type);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
    },
    
    /**
     * Handle price update from WebSocket
     */
    handlePriceUpdate(data) {
        const price = data.price;
        this.currentPrice = price;
        
        // Update chart
        if (this.chart) {
            this.chart.updatePrice(price);
        }
        
        // Update P&L calculator
        if (this.pnlCalc) {
            this.pnlCalc.updatePrice(price);
        }
        
        // Update header price display
        this.updateHeaderPrice(price, data.change);
    },
    
    /**
     * Handle trade executed event
     */
    handleTradeExecuted(data) {
        console.log('📊 Trade executed:', data);
        
        // Mark on chart
        if (this.chart) {
            this.chart.markTrade({
                action: data.action,
                price: data.price,
                time: Date.now() / 1000
            });
        }
        
        // Update manual trading balance
        if (this.manualTrading) {
            this.manualTrading.updateBalance(data);
        }
        
        // Show notification
        this.showTradeNotification(data);
        
        // Refresh position data
        this.fetchPositionData().then(() => {
            if (this.pnlCalc) {
                this.pnlCalc.updatePosition(
                    this.position.amount,
                    this.position.entry_price
                );
            }
        });
    },
    
    /**
     * Handle bot status change
     */
    handleStatusChange(data) {
        console.log('⚡ Status change:', data);
        
        const statusBadge = document.getElementById('botStatus');
        if (statusBadge) {
            statusBadge.textContent = data.bot_running ? 'RUNNING' : 'STOPPED';
            statusBadge.className = data.bot_running ? 'badge bg-success' : 'badge bg-secondary';
        }
    },
    
    /**
     * Handle AI advice
     */
    handleAIAdvice(data) {
        console.log('🤖 AI Advice received:', data);
        
        if (this.aiCopilot) {
            this.aiCopilot.displayAdvice(data);
        }
    },
    
    /**
     * Handle mode change
     */
    handleModeChange(data) {
        console.log('🔧 Mode changed:', data);
        this.showNotification(`Bot mode: ${data.mode.toUpperCase()}`, 'info');
    },
    
    /**
     * Reconnect WebSocket after disconnect
     */
    reconnectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return; // Already connected
        }
        
        console.log('🔄 Reconnecting WebSocket...');
        this.connectWebSocket().catch(err => {
            console.error('Reconnect failed:', err);
        });
    },
    
    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        // AI Mode selector
        const aiModeSelect = document.getElementById('aiMode');
        if (aiModeSelect && this.aiCopilot) {
            aiModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                this.aiCopilot.setMode(mode);
                localStorage.setItem('aiMode', mode);
                console.log('AI mode changed to:', mode);
            });
        }
        
        // Ask AI button
        const askAIBtn = document.getElementById('askAI');
        const aiQuestionInput = document.getElementById('aiQuestion');
        if (askAIBtn && aiQuestionInput && this.aiCopilot) {
            askAIBtn.addEventListener('click', () => {
                const question = aiQuestionInput.value.trim();
                if (question) {
                    this.aiCopilot.askAI(question);
                    aiQuestionInput.value = ''; // Clear input
                }
            });
            
            // Enter key to ask
            aiQuestionInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    askAIBtn.click();
                }
            });
        }
        
        // Timeframe buttons
        const timeframeButtons = document.querySelectorAll('.timeframe-btn');
        timeframeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeframe = e.target.dataset.timeframe;
                if (timeframe && this.chart) {
                    this.chart.changeTimeframe(timeframe);
                    localStorage.setItem('chartTimeframe', timeframe);
                    
                    // Update active state
                    timeframeButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
            });
        }
        
        console.log('✅ Event listeners registered');
    },
    
    /**
     * Start background update tasks
     */
    startBackgroundTasks() {
        // Update timestamp display every second
        setInterval(() => {
            this.updateTimestamp();
        }, 1000);
        
        // Refresh position data every 30 seconds
        setInterval(() => {
            this.fetchPositionData();
        }, 30000);
        
        console.log('✅ Background tasks started');
    },
    
    /**
     * Load grid trading levels and mark on chart
     */
    async loadGridLevels() {
        try {
            const response = await fetch('http://localhost:8002/api/grid/levels');
            if (!response.ok) return;
            
            const levels = await response.json();
            
            if (this.chart) {
                // Add horizontal lines for buy/sell thresholds
                this.chart.addHorizontalLine(levels.buy_threshold_price, 'green', 'Buy Level');
                this.chart.addHorizontalLine(levels.sell_threshold_price, 'red', 'Sell Level');
            }
            
            console.log('✅ Grid levels loaded:', levels);
        } catch (error) {
            console.error('Grid levels error:', error);
        }
    },
    
    /**
     * Get current market context for AI
     */
    getMarketContext() {
        return {
            price: this.currentPrice,
            position: this.position,
            pnl: this.pnlCalc ? this.pnlCalc.calculateUnrealizedPnL() : 0,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Update header price display
     */
    updateHeaderPrice(price, change) {
        const priceEl = document.getElementById('currentPrice');
        const changeEl = document.getElementById('priceChange');
        
        if (priceEl) {
            priceEl.textContent = this.formatCurrency(price);
            
            // Add flash animation
            priceEl.classList.remove('price-flash-up', 'price-flash-down');
            void priceEl.offsetWidth; // Trigger reflow
            
            if (change > 0) {
                priceEl.classList.add('price-flash-up');
            } else if (change < 0) {
                priceEl.classList.add('price-flash-down');
            }
        }
        
        if (changeEl && change !== undefined) {
            changeEl.textContent = this.formatPercent(change);
            changeEl.className = 'price-change ' + (change >= 0 ? 'positive' : 'negative');
        }
    },
    
    /**
     * Update timestamp display
     */
    updateTimestamp() {
        const timestampEl = document.getElementById('lastUpdate');
        if (timestampEl) {
            const now = new Date();
            timestampEl.textContent = now.toLocaleTimeString();
        }
    },
    
    /**
     * Show trade notification
     */
    showTradeNotification(trade) {
        const emoji = trade.action === 'BUY' ? '🟢' : '🔴';
        const message = `${emoji} ${trade.action} ${trade.amount} BTC at $${this.formatNumber(trade.price)}`;
        
        this.showNotification(message, trade.action === 'BUY' ? 'success' : 'danger');
        
        // Flash screen effect
        this.flashScreen(trade.action === 'BUY' ? 'green' : 'red');
        
        // Play sound if enabled
        this.playTradeSound(trade.action);
    },
    
    /**
     * Show notification toast
     */
    showNotification(message, type = 'info') {
        // Use Bootstrap toast if available
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = `toast align-items-center text-white bg-${type} border-0`;
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            `;
            toastContainer.appendChild(toast);
            
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
            
            // Remove after hidden
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
            });
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },
    
    /**
     * Flash screen effect
     */
    flashScreen(color) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${color};
            opacity: 0.2;
            pointer-events: none;
            z-index: 9999;
            animation: flashFade 0.5s ease-out;
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.remove(), 500);
    },
    
    /**
     * Play trade sound
     */
    playTradeSound(action) {
        const soundEnabled = localStorage.getItem('tradeSoundsEnabled') !== 'false';
        if (!soundEnabled) return;
        
        // Could add audio elements here
        // const audio = new Audio(action === 'BUY' ? '/sounds/buy.mp3' : '/sounds/sell.mp3');
        // audio.play().catch(err => console.log('Sound play failed:', err));
    },
    
    /**
     * Refresh all data
     */
    async refreshAllData() {
        console.log('🔄 Refreshing all data...');
        
        try {
            await this.fetchPositionData();
            
            if (this.chart) {
                await this.chart.refresh();
            }
            
            if (this.pnlCalc) {
                this.pnlCalc.updatePosition(
                    this.position.amount,
                    this.position.entry_price
                );
            }
            
            this.showNotification('Data refreshed', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
            this.showNotification('Refresh failed', 'error');
        }
    },
    
    /**
     * Format currency
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    },
    
    /**
     * Format percent
     */
    formatPercent(value) {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    },
    
    /**
     * Format number
     */
    formatNumber(value, decimals = 2) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TerminalInit.init().catch(err => {
        console.error('Fatal initialization error:', err);
    });
});

// Add flash animation CSS if not present
if (!document.getElementById('terminal-animations')) {
    const style = document.createElement('style');
    style.id = 'terminal-animations';
    style.textContent = `
        @keyframes flashFade {
            from { opacity: 0.2; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Export for external use
window.TerminalInit = TerminalInit;
