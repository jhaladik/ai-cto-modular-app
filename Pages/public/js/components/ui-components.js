// AI Factory UI Components Library
// File: /js/components/ui-components.js

/**
 * Reusable UI Components for AI Factory
 * Used by both admin and client dashboards
 */

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

class StatCard {
    constructor(config) {
        this.id = config.id;
        this.label = config.label;
        this.value = config.value || '-';
        this.change = config.change || null;
        this.icon = config.icon || '';
        this.type = config.type || 'default'; // 'default', 'currency', 'percentage'
    }

    render() {
        const formattedValue = this.formatValue(this.value);
        const changeHtml = this.renderChange();
        
        return `
            <div class="stat-card" data-stat="${this.id}">
                <div class="stat-value" id="stat-${this.id}">
                    ${this.icon} ${formattedValue}
                </div>
                <div class="stat-label">${this.label}</div>
                ${changeHtml}
            </div>
        `;
    }

    formatValue(value) {
        if (value === null || value === undefined || value === '-') return '-';
        
        switch (this.type) {
            case 'currency':
                return `$${Number(value).toFixed(2)}`;
            case 'percentage':
                return `${Number(value).toFixed(1)}%`;
            default:
                return String(value);
        }
    }

    renderChange() {
        if (!this.change) return '';
        
        const { value, label, isPercent } = this.change;
        if (value === null || value === undefined) return '';
        
        const isPositive = value > 0;
        const symbol = isPositive ? '+' : '';
        const suffix = isPercent ? '%' : '';
        const className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        
        return `
            <div class="${className}">
                ${symbol}${value}${suffix} ${label}
            </div>
        `;
    }

    update(newValue, newChange = null) {
        this.value = newValue;
        this.change = newChange;
        
        const element = document.getElementById(`stat-${this.id}`);
        if (element) {
            element.innerHTML = `${this.icon} ${this.formatValue(newValue)}`;
        }
        
        if (newChange) {
            const changeEl = element?.parentElement?.querySelector('.stat-change');
            if (changeEl) {
                const { value, label, isPercent } = newChange;
                const isPositive = value > 0;
                const symbol = isPositive ? '+' : '';
                const suffix = isPercent ? '%' : '';
                changeEl.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
                changeEl.textContent = `${symbol}${value}${suffix} ${label}`;
            }
        }
    }
}

// =============================================================================
// WORKER CARD COMPONENT
// =============================================================================

class WorkerCard {
    constructor(config) {
        this.workerId = config.workerId;
        this.name = config.name;
        this.icon = config.icon;
        this.apiClient = config.apiClient || window.apiClient;
        this.userContext = config.userContext || {};
        this.containerId = `worker-${this.workerId}`;
        this.statusId = `status-${this.workerId}`;
    }

    render() {
        return `
            <div class="card worker-card" data-worker="${this.workerId}">
                <div class="card-header">
                    <h3 class="card-title">
                        ${this.icon} ${this.name}
                        <span class="worker-status" id="${this.statusId}">
                            <span class="status-dot"></span>
                            Loading...
                        </span>
                    </h3>
                </div>
                <div class="card-content" id="${this.containerId}">
                    <div class="loading-state">Loading worker...</div>
                </div>
            </div>
        `;
    }

    async mount() {
        // Override in specific worker implementations
        await this.loadInterface();
        await this.checkHealth();
    }

    async loadInterface() {
        // Default implementation - override in specific workers
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="worker-interface">
                    <p>Worker interface not implemented yet.</p>
                    <div class="worker-actions">
                        <button class="btn btn-secondary btn-small" onclick="this.checkHealth()">
                            💚 Health Check
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async checkHealth() {
        const statusEl = document.getElementById(this.statusId);
        if (!statusEl) return;
        
        try {
            const health = await this.apiClient.getWorkerHealth(this.workerId);
            this.updateStatus(statusEl, health);
        } catch (error) {
            this.updateStatus(statusEl, { status: 'error', message: error.message });
        }
    }

    updateStatus(statusEl, health) {
        const isHealthy = health.status === 'healthy';
        statusEl.className = `worker-status ${isHealthy ? 'healthy' : 'error'}`;
        statusEl.innerHTML = `
            <span class="status-dot ${isHealthy ? 'online' : 'offline'}"></span>
            ${isHealthy ? 'Healthy' : 'Error'}
        `;
    }

    showError(error) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h4>⚠️ Worker Unavailable</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-small btn-secondary" onclick="window.workerRegistry?.get('${this.workerId}')?.mount()">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }
}

// =============================================================================
// UNIVERSAL RESEARCHER CARD (Specific Implementation)
// =============================================================================

class UniversalResearcherCard extends WorkerCard {
    constructor(config) {
        super({
            workerId: 'universal-researcher',
            name: 'Universal Researcher',
            icon: '🔬',
            ...config
        });
    }

    async loadInterface() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="worker-interface">
                <div class="form-group">
                    <label class="form-label">Research Topic</label>
                    <input type="text" class="form-input" id="research-topic-${this.workerId}" 
                           placeholder="Enter research topic...">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Research Depth</label>
                    <select class="form-input" id="research-depth-${this.workerId}">
                        <option value="1">Quick (1 depth)</option>
                        <option value="2" selected>Standard (2 depth)</option>
                        <option value="3">Deep (3 depth)</option>
                    </select>
                </div>
                
                <div class="worker-actions">
                    <button class="btn btn-primary" onclick="window.workerRegistry?.get('${this.workerId}')?.executeResearch()" id="research-btn-${this.workerId}">
                        🔍 Start Research
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.checkHealth()" id="health-btn-${this.workerId}">
                        💚 Health Check
                    </button>
                </div>
                
                <div id="research-results-${this.workerId}" class="research-results" style="margin-top: 1rem;"></div>
            </div>
        `;
    }

    async executeResearch() {
        const topic = document.getElementById(`research-topic-${this.workerId}`)?.value;
        const depth = document.getElementById(`research-depth-${this.workerId}`)?.value || '2';
        const resultsEl = document.getElementById(`research-results-${this.workerId}`);
        const btn = document.getElementById(`research-btn-${this.workerId}`);
        
        if (!topic) {
            alert('Please enter a research topic');
            return;
        }

        try {
            // Update UI
            btn.textContent = '⏳ Researching...';
            btn.disabled = true;
            resultsEl.innerHTML = '<div class="loading-state">Researching topic...</div>';
            
            // Execute research via API client
            const result = await this.apiClient.executeResearch(topic, parseInt(depth));
            this.displayResults(result);
            
        } catch (error) {
            console.error('Research failed:', error);
            resultsEl.innerHTML = `
                <div class="error-state">
                    <h4>Research Failed</h4>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            btn.textContent = '🔍 Start Research';
            btn.disabled = false;
        }
    }

    displayResults(result) {
        const resultsEl = document.getElementById(`research-results-${this.workerId}`);
        
        if (result.sources && result.sources.length > 0) {
            resultsEl.innerHTML = `
                <div class="research-success">
                    <h4>✅ Research Complete</h4>
                    <p><strong>${result.sources.length}</strong> sources found</p>
                    <p><strong>Session ID:</strong> ${result.session_id}</p>
                    <p><strong>Quality Score:</strong> ${(result.quality_score * 100).toFixed(1)}%</p>
                    <details style="margin-top: 0.5rem;">
                        <summary>View Sources</summary>
                        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            ${result.sources.slice(0, 5).map(source => 
                                `<li><a href="${source.url}" target="_blank">${source.title}</a></li>`
                            ).join('')}
                            ${result.sources.length > 5 ? `<li>... and ${result.sources.length - 5} more</li>` : ''}
                        </ul>
                    </details>
                </div>
            `;
        } else {
            resultsEl.innerHTML = `
                <div class="error-state">
                    <h4>No Results</h4>
                    <p>No sources found for this topic.</p>
                </div>
            `;
        }
    }
}

// =============================================================================
// DASHBOARD LAYOUT COMPONENT
// =============================================================================

class DashboardLayout {
    constructor(config) {
        this.title = config.title || 'AI Factory';
        this.userInfo = config.userInfo || {};
        this.showHeader = config.showHeader !== false;
        this.showStats = config.showStats !== false;
        this.showWorkers = config.showWorkers !== false;
        this.customActions = config.customActions || [];
    }

    render() {
        return `
            <div class="admin-dashboard">
                ${this.showHeader ? this.renderHeader() : ''}
                <div class="dashboard-content">
                    ${this.showStats ? this.renderStatsSection() : ''}
                    ${this.showWorkers ? this.renderWorkersSection() : ''}
                </div>
            </div>
        `;
    }

    renderHeader() {
        const userName = this.userInfo?.fullName || this.userInfo?.username || 'User';
        
        const defaultActions = [
            { text: '🔄 Refresh', onclick: 'window.currentDashboard?.refresh()', class: 'btn-secondary btn-small' },
            { text: '🚪 Logout', onclick: 'logout()', class: 'btn-secondary btn-small' }
        ];
        
        const allActions = [...this.customActions, ...defaultActions];
        
        return `
            <header class="dashboard-header">
                <h1>${this.title}</h1>
                <div class="header-actions">
                    <span class="user-info">Welcome, ${userName}</span>
                    ${allActions.map(action => 
                        `<button class="btn ${action.class}" onclick="${action.onclick}">${action.text}</button>`
                    ).join('')}
                </div>
            </header>
        `;
    }

    renderStatsSection() {
        return `
            <div class="stats-grid" id="stats-grid">
                <!-- Stats cards will be inserted here -->
            </div>
        `;
    }

    renderWorkersSection() {
        return `
            <div class="dashboard-grid" id="workers-grid">
                <!-- Worker cards will be inserted here -->
            </div>
        `;
    }
}

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.instances = new Map();
    }

    register(name, componentClass) {
        this.components.set(name, componentClass);
    }

    create(name, config) {
        const ComponentClass = this.components.get(name);
        if (!ComponentClass) {
            throw new Error(`Component '${name}' not found`);
        }
        
        const instance = new ComponentClass(config);
        this.instances.set(`${name}-${Date.now()}`, instance);
        return instance;
    }

    getInstances(name) {
        return Array.from(this.instances.values()).filter(instance => 
            instance.constructor.name === name || instance.workerId === name
        );
    }
}

// =============================================================================
// ADDITIONAL WORKER CARDS (for client dashboard)
// =============================================================================

class ContentClassifierCard extends WorkerCard {
    constructor(config) {
        super({
            workerId: 'content-classifier',
            name: 'Content Classifier',
            icon: '🧠',
            ...config
        });
    }

    async loadInterface() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="worker-interface">
                <div class="form-group">
                    <label class="form-label">Content to Classify</label>
                    <textarea class="form-input form-textarea" id="content-input-${this.workerId}" 
                              placeholder="Paste content to analyze and classify..." rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Classification Type</label>
                    <select class="form-input" id="classification-type-${this.workerId}">
                        <option value="sentiment">Sentiment Analysis</option>
                        <option value="category">Content Category</option>
                        <option value="quality">Quality Assessment</option>
                        <option value="relevance">Topic Relevance</option>
                    </select>
                </div>
                
                <div class="worker-actions">
                    <button class="btn btn-primary" onclick="window.workerRegistry?.get('${this.workerId}')?.classifyContent()" id="classify-btn-${this.workerId}">
                        🧠 Classify Content
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.checkHealth()" id="health-btn-${this.workerId}">
                        💚 Health Check
                    </button>
                </div>
                
                <div id="classification-results-${this.workerId}" class="classification-results" style="margin-top: 1rem;"></div>
            </div>
        `;
    }

    async classifyContent() {
        const content = document.getElementById(`content-input-${this.workerId}`)?.value;
        const classificationType = document.getElementById(`classification-type-${this.workerId}`)?.value;
        const resultsEl = document.getElementById(`classification-results-${this.workerId}`);
        const btn = document.getElementById(`classify-btn-${this.workerId}`);
        
        if (!content?.trim()) {
            alert('Please enter content to classify');
            return;
        }

        try {
            // Update UI
            btn.textContent = '⏳ Analyzing...';
            btn.disabled = true;
            resultsEl.innerHTML = '<div class="loading-state">Analyzing content...</div>';
            
            // Make API call (when content classifier is implemented)
            const result = await this.apiClient.workerRequest('content-classifier', '/classify', 'POST', {
                content: content,
                classification_type: classificationType
            });
            
            this.displayClassificationResults(result);
            
        } catch (error) {
            console.error('Classification failed:', error);
            resultsEl.innerHTML = `
                <div class="error-state">
                    <h4>Classification Failed</h4>
                    <p>Content Classifier is not available yet. This feature will be added when the worker is implemented.</p>
                </div>
            `;
        } finally {
            btn.textContent = '🧠 Classify Content';
            btn.disabled = false;
        }
    }

    displayClassificationResults(result) {
        const resultsEl = document.getElementById(`classification-results-${this.workerId}`);
        
        if (result && result.classification) {
            resultsEl.innerHTML = `
                <div class="classification-success">
                    <h4>✅ Classification Complete</h4>
                    <div style="margin: 1rem 0;">
                        <strong>Type:</strong> ${result.classification.type}<br>
                        <strong>Confidence:</strong> ${(result.classification.confidence * 100).toFixed(1)}%<br>
                        <strong>Category:</strong> ${result.classification.category}
                    </div>
                    ${result.classification.details ? `<p><strong>Details:</strong> ${result.classification.details}</p>` : ''}
                </div>
            `;
        } else {
            resultsEl.innerHTML = `
                <div class="error-state">
                    <h4>No Classification Results</h4>
                    <p>Unable to classify the provided content.</p>
                </div>
            `;
        }
    }
}

class ReportBuilderCard extends WorkerCard {
    constructor(config) {
        super({
            workerId: 'report-builder',
            name: 'Report Builder',
            icon: '📊',
            ...config
        });
    }

    async loadInterface() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="worker-interface">
                <div class="form-group">
                    <label class="form-label">Report Type</label>
                    <select class="form-input" id="report-type-${this.workerId}">
                        <option value="executive_summary">Executive Summary</option>
                        <option value="competitive_intelligence">Competitive Intelligence</option>
                        <option value="market_analysis">Market Analysis</option>
                        <option value="trend_report">Trend Report</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Topic/Focus Area</label>
                    <input type="text" class="form-input" id="report-topic-${this.workerId}" 
                           placeholder="Enter the main topic for your report...">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Time Range</label>
                    <select class="form-input" id="time-range-${this.workerId}">
                        <option value="7d">Last 7 days</option>
                        <option value="30d" selected>Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>
                </div>
                
                <div class="worker-actions">
                    <button class="btn btn-primary" onclick="window.workerRegistry?.get('${this.workerId}')?.generateReport()" id="generate-btn-${this.workerId}">
                        📊 Generate Report
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.checkHealth()" id="health-btn-${this.workerId}">
                        💚 Health Check
                    </button>
                </div>
                
                <div id="report-results-${this.workerId}" class="report-results" style="margin-top: 1rem;"></div>
            </div>
        `;
    }

    async generateReport() {
        const reportType = document.getElementById(`report-type-${this.workerId}`)?.value;
        const topic = document.getElementById(`report-topic-${this.workerId}`)?.value;
        const timeRange = document.getElementById(`time-range-${this.workerId}`)?.value;
        const resultsEl = document.getElementById(`report-results-${this.workerId}`);
        const btn = document.getElementById(`generate-btn-${this.workerId}`);
        
        if (!topic?.trim()) {
            alert('Please enter a topic for the report');
            return;
        }

        try {
            // Update UI
            btn.textContent = '⏳ Generating...';
            btn.disabled = true;
            resultsEl.innerHTML = '<div class="loading-state">Generating report...</div>';
            
            // Make API call (when report builder is implemented)
            const result = await this.apiClient.workerRequest('report-builder', '/generate', 'POST', {
                report_type: reportType,
                topic: topic,
                time_range: timeRange,
                output_format: 'json'
            });
            
            this.displayReportResults(result);
            
        } catch (error) {
            console.error('Report generation failed:', error);
            resultsEl.innerHTML = `
                <div class="error-state">
                    <h4>Report Generation Failed</h4>
                    <p>Report Builder is not available yet. This feature will be added when the worker is implemented.</p>
                </div>
            `;
        } finally {
            btn.textContent = '📊 Generate Report';
            btn.disabled = false;
        }
    }

    displayReportResults(result) {
        const resultsEl = document.getElementById(`report-results-${this.workerId}`);
        
        if (result && result.report_id) {
            resultsEl.innerHTML = `
                <div class="report-success">
                    <h4>✅ Report Generated</h4>
                    <div style="margin: 1rem 0;">
                        <strong>Report ID:</strong> ${result.report_id}<br>
                        <strong>Title:</strong> ${result.title || 'Generated Report'}<br>
                        <strong>Pages:</strong> ${result.page_count || 'N/A'}
                    </div>
                    <div class="report-actions" style="margin-top: 1rem;">
                        <button class="btn btn-secondary btn-small">📄 View Report</button>
                        <button class="btn btn-secondary btn-small">💾 Download PDF</button>
                        <button class="btn btn-secondary btn-small">🔗 Share Link</button>
                    </div>
                </div>
            `;
        } else {
            resultsEl.innerHTML = `
                <div class="error-state">
                    <h4>Report Generation Failed</h4>
                    <p>Unable to generate the requested report.</p>
                </div>
            `;
        }
    }
}

// Create global registry
window.ComponentRegistry = ComponentRegistry;
window.componentRegistry = new ComponentRegistry();

// Register components
window.componentRegistry.register('StatCard', StatCard);
window.componentRegistry.register('WorkerCard', WorkerCard);
window.componentRegistry.register('UniversalResearcherCard', UniversalResearcherCard);
window.componentRegistry.register('DashboardLayout', DashboardLayout);

// Export classes
window.StatCard = StatCard;
window.WorkerCard = WorkerCard;
window.UniversalResearcherCard = UniversalResearcherCard;
window.DashboardLayout = DashboardLayout;

// Worker registry for easy access
window.workerRegistry = new Map();