/**
 * ManualTrading - Risk-managed manual trading helper
 * Exports: window.ManualTrading
 */
(function () {
    class ManualTrading {
        /**
         * @param {Object} config
         * @param {number} config.maxTradeSize - Maximum BTC per trade
         * @param {number} config.minTradeSize - Minimum BTC per trade
         * @param {number} config.feeRate - Trading fee as fraction (e.g., 0.001)
         * @param {string} [config.apiBase] - API base URL for manual trade endpoint
         * @param {Object} [config.selectors] - DOM selectors for inputs/buttons
         * @param {Object} [config.balances] - Initial balances { BTC, USDT }
         */
        constructor(config = {}) {
            const defaults = {
                maxTradeSize: 0.1,
                minTradeSize: 0.001,
                feeRate: 0.001,
                apiBase: 'http://localhost:8002', // Bot API default
                selectors: {
                    amount: '#manual-amount',
                    buyButton: '#manual-buy-btn',
                    sellButton: '#manual-sell-btn',
                    estimated: '#manual-estimated-value',
                    fee: '#manual-fee',
                    availableUSDT: '.balance-display .balance-value',
                    availableBTC: '#portfolio-btc'
                },
                requiresConfirmation: true,
            };
            this.cfg = Object.assign({}, defaults, config || {});

            this.maxTradeSize = this.cfg.maxTradeSize;
            this.minTradeSize = this.cfg.minTradeSize;
            this.feeRate = this.cfg.feeRate;
            this.requiresConfirmation = this.cfg.requiresConfirmation !== false;
            this.cooldownMs = 5000;
            this.lastTradeTime = 0;
            this.botBusy = false;
            this.cooldownTimer = null;

            // Balances
            this.balances = Object.assign({ BTC: 0, USDT: 0 }, this.cfg.balances || {});
            // Try to parse from DOM
            this.updateAvailableBalanceFromDOM();

            // Cache DOM (vanilla)
            this.elAmount = document.querySelector(this.cfg.selectors.amount);
            this.elBuy = document.querySelector(this.cfg.selectors.buyButton);
            this.elSell = document.querySelector(this.cfg.selectors.sellButton);
            this.elEstimated = document.querySelector(this.cfg.selectors.estimated);
            this.elFee = document.querySelector(this.cfg.selectors.fee);

            this.bindEvents();
        }

        parseMoney(text) {
            return Number(String(text || '').replace(/[^0-9.\-]/g, '')) || 0;
        }

        getCurrentPrice() {
            const header = document.getElementById('header-price');
            const current = document.getElementById('current-position-price');
            const txt = (header && header.textContent) || (current && current.textContent) || '0';
            return this.parseMoney(txt);
        }

        updateAvailableBalanceFromDOM() {
            try {
                const usdtEl = document.querySelector(this.cfg.selectors.availableUSDT);
                if (usdtEl) {
                    this.balances.USDT = this.parseMoney(usdtEl.textContent);
                }
                const btcEl = document.querySelector(this.cfg.selectors.availableBTC);
                if (btcEl) {
                    this.balances.BTC = Number(String(btcEl.textContent).replace(/[^0-9.\-]/g, '')) || 0;
                }
            } catch (_) {}
        }

        calculateTradeValue(action, amount, price) {
            const value = amount * price;
            const fee = value * this.feeRate;
            const total = action === 'BUY' ? (value + fee) : (value - fee);
            return { value, fee, total };
        }

        validateTrade(action, amount) {
            const now = Date.now();
            const price = this.getCurrentPrice();
            const amt = Number(amount);
            if (!amt || amt <= 0 || isNaN(amt)) {
                return { valid: false, error: 'Enter a valid trade amount.' };
            }
            if (amt < this.minTradeSize) {
                return { valid: false, error: `Amount must be at least ${this.minTradeSize} BTC.` };
            }
            if (amt > this.maxTradeSize) {
                return { valid: false, error: `Amount exceeds max trade size (${this.maxTradeSize} BTC).` };
            }
            if (this.botBusy) {
                return { valid: false, error: 'Bot is currently executing a trade. Please wait.' };
            }
            if (now - this.lastTradeTime < this.cooldownMs) {
                const secs = Math.ceil((this.cooldownMs - (now - this.lastTradeTime)) / 1000);
                return { valid: false, error: `Cooldown active. Please wait ${secs}s.` };
            }

            // Balance checks
            const { value, fee, total } = this.calculateTradeValue(action, amt, price);
            if (action === 'BUY') {
                if (total > this.balances.USDT) {
                    return { valid: false, error: 'Insufficient USDT balance.' };
                }
            } else {
                if (amt > this.balances.BTC) {
                    return { valid: false, error: 'Insufficient BTC balance.' };
                }
            }

            return { valid: true, error: null, calc: { price, value, fee, total } };
        }

        showConfirmationDialog(action, amount, price) {
            if (!this.requiresConfirmation) return Promise.resolve(true);
            const self = this;
            return new Promise((resolve) => {
                const calc = self.calculateTradeValue(action, amount, price);
                const id = 'manual-trade-confirm-modal';
                let modalEl = document.getElementById(id);
                if (modalEl) modalEl.remove();

                const html = `
<div class="modal fade" id="${id}" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content bg-dark text-light">
      <div class="modal-header">
        <h5 class="modal-title">Confirm ${action}</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="mb-2">Amount: <strong>${amount} BTC</strong></div>
        <div class="mb-2">Price: <strong>$${price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>
        <div class="mb-2">Estimated Value: <strong>$${calc.value.toFixed(2)}</strong></div>
        <div class="mb-2">Fee ( ${(this.feeRate*100).toFixed(2)}% ): <strong>$${calc.fee.toFixed(2)}</strong></div>
        <div class="mb-3">Total ${action === 'BUY' ? 'Cost' : 'Proceeds'}: <strong>$${calc.total.toFixed(2)}</strong></div>
        <div class="risk-warning"><i class="fas fa-exclamation-triangle"></i> Trading involves significant risk. You can lose capital.</div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="confirm-risk-modal">
          <label class="form-check-label" for="confirm-risk-modal">I understand the risks</label>
        </div>
        <div class="text-muted mt-2"><small>Auto-cancels in <span id="trade-confirm-countdown">30</span>s</small></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn ${action==='BUY'?'btn-success':'btn-danger'}" id="confirm-trade-btn" disabled>Confirm Trade</button>
      </div>
    </div>
  </div>
</div>`;
                document.body.insertAdjacentHTML('beforeend', html);
                modalEl = document.getElementById(id);
                const confirmBtn = modalEl.querySelector('#confirm-trade-btn');
                const chk = modalEl.querySelector('#confirm-risk-modal');
                const bsModal = new bootstrap.Modal(modalEl);

                let seconds = 30;
                const countdownEl = modalEl.querySelector('#trade-confirm-countdown');
                const timer = setInterval(() => {
                    seconds -= 1;
                    if (countdownEl) countdownEl.textContent = String(seconds);
                    if (seconds <= 0) {
                        clearInterval(timer);
                        bsModal.hide();
                        resolve(false);
                    }
                }, 1000);

                chk.addEventListener('change', () => {
                    confirmBtn.disabled = !chk.checked;
                });

                confirmBtn.addEventListener('click', () => {
                    clearInterval(timer);
                    bsModal.hide();
                    resolve(true);
                });

                modalEl.addEventListener('hidden.bs.modal', () => {
                    modalEl.remove();
                });

                bsModal.show();
            });
        }

        async executeTrade(action, amount) {
            const price = this.getCurrentPrice();
            const validation = this.validateTrade(action, amount);
            if (!validation.valid) {
                this.notify('Trade Invalid', validation.error, 'error');
                return { success: false, error: validation.error };
            }

            const confirmed = await this.showConfirmationDialog(action, amount, price);
            if (!confirmed) {
                this.notify('Trade Cancelled', 'You cancelled the trade.', 'warning');
                return { success: false, error: 'cancelled' };
            }

            try {
                this.disableButtons(true);
                this.botBusy = true;

                const payload = {
                    action,
                    amount: Number(amount),
                    price: price,
                    timestamp: new Date().toISOString(),
                };

                const res = await fetch(`${this.cfg.apiBase}/api/manual-trade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json().catch(() => ({}));

                this.notify('Trade Executed', `${action} ${amount} BTC @ $${price.toFixed(2)}`, 'success');

                // Update balances (naive local update)
                const { value, fee, total } = this.calculateTradeValue(action, Number(amount), price);
                if (action === 'BUY') {
                    this.balances.USDT -= total;
                    this.balances.BTC += Number(amount);
                } else {
                    this.balances.BTC -= Number(amount);
                    this.balances.USDT += total;
                }
                this.updateAvailableBalanceDisplay();

                // Mark trade on chart
                if (window.tradingChart && window.tradingChart.markTrade) {
                    window.tradingChart.markTrade({
                        timestamp: Math.floor(Date.now() / 1000),
                        type: action,
                        price: price,
                        amount: Number(amount),
                    });
                }

                // Inform AI / logging hooks (no-op placeholder)
                if (window.console) console.log('AI log: manual trade', payload, data);

                // Start cooldown
                this.lastTradeTime = Date.now();
                this.startCooldown();

                return { success: true, data };
            } catch (err) {
                console.error('Manual trade error:', err);
                this.notify('Trade Failed', String(err.message || err), 'error');
                return { success: false, error: String(err.message || err) };
            } finally {
                this.botBusy = false;
                this.disableButtons(false);
            }
        }

        handleBuyClick() {
            const amt = Number(this.elAmount && this.elAmount.value);
            return this.executeTrade('BUY', amt);
        }

        handleSellClick() {
            const amt = Number(this.elAmount && this.elAmount.value);
            return this.executeTrade('SELL', amt);
        }

        updateTradeValue() {
            const amt = Number(this.elAmount && this.elAmount.value) || 0;
            const price = this.getCurrentPrice();
            const { value, fee } = this.calculateTradeValue('BUY', amt, price);
            if (this.elEstimated) this.elEstimated.textContent = this.formatMoney(value);
            if (this.elFee) this.elFee.textContent = this.formatMoney(fee);
        }

        updateAvailableBalance(balance) {
            if (balance && typeof balance.USDT === 'number') this.balances.USDT = balance.USDT;
            if (balance && typeof balance.BTC === 'number') this.balances.BTC = balance.BTC;
            this.updateAvailableBalanceDisplay();
        }

        updateAvailableBalanceDisplay() {
            try {
                const usdtEl = document.querySelector(this.cfg.selectors.availableUSDT);
                if (usdtEl) usdtEl.textContent = this.formatMoney(this.balances.USDT) + ' USDT';
                const btcEl = document.querySelector(this.cfg.selectors.availableBTC);
                if (btcEl) btcEl.textContent = (this.balances.BTC).toFixed(6);
            } catch (_) {}
        }

        startCooldown() {
            const end = Date.now() + this.cooldownMs;
            this.disableButtons(true);
            const tick = () => {
                const remaining = Math.max(0, end - Date.now());
                const secs = Math.ceil(remaining / 1000);
                if (this.elBuy) this.elBuy.textContent = `BUY (${secs})`;
                if (this.elSell) this.elSell.textContent = `SELL (${secs})`;
                if (remaining <= 0) {
                    this.enableButtons();
                } else {
                    this.cooldownTimer = setTimeout(tick, 250);
                }
            };
            tick();
        }

        enableButtons() {
            if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
            if (this.elBuy) { this.elBuy.disabled = false; this.elBuy.innerHTML = '<i class="fas fa-arrow-up"></i> BUY'; }
            if (this.elSell) { this.elSell.disabled = false; this.elSell.innerHTML = '<i class="fas fa-arrow-down"></i> SELL'; }
        }

        disableButtons(disabled) {
            if (this.elBuy) this.elBuy.disabled = !!disabled;
            if (this.elSell) this.elSell.disabled = !!disabled;
        }

        bindEvents() {
            if (this.elBuy) this.elBuy.addEventListener('click', () => this.handleBuyClick());
            if (this.elSell) this.elSell.addEventListener('click', () => this.handleSellClick());
            if (this.elAmount) this.elAmount.addEventListener('input', () => this.updateTradeValue());
            if (this.elAmount) this.elAmount.addEventListener('change', () => this.updateTradeValue());
            // Initial compute
            this.updateTradeValue();
        }

        formatMoney(val) {
            const n = Number(val) || 0;
            return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        notify(title, message, type) {
            const fn = (window.showNotification || window.notify || null);
            if (typeof fn === 'function') return fn(title, message, type || 'info');
            // Fallback
            console.log(`[${type || 'info'}] ${title}: ${message}`);
        }
    }

    window.ManualTrading = ManualTrading;
})();
