/**
 * Phase 2: Worker Base Classes
 * Extracted from existing worker patterns (content-classifier.html, etc.)
 */

// =============================================================================
// WORKER CARD BASE CLASS
// =============================================================================

/**
 * Base class for worker dashboard cards
 * Extracted from admin-dashboard-components.js patterns
 */
class WorkerCardBase {
    constructor(config) {
        this.workerId = config.workerId;
        this.title = config.title;
        this.icon = config.icon || '🔧';
        this.description = config.description || '';
        this.kamContext = config.kamContext;
        this.permissionResolver = config.permissionResolver;
        this.apiClient = config.apiClient;
        
        // Card state
        this.loading = false;
        this.error = null;
        this.data = null;
        this.containerId = `${this.workerId}-card`;
        
        // Common capabilities
        this.supportsTemplate = config.supportsTemplate || true;
        this.supportsBatch = config.supportsBatch || false;
        this.requiresPermission = config.requiresPermission || 'basic_worker_access';
    }

    /**
     * Main render method - creates the card HTML
     */
    async render() {
        // Check permissions first
        const hasPermission = await this.permissionResolver.hasPermission(this.requiresPermission);
        if (!hasPermission) {
            return this.renderAccessDenied();
        }

        return `
            <div class="worker-card" id="${this.containerId}" data-worker="${this.workerId}">
                ${this.renderHeader()}
                ${this.renderStatus()}
                <div class="card-content">
                    ${await this.renderContent()}
                </div>
                ${this.renderActions()}
            </div>
        `;
    }

    /**
     * Render card header (extracted from existing pattern)
     */
    renderHeader() {
        return `
            <div class="worker-header">
                <div class="worker-info">
                    <div class="worker-icon">${this.icon}</div>
                    <div class="worker-title-section">
                        <h3 class="worker-title">${this.title}</h3>
                        <p class="worker-description">${this.description}</p>
                    </div>
                </div>
                <div class="worker-status" id="${this.workerId}-status">
                    <span class="status-indicator status-unknown">●</span>
                </div>
            </div>
        `;
    }

    /**
     * Render status section (from existing worker patterns)
     */
    renderStatus() {
        if (this.loading) {
            return `
                <div class="card-status loading">
                    <div class="loading-spinner"></div>
                    <span>Loading...</span>
                </div>
            `;
        }

        if (this.error) {
            return `
                <div class="card-status error">
                    <span class="error-icon">⚠️</span>
                    <span class="error-text">${this.error.message}</span>
                    <button class="btn-retry" onclick="this.retry()">Retry</button>
                </div>
            `;
        }

        return ''; // No status to show
    }

    /**
     * Render main content - override in subclasses
     */
    async renderContent() {
        return `
            <div class="default-content">
                <p>Worker ready for configuration</p>
            </div>
        `;
    }

    /**
     * Render action buttons (extracted from existing pattern)
     */
    renderActions() {
        return `
            <div class="card-actions">
                <button class="btn btn-primary" onclick="window.componentRegistry.loadWorkerInterface('${this.workerId}')">
                    Open Interface
                </button>
                <button class="btn btn-secondary" onclick="this.showQuickStart()">
                    Quick Start
                </button>
                ${this.renderCustomActions()}
            </div>
        `;
    }

    /**
     * Custom actions - override in subclasses
     */
    renderCustomActions() {
        return '';
    }

    /**
     * Render access denied message
     */
    renderAccessDenied() {
        return `
            <div class="worker-card access-denied">
                <div class="access-denied-content">
                    <div class="worker-icon-disabled">${this.icon}</div>
                    <h3>${this.title}</h3>
                    <p class="access-message">🔒 Upgrade required</p>
                    <button class="btn btn-upgrade" onclick="this.showUpgradeOptions()">
                        View Plans
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Load worker data (from existing API patterns)
     */
    async loadData() {
        try {
            this.loading = true;
            this.error = null;
            this.updateDisplay();

            // Get worker status
            const status = await this.apiClient.callWorker(this.workerId, '/status');
            
            // Get recent activity if available
            const activity = await this.apiClient.callWorker(this.workerId, '/recent-activity').catch(() => null);

            this.data = {
                status: status,
                activity: activity,
                loaded: new Date()
            };

            this.loading = false;
            this.updateDisplay();

        } catch (error) {
            this.loading = false;
            this.error = error;
            this.updateDisplay();
        }
    }

    /**
     * Update card display
     */
    updateDisplay() {
        const container = document.getElementById(this.containerId);
        if (container) {
            // Update just the status and content sections
            const statusElement = container.querySelector('.card-status');
            if (statusElement) {
                statusElement.outerHTML = this.renderStatus();
            }
        }
    }

    /**
     * Show quick start modal
     */
    showQuickStart() {
        // Override in subclasses for worker-specific quick start
        console.log(`Quick start for ${this.workerId}`);
    }

    /**
     * Show upgrade options
     */
    showUpgradeOptions() {
        alert('Upgrade your subscription to access this worker');
    }

    /**
     * Retry after error
     */
    async retry() {
        await this.loadData();
    }
}

// =============================================================================
// WORKER INTERFACE BASE CLASS  
// =============================================================================

/**
 * Base class for full worker interfaces
 * Extracted from content-classifier.html and other worker pages
 */
class WorkerInterfaceBase {
    constructor(config) {
        this.workerId = config.workerId;
        this.title = config.title;
        this.icon = config.icon || '🔧';
        this.subtitle = config.subtitle || '';
        this.kamContext = config.kamContext;
        this.permissionResolver = config.permissionResolver;
        this.apiClient = config.apiClient;
        
        // Interface state
        this.loaded = false;
        this.currentSession = null;
        this.results = [];
        
        // Configuration
        this.requiresPermission = config.requiresPermission || 'basic_worker_access';
        this.supportsBatch = config.supportsBatch || false;
        this.supportsTemplates = config.supportsTemplates || true;
    }

    /**
     * Initialize interface (called when page loads)
     */
    async initialize() {
        try {
            // Check permissions
            const hasPermission = await this.permissionResolver.hasPermission(this.requiresPermission);
            if (!hasPermission) {
                this.showAccessDenied();
                return;
            }

            // Setup authentication
            await this.setupAuth();

            // Load initial data
            await this.loadInitialData();

            // Setup event listeners
            this.setupEventListeners();

            // Hide loading screen
            this.hideLoadingScreen();

            this.loaded = true;
            console.log(`✅ ${this.workerId} interface initialized`);

        } catch (error) {
            console.error(`❌ ${this.workerId} initialization failed:`, error);
            this.showError(error);
        }
    }

    /**
     * Setup authentication (from existing pattern)
     */
    async setupAuth() {
        const sessionToken = localStorage.getItem('bitware-session-token');
        if (!sessionToken) {
            throw new Error('No session token found');
        }

        // Validate session
        const validation = await this.apiClient.callWorker('auth', '/validate');
        if (!validation.valid) {
            throw new Error('Session expired');
        }

        // Update header with user info
        this.updateUserDisplay(validation.user);
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Get worker status
            const status = await this.apiClient.callWorker(this.workerId, '/status');
            this.updateStatusDisplay(status);

            // Load templates if supported
            if (this.supportsTemplates) {
                const templates = await this.apiClient.callWorker(this.workerId, '/templates').catch(() => []);
                this.updateTemplateOptions(templates);
            }

            // Load recent sessions
            const recentSessions = await this.apiClient.callWorker(this.workerId, '/recent-sessions').catch(() => []);
            this.updateRecentSessions(recentSessions);

        } catch (error) {
            console.warn(`⚠️ Could not load initial data for ${this.workerId}:`, error);
        }
    }

    /**
     * Setup event listeners (extracted from existing patterns)
     */
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('bitware-session-token');
                window.location.href = '/login.html';
            });
        }

        // Execute button
        const executeBtn = document.getElementById('execute-btn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeWorker());
        }

        // Form submission
        const mainForm = document.getElementById('worker-form');
        if (mainForm) {
            mainForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.executeWorker();
            });
        }

        // Setup worker-specific listeners
        this.setupCustomEventListeners();
    }

    /**
     * Custom event listeners - override in subclasses
     */
    setupCustomEventListeners() {
        // Override in subclasses
    }

    /**
     * Hide loading screen (from existing pattern)
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const mainContent = document.getElementById('main-content');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (mainContent) {
            mainContent.style.display = 'block';
        }
    }

    /**
     * Update user display in header
     */
    updateUserDisplay(user) {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.textContent = user.email || user.username || 'User';
        }
    }

    /**
     * Update status display
     */
    updateStatusDisplay(status) {
        const statusValue = document.getElementById('status-value');
        const statusIndicator = document.querySelector('.status-indicator');
        
        if (statusValue) {
            statusValue.textContent = status.status || 'Unknown';
        }
        
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${status.status === 'healthy' ? 'status-online' : 'status-offline'}`;
        }
    }

    /**
     * Update template options
     */
    updateTemplateOptions(templates) {
        const templateSelect = document.getElementById('template-select');
        if (templateSelect && templates.length > 0) {
            templateSelect.innerHTML = templates.map(t => 
                `<option value="${t.id}">${t.name}</option>`
            ).join('');
        }
    }

    /**
     * Update recent sessions display
     */
    updateRecentSessions(sessions) {
        const recentList = document.getElementById('recent-sessions');
        if (recentList && sessions.length > 0) {
            recentList.innerHTML = sessions.map(s => `
                <div class="recent-session" onclick="this.loadSession('${s.id}')">
                    <div class="session-info">
                        <strong>${s.input_summary || 'Session'}</strong>
                        <span class="session-date">${new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    /**
     * Execute worker (main functionality)
     */
    async executeWorker() {
        try {
            // Gather input data
            const inputData = this.gatherInputData();
            
            // Validate input
            const validation = this.validateInput(inputData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Show progress
            this.showProgress();

            // Execute via API
            const result = await this.apiClient.callWorker(this.workerId, '/', 'POST', inputData);

            // Store session
            this.currentSession = result.session_id || Date.now().toString();

            // Display results
            this.displayResults(result);

            // Track usage
            if (this.kamContext) {
                await this.kamContext.trackUsage(this.workerId, result.cost_usd || 0, inputData);
            }

        } catch (error) {
            console.error(`❌ ${this.workerId} execution failed:`, error);
            this.showError(error);
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Gather input data - override in subclasses
     */
    gatherInputData() {
        return {};
    }

    /**
     * Validate input - override in subclasses
     */
    validateInput(inputData) {
        return { valid: true };
    }

    /**
     * Show progress indicator
     */
    showProgress() {
        const progressSection = document.getElementById('progress-section');
        const executeBtn = document.getElementById('execute-btn');
        
        if (progressSection) {
            progressSection.style.display = 'block';
        }
        
        if (executeBtn) {
            executeBtn.disabled = true;
            executeBtn.textContent = 'Processing...';
        }
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const progressSection = document.getElementById('progress-section');
        const executeBtn = document.getElementById('execute-btn');
        
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        if (executeBtn) {
            executeBtn.disabled = false;
            executeBtn.textContent = 'Execute';
        }
    }

    /**
     * Display results - override in subclasses
     */
    displayResults(result) {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.innerHTML = `
                <h3>Results</h3>
                <pre>${JSON.stringify(result, null, 2)}</pre>
            `;
        }
    }

    /**
     * Show error message
     */
    showError(error) {
        const errorContainer = document.getElementById('error-container') || this.createErrorContainer();
        errorContainer.innerHTML = `
            <div class="error-message">
                <h4>⚠️ Error</h4>
                <p>${error.message}</p>
                <button onclick="this.clearError()">Dismiss</button>
            </div>
        `;
        errorContainer.style.display = 'block';
    }

    /**
     * Create error container if not exists
     */
    createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'error-container';
        container.className = 'error-container';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Clear error message
     */
    clearError() {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }

    /**
     * Show access denied
     */
    showAccessDenied() {
        document.body.innerHTML = `
            <div class="access-denied-page">
                <div class="access-denied-content">
                    <h1>🔒 Access Denied</h1>
                    <p>You don't have permission to access ${this.title}</p>
                    <p>Please upgrade your subscription or contact support.</p>
                    <a href="/" class="btn btn-primary">Return to Dashboard</a>
                </div>
            </div>
        `;
    }

    /**
     * Load previous session
     */
    async loadSession(sessionId) {
        try {
            const session = await this.apiClient.callWorker(this.workerId, `/session/${sessionId}`);
            
            // Populate form with session data
            this.populateForm(session.input_data);
            
            // Display previous results
            this.displayResults(session.results);
            
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    }

    /**
     * Populate form with data - override in subclasses
     */
    populateForm(inputData) {
        // Override in subclasses
    }
}

// =============================================================================
// EXPORT FOR GLOBAL USE
// =============================================================================

window.WorkerCardBase = WorkerCardBase;
window.WorkerInterfaceBase = WorkerInterfaceBase;

console.log('✅ Worker Base Classes loaded!');