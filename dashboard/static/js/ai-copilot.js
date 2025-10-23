/**
 * AICoPilot - AI trading assistant with multiple operation modes
 * Exports: window.AICoPilot
 */
(function () {
    class AICoPilot {
        /**
         * @param {Object} config
         * @param {string} [config.mode='opinion'] - Initial mode: 'opinion' | 'suggest' | 'copilot'
         * @param {string} [config.apiBase] - API base URL for AI chat endpoint
         * @param {Object} [config.selectors] - DOM selectors for UI elements
         * @param {number} [config.opinionInterval] - Interval for opinion mode updates (ms)
         */
        constructor(config = {}) {
            const defaults = {
                mode: 'opinion',
                apiBase: 'http://localhost:8002',
                opinionInterval: 30 * 60 * 1000, // 30 minutes
                selectors: {
                    modeSelect: '#aiMode',
                    adviceBox: '#ai-message',
                    confidenceBar: '#ai-confidence',
                    askButton: '#askAI',
                    questionInput: '#aiQuestion',
                },
            };
            this.cfg = Object.assign({}, defaults, config || {});

            this.currentMode = this.cfg.mode;
            this.lastAdvice = null;
            this.messageHistory = [];
            this.opinionTimer = null;

            // Cache DOM
            this.elModeSelect = document.querySelector(this.cfg.selectors.modeSelect);
            this.elAdviceBox = document.querySelector(this.cfg.selectors.adviceBox);
            this.elConfidenceBar = document.querySelector(this.cfg.selectors.confidenceBar);
            this.elAskButton = document.querySelector(this.cfg.selectors.askButton);
            this.elQuestionInput = document.querySelector(this.cfg.selectors.questionInput);

            this.bindEvents();
            this.startModeLoop();

            console.log('[AICoPilot] Initialized in mode:', this.currentMode);
        }

        /**
         * Change the AI operating mode
         * @param {string} newMode - 'opinion' | 'suggest' | 'copilot'
         */
        setMode(newMode) {
            const validModes = ['opinion', 'suggest', 'copilot'];
            if (!validModes.includes(newMode)) {
                console.warn('[AICoPilot] Invalid mode:', newMode);
                return;
            }

            const oldMode = this.currentMode;
            this.currentMode = newMode;
            console.log(`[AICoPilot] Mode changed: ${oldMode} → ${newMode}`);

            // Update UI if mode selector exists
            if (this.elModeSelect && this.elModeSelect.value !== newMode) {
                this.elModeSelect.value = newMode;
            }

            // Restart mode loop
            this.startModeLoop();

            // Notify user
            this.notify('AI Mode Changed', `Now in ${this.getModeLabel(newMode)} mode`, 'info');
        }

        getModeLabel(mode) {
            const labels = {
                opinion: 'Opinion Only',
                suggest: 'Suggest Trades',
                copilot: 'Co-Pilot',
            };
            return labels[mode] || mode;
        }

        /**
         * Start mode-specific behavior loop
         */
        startModeLoop() {
            // Clear any existing timer
            if (this.opinionTimer) clearInterval(this.opinionTimer);

            if (this.currentMode === 'opinion') {
                // Opinion mode: passive updates every 30 minutes
                this.requestAdvice(); // Initial request
                this.opinionTimer = setInterval(() => {
                    this.requestAdvice();
                }, this.cfg.opinionInterval);
            } else {
                // Suggest and Co-Pilot: on-demand only (no auto-refresh)
                this.opinionTimer = null;
            }
        }

        /**
         * Build context object for AI requests
         * @returns {Object} Current trading context
         */
        getContext() {
            const priceEl = document.getElementById('header-price') || document.getElementById('current-position-price');
            const currentPrice = priceEl ? this.parseMoney(priceEl.textContent) : 0;

            const btcEl = document.getElementById('portfolio-btc');
            const usdtEl = document.getElementById('portfolio-usdt');
            const btc = btcEl ? parseFloat(btcEl.textContent) : 0;
            const usdt = usdtEl ? this.parseMoney(usdtEl.textContent) : 0;

            const entryEl = document.getElementById('entry-price');
            const entryPrice = entryEl ? this.parseMoney(entryEl.textContent) : 0;

            const pnlEl = document.getElementById('unrealized-pnl');
            const pnl = pnlEl ? pnlEl.textContent : 'N/A';

            // Build context
            return {
                currentPrice,
                position: { BTC: btc, USDT: usdt },
                entryPrice,
                pnl,
                mode: this.currentMode,
                timestamp: new Date().toISOString(),
            };
        }

        /**
         * Generate mode-specific prompt
         * @param {string} mode
         * @param {Object} context
         * @param {string} [customQuestion]
         * @returns {string} AI prompt
         */
        buildPrompt(mode, context, customQuestion = null) {
            if (customQuestion) {
                return `${customQuestion}\n\nContext:\nPrice: $${context.currentPrice.toFixed(2)}, Position: ${context.position.BTC} BTC / $${context.position.USDT.toFixed(2)} USDT, Entry: $${context.entryPrice.toFixed(2)}, P&L: ${context.pnl}`;
            }

            const base = `Current BTC price: $${context.currentPrice.toFixed(2)}\nYour position: ${context.position.BTC} BTC, ${context.position.USDT.toFixed(2)} USDT\nEntry price: $${context.entryPrice.toFixed(2)}\nUnrealized P&L: ${context.pnl}\n\n`;

            switch (mode) {
                case 'opinion':
                    return base + "What's your market analysis? Provide educational commentary without specific trade suggestions.";
                case 'suggest':
                    return base + "Should I consider any trades now? If yes, explain your reasoning.";
                case 'copilot':
                    return base + "What action should I take and why? Provide a specific recommendation with confidence level.";
                default:
                    return base + "Provide your insight on the current market situation.";
            }
        }

        /**
         * Request advice from AI service
         * @param {string} [customQuestion] - Optional custom user question
         */
        async requestAdvice(customQuestion = null) {
            try {
                const context = this.getContext();
                const prompt = this.buildPrompt(this.currentMode, context, customQuestion);

                console.log('[AICoPilot] Requesting advice...', { mode: this.currentMode, customQuestion });

                const res = await fetch(`${this.cfg.apiBase}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        context,
                        mode: this.currentMode,
                    }),
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                // Store response
                this.lastAdvice = {
                    timestamp: Date.now(),
                    mode: this.currentMode,
                    question: customQuestion,
                    response: data,
                };
                this.messageHistory.push(this.lastAdvice);

                // Display
                this.displayAdvice(data);

                return data;
            } catch (err) {
                console.error('[AICoPilot] Request failed:', err);
                this.displayError(err);
                return null;
            }
        }

        /**
         * Parse and display AI response
         * @param {Object} advice - AI response object
         */
        displayAdvice(advice) {
            if (!this.elAdviceBox) return;

            // Extract fields from response
            const message = advice.message || advice.text || advice.advice || 'No advice available.';
            const action = advice.action || null; // e.g., 'BUY', 'SELL', 'HOLD'
            const reasoning = advice.reasoning || advice.reason || null;
            const confidence = advice.confidence || null; // e.g., 85 (percent)

            // Build display HTML
            let html = `<div class="ai-advice-message" style="animation: fadeIn 0.5s;">`;
            html += `<div class="speech-bubble">💬 ${this.escapeHtml(message)}</div>`;

            if (reasoning) {
                html += `<div class="reasoning mt-2"><small>📝 <em>${this.escapeHtml(reasoning)}</em></small></div>`;
            }

            if (action && (this.currentMode === 'suggest' || this.currentMode === 'copilot')) {
                html += `<div class="suggested-action mt-2"><strong>🎯 Suggested: ${action}</strong></div>`;
            }

            html += `</div>`;

            this.elAdviceBox.innerHTML = html;

            // Update confidence bar if in copilot mode
            if (this.elConfidenceBar && confidence !== null && this.currentMode === 'copilot') {
                this.elConfidenceBar.style.width = `${confidence}%`;
                this.elConfidenceBar.parentElement.style.display = 'block';
            } else if (this.elConfidenceBar) {
                this.elConfidenceBar.parentElement.style.display = 'none';
            }

            // If action is suggested, show suggestion card
            if (action && (this.currentMode === 'suggest' || this.currentMode === 'copilot')) {
                this.handleSuggestion({ action, reasoning, confidence, advice });
            }

            console.log('[AICoPilot] Advice displayed:', { action, confidence });
        }

        /**
         * Display error message
         * @param {Error} err
         */
        displayError(err) {
            if (!this.elAdviceBox) return;
            this.elAdviceBox.innerHTML = `<div class="text-danger"><small>⚠️ ${this.escapeHtml(err.message || 'AI request failed')}</small></div>`;
        }

        /**
         * Handle AI suggestion (suggest/copilot modes)
         * @param {Object} suggestion
         */
        handleSuggestion(suggestion) {
            if (this.currentMode === 'opinion') {
                // Opinion mode: no action buttons
                return;
            }

            const { action, reasoning, confidence } = suggestion;

            // Create suggestion card (Bootstrap modal or inline card)
            const id = 'ai-suggestion-card';
            let cardEl = document.getElementById(id);
            if (cardEl) cardEl.remove();

            const html = `
<div id="${id}" class="alert alert-info mt-3" style="animation: slideIn 0.5s;">
  <h6><i class="fas fa-lightbulb"></i> AI Suggestion</h6>
  <p><strong>${action}</strong></p>
  ${reasoning ? `<p><small>${this.escapeHtml(reasoning)}</small></p>` : ''}
  ${confidence !== null && this.currentMode === 'copilot' ? `<p><small>Confidence: ${confidence}%</small></p>` : ''}
  <button class="btn btn-sm btn-primary" id="execute-suggestion-btn">Execute Trade</button>
  <button class="btn btn-sm btn-secondary ms-2" id="dismiss-suggestion-btn">Dismiss</button>
</div>`;

            // Append after advice box
            if (this.elAdviceBox && this.elAdviceBox.parentElement) {
                this.elAdviceBox.insertAdjacentHTML('afterend', html);

                cardEl = document.getElementById(id);
                const executeBtn = document.getElementById('execute-suggestion-btn');
                const dismissBtn = document.getElementById('dismiss-suggestion-btn');

                if (executeBtn) {
                    executeBtn.addEventListener('click', () => {
                        this.executeSuggestion(suggestion);
                        cardEl.remove();
                    });
                }

                if (dismissBtn) {
                    dismissBtn.addEventListener('click', () => {
                        cardEl.remove();
                    });
                }
            }
        }

        /**
         * Execute AI-suggested trade
         * @param {Object} suggestion
         */
        async executeSuggestion(suggestion) {
            const { action, advice } = suggestion;
            const amount = advice.amount || 0.01; // Default or parse from advice

            console.log('[AICoPilot] Executing suggestion:', { action, amount });

            // Check if ManualTrading is available
            if (window.__manualTrading && window.__manualTrading.executeTrade) {
                const result = await window.__manualTrading.executeTrade(action, amount);
                if (result.success) {
                    this.notify('AI Trade Executed', `${action} ${amount} BTC`, 'success');
                    // Log outcome for AI learning
                    this.logTradeOutcome({ action, amount, result });
                } else {
                    this.notify('Trade Failed', result.error || 'Unknown error', 'error');
                }
            } else {
                this.notify('Manual Trading Not Available', 'Cannot execute AI suggestion', 'warning');
            }
        }

        /**
         * User asks a custom question
         */
        async askAI(question = null) {
            let q = question;
            if (!q && this.elQuestionInput) {
                q = this.elQuestionInput.value.trim();
            }

            if (!q) {
                // No custom question: request standard advice
                return this.requestAdvice();
            }

            console.log('[AICoPilot] Custom question:', q);
            const result = await this.requestAdvice(q);

            // Clear input
            if (this.elQuestionInput) this.elQuestionInput.value = '';

            return result;
        }

        /**
         * Log trade outcome to AI for learning
         * @param {Object} trade
         */
        async logTradeOutcome(trade) {
            try {
                console.log('[AICoPilot] Logging trade outcome:', trade);
                await fetch(`${this.cfg.apiBase}/api/ai-log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'trade_executed',
                        trade,
                        context: this.getContext(),
                        timestamp: new Date().toISOString(),
                    }),
                });
            } catch (err) {
                console.warn('[AICoPilot] Failed to log trade outcome:', err);
            }
        }

        /**
         * Subscribe to WebSocket for real-time AI messages
         * @param {WebSocket} ws
         */
        subscribeToWebSocket(ws) {
            if (!ws) return;

            const originalOnMessage = ws.onmessage;

            ws.onmessage = (event) => {
                // Call original handler first
                if (originalOnMessage) originalOnMessage.call(ws, event);

                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'ai_message' || data.type === 'ai_advice') {
                        console.log('[AICoPilot] Real-time AI message:', data);
                        this.displayAdvice(data);
                    } else if (data.type === 'ai_warning') {
                        this.notify('AI Warning', data.message || 'Risk detected', 'warning');
                    }
                } catch (_) {
                    // Not JSON or not relevant
                }
            };

            console.log('[AICoPilot] Subscribed to WebSocket');
        }

        /**
         * Bind UI events
         */
        bindEvents() {
            // Mode selector
            if (this.elModeSelect) {
                this.elModeSelect.addEventListener('change', (e) => {
                    this.setMode(e.target.value);
                });
            }

            // Ask AI button
            if (this.elAskButton) {
                this.elAskButton.addEventListener('click', () => {
                    this.askAI();
                });
            }

            // Question input: Enter key
            if (this.elQuestionInput) {
                this.elQuestionInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.askAI();
                    }
                });
            }
        }

        /**
         * Utility: parse money string
         * @param {string} text
         * @returns {number}
         */
        parseMoney(text) {
            return Number(String(text || '').replace(/[^0-9.\-]/g, '')) || 0;
        }

        /**
         * Utility: escape HTML
         * @param {string} text
         * @returns {string}
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /**
         * Utility: notify user
         * @param {string} title
         * @param {string} message
         * @param {string} type
         */
        notify(title, message, type) {
            const fn = window.showNotification || window.notify || null;
            if (typeof fn === 'function') return fn(title, message, type || 'info');
            // Fallback
            console.log(`[AICoPilot Notify] ${type?.toUpperCase() || 'INFO'}: ${title} - ${message}`);
        }
    }

    window.AICoPilot = AICoPilot;
})();
