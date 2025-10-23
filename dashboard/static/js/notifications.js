/**
 * Toast Notification System
 * Displays beautiful toast notifications for trade alerts and system messages
 */

// Toast notification types
const NOTIFICATION_TYPES = {
    success: { icon: '✅', bgColor: '#10b981', duration: 5000 },
    error: { icon: '❌', bgColor: '#ef4444', duration: 10000 },
    info: { icon: 'ℹ️', bgColor: '#3b82f6', duration: 5000 },
    warning: { icon: '⚠️', bgColor: '#f59e0b', duration: 7000 }
};

/**
 * Show a toast notification with modern styling
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info, warning, trade)
 * @param {number} duration - Duration in milliseconds (optional)
 */
function showNotification(title, message, type = 'info', duration = null) {
    const notificationType = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const displayDuration = duration || notificationType.duration;
    
    // Get or create toast container
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Create toast element with modern card design
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Create unique ID for progress bar
    const progressId = 'progress-' + Date.now();
    
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-title">
                ${notificationType.icon} ${escapeHtml(title)}
            </div>
            <button class="toast-close" onclick="closeToast(this)">×</button>
        </div>
        <div class="toast-body">
            ${escapeHtml(message)}
        </div>
        <div id="${progressId}" class="toast-progress"></div>
    `;
    
    // Add to container (slides in automatically with CSS)
    container.appendChild(toast);
    
    // Auto-dismiss with progress bar animation
    const timeoutId = setTimeout(() => {
        dismissToast(toast);
    }, displayDuration);
    
    // Update progress bar duration
    const progressBar = toast.querySelector('.toast-progress');
    if (progressBar) {
        progressBar.style.animationDuration = `${displayDuration}ms`;
    }
    
    // Store timeout ID for manual dismissal
    toast.dataset.timeoutId = timeoutId;
    
    // Click anywhere on toast to dismiss
    toast.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toast-close')) {
            dismissToast(toast);
        }
    });
    
    // Optional: Play notification sound
    // playNotificationSound(type);
    
    return toast;
}

/**
 * Show notification for a new trade
 * @param {object} trade - Trade data object
 */
function showTradeNotification(trade) {
    const action = trade.action || 'TRADE';
    const price = trade.price || 0;
    const amount = trade.amount || 0;
    const symbol = trade.symbol || 'BTC/USDT';
    
    const title = `New ${action}!`;
    const message = `${action} ${amount} ${symbol} at $${price.toLocaleString()}`;
    
    // Use success for BUY, info for SELL
    const type = action === 'BUY' ? 'success' : 'info';
    
    return showNotification(title, message, type);
}

/**
 * Show error notification
 * @param {string} error - Error message
 */
function showErrorNotification(error) {
    return showNotification('Error', error, 'error');
}

/**
 * Show bot status change notification
 * @param {string} status - New bot status
 */
function showBotStatusChange(status) {
    const isRunning = status === 'running' || status === 'started';
    const title = isRunning ? 'Bot Started' : 'Bot Stopped';
    const message = isRunning ? 
        'Trading bot is now active and monitoring markets' : 
        'Trading bot has been stopped';
    
    return showNotification(title, message, 'warning');
}

/**
 * Close a toast notification
 * @param {HTMLElement} button - Close button element
 */
function closeToast(button) {
    const toast = button.closest('.toast');
    dismissToast(toast);
}

/**
 * Dismiss a toast with animation
 * @param {HTMLElement} toast - Toast element to dismiss
 */
function dismissToast(toast) {
    if (!toast) return;
    
    // Clear auto-dismiss timeout
    if (toast.dataset.timeoutId) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
    }
    
    // Trigger slide-out animation
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Clear all toast notifications
 */
function clearAllToasts() {
    const container = document.getElementById('toast-container');
    if (container) {
        const toasts = container.querySelectorAll('.toast');
        toasts.forEach(toast => dismissToast(toast));
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Play notification sound (optional)
 * @param {string} type - Notification type
 */
function playNotificationSound(type) {
    // Create audio element
    const audio = new Audio();
    
    // Different sounds for different notification types
    switch (type) {
        case 'success':
            // audio.src = '/static/sounds/success.mp3';
            break;
        case 'error':
            // audio.src = '/static/sounds/error.mp3';
            break;
        case 'warning':
            // audio.src = '/static/sounds/warning.mp3';
            break;
        default:
            // audio.src = '/static/sounds/notification.mp3';
            break;
    }
    
    // Play sound (commented out - uncomment when sound files are added)
    // audio.play().catch(err => console.log('Audio play failed:', err));
}

// Add CSS styles for toast notifications
const toastStyles = `
    .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
    }

    .toast {
        display: flex;
        align-items: center;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translateX(120%);
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        opacity: 0;
    }

    .toast-show {
        transform: translateX(0);
        opacity: 1;
    }

    .toast-hide {
        transform: translateX(120%);
        opacity: 0;
    }

    .toast-icon {
        font-size: 24px;
        margin-right: 12px;
        flex-shrink: 0;
    }

    .toast-content {
        flex: 1;
    }

    .toast-title {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 4px;
    }

    .toast-message {
        font-size: 13px;
        opacity: 0.95;
    }

    .toast-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        margin-left: 12px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .toast-close:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 768px) {
        .toast-container {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
        }
    }
`;

// Inject styles into page
const styleElement = document.createElement('style');
styleElement.textContent = toastStyles;
document.head.appendChild(styleElement);
