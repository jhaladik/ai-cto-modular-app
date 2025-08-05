/**
 * UI Components - Clean Version
 * Essential UI components only - NO SEARCH, NO COMPLEX FUNCTIONALITY
 */

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

class StatCard {
    constructor(config) {
        this.label = config.label || 'Stat';
        this.value = config.value || '0';
        this.icon = config.icon || '📊';
        this.color = config.color || 'primary';
        this.trend = config.trend || null; // 'up', 'down', 'stable'
        this.trendValue = config.trendValue || null;
    }

    render() {
        const trendIcon = {
            'up': '📈',
            'down': '📉',
            'stable': '➡️'
        };

        return `
            <div class="stat-card stat-card-${this.color}">
                <div class="stat-card-content">
                    <div class="stat-icon">${this.icon}</div>
                    <div class="stat-details">
                        <div class="stat-value">${this.value}</div>
                        <div class="stat-label">${this.label}</div>
                        ${this.trend ? `
                            <div class="stat-trend trend-${this.trend}">
                                ${trendIcon[this.trend]} ${this.trendValue}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}

// =============================================================================
// CLIENT CARD COMPONENT
// =============================================================================

class ClientCard {
    constructor(clientData) {
        this.clientData = clientData;
    }

    render() {
        const client = this.clientData;
        const budgetPercentage = client.monthly_budget_usd > 0 
            ? (client.used_budget_current_month / client.monthly_budget_usd) * 100 
            : 0;

        return `
            <div class="client-card" onclick="router.navigate('/clients/${client.client_id}')">
                <div class="client-card-header">
                    <div class="client-basic-info">
                        <h3 class="client-company-name">${client.company_name}</h3>
                        <p class="client-email">${client.contact_email}</p>
                    </div>
                    <div class="client-badges">
                        <span class="tier-badge tier-${client.subscription_tier}">
                            ${this.formatTierName(client.subscription_tier)}
                        </span>
                        <span class="status-badge status-${client.account_status}">
                            ${client.account_status}
                        </span>
                    </div>
                </div>
                
                <div class="client-card-body">
                    <div class="client-stats">
                        <div class="stat-item">
                            <span class="stat-label">Industry</span>
                            <span class="stat-value">${client.industry || 'N/A'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Budget Usage</span>
                            <span class="stat-value">${budgetPercentage.toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="budget-bar">
                        <div class="budget-progress" style="width: ${Math.min(budgetPercentage, 100)}%"></div>
                    </div>
                    
                    <div class="budget-text">
                        $${client.used_budget_current_month} / $${client.monthly_budget_usd}
                    </div>
                </div>
                
                <div class="client-card-footer">
                    <span class="created-date">
                        Added ${new Date(client.created_at).toLocaleDateString()}
                    </span>
                    <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); router.navigate('/clients/${client.client_id}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    formatTierName(tier) {
        const tierNames = {
            'basic': '🥉 Basic',
            'standard': '🥈 Standard',
            'premium': '🥇 Premium',
            'enterprise': '💎 Enterprise'
        };
        return tierNames[tier] || '🔧 Unknown';
    }
}

// =============================================================================
// SIMPLE MODAL COMPONENT
// =============================================================================

class SimpleModal {
    constructor(config) {
        this.title = config.title || 'Modal';
        this.content = config.content || '';
        this.actions = config.actions || [];
        this.size = config.size || 'medium'; // small, medium, large
        this.onClose = config.onClose || null;
        this.id = config.id || `modal-${Date.now()}`;
    }

    render() {
        return `
            <div class="modal-overlay" id="${this.id}" onclick="this.close()">
                <div class="modal modal-${this.size}" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3 class="modal-title">${this.title}</h3>
                        <button class="modal-close" onclick="document.getElementById('${this.id}').close()">
                            ✕
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        ${this.content}
                    </div>
                    
                    ${this.actions.length > 0 ? `
                        <div class="modal-footer">
                            ${this.actions.map(action => `
                                <button class="btn ${action.class || 'btn-secondary'}" 
                                        onclick="${action.onclick}">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    show() {
        const modalHtml = this.render();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById(this.id);
        
        // Add close functionality
        modalElement.close = () => {
            modalElement.remove();
            if (this.onClose) this.onClose();
        };
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Restore body scroll when modal closes
        const originalClose = modalElement.close;
        modalElement.close = () => {
            document.body.style.overflow = '';
            originalClose();
        };
        
        return modalElement;
    }

    static show(config) {
        const modal = new SimpleModal(config);
        return modal.show();
    }
}

// =============================================================================
// LOADING COMPONENT
// =============================================================================

class LoadingComponent {
    constructor(config = {}) {
        this.message = config.message || 'Loading...';
        this.size = config.size || 'medium'; // small, medium, large
        this.type = config.type || 'spinner'; // spinner, dots, bars
    }

    render() {
        const spinners = {
            'spinner': '🔄',
            'dots': '⋯',
            'bars': '▪▫▪'
        };

        return `
            <div class="loading-component loading-${this.size}">
                <div class="loading-icon loading-${this.type}">
                    ${spinners[this.type] || spinners.spinner}
                </div>
                <div class="loading-message">${this.message}</div>
            </div>
        `;
    }

    static show(container, config = {}) {
        const loading = new LoadingComponent(config);
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (container) {
            container.innerHTML = loading.render();
        }
        return loading;
    }
}

// =============================================================================
// ERROR COMPONENT
// =============================================================================

class ErrorComponent {
    constructor(config) {
        this.title = config.title || 'Error';
        this.message = config.message || 'Something went wrong';
        this.actions = config.actions || [];
        this.type = config.type || 'error'; // error, warning, info
    }

    render() {
        const icons = {
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        return `
            <div class="error-component error-${this.type}">
                <div class="error-icon">${icons[this.type]}</div>
                <div class="error-content">
                    <h3 class="error-title">${this.title}</h3>
                    <p class="error-message">${this.message}</p>
                    ${this.actions.length > 0 ? `
                        <div class="error-actions">
                            ${this.actions.map(action => `
                                <button class="btn ${action.class || 'btn-primary'}" 
                                        onclick="${action.onclick}">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static show(container, config) {
        const error = new ErrorComponent(config);
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (container) {
            container.innerHTML = error.render();
        }
        return error;
    }
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

class EmptyState {
    constructor(config) {
        this.title = config.title || 'No Data';
        this.message = config.message || 'There is nothing to display';
        this.icon = config.icon || '📭';
        this.actions = config.actions || [];
    }

    render() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${this.icon}</div>
                <div class="empty-state-content">
                    <h3 class="empty-state-title">${this.title}</h3>
                    <p class="empty-state-message">${this.message}</p>
                    ${this.actions.length > 0 ? `
                        <div class="empty-state-actions">
                            ${this.actions.map(action => `
                                <button class="btn ${action.class || 'btn-primary'}" 
                                        onclick="${action.onclick}">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static show(container, config) {
        const emptyState = new EmptyState(config);
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (container) {
            container.innerHTML = emptyState.render();
        }
        return emptyState;
    }
}

// =============================================================================
// TOAST NOTIFICATION COMPONENT
// =============================================================================

class Toast {
    constructor(config) {
        this.message = config.message || 'Notification';
        this.type = config.type || 'info'; // success, error, warning, info
        this.duration = config.duration || 3000;
        this.action = config.action || null;
        this.id = `toast-${Date.now()}`;
    }

    render() {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        return `
            <div class="toast toast-${this.type}" id="${this.id}">
                <div class="toast-content">
                    <span class="toast-icon">${icons[this.type]}</span>
                    <span class="toast-message">${this.message}</span>
                </div>
                ${this.action ? `
                    <button class="toast-action" onclick="${this.action.onclick}">
                        ${this.action.text}
                    </button>
                ` : ''}
                <button class="toast-close" onclick="document.getElementById('${this.id}').remove()">
                    ✕
                </button>
            </div>
        `;
    }

    show() {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Add toast
        container.insertAdjacentHTML('beforeend', this.render());
        
        // Auto-remove after duration
        if (this.duration > 0) {
            setTimeout(() => {
                const toastElement = document.getElementById(this.id);
                if (toastElement) {
                    toastElement.remove();
                }
            }, this.duration);
        }
    }

    static show(config) {
        const toast = new Toast(config);
        toast.show();
        return toast;
    }

    static success(message, action = null) {
        return Toast.show({ message, type: 'success', action });
    }

    static error(message, action = null) {
        return Toast.show({ message, type: 'error', duration: 5000, action });
    }

    static warning(message, action = null) {
        return Toast.show({ message, type: 'warning', action });
    }

    static info(message, action = null) {
        return Toast.show({ message, type: 'info', action });
    }
}

// =============================================================================
// BREADCRUMB COMPONENT
// =============================================================================

class Breadcrumb {
    constructor(items) {
        this.items = items || [];
    }

    render() {
        if (this.items.length === 0) return '';

        return `
            <nav class="breadcrumb">
                ${this.items.map((item, index) => {
                    const isLast = index === this.items.length - 1;
                    
                    if (isLast) {
                        return `<span class="breadcrumb-current">${item.label}</span>`;
                    } else {
                        return `
                            <a href="#" onclick="${item.onclick}; return false;" class="breadcrumb-link">
                                ${item.label}
                            </a>
                            <span class="breadcrumb-separator">›</span>
                        `;
                    }
                }).join('')}
            </nav>
        `;
    }

    static render(items) {
        const breadcrumb = new Breadcrumb(items);
        return breadcrumb.render();
    }
}

// =============================================================================
// PAGINATION COMPONENT
// =============================================================================

class Pagination {
    constructor(config) {
        this.currentPage = config.currentPage || 1;
        this.totalPages = config.totalPages || 1;
        this.onPageChange = config.onPageChange || null;
        this.maxVisiblePages = config.maxVisiblePages || 5;
    }

    render() {
        if (this.totalPages <= 1) return '';

        const startPage = Math.max(1, this.currentPage - Math.floor(this.maxVisiblePages / 2));
        const endPage = Math.min(this.totalPages, startPage + this.maxVisiblePages - 1);

        let pages = [];
        
        // Previous button
        pages.push(`
            <button class="page-btn" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="${this.onPageChange}(${this.currentPage - 1})">
                ‹ Previous
            </button>
        `);

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            pages.push(`
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="${this.onPageChange}(${i})">
                    ${i}
                </button>
            `);
        }

        // Next button
        pages.push(`
            <button class="page-btn" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}
                    onclick="${this.onPageChange}(${this.currentPage + 1})">
                Next ›
            </button>
        `);

        return `
            <div class="pagination">
                ${pages.join('')}
            </div>
        `;
    }

    static render(config) {
        const pagination = new Pagination(config);
        return pagination.render();
    }
}

// =============================================================================
// GLOBAL UTILITY FUNCTIONS
// =============================================================================

const UIUtils = {
    /**
     * Format currency
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    /**
     * Format date
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },

    /**
     * Format relative time
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return this.formatDate(date);
    },

    /**
     * Truncate text
     */
    truncate(text, length = 50) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    /**
     * Debounce function
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
};

// =============================================================================
// EXPORT COMPONENTS TO GLOBAL SCOPE
// =============================================================================

window.StatCard = StatCard;
window.ClientCard = ClientCard;
window.SimpleModal = SimpleModal;
window.Modal = SimpleModal; // Alias for compatibility
window.LoadingComponent = LoadingComponent;
window.ErrorComponent = ErrorComponent;
window.EmptyState = EmptyState;
window.Toast = Toast;
window.Breadcrumb = Breadcrumb;
window.Pagination = Pagination;
window.UIUtils = UIUtils;

// Helper function for showing toasts
window.showToast = function(message, type = 'info', duration = 3000) {
    return Toast.show({ message, type, duration });
};

console.log('✅ UI Components loaded (clean version)');