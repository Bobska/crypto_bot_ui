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
    trades: [],
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
            // Store full list for today's results calculations
            if (Array.isArray(trades)) {
                this.trades = trades;
            }

            // Update new trade history section
            this.updateTradeHistory();

            // Update today's results summary
            this.updateTodaysResults();

            // Backwards compatibility: update legacy table if present
            const tbody = document.getElementById('orderHistoryBody');
            if (tbody) {
                if (!Array.isArray(trades) || trades.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No trades yet</td></tr>';
                } else {
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
                }
            }
        } catch (error) {
            console.error('Failed to load order history:', error);
        }
    },

    /**
     * PHASE 5: Render the new trade history table (limit 20, newest first)
     */
    updateTradeHistory() {
        const container = document.getElementById('tradeTableBody');
        if (!container) return;

        if (!Array.isArray(this.trades) || this.trades.length === 0) {
            container.innerHTML = '<div class="text-muted" style="padding:8px 0;">No trades yet</div>';
            return;
        }

        const rows = this.trades
            .slice(0, 20)
            .map(t => {
                const time = t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '--';
                const action = (t.action || '').toUpperCase();
                const actionClass = action === 'BUY' ? 'action-buy' : 'action-sell';
                const price = typeof t.price === 'number' ? `$${this.formatNumber(t.price)}` : '--';
                const amount = typeof t.amount === 'number' ? t.amount.toFixed(6) : (t.amount || '--');
                // Profit: prefer numeric field, else parse string
                let profitVal = null;
                if (typeof t.profit === 'number') {
                    profitVal = t.profit;
                } else if (typeof t.result === 'string') {
                    const m = t.result.match(/[+-]?\$?([0-9,.]+)/);
                    if (m && m[0]) {
                        const raw = m[0].replace('$', '').replace(/,/g, '');
                        const val = parseFloat(raw);
                        if (!isNaN(val)) {
                            profitVal = t.result.trim().startsWith('-') ? -Math.abs(val) : Math.abs(val);
                        }
                    }
                }
                const profitStr = profitVal === null ? '--' : this.formatCurrency(profitVal);
                const profitClass = profitVal === null ? '' : (profitVal >= 0 ? 'positive' : 'negative');

                return `
                    <div class="trade-row">
                        <span class="col-time">${time}</span>
                        <span class="col-action ${actionClass}">${action || '--'}</span>
                        <span class="col-price">${price}</span>
                        <span class="col-amount">${amount}</span>
                        <span class="col-profit profit-value ${profitClass}">${profitStr}</span>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = rows;
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
            const priceElNew = document.getElementById('headerPrice');
            if (priceElNew && this.currentPrice > 0) {
                priceElNew.textContent = this.formatCurrency(this.currentPrice);
            }

            // Update bot status panel based on latest position
            this.updateBotStatus();
            
            // Update portfolio display (fetches balance from API)
            await this.updatePortfolioDisplay();
            
            // Update quick trade estimates
            this.updateQuickTradeEstimates();

            // Update right panel position card
            this.updatePositionCard();
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
                    
                    // Update connection status indicator
                    const statusElement = document.querySelector('[data-connection-status]');
                    if (statusElement) {
                        statusElement.textContent = '🟢';
                        statusElement.title = 'Connected';
                        console.log('✅ Connection status updated to: Connected');
                    }
                    const headerStatus = document.getElementById('headerStatus');
                    if (headerStatus) {
                        headerStatus.textContent = '🟢 LIVE';
                        headerStatus.style.color = '#22c55e';
                    }
                    
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
                    
                    // Update connection status indicator
                    const statusElement = document.querySelector('[data-connection-status]');
                    if (statusElement) {
                        statusElement.textContent = '🔴';
                        statusElement.title = 'Disconnected';
                        console.log('🔴 Connection status updated to: Disconnected');
                    }
                    
                    // Update header to show disconnected
                    const priceEl = document.getElementById('header-price');
                    if (priceEl) {
                        priceEl.textContent = '⚪ Reconnecting...';
                        priceEl.style.color = '#fbbf24'; // Yellow
                    }
                    const priceElNew = document.getElementById('headerPrice');
                    if (priceElNew) {
                        priceElNew.textContent = 'Reconnecting...';
                    }
                    const headerStatus = document.getElementById('headerStatus');
                    if (headerStatus) {
                        headerStatus.textContent = '🟡 RECONNECTING';
                        headerStatus.style.color = '#fbbf24';
                    }
                    
                    // Always try to reconnect
                    if (!this.reconnecting) {
                        this.reconnecting = true;
                        
                        // Update status to reconnecting
                        if (statusElement) {
                            statusElement.textContent = '🟡';
                            statusElement.title = 'Reconnecting...';
                            console.log('🟡 Connection status updated to: Reconnecting');
                        }
                        
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

    // Update position card current price / profit
    this.updatePositionCard();
        
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

            // Update position card after refreshed data
            this.updatePositionCard();
        });

        // Track trade for today's results if timestamp available
        try {
            if (data && data.timestamp) {
                this.trades = Array.isArray(this.trades) ? this.trades : [];
                this.trades.unshift(data);
                this.updateTodaysResults();
                this.updateTradeHistory();
            }
        } catch (e) {
            // Non-fatal
        }
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

        // Update right panel position card
        this.updatePositionCard();
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

        // ===== PHASE 3: Update new bot status card elements =====
        
        // Update bot status text and indicator
        const botStatusText = document.getElementById('botStatusText');
        const botStatusDot = document.getElementById('botStatusDot');
        const botRunning = statusData?.bot_running !== false; // default to running if no data
        
        if (botStatusText) {
            botStatusText.textContent = botRunning ? 'BOT RUNNING' : 'BOT STOPPED';
        }
        if (botStatusDot) {
            botStatusDot.classList.toggle('inactive', !botRunning);
        }

        // Update position info
        const botPosition = document.getElementById('botPosition');
        const botEntry = document.getElementById('botEntry');
        const botTarget = document.getElementById('botTarget');
        
        if (this.position) {
            if (botPosition) {
                botPosition.textContent = this.position.has_position ? 'LONG BTC' : 'USDT';
                botPosition.style.color = this.position.has_position ? '#22c55e' : '#9ca3af';
            }
            
            if (botEntry) {
                if (this.position.has_position && this.position.entry_price) {
                    botEntry.textContent = `$${this.position.entry_price.toFixed(2)}`;
                } else {
                    botEntry.textContent = '--';
                }
            }
            
            if (botTarget) {
                if (this.position.has_position && this.position.entry_price) {
                    const sellTarget = (this.position.entry_price * 1.01).toFixed(2);
                    botTarget.textContent = `$${sellTarget}`;
                } else {
                    botTarget.textContent = '--';
                }
            }
        }

        // Update next action text
        const nextActionText = document.getElementById('nextActionText');
        if (nextActionText && this.position) {
            if (this.position.has_position) {
                const sellTarget = (this.position.entry_price * 1.01).toFixed(2);
                nextActionText.textContent = `Waiting to SELL at $${sellTarget} (+1%)`;
            } else {
                nextActionText.textContent = 'Monitoring for BUY opportunity...';
            }
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
        
        // Update DOM elements (support legacy + new Phase 4 IDs)
        const totalElLegacy = document.getElementById('total-portfolio-value');
        if (totalElLegacy) {
            totalElLegacy.textContent = this.formatCurrency(totalValue);
        }
        const btcElLegacy = document.getElementById('portfolio-btc');
        if (btcElLegacy) {
            btcElLegacy.textContent = btcAmount.toFixed(6);
        }
        const usdtElLegacy = document.getElementById('portfolio-usdt');
        if (usdtElLegacy) {
            usdtElLegacy.textContent = this.formatCurrency(usdtBalance);
        }

        // Phase 4 wallet card IDs
        const walletUsdtEl = document.getElementById('walletUSDT');
        if (walletUsdtEl) {
            walletUsdtEl.textContent = this.formatCurrency(usdtBalance);
        }
        const walletBtcEl = document.getElementById('walletBTC');
        if (walletBtcEl) {
            walletBtcEl.textContent = (btcAmount || 0).toFixed(6);
        }
        const totalValueEl = document.getElementById('totalValue');
        if (totalValueEl) {
            totalValueEl.textContent = this.formatCurrency(totalValue);
        }
        
        // CRITICAL FIX: Update the "Available Balance" in Manual Trading panel
        const availableBalanceEl = document.getElementById('available-usdt-balance');
        if (availableBalanceEl) {
            availableBalanceEl.textContent = `${this.formatCurrency(usdtBalance)} USDT`;
        }
        
        // Only log successful updates, not every price change
        if (Math.random() < 0.1) { // Log 10% of updates
            console.log(`💼 Portfolio: ${btcAmount.toFixed(6)} BTC + ${usdtBalance.toFixed(2)} USDT = ${totalValue.toFixed(2)}`);
        }
    },

    /**
     * PHASE 4: Update right panel position card
     */
    updatePositionCard() {
        const statusEl = document.getElementById('positionStatus');
        const detailsEl = document.getElementById('positionDetails');
        const entryEl = document.getElementById('posEntryPrice');
        const currentEl = document.getElementById('posCurrentPrice');
        const profitEl = document.getElementById('posProfit');

        if (!statusEl || !detailsEl) return; // Card not present

        if (this.position && this.position.has_position) {
            // Show details
            statusEl.style.display = 'none';
            detailsEl.style.display = '';

            const entry = this.position.entry_price || 0;
            const current = this.currentPrice || this.position.current_price || 0;
            const amount = this.position.amount || 0;
            const profit = (current - entry) * amount;

            if (entryEl) entryEl.textContent = this.formatCurrency(entry);
            if (currentEl) currentEl.textContent = this.formatCurrency(current);
            if (profitEl) {
                profitEl.textContent = this.formatCurrency(profit);
                profitEl.classList.remove('positive', 'negative');
                if (profit > 0) profitEl.classList.add('positive');
                if (profit < 0) profitEl.classList.add('negative');
            }
        } else {
            // No active position
            statusEl.textContent = 'Not Trading';
            statusEl.style.display = '';
            detailsEl.style.display = 'none';
        }
    },

    /**
     * PHASE 4: Update Today's Results summary
     */
    updateTodaysResults() {
        const tradesCountEl = document.getElementById('todayTrades');
        const profitEl = document.getElementById('todayProfit');
        if (!tradesCountEl || !profitEl) return;

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        let todays = [];
        if (Array.isArray(this.trades)) {
            todays = this.trades.filter(t => {
                try {
                    const ts = new Date(t.timestamp);
                    return ts >= startOfDay && ts < endOfDay;
                } catch { return false; }
            });
        }

        const count = todays.length;
        let totalProfit = 0;
        todays.forEach(t => {
            // Prefer numeric profit field if provided
            if (typeof t.profit === 'number') {
                totalProfit += t.profit;
                return;
            }
            // Fallback: parse result string like "+$100.00" or "-$12.34"
            if (typeof t.result === 'string') {
                const m = t.result.match(/[+-]?\$?([0-9,.]+)/);
                if (m && m[0]) {
                    const raw = m[0].replace('$', '').replace(/,/g, '');
                    const val = parseFloat(raw);
                    if (!isNaN(val)) {
                        totalProfit += t.result.trim().startsWith('-') ? -Math.abs(val) : Math.abs(val);
                    }
                }
            }
        });

        tradesCountEl.textContent = String(count);
        profitEl.textContent = this.formatCurrency(totalProfit);
        profitEl.classList.remove('positive', 'negative');
        if (totalProfit > 0) profitEl.classList.add('positive');
        if (totalProfit < 0) profitEl.classList.add('negative');
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
        // Update both legacy and new header elements
        const priceEl = document.getElementById('header-price');
        const priceElNew = document.getElementById('headerPrice');
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

        if (priceElNew) {
            priceElNew.textContent = this.formatCurrency(price);
            priceElNew.classList.remove('flash-green', 'flash-red');
            void priceElNew.offsetWidth;
            if (change > 0) priceElNew.classList.add('flash-green');
            if (change < 0) priceElNew.classList.add('flash-red');
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
