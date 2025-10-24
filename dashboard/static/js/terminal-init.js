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
    reconnecting: false,
    pingInterval: null,
    
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

            // 10. Load recent order history into the table
            await this.loadOrderHistory();
            
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
     * Load recent order history and render top 3 rows
     */
    async loadOrderHistory() {
        try {
            const response = await fetch('http://localhost:8002/api/trades/recent');
            if (!response || !response.ok) return;

            const trades = await response.json();

            const tbody = document.getElementById('orderHistoryBody');
            if (!tbody) return;

            if (!Array.isArray(trades) || trades.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No trades yet</td></tr>';
                return;
            }

            tbody.innerHTML = trades.slice(0, 3).map(trade => `
                <tr>
                    <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
                    <td><span class="badge bg-${trade.action === 'BUY' ? 'success' : 'danger'}">${trade.action}</span></td>
                    <td>${trade.amount || '0.001'}</td>
                    <td class="${trade.result && trade.result.includes('+') ? 'text-success' : 'text-danger'}">
                        ${trade.result || '--'}
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Failed to load order history:', error);
        }
    },
    
    /**
     * Initialize TradingChart component - LIVE DATA ONLY
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
            
            // Load historical data - will show empty chart if API fails
            const symbol = 'BTC/USDT';
            const timeframe = localStorage.getItem('chartTimeframe') || '1h';
            
            try {
                await this.chart.loadHistoricalData(symbol, timeframe);
                console.log('✅ Chart initialized with LIVE data');
            } catch (error) {
                console.error('❌ Failed to load chart data from API:', error);
                this.showNotification('Chart data unavailable - Bot API not responding', 'error');
                // Chart will be empty - no fallback data
            }
            
        } catch (error) {
            console.error('❌ Chart initialization error:', error);
            throw new Error('Chart init failed: ' + error.message);
        }
    },
    
    /**
     * Fetch current position and balance data - LIVE DATA ONLY
     */
    async fetchPositionData() {
        try {
            const response = await fetch('http://localhost:8002/api/position/pnl', {
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.position = await response.json();
            this.currentPrice = this.position.current_price || 0;
            
            console.log('✅ Position data loaded (LIVE):', this.position);
            
            // Show static data indicator until WebSocket updates
            const priceEl = document.getElementById('header-price');
            if (priceEl && this.currentPrice > 0) {
                priceEl.textContent = '⚪ ' + this.formatCurrency(this.currentPrice) + ' STATIC';
                priceEl.style.color = '#fbbf24'; // Yellow/orange for static
                priceEl.style.fontWeight = 'bold';
            }

            // Update bot status panel based on latest position
            this.updateBotStatus();
            
            // Update portfolio display (fetches balance from API)
            await this.updatePortfolioDisplay();
            
            // Update quick trade estimates
            this.updateQuickTradeEstimates();
        } catch (error) {
            console.error('❌ Position fetch error:', error);
            // NO FALLBACK - Show empty/zero to indicate data is not live
            this.position = {
                has_position: false,
                amount: 0,
                entry_price: 0,
                current_price: 0,
                unrealized_pnl: 0,
                unrealized_pnl_pct: 0
            };
            console.error('❌ API NOT RESPONDING - Showing zero values');
            this.showNotification('Bot API not responding - check if server is running', 'error');
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
            
            // FIXED: Pass object instead of separate parameters
            this.pnlCalc = new PnLCalculator({
                amount: this.position.amount,
                entryPrice: this.position.entry_price,
                currentPrice: this.currentPrice,
                position: this.position.has_position ? 'BTC' : 'USDT',
                feeRate: 0.001
            });
            
            // Render to DOM
            this.pnlCalc.renderToDOM('pnlContainer');
            
            if (this.position.has_position) {
                console.log('✅ P&L Calculator initialized with LIVE position');
            } else {
                console.warn('⚠️ P&L Calculator initialized - NO ACTIVE POSITION');
            }
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
                let connected = false;
                
                this.ws.onopen = () => {
                    connected = true;
                    console.log('✅ WebSocket connected - LIVE UPDATES ENABLED');
                    this.showNotification('Real-time updates connected', 'success');
                    this.setupWebSocketHandlers();
                    
                    // CRITICAL: Start ping interval to keep connection alive (25s < 30s server timeout)
                    this.pingInterval = setInterval(() => {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ type: 'ping' }));
                            console.log('🏓 Ping sent to keep connection alive');
                        } else {
                            console.log('⚠️ WebSocket not open, clearing ping interval');
                            clearInterval(this.pingInterval);
                            this.pingInterval = null;
                        }
                    }, 25000); // Send ping every 25 seconds
                    
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };
                
                this.ws.onclose = (event) => {
                    console.warn(`❌ WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'None'}`);
                    
                    // Clear ping interval when connection closes
                    if (this.pingInterval) {
                        clearInterval(this.pingInterval);
                        this.pingInterval = null;
                        console.log('🛑 Ping interval cleared');
                    }
                    
                    // Update header to show disconnected
                    const priceEl = document.getElementById('header-price');
                    if (priceEl) {
                        priceEl.textContent = '⚪ Reconnecting...';
                        priceEl.style.color = '#fbbf24'; // Yellow
                    }
                    
                    // Always try to reconnect
                    if (!this.reconnecting) {
                        this.reconnecting = true;
                        setTimeout(() => {
                            this.reconnecting = false;
                            this.connectWebSocket().catch(err => {
                                console.error('Reconnect failed:', err);
                            });
                        }, 3000); // 3 seconds
                    }
                };
                
                // Timeout if connection takes too long (10 seconds)
                setTimeout(() => {
                    if (!connected && this.ws.readyState !== WebSocket.OPEN) {
                        console.warn('⚠️ WebSocket connection timeout - continuing without real-time updates');
                        console.warn('   Make sure the Bot API is running on port 8002');
                        resolve(); // Don't block initialization
                    }
                }, 10000);
                
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
                
                // Ignore pong responses from server
                if (msg.type === 'pong') {
                    console.log('🏓 Pong received from server');
                    return;
                }
                
                // Ignore heartbeat messages
                if (msg.type === 'heartbeat') {
                    console.log('💓 Heartbeat received from server');
                    return;
                }
                
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
     * Handle price update from WebSocket - LIVE DATA ONLY
     */
    handlePriceUpdate(data) {
        const price = data.price;
        this.currentPrice = price;
        
        console.log(`💹 LIVE Price Update: $${price.toFixed(2)}`);
        
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
        
        // Update portfolio display with new price
        this.updatePortfolioDisplay();
        
        // Update quick trade estimates
        this.updateQuickTradeEstimates();
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
        
        // Refresh position data ONCE (no timers) and update PnL calculator
        this.fetchPositionData().then(() => {
            if (this.pnlCalc) {
                this.pnlCalc.amount = this.position.amount;
                this.pnlCalc.entryPrice = this.position.entry_price;
                this.pnlCalc.position = this.position.has_position ? 'BTC' : 'USDT';
                // Re-render with updated values and recalc using current price
                this.pnlCalc.updatePrice(this.currentPrice);
                this.pnlCalc.renderToDOM('pnlContainer');
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

        // Update the Bot Status panel details
        this.updateBotStatus(data);
    },

    /**
     * Update Bot Status panel (strategy, next action, target price)
     */
    updateBotStatus(statusData) {
        // Strategy display
        let strategyEl = document.getElementById('botStrategy');
        if (!strategyEl) {
            // Fallback: find the Strategy row's value element
            const rows = document.querySelectorAll('.terminal-card .info-row');
            for (const row of rows) {
                const label = row.querySelector('.info-label');
                const value = row.querySelector('.info-value');
                if (label && value && label.textContent.trim().toLowerCase() === 'strategy') {
                    strategyEl = value;
                    break;
                }
            }
        }
        if (strategyEl) {
            strategyEl.textContent = 'Grid Trading';
        }

        // Next action (support both camelCase and kebab-case ids)
        const nextActionEl = document.getElementById('nextAction') || document.getElementById('next-action');
        if (nextActionEl && this.position) {
            if (this.position.has_position) {
                // Holding BTC - waiting to sell
                const sellTarget = (this.position.entry_price * 1.01).toFixed(2);
                nextActionEl.textContent = `SELL at $${sellTarget}`;
            } else {
                // Holding USDT - waiting to buy
                nextActionEl.textContent = 'BUY on dip';
            }
        }

        // Target price (support both camelCase and kebab-case ids)
        const targetEl = document.getElementById('targetPrice') || document.getElementById('target-price');
        if (targetEl && this.position && this.position.has_position) {
            const sellTarget = (this.position.entry_price * 1.01).toFixed(2);
            targetEl.textContent = `$${sellTarget}`;
        }
    },

    /**
     * Update Portfolio display with real balance data from API
     */
    async updatePortfolioDisplay() {
        if (!this.position) return;
        
        const btcAmount = this.position.amount || 0;
        
        // Fetch REAL balance with longer timeout and fallback
        let usdtBalance = 950.00; // fallback
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const statusResponse = await fetch('http://localhost:8002/api/status', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (statusResponse.ok) {
                const status = await statusResponse.json();
                usdtBalance = status.balance?.USDT || usdtBalance;
            }
        } catch (error) {
            // Use cached balance on error - don't log as this is expected during price updates
            // Only log if it's not a timeout
            if (error.name !== 'AbortError') {
                console.warn('Could not fetch balance:', error.message);
            }
        }
        
        const btcValue = btcAmount * this.currentPrice;
        const totalValue = btcValue + usdtBalance;
        
        // Update DOM elements (template uses kebab-case IDs)
        const totalEl = document.getElementById('total-portfolio-value');
        if (totalEl) {
            totalEl.textContent = this.formatCurrency(totalValue); // Shows cents
        }
        
        const btcEl = document.getElementById('portfolio-btc');
        if (btcEl) {
            btcEl.textContent = btcAmount.toFixed(6); // 6 decimals for BTC
        }
        
        const usdtEl = document.getElementById('portfolio-usdt');
        if (usdtEl) {
            usdtEl.textContent = this.formatCurrency(usdtBalance); // Shows cents
        }
        
        // Only log successful updates, not every price change
        if (Math.random() < 0.1) { // Log 10% of updates
            console.log(`💼 Portfolio: ${btcAmount.toFixed(6)} BTC + ${usdtBalance.toFixed(2)} USDT = ${totalValue.toFixed(2)}`);
        }
    },

    /**
     * Update Quick Trade estimates with current price
     */
    updateQuickTradeEstimates() {
        const amounts = [0.001, 0.01, 0.1];
        
        amounts.forEach((amount, index) => {
            const value = amount * this.currentPrice;
            
            // Update the estimate span inside each option
            const estimateEl = document.getElementById(`quickTradeEstimate${index}`);
            if (estimateEl) {
                estimateEl.textContent = `~${this.formatCurrency(value)}`;
            }
        });
        
        // Update the main estimated value display
        const selectedAmount = parseFloat(document.getElementById('quick-trade-amount')?.value || 0.01);
        const selectedValue = selectedAmount * this.currentPrice;
        const valueEl = document.getElementById('quick-trade-value');
        if (valueEl) {
            valueEl.textContent = this.formatCurrency(selectedValue);
        }
        
        // Update manual trading estimates if ManualTrading is initialized
        if (this.manualTrading && typeof this.manualTrading.updateTradeValue === 'function') {
            this.manualTrading.updateTradeValue();
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
        
        if (this.reconnecting) {
            console.log('⏳ Reconnection already in progress...');
            return; // Prevent multiple simultaneous reconnection attempts
        }
        
        console.log('🔄 Reconnecting WebSocket...');
        this.reconnecting = true;
        
        this.connectWebSocket().catch(err => {
            console.error('Reconnect failed:', err);
        }).finally(() => {
            this.reconnecting = false;
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
        // Update timestamp display every second (only allowed interval)
        setInterval(() => {
            this.updateTimestamp();
        }, 1000);
        
        console.log('✅ Timestamp updater started');
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
     * Update header price display - LIVE DATA INDICATOR
     */
    updateHeaderPrice(price, change) {
        // CORRECT IDs for trading terminal
        const priceEl = document.getElementById('header-price');
        const changeEl = document.getElementById('header-change');
        const timestampEl = document.getElementById('header-timestamp');
        
        if (priceEl) {
            // Show LIVE indicator
            priceEl.textContent = '🔴 ' + this.formatCurrency(price) + ' LIVE';
            priceEl.style.fontWeight = 'bold';
            priceEl.style.color = '#22c55e'; // Green for live
            
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
            const icon = change >= 0 ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
            changeEl.innerHTML = icon + ' ' + this.formatPercent(change);
            changeEl.className = 'price-change ' + (change >= 0 ? 'positive' : 'negative');
        }
        
        // Update timestamp to show it's live
        if (timestampEl) {
            const now = new Date();
            timestampEl.textContent = now.toLocaleTimeString();
        }
    },
    
    /**
     * Update timestamp display
     */
    updateTimestamp() {
        const timestampEl = document.getElementById('header-timestamp');
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
                // Update fields directly and re-render (no updatePosition API)
                this.pnlCalc.amount = this.position.amount;
                this.pnlCalc.entryPrice = this.position.entry_price;
                this.pnlCalc.position = this.position.has_position ? 'BTC' : 'USDT';
                this.pnlCalc.updatePrice(this.currentPrice);
                this.pnlCalc.renderToDOM('pnlContainer');
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
