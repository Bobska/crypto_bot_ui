/**
 * PnLCalculator - Real-time profit/loss calculations for a single position
 * Exports: window.PnLCalculator
 */
(function () {
    class PnLCalculator {
        /**
         * @param {Object} position
         * @param {number} position.entryPrice - Entry price in USD
         * @param {number} position.currentPrice - Current price in USD
         * @param {number} position.amount - Amount of base asset (e.g., BTC)
         * @param {string} position.position - 'BTC' when holding BTC, 'USDT' when flat/holding cash
         * @param {number} [position.feeRate=0.001] - Trading fee rate (0.1% default)
         */
        constructor(position) {
            const defaults = { entryPrice: 0, currentPrice: 0, amount: 0, position: 'USDT', feeRate: 0.001 };
            const cfg = Object.assign({}, defaults, position || {});

            this.entryPrice = Number(cfg.entryPrice) || 0;
            this.currentPrice = Number(cfg.currentPrice) || 0;
            this.amount = Number(cfg.amount) || 0;
            this.position = (cfg.position || 'USDT').toUpperCase();
            this.feeRate = Number(cfg.feeRate) || 0.001;

            // Render targets (optional)
            this.renderTargets = null; // { unrealizedId, ifSoldId, entryId, currentId }
        }

        /**
         * Calculate unrealized PnL when holding BTC
         * @returns {{pnl:number, pct:number}}
         */
        calculateUnrealizedPnL() {
            if (this.position !== 'BTC' || this.amount <= 0 || this.entryPrice <= 0) {
                return { pnl: 0, pct: 0 };
            }
            const unrealizedValue = this.amount * this.currentPrice;
            const costBasis = this.amount * this.entryPrice;
            const unrealizedPnL = unrealizedValue - costBasis;
            const pnlPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
            return { pnl: unrealizedPnL, pct: pnlPercentage };
        }

        /**
         * Calculate net proceeds and ROI if we sell now.
         * @returns {null|{netProfit:number, roi:number, grossProceeds:number, fees:number, breakEven:number}}
         */
        calculateIfSoldNow() {
            if (this.position !== 'BTC' || this.amount <= 0 || this.entryPrice <= 0) {
                return null;
            }
            const grossProceeds = this.amount * this.currentPrice;
            const sellFee = grossProceeds * this.feeRate;
            const netProceeds = grossProceeds - sellFee;

            const costBasis = this.amount * this.entryPrice;
            const buyFee = costBasis * this.feeRate;
            const totalCost = costBasis + buyFee;

            const netProfit = netProceeds - totalCost;
            const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
            const breakEven = this.entryPrice * (1 + this.feeRate * 2);

            return {
                netProfit,
                roi,
                grossProceeds,
                fees: sellFee + buyFee,
                breakEven,
            };
        }

        /**
         * Update current price and recompute
         * @param {number} newPrice
         * @returns {{unrealized:{pnl:number,pct:number}, ifSold:null|object}}
         */
        updatePrice(newPrice) {
            this.currentPrice = Number(newPrice) || 0;
            const unrealized = this.calculateUnrealizedPnL();
            const ifSold = this.calculateIfSoldNow();
            if (this.renderTargets) this.renderToDOM(this.renderTargets);
            return { unrealized, ifSold };
        }

        /**
         * Format helpers
         */
        formatCurrency(amount) {
            const val = Number(amount) || 0;
            const sign = val < 0 ? '-' : '';
            const abs = Math.abs(val);
            return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        formatPercentage(pct) {
            const val = Number(pct) || 0;
            const sign = val > 0 ? '+' : (val < 0 ? '' : '');
            return `${sign}${val.toFixed(2)}%`;
        }

        getColor(value) {
            if (value > 0) return 'pnl-positive';
            if (value < 0) return 'pnl-negative';
            return 'text-muted';
        }

        /**
         * Render values to DOM
         * @param {Object|string} target - mapping or container id (ignored for now)
         * Supports IDs:
         *   unrealized: '#unrealized-pnl' (fallback '#unrealizedPnL')
         *   ifSold: '#if-sold-value' (fallback '#ifSoldNow')
         *   entry: '#entry-price'
         *   current: '#current-position-price'
         */
        renderToDOM(target) {
            // Cache targets on first run for automatic update after updatePrice()
            if (!this.renderTargets) {
                this.renderTargets = target || {};
            }
            const $ = window.jQuery || window.$;
            if (!$) return;

            const unreal = this.calculateUnrealizedPnL();
            const ifSold = this.calculateIfSoldNow();

            const unrealId = this.renderTargets.unrealizedId || '#unrealized-pnl';
            const unrealAlt = '#unrealizedPnL';
            const ifSoldId = this.renderTargets.ifSoldId || '#if-sold-value';
            const ifSoldAlt = '#ifSoldNow';
            const entryId = this.renderTargets.entryId || '#entry-price';
            const currentId = this.renderTargets.currentId || '#current-position-price';

            // Entry and current price (if elements exist)
            if ($(entryId).length) $(entryId).text(this.formatCurrency(this.entryPrice));
            if ($(currentId).length) $(currentId).text(this.formatCurrency(this.currentPrice));

            // Unrealized PnL
            const unrealText = `${this.formatCurrency(unreal.pnl)} (${this.formatPercentage(unreal.pct)})`;
            const unrealColor = this.getColor(unreal.pnl);
            const $unreal = $(unrealId).length ? $(unrealId) : $(unrealAlt);
            if ($unreal.length) {
                $unreal.text(unrealText)
                       .removeClass('pnl-positive pnl-negative text-muted counter-up counter-down')
                       .addClass(unrealColor);
                // Animate direction
                if (unreal.pnl > 0) {
                    $unreal.addClass('counter-up');
                    setTimeout(() => $unreal.removeClass('counter-up'), 600);
                } else if (unreal.pnl < 0) {
                    $unreal.addClass('counter-down');
                    setTimeout(() => $unreal.removeClass('counter-down'), 600);
                }
            }

            // If sold now
            const $ifSold = $(ifSoldId).length ? $(ifSoldId) : $(ifSoldAlt);
            if ($ifSold.length) {
                if (ifSold) {
                    $ifSold.text(this.formatCurrency(ifSold.netProfit));
                } else {
                    $ifSold.text('--');
                }
            }
        }

        /**
         * Subscribe to WebSocket messages for live price updates.
         * Expects data objects like: { type: 'price_update', data: { price } }
         * @param {Object} websocket - app-level websocket wrapper
         */
        subscribeToWebSocket(websocket) {
            if (!websocket) return;
            const originalOnMessage = websocket.onMessage;

            websocket.onMessage = (data) => {
                if (typeof originalOnMessage === 'function') {
                    originalOnMessage.call(websocket, data);
                }
                if (data && data.type === 'price_update' && data.data && data.data.price) {
                    this.updatePrice(Number(data.data.price));
                }
            };
        }
    }

    window.PnLCalculator = PnLCalculator;
})();
