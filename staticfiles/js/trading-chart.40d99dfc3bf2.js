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
        this.currentTimeframe = '1D';
        this.symbol = 'BTC/USDT';
        
        this.initializeChart();
        this.setupResizeHandler();
    }

    /**
     * Initialize the chart with dark theme configuration
     */
    initializeChart() {
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

        console.log('TradingChart initialized');
    }

    /**
     * Load historical candle data
     * @param {string} symbol - Trading pair (e.g., 'BTC/USDT')
     * @param {string} timeframe - Timeframe (e.g., '1H', '4H', '1D', '1W')
     */
    async loadHistoricalData(symbol = 'BTC/USDT', timeframe = '1D') {
        this.symbol = symbol;
        this.currentTimeframe = timeframe;

        try {
            // TODO: Replace with actual API call to bot backend
            // const response = await fetch(`/api/candles?symbol=${symbol}&timeframe=${timeframe}`);
            // const data = await response.json();

            // Sample data for demonstration
            const sampleData = this.generateSampleData(100);
            
            // Set candlestick data
            this.candleSeries.setData(sampleData.candles);
            
            // Set volume data
            this.volumeSeries.setData(sampleData.volumes);
            
            // Auto-fit chart to data
            this.chart.timeScale().fitContent();
            
            console.log(`Loaded ${sampleData.candles.length} candles for ${symbol} ${timeframe}`);
        } catch (error) {
            console.error('Error loading historical data:', error);
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
     * Update current price display
     * @param {number} newPrice - Current price
     */
    updatePrice(newPrice) {
        if (!newPrice) return;

        // Remove existing current price line
        if (this.priceLines.currentPrice) {
            this.candleSeries.removePriceLine(this.priceLines.currentPrice);
        }

        // Add current price line
        this.priceLines.currentPrice = this.candleSeries.createPriceLine({
            price: parseFloat(newPrice),
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: `Current: $${parseFloat(newPrice).toFixed(2)}`,
        });

        // Flash effect on container
        this.flashContainer();
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
                    this.updatePrice(price);
                    
                    // Create candle from price update
                    const candle = {
                        time: Math.floor(Date.now() / 1000),
                        open: price,
                        high: price,
                        low: price,
                        close: price,
                        volume: 0,
                    };
                    this.addRealtimeCandle(candle);
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
     * Set timeframe and reload data
     * @param {string} timeframe - New timeframe ('1H', '4H', '1D', '1W')
     */
    setTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        this.loadHistoricalData(this.symbol, timeframe);
        console.log('Timeframe changed to:', timeframe);
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
