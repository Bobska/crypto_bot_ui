/**
 * TradingChart - Manages TradingView Lightweight Charts
 * Handles candlestick data, volume, trade markers, and real-time updates
 */
class TradingChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Check if LightweightCharts is loaded
        if (typeof LightweightCharts === 'undefined') {
            console.error('LightweightCharts library not loaded. Please include the CDN script before trading-chart.js');
            return;
        }

        this.chart = null;
        this.candleSeries = null;
        this.volumeSeries = null;
        this.markers = [];
        this.priceLines = {};
        this.currentTimeframe = localStorage.getItem('chartTimeframe') || '1h';
        this.symbol = 'BTC/USDT';
        this.lastCandle = null;
        
        this.initializeChart();
        this.setupResizeHandler();
    }

    /**
     * Initialize the chart with dark theme configuration
     */
    initializeChart() {
        try {
            console.log('Creating chart with LightweightCharts:', typeof LightweightCharts);
            if (LightweightCharts && LightweightCharts.version) {
                console.log('LightweightCharts version:', LightweightCharts.version);
            }
            console.log('Container:', this.container);
            console.log('Container dimensions:', this.container.clientWidth, 'x', this.container.clientHeight);
            
            const chartOptions = {
                layout: {
                    background: { color: '#1a1a2e' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#2a2a3e' },
                    horzLines: { color: '#2a2a3e' },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                    vertLine: {
                        color: '#758696',
                        width: 1,
                        style: 3, // dashed
                        labelBackgroundColor: '#3b82f6',
                    },
                    horzLine: {
                        color: '#758696',
                        width: 1,
                        style: 3,
                        labelBackgroundColor: '#3b82f6',
                    },
                },
                timeScale: {
                    borderColor: '#485c7b',
                    timeVisible: true,
                    secondsVisible: false,
                    rightOffset: 12,
                    barSpacing: 10,
                },
                rightPriceScale: {
                    borderColor: '#485c7b',
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.2,
                    },
                },
                width: this.container.clientWidth,
                height: 500,
            };

            this.chart = LightweightCharts.createChart(this.container, chartOptions);
            console.log('Chart created:', this.chart);
            console.log('Chart methods:', Object.keys(this.chart));
            console.log('typeof chart.addCandlestickSeries:', typeof (this.chart && this.chart.addCandlestickSeries));

            if (!this.chart || typeof this.chart.addCandlestickSeries !== 'function') {
                console.error('Chart object is invalid or missing addCandlestickSeries method');
                console.error('Chart type:', typeof this.chart);
                console.error('Available methods:', this.chart ? Object.keys(this.chart) : 'null');
                return;
            }

            // Add candlestick series
            this.candleSeries = this.chart.addCandlestickSeries({
                upColor: '#22c55e',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#22c55e',
                wickDownColor: '#ef4444',
        });

            // Add volume series (histogram below main chart)
            this.volumeSeries = this.chart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '', // empty string means overlay on main price scale
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });

            console.log('TradingChart initialized successfully');
            console.log('Candlestick series:', this.candleSeries);
            console.log('Volume series:', this.volumeSeries);
        } catch (error) {
            console.error('Error initializing TradingChart:', error);
            console.error('Error stack:', error.stack);
        }
    }

    /**
     * Load historical candle data - LIVE DATA ONLY
     * @param {string} symbol - Trading pair (e.g., 'BTC/USDT')
     * @param {string} timeframe - Timeframe (e.g., '1H', '4H', '1D', '1W')
     */
    async loadHistoricalData(symbol = 'BTC/USDT', timeframe = '1D') {
        this.symbol = symbol;
        this.currentTimeframe = timeframe;

        try {
            console.log(`📊 Fetching ${symbol} ${timeframe} candles...`);
            
            // Remove slash from symbol (BTC/USDT -> BTCUSDT) to match Binance format
            const symbolClean = symbol.replace('/', '');
            
            // Fetch from Bot API - ensure it returns LATEST candles
            const response = await fetch(`http://localhost:8002/api/candles/${symbolClean}/${timeframe}?limit=100`);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            let candles = await response.json();
            
            if (!candles || candles.length === 0) {
                throw new Error('No candle data returned from API');
            }
            
            // Sort by time to ensure chronological order
            candles.sort((a, b) => a.time - b.time);

            // For longer timeframes, only keep recent data to avoid testnet price anomalies
            const now = Math.floor(Date.now() / 1000);
            const tf = (timeframe || '').toLowerCase();
            const maxAgeSeconds = {
                '1m': 2 * 24 * 3600,    // 2 days
                '5m': 3 * 24 * 3600,    // 3 days
                '15m': 5 * 24 * 3600,   // 5 days
                '1h': 7 * 24 * 3600,    // 1 week
                '4h': 14 * 24 * 3600,   // 2 weeks
                '1d': 30 * 24 * 3600,   // 1 month
                '1w': 60 * 24 * 3600    // 2 months
            };
            const maxAge = maxAgeSeconds[tf] || (7 * 24 * 3600);
            const cutoffTime = now - maxAge;

            candles = candles.filter(c => c.time >= cutoffTime);

            if (candles.length === 0) {
                throw new Error('No recent candles available for this timeframe');
            }

            console.log(`Filtered to ${candles.length} recent candles (last ${Math.floor(maxAge / 86400)} days)`);
            
            // Validate data freshness - last candle should be recent
            const lastCandle = candles[candles.length - 1];
            const lastCandleTime = lastCandle.time;
            const currentTime = Math.floor(Date.now() / 1000);
            const timeDiff = currentTime - lastCandleTime;
            
            console.log(`Last candle: ${new Date(lastCandleTime * 1000).toLocaleString()}`);
            console.log(`Current time: ${new Date(currentTime * 1000).toLocaleString()}`);
            console.log(`Time difference: ${Math.floor(timeDiff / 60)} minutes`);
            
            if (timeDiff > 7200) {
                console.warn('⚠️ WARNING: Candle data is OLD (>2 hours)');
                console.warn(`Last candle close: $${lastCandle.close}`);
            }
            
            // Set candlestick data
            this.candleSeries.setData(candles);
            
            // Set volume data
            const volumeData = candles.map(c => ({
                time: c.time,
                value: c.volume || 0,
                color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
            }));
            this.volumeSeries.setData(volumeData);
            
            // Store last candle for updatePrice() to continue from
            this.lastCandle = lastCandle;
            
            // Auto-fit chart to data
            this.chart.timeScale().fitContent();
            
            console.log(`✅ Loaded ${candles.length} candles for ${symbol} ${timeframe}`);
            console.log(`Price range: $${Math.min(...candles.map(c => c.low)).toFixed(2)} - $${Math.max(...candles.map(c => c.high)).toFixed(2)}`);
            
        } catch (error) {
            console.error('❌ Failed to load candles:', error);
            throw error;
        }
    }

    /**
     * Generate sample candlestick data for demonstration
     * @param {number} count - Number of candles to generate
     */
    generateSampleData(count) {
        const candles = [];
        const volumes = [];
        let basePrice = 45000;
        let baseTime = Math.floor(Date.now() / 1000) - (count * 86400); // Start count days ago

        for (let i = 0; i < count; i++) {
            const change = (Math.random() - 0.5) * 1000;
            const open = basePrice;
            const close = basePrice + change;
            const high = Math.max(open, close) + Math.random() * 500;
            const low = Math.min(open, close) - Math.random() * 500;
            const volume = Math.random() * 100 + 50;

            candles.push({
                time: baseTime + (i * 86400),
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
            });

            volumes.push({
                time: baseTime + (i * 86400),
                value: parseFloat(volume.toFixed(2)),
                color: close > open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            });

            basePrice = close;
        }

        return { candles, volumes };
    }

    /**
     * Add or update a real-time candle
     * @param {Object} candle - Candle data {time, open, high, low, close, volume}
     */
    addRealtimeCandle(candle) {
        if (!candle || !candle.time) {
            console.warn('Invalid candle data:', candle);
            return;
        }

        try {
            // Update candlestick
            this.candleSeries.update({
                time: candle.time,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close),
            });

            // Update volume
            if (candle.volume) {
                const isGreen = candle.close > candle.open;
                this.volumeSeries.update({
                    time: candle.time,
                    value: parseFloat(candle.volume),
                    color: isGreen ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                });
            }

            console.log('Real-time candle updated:', candle);
        } catch (error) {
            console.error('Error updating real-time candle:', error);
        }
    }

    /**
     * Mark a trade on the chart
     * @param {Object} trade - Trade data {timestamp, type, price, amount}
     */
    markTrade(trade) {
        if (!trade || !trade.timestamp || !trade.type || !trade.price) {
            console.warn('Invalid trade data:', trade);
            return;
        }

        const isBuy = trade.type.toUpperCase() === 'BUY';
        
        const marker = {
            time: trade.timestamp,
            position: isBuy ? 'belowBar' : 'aboveBar',
            color: isBuy ? '#22c55e' : '#ef4444',
            shape: isBuy ? 'arrowUp' : 'arrowDown',
            text: `${trade.type.toUpperCase()} @ $${parseFloat(trade.price).toFixed(2)}`,
        };

        // Add to markers array
        this.markers.push(marker);

        // Update chart markers
        this.candleSeries.setMarkers(this.markers);

        console.log('Trade marked on chart:', trade);
    }

    /**
     * Add grid trading level lines
     * @param {number} buyLevel - Buy threshold price
     * @param {number} sellLevel - Sell threshold price
     */
    addGridLines(buyLevel, sellLevel) {
        // Remove existing grid lines if any
        if (this.priceLines.buyLine) {
            this.candleSeries.removePriceLine(this.priceLines.buyLine);
        }
        if (this.priceLines.sellLine) {
            this.candleSeries.removePriceLine(this.priceLines.sellLine);
        }

        // Add buy level line
        if (buyLevel) {
            this.priceLines.buyLine = this.candleSeries.createPriceLine({
                price: parseFloat(buyLevel),
                color: '#22c55e',
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: `Buy Target: $${parseFloat(buyLevel).toFixed(2)}`,
            });
            console.log('Buy level line added:', buyLevel);
        }

        // Add sell level line
        if (sellLevel) {
            this.priceLines.sellLine = this.candleSeries.createPriceLine({
                price: parseFloat(sellLevel),
                color: '#ef4444',
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: `Sell Target: $${parseFloat(sellLevel).toFixed(2)}`,
            });
            console.log('Sell level line added:', sellLevel);
        }
    }

    /**
     * Add a horizontal line at a specific price
     * @param {number} price - Price level
     * @param {string} color - Line color (e.g., 'green', 'red', '#22c55e')
     * @param {string} label - Label text
     */
    addHorizontalLine(price, color, label) {
        if (!price) {
            console.warn('Invalid price for horizontal line:', price);
            return;
        }

        try {
            // Convert color names to hex
            const colorMap = {
                'green': '#22c55e',
                'red': '#ef4444',
                'blue': '#3b82f6',
                'yellow': '#f59e0b',
                'orange': '#f97316'
            };
            const lineColor = colorMap[color.toLowerCase()] || color;

            // Create price line
            const priceLine = this.candleSeries.createPriceLine({
                price: parseFloat(price),
                color: lineColor,
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: label || `$${parseFloat(price).toFixed(2)}`,
            });

            // Store reference
            const lineKey = label?.toLowerCase().replace(/\s+/g, '_') || `line_${price}`;
            this.priceLines[lineKey] = priceLine;

            console.log(`Horizontal line added: ${label} at $${price}`, lineColor);
            return priceLine;
        } catch (error) {
            console.error('Error adding horizontal line:', error);
        }
    }

    /**
     * Remove a horizontal line by key
     * @param {string} lineKey - Key of the line to remove
     */
    removeHorizontalLine(lineKey) {
        if (this.priceLines[lineKey]) {
            this.candleSeries.removePriceLine(this.priceLines[lineKey]);
            delete this.priceLines[lineKey];
            console.log(`Horizontal line removed: ${lineKey}`);
        }
    }

    /**
     * Update current price and the current candle in real-time
     * @param {number} price - Current price
     */
    updatePrice(price) {
        if (!this.candleSeries || !price) return;

        const currentTime = Math.floor(Date.now() / 1000);

        // Initialize lastCandle if not present
        if (!this.lastCandle) {
            this.lastCandle = {
                time: currentTime,
                open: parseFloat(price),
                high: parseFloat(price),
                low: parseFloat(price),
                close: parseFloat(price),
            };
        }

        // Determine interval length based on timeframe
        const timeframe = this.currentTimeframe || '1h';
        const intervalSeconds = this.getIntervalSeconds(timeframe);

        // Roll to a new candle if interval elapsed
        if ((currentTime - this.lastCandle.time) >= intervalSeconds) {
            this.lastCandle = {
                time: currentTime,
                open: parseFloat(price),
                high: parseFloat(price),
                low: parseFloat(price),
                close: parseFloat(price),
            };
        } else {
            // Update existing candle
            const p = parseFloat(price);
            this.lastCandle.high = Math.max(this.lastCandle.high, p);
            this.lastCandle.low = Math.min(this.lastCandle.low, p);
            this.lastCandle.close = p;
        }

        // Update the chart with the current candle
        this.candleSeries.update(this.lastCandle);

        // Update (and re-create) a current price line for visibility
        if (this.priceLines.currentPrice) {
            this.candleSeries.removePriceLine(this.priceLines.currentPrice);
        }
        this.priceLines.currentPrice = this.candleSeries.createPriceLine({
            price: parseFloat(price),
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: `Current: $${parseFloat(price).toFixed(2)}`,
        });

        // Flash effect on container
        this.flashContainer();

        console.log(`📊 Chart updated: $${parseFloat(price).toFixed(2)}`);
    }

    /**
     * Map timeframe string to seconds
     * @param {string} timeframe
     * @returns {number}
     */
    getIntervalSeconds(timeframe) {
        const tf = (timeframe || '').toString().toLowerCase();
        const intervals = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '30m': 1800,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400,
            '1w': 604800,
        };
        // Also support uppercase formats like '1H','4H','1D','1W'
        const upper = (timeframe || '').toString().toUpperCase();
        const upperMap = {
            '1H': 3600,
            '4H': 14400,
            '1D': 86400,
            '1W': 604800,
        };
        return intervals[tf] || upperMap[upper] || 3600;
    }

    /**
     * Flash the chart container briefly
     */
    flashContainer() {
        this.container.style.transition = 'box-shadow 0.3s ease';
        this.container.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
        
        setTimeout(() => {
            this.container.style.boxShadow = 'none';
        }, 300);
    }

    /**
     * Subscribe to WebSocket for real-time updates
     * @param {WebSocket} websocket - WebSocket connection
     */
    subscribeToWebSocket(websocket) {
        if (!websocket) {
            console.warn('No WebSocket provided for chart subscription');
            return;
        }

        this.websocket = websocket;

        // Listen for price updates
        const originalOnMessage = websocket.onMessage;
        websocket.onMessage = (data) => {
            // Call original handler
            if (originalOnMessage) {
                originalOnMessage.call(websocket, data);
            }

            // Handle chart-specific updates
            if (data.type === 'price_update' && data.data) {
                const price = data.data.price;
                if (price) {
                    // Update price will handle current candle updates
                    this.updatePrice(price);
                }
            }

            // Handle trade events
            if (data.type === 'trade_executed' && data.data) {
                const trade = {
                    timestamp: Math.floor(Date.now() / 1000),
                    type: data.data.type,
                    price: data.data.price,
                    amount: data.data.amount,
                };
                this.markTrade(trade);
            }
        };

        console.log('Chart subscribed to WebSocket updates');
    }

    /**
     * Change timeframe and reload data with proper async handling
     * @param {string} timeframe - New timeframe ('1m', '5m', '1h', '4h', '1d', '1w')
     */
    async changeTimeframe(timeframe) {
        console.log(`📊 Changing timeframe to: ${timeframe}`);
        
        this.currentTimeframe = timeframe;
        
        // Save to localStorage for persistence
        localStorage.setItem('chartTimeframe', timeframe);
        
        // Reload chart data with new timeframe
        try {
            await this.loadHistoricalData(this.symbol || 'BTC/USDT', timeframe);
            console.log(`✅ Timeframe changed to ${timeframe}`);
        } catch (error) {
            console.error('❌ Failed to change timeframe:', error);
        }
    }

    /**
     * Legacy sync method - use changeTimeframe() instead
     * @deprecated
     */
    setTimeframe(timeframe) {
        this.changeTimeframe(timeframe);
    }

    /**
     * Clear all markers from the chart
     */
    clearMarkers() {
        this.markers = [];
        this.candleSeries.setMarkers([]);
        console.log('All markers cleared');
    }

    /**
     * Clear all price lines from the chart
     */
    clearPriceLines() {
        Object.values(this.priceLines).forEach(line => {
            if (line) {
                this.candleSeries.removePriceLine(line);
            }
        });
        this.priceLines = {};
        console.log('All price lines cleared');
    }

    /**
     * Resize chart to fit container
     */
    resize() {
        if (this.chart && this.container) {
            this.chart.applyOptions({
                width: this.container.clientWidth,
                height: 500,
            });
            console.log('Chart resized to:', this.container.clientWidth, 'x 500');
        }
    }

    /**
     * Setup window resize handler
     */
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.resize();
        });
    }

    /**
     * Destroy chart and cleanup
     */
    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
        this.candleSeries = null;
        this.volumeSeries = null;
        this.markers = [];
        this.priceLines = {};
        console.log('TradingChart destroyed');
    }

    /**
     * Get current visible range
     * @returns {Object} {from, to} timestamps
     */
    getVisibleRange() {
        if (!this.chart) return null;
        
        const timeScale = this.chart.timeScale();
        const visibleRange = timeScale.getVisibleRange();
        
        return visibleRange;
    }

    /**
     * Set visible range
     * @param {Object} range - {from, to} timestamps
     */
    setVisibleRange(range) {
        if (!this.chart || !range) return;
        
        this.chart.timeScale().setVisibleRange(range);
    }

    /**
     * Auto-fit chart to data
     */
    fitContent() {
        if (this.chart) {
            this.chart.timeScale().fitContent();
        }
    }

    /**
     * Take a screenshot of the chart
     * @returns {string} Base64 encoded image
     */
    takeScreenshot() {
        if (!this.chart) return null;
        
        try {
            const canvas = this.container.querySelector('canvas');
            if (canvas) {
                return canvas.toDataURL('image/png');
            }
        } catch (error) {
            console.error('Error taking screenshot:', error);
        }
        return null;
    }
}

// Export to global scope
window.TradingChart = TradingChart;

console.log('TradingChart class loaded');
