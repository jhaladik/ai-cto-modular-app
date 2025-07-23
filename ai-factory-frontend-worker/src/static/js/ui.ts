// AI Factory Frontend Worker - UI Helper Module
// @WORKER: FrontendWorker
// 🧱 Type: StaticJS
// 📍 Path: src/static/js/ui.ts
// 🎯 Role: Common UI utilities and helper functions
// 💾 Storage: { embedded: "worker_code" }

export const UI_JS = `
/**
 * AI Factory UI Helper
 * Common UI utilities and helper functions
 */
class AIFactoryUI {
    constructor() {
        this.loadingSpinner = null;
        this.init();
    }

    /**
     * Initialize UI helpers
     */
    init() {
        this.createLoadingSpinner();
        this.setupGlobalEventListeners();
    }

    /**
     * Create loading spinner element
     */
    createLoadingSpinner() {
        if (document.getElementById('loading-spinner')) {
            this.loadingSpinner = document.getElementById('loading-spinner');
            return;
        }

        this.loadingSpinner = document.createElement('div');
        this.loadingSpinner.id = 'loading-spinner';
        this.loadingSpinner.className = 'loading-spinner';
        this.loadingSpinner.style.display = 'none';
        this.loadingSpinner.innerHTML = `
            <div class="spinner"></div>
            <div id="loading-message">Loading...</div>
        `;
        document.body.appendChild(this.loadingSpinner);
    }

    /**
     * Show loading spinner
     */
    showLoading(message = 'Loading...') {
        if (this.loadingSpinner) {
            const messageEl = this.loadingSpinner.querySelector('#loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            this.loadingSpinner.style.display = 'flex';
        }
    }

    /**
     * Hide loading spinner
     */
    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(elementId, message, duration = 5000) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            element.className = 'error-message';
            
            if (duration > 0) {
                setTimeout(() => {
                    element.style.display = 'none';
                }, duration);
            }
        } else {
            // Fallback to alert if element not found
            alert('Error: ' + message);
        }
    }

    /**
     * Show success message
     */
    showSuccess(elementId, message, duration = 3000) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            element.className = 'message message-success';
            
            if (duration > 0) {
                setTimeout(() => {
                    element.style.display = 'none';
                }, duration);
            }
        }
    }

    /**
     * Show info message
     */
    showInfo(elementId, message, duration = 3000) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            element.className = 'message message-info';
            
            if (duration > 0) {
                setTimeout(() => {
                    element.style.display = 'none';
                }, duration);
            }
        }
    }

    /**
     * Create notification toast
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-$\{type\}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });

        // Set background color based on type
        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#27ae60';
                break;
            case 'error':
                toast.style.backgroundColor = '#e74c3c';
                break;
            case 'warning':
                toast.style.backgroundColor = '#f39c12';
                break;
            default:
                toast.style.backgroundColor = '#3498db';
        }

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * Confirm dialog with custom styling
     */
    confirm(message, onConfirm, onCancel = null) {
        const confirmed = window.confirm(message);
        if (confirmed && onConfirm) {
            onConfirm();
        } else if (!confirmed && onCancel) {
            onCancel();
        }
        return confirmed;
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '-';
        
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (e) {
            return timestamp;
        }
    }

    /**
     * Format duration in milliseconds to human readable
     */
    formatDuration(ms) {
        if (!ms || ms < 0) return '-';
        
        if (ms < 1000) {
            return `$\{ms\}ms`;
        } else if (ms < 60000) {
            return `$\{(ms / 1000).toFixed(1)\}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = ((ms % 60000) / 1000).toFixed(0);
            return `\${minutes}m $\{seconds\}s`;
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Format currency (USD)
     */
    formatCurrency(amount) {
        if (typeof amount !== 'number') return '$0.00';
        return `$$\{amount.toFixed(2)\}`;
    }

    /**
     * Create status badge element
     */
    createStatusBadge(status, text = null) {
        const badge = document.createElement('span');
        badge.className = `status status-$\{status\}`;
        badge.textContent = text || status;
        return badge;
    }

    /**
     * Create progress bar
     */
    createProgressBar(percentage, showText = true) {
        const container = document.createElement('div');
        container.className = 'progress-container';
        container.style.cssText = `
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        `;

        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.style.cssText = `
            height: 100%;
            background: #3498db;
            width: \${Math.min(100, Math.max(0, percentage))}%;
            transition: width 0.3s ease;
        `;

        if (showText) {
            const text = document.createElement('div');
            text.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 12px;
                font-weight: bold;
                color: #333;
            `;
            text.textContent = `$\{Math.round(percentage)\}%`;
            container.appendChild(text);
        }

        container.appendChild(bar);
        return container;
    }

    /**
     * Debounce function for search inputs
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Handle authentication events
        window.addEventListener('auth:login', (event) => {
            this.showToast(`Welcome back, $\{event.detail.user.username\}!`, 'success');
        });

        window.addEventListener('auth:logout', (event) => {
            this.showToast('You have been logged out', 'info');
        });

        window.addEventListener('auth:session-expired', () => {
            this.showToast('Your session has expired. Please login again.', 'warning', 5000);
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showToast('An unexpected error occurred', 'error');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showToast('An unexpected error occurred', 'error');
        });
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard', 'success', 1000);
            return true;
        } catch (err) {
            console.error('Failed to copy text:', err);
            this.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    }

    /**
     * Download text as file
     */
    downloadAsFile(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showToast(`Downloaded $\{filename\}`, 'success');
    }

    /**
     * Animate element with CSS classes
     */
    animate(element, animationClass, duration = 1000) {
        return new Promise((resolve) => {
            element.classList.add(animationClass);
            
            setTimeout(() => {
                element.classList.remove(animationClass);
                resolve();
            }, duration);
        });
    }

    /**
     * Smooth scroll to element
     */
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * Get URL parameters
     */
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Update URL without page reload
     */
    updateUrl(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', url);
    }
}

// Make UI helper available globally
window.AIFactoryUI = AIFactoryUI;
`;