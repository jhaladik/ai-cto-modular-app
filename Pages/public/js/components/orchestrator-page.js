/**
 * Orchestrator 2.0 Page Component
 * Main dashboard for pipeline orchestration and management
 */
class OrchestratorPage {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.orchestratorAPI = new OrchestratorAPI();
        
        // State management
        this.activeTab = 'dashboard';
        this.executions = [];
        this.templates = [];
        this.workers = [];
        this.resources = null;
        this.refreshInterval = null;
        
        // Bind methods
        this.switchTab = this.switchTab.bind(this);
        this.refreshData = this.refreshData.bind(this);
        this.executePipeline = this.executePipeline.bind(this);
    }

    /**
     * Main render method
     */
    render() {
        return `
            <div class="admin-page orchestrator-page">
                ${this.renderHeader()}
                ${this.renderTabs()}
                <div class="page-content">
                    <div id="orchestrator-tab-content" class="tab-content">
                        ${this.renderTabContent()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render page header
     */
    renderHeader() {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1 class="page-title">
                        <span class="page-icon">🎛️</span>
                        Orchestrator 2.0 Control Center
                    </h1>
                    <p class="page-subtitle">Pipeline orchestration, resource management, and worker coordination</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="window.orchestratorPage.refreshData()">
                        <i class="icon">🔄</i> Refresh
                    </button>
                    <button class="btn btn-primary" onclick="window.orchestratorPage.showExecuteModal()">
                        <i class="icon">▶️</i> Execute Pipeline
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render tab navigation
     */
    renderTabs() {
        const tabs = [
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'pipelines', icon: '🔄', label: 'Pipeline Manager' },
            { id: 'resources', icon: '📈', label: 'Resource Monitor' },
            { id: 'workers', icon: '🤖', label: 'Worker Status' },
            { id: 'history', icon: '📜', label: 'Execution History' },
            { id: 'templates', icon: '📝', label: 'Template Editor' },
            { id: 'logs', icon: '📋', label: 'System Logs' }
        ];

        return `
            <div class="page-tabs">
                <div class="page-tabs-container">
                    ${tabs.map(tab => `
                        <button class="page-tab ${this.activeTab === tab.id ? 'active' : ''}"
                                onclick="window.orchestratorPage.switchTab('${tab.id}')">
                            <span class="page-tab-icon">${tab.icon}</span>
                            <span class="page-tab-label">${tab.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render tab content based on active tab
     */
    renderTabContent() {
        switch (this.activeTab) {
            case 'dashboard':
                return this.renderDashboard();
            case 'pipelines':
                return this.renderPipelineManager();
            case 'resources':
                return this.renderResourceMonitor();
            case 'workers':
                return this.renderWorkerStatus();
            case 'history':
                return this.renderExecutionHistory();
            case 'templates':
                return this.renderTemplateEditor();
            case 'logs':
                return this.renderSystemLogs();
            default:
                return this.renderDashboard();
        }
    }

    /**
     * Render main dashboard
     */
    renderDashboard() {
        return `
            <div class="orchestrator-dashboard">
                <!-- Stats Cards -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">▶️</div>
                        <div class="stat-content">
                            <div class="stat-value" id="active-pipelines">0</div>
                            <div class="stat-label">Active Pipelines</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-content">
                            <div class="stat-value" id="queue-length">0</div>
                            <div class="stat-label">Queue Length</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-value" id="resource-usage">0%</div>
                            <div class="stat-label">Resource Usage</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value" id="daily-cost">$0.00</div>
                            <div class="stat-label">Today's Cost</div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="dashboard-section">
                    <h2 class="section-title">Quick Actions</h2>
                    <div class="quick-actions">
                        <button class="action-card" onclick="window.orchestratorPage.showExecuteModal()">
                            <div class="action-icon">🚀</div>
                            <div class="action-label">Execute Pipeline</div>
                        </button>
                        <button class="action-card" onclick="window.orchestratorPage.switchTab('resources')">
                            <div class="action-icon">📊</div>
                            <div class="action-label">Check Resources</div>
                        </button>
                        <button class="action-card" onclick="window.orchestratorPage.switchTab('workers')">
                            <div class="action-icon">🔍</div>
                            <div class="action-label">Worker Health</div>
                        </button>
                        <button class="action-card" onclick="window.orchestratorPage.switchTab('history')">
                            <div class="action-icon">📜</div>
                            <div class="action-label">View History</div>
                        </button>
                    </div>
                </div>

                <!-- Active Executions -->
                <div class="dashboard-section">
                    <h2 class="section-title">Active Executions</h2>
                    <div id="active-executions-list" class="executions-list">
                        <div class="empty-state">
                            <div class="empty-icon">📭</div>
                            <p>No active executions</p>
                        </div>
                    </div>
                </div>

                <!-- System Health -->
                <div class="dashboard-section">
                    <h2 class="section-title">System Health</h2>
                    <div id="system-health" class="health-grid">
                        <div class="health-indicator">
                            <div class="health-status healthy"></div>
                            <span>API Services</span>
                        </div>
                        <div class="health-indicator">
                            <div class="health-status healthy"></div>
                            <span>Storage</span>
                        </div>
                        <div class="health-indicator">
                            <div class="health-status healthy"></div>
                            <span>Workers</span>
                        </div>
                        <div class="health-indicator">
                            <div class="health-status healthy"></div>
                            <span>Queue</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render Pipeline Manager tab
     */
    renderPipelineManager() {
        return `
            <div class="pipeline-manager">
                <div class="section-header">
                    <h2>Pipeline Execution & Management</h2>
                    <div class="section-actions">
                        <button class="btn btn-primary" onclick="window.orchestratorPage.showExecuteModal()">
                            <i class="icon">▶️</i> Execute New Pipeline
                        </button>
                    </div>
                </div>

                <!-- Execution Queue -->
                <div class="pipeline-section">
                    <h3>Execution Queue</h3>
                    <div id="execution-queue" class="queue-container">
                        <div class="loading-spinner">Loading queue...</div>
                    </div>
                </div>

                <!-- Active Executions -->
                <div class="pipeline-section">
                    <h3>Active Executions</h3>
                    <div id="active-pipeline-list" class="pipeline-list">
                        <div class="loading-spinner">Loading executions...</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render Resource Monitor tab
     */
    renderResourceMonitor() {
        return `
            <div class="resource-monitor">
                <div class="section-header">
                    <h2>Resource Usage & Availability</h2>
                    <div class="time-range-selector">
                        <select id="resource-time-range" onchange="window.orchestratorPage.updateResourceView()">
                            <option value="1h">Last Hour</option>
                            <option value="24h" selected>Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>
                </div>

                <!-- Resource Gauges -->
                <div class="resource-gauges">
                    <div class="gauge-container">
                        <h3>API Usage</h3>
                        <div class="gauge" id="api-gauge">
                            <div class="gauge-fill" style="width: 0%"></div>
                            <div class="gauge-label">0%</div>
                        </div>
                        <div class="gauge-details">
                            <span>OpenAI: <span id="openai-usage">0</span> / <span id="openai-limit">10000</span></span>
                        </div>
                    </div>

                    <div class="gauge-container">
                        <h3>Storage Usage</h3>
                        <div class="gauge" id="storage-gauge">
                            <div class="gauge-fill" style="width: 0%"></div>
                            <div class="gauge-label">0%</div>
                        </div>
                        <div class="gauge-details">
                            <span>KV: <span id="kv-usage">0</span> MB</span>
                            <span>R2: <span id="r2-usage">0</span> GB</span>
                        </div>
                    </div>

                    <div class="gauge-container">
                        <h3>Worker Capacity</h3>
                        <div class="gauge" id="worker-gauge">
                            <div class="gauge-fill" style="width: 0%"></div>
                            <div class="gauge-label">0%</div>
                        </div>
                        <div class="gauge-details">
                            <span>Active: <span id="active-workers">0</span> / <span id="total-workers">8</span></span>
                        </div>
                    </div>
                </div>

                <!-- Cost Tracking -->
                <div class="resource-section">
                    <h3>Cost Analysis</h3>
                    <div id="cost-chart-container">
                        <canvas id="cost-chart"></canvas>
                    </div>
                    <div class="cost-summary">
                        <div class="cost-item">
                            <span>Today:</span>
                            <strong id="today-cost">$0.00</strong>
                        </div>
                        <div class="cost-item">
                            <span>This Week:</span>
                            <strong id="week-cost">$0.00</strong>
                        </div>
                        <div class="cost-item">
                            <span>This Month:</span>
                            <strong id="month-cost">$0.00</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render Worker Status tab
     */
    renderWorkerStatus() {
        return `
            <div class="worker-status">
                <div class="section-header">
                    <h2>Worker Health & Status</h2>
                    <button class="btn btn-secondary" onclick="window.orchestratorPage.testAllHandshakes()">
                        <i class="icon">🤝</i> Test All Handshakes
                    </button>
                </div>

                <div class="worker-grid" id="worker-grid">
                    <div class="loading-spinner">Loading worker status...</div>
                </div>
            </div>
        `;
    }

    /**
     * Render Execution History tab
     */
    renderExecutionHistory() {
        return `
            <div class="execution-history">
                <div class="section-header">
                    <h2>Execution History</h2>
                    <div class="history-filters">
                        <select id="history-status-filter" onchange="window.orchestratorPage.filterHistory()">
                            <option value="">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <select id="history-time-filter" onchange="window.orchestratorPage.filterHistory()">
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                        <button class="btn btn-secondary" onclick="window.orchestratorPage.exportHistory()">
                            <i class="icon">📥</i> Export
                        </button>
                    </div>
                </div>

                <div class="history-table-container">
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>Execution ID</th>
                                <th>Pipeline</th>
                                <th>Client</th>
                                <th>Status</th>
                                <th>Duration</th>
                                <th>Cost</th>
                                <th>Started</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="history-table-body">
                            <tr>
                                <td colspan="8" class="loading-cell">
                                    <div class="loading-spinner">Loading history...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="pagination" id="history-pagination">
                    <!-- Pagination controls will be inserted here -->
                </div>
            </div>
        `;
    }

    /**
     * Render Template Editor tab
     */
    renderTemplateEditor() {
        return `
            <div class="template-editor">
                <div class="section-header">
                    <h2>Pipeline Template Editor</h2>
                    <div class="template-actions">
                        <button class="btn btn-secondary" onclick="window.orchestratorPage.syncTemplates()">
                            <i class="icon">🔄</i> Sync with KAM
                        </button>
                        <button class="btn btn-primary" onclick="window.orchestratorPage.createNewTemplate()">
                            <i class="icon">➕</i> New Template
                        </button>
                    </div>
                </div>

                <div class="template-editor-container">
                    <div class="template-list-panel">
                        <h3>Templates</h3>
                        <div id="template-list" class="template-list">
                            <div class="loading-spinner">Loading templates...</div>
                        </div>
                    </div>
                    <div class="template-editor-panel">
                        <div id="template-editor-content">
                            <div class="empty-state">
                                <div class="empty-icon">📄</div>
                                <p>Select a template to edit</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render System Logs tab
     */
    renderSystemLogs() {
        return `
            <div class="system-logs">
                <div class="section-header">
                    <h2>System Logs</h2>
                    <div class="log-filters">
                        <select id="log-level-filter" onchange="window.orchestratorPage.filterLogs()">
                            <option value="">All Levels</option>
                            <option value="error">Errors</option>
                            <option value="warning">Warnings</option>
                            <option value="info">Info</option>
                            <option value="debug">Debug</option>
                        </select>
                        <input type="text" id="log-search" placeholder="Search logs..." 
                               onkeyup="window.orchestratorPage.searchLogs()">
                        <button class="btn btn-secondary" onclick="window.orchestratorPage.clearLogs()">
                            <i class="icon">🗑️</i> Clear
                        </button>
                    </div>
                </div>

                <div class="log-viewer" id="log-viewer">
                    <div class="log-entries">
                        <!-- Log entries will be inserted here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Mount component and start data loading
     */
    async mount() {
        console.log('🎛️ Mounting Orchestrator Page...');
        
        // Set global reference
        window.orchestratorPage = this;
        
        // Initial data load
        await this.loadInitialData();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        // Initialize any charts or visualizations
        this.initializeVisualizations();
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load templates
            const templatesResponse = await this.orchestratorAPI.getTemplates();
            this.templates = templatesResponse.templates || [];
            
            // Load system health
            const healthResponse = await this.orchestratorAPI.getHealth();
            this.updateHealthIndicators(healthResponse);
            
            // Load active executions
            await this.loadActiveExecutions();
            
            // Load resource status
            await this.loadResourceStatus();
            
            // Load worker status
            await this.loadWorkerStatus();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            window.showToast('Failed to load orchestrator data', 'error');
        }
    }

    /**
     * Load active executions
     */
    async loadActiveExecutions() {
        try {
            const response = await this.orchestratorAPI.getQueue();
            const activeExecutions = response.queue || response.executions || [];
            
            // Update dashboard stats if elements exist
            const activePipelinesEl = document.getElementById('active-pipelines');
            const queueLengthEl = document.getElementById('queue-length');
            
            if (activePipelinesEl) {
                activePipelinesEl.textContent = 
                    activeExecutions.filter(e => e.status === 'running').length;
            }
            
            if (queueLengthEl) {
                queueLengthEl.textContent = 
                    activeExecutions.filter(e => e.status === 'queued' || e.status === 'pending').length;
            }
            
            // Update active executions list
            this.renderActiveExecutionsList(activeExecutions);
            
            // Update execution queue
            this.renderExecutionQueue(activeExecutions.filter(e => 
                e.status === 'queued' || e.status === 'pending'
            ));
            
        } catch (error) {
            console.error('Failed to load executions:', error);
        }
    }

    /**
     * Load resource status
     */
    async loadResourceStatus() {
        try {
            const response = await this.orchestratorAPI.getResourceStatus();
            this.resources = response.pools || response.resource_pool || [];
            
            // Update resource gauges
            this.updateResourceGauges();
            
            // Update cost tracking
            this.updateCostTracking(response.usage_summary || response.cost_summary || {});
            
        } catch (error) {
            console.error('Failed to load resources:', error);
        }
    }

    /**
     * Load worker status
     */
    async loadWorkerStatus() {
        try {
            const response = await this.orchestratorAPI.getWorkerStatus();
            this.workers = response.workers || [];
            
            // Update worker grid
            this.renderWorkerGrid();
            
        } catch (error) {
            console.error('Failed to load workers:', error);
        }
    }

    /**
     * Render execution queue
     */
    renderExecutionQueue(queuedExecutions) {
        const container = document.getElementById('execution-queue');
        if (!container) return;
        
        if (queuedExecutions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <p>No items in queue</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="queue-list">
                ${queuedExecutions.map((execution, index) => `
                    <div class="queue-item">
                        <div class="queue-position">#${index + 1}</div>
                        <div class="queue-details">
                            <div class="queue-id">${execution.execution_id}</div>
                            <div class="queue-template">${execution.template_name}</div>
                            <div class="queue-priority priority-${execution.priority || 'normal'}">
                                ${execution.priority || 'normal'} priority
                            </div>
                        </div>
                        <div class="queue-actions">
                            <button class="btn btn-sm" onclick="window.orchestratorPage.cancelExecution('${execution.execution_id}')">
                                Cancel
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render active executions list
     */
    renderActiveExecutionsList(executions) {
        const container = document.getElementById('active-pipeline-list');
        if (!container) return;
        
        if (executions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No active executions</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = executions.map(execution => {
            const status = this.orchestratorAPI.parseExecutionStatus(execution.status);
            return `
                <div class="execution-item">
                    <div class="execution-header">
                        <span class="execution-id">${execution.execution_id}</span>
                        <span class="execution-status ${status.color}">${status.icon} ${status.label}</span>
                    </div>
                    <div class="execution-details">
                        <span>Pipeline: ${execution.pipeline_name}</span>
                        <span>Progress: ${execution.progress || 0}%</span>
                    </div>
                    <div class="execution-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${execution.progress || 0}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render worker grid
     */
    renderWorkerGrid() {
        const container = document.getElementById('worker-grid');
        if (!container) return;
        
        container.innerHTML = this.workers.map(worker => {
            const healthClass = worker.health_status === 'healthy' ? 'healthy' : 
                               worker.health_status === 'degraded' ? 'warning' : 'unhealthy';
            
            return `
                <div class="worker-card">
                    <div class="worker-header">
                        <h3>${worker.worker_name}</h3>
                        <div class="health-status ${healthClass}"></div>
                    </div>
                    <div class="worker-details">
                        <div class="worker-stat">
                            <span>Protocol:</span>
                            <strong>${worker.protocol_version || '1.0'}</strong>
                        </div>
                        <div class="worker-stat">
                            <span>Status:</span>
                            <strong>${worker.status}</strong>
                        </div>
                        <div class="worker-stat">
                            <span>Capacity:</span>
                            <strong>${worker.current_load || 0}/${worker.max_concurrent || 1}</strong>
                        </div>
                    </div>
                    <div class="worker-actions">
                        <button class="btn btn-sm" onclick="window.orchestratorPage.testHandshake('${worker.worker_name}')">
                            Test Handshake
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update resource gauges
     */
    updateResourceGauges() {
        if (!this.resources || !Array.isArray(this.resources)) return;
        
        // Find OpenAI resources
        const openaiResource = this.resources.find(r => 
            r.resource_name === 'openai_gpt4' || r.resource_name === 'openai_gpt35'
        );
        
        if (openaiResource) {
            const apiUsage = openaiResource.utilization_percentage || 0;
            this.updateGauge('api-gauge', apiUsage);
            
            const usageEl = document.getElementById('openai-usage');
            const limitEl = document.getElementById('openai-limit');
            
            if (usageEl) usageEl.textContent = openaiResource.current_usage || 0;
            if (limitEl) limitEl.textContent = openaiResource.daily_limit || 0;
        }
        
        // Find storage resources
        const kvResource = this.resources.find(r => r.resource_name === 'kv_storage');
        const r2Resource = this.resources.find(r => r.resource_name === 'r2_storage');
        
        if (kvResource || r2Resource) {
            // Use KV usage for the gauge since it has limits
            const storageUsage = kvResource ? kvResource.utilization_percentage || 0 : 0;
            this.updateGauge('storage-gauge', storageUsage);
            
            const kvUsageEl = document.getElementById('kv-usage');
            const r2UsageEl = document.getElementById('r2-usage');
            
            if (kvUsageEl && kvResource) {
                kvUsageEl.textContent = Math.round(kvResource.current_usage || 0);
            }
            if (r2UsageEl && r2Resource) {
                r2UsageEl.textContent = Math.round(r2Resource.current_usage || 0);
            }
        }
        
        // Update overall resource usage
        const overallUsage = this.calculateOverallResourceUsage();
        const resourceUsageEl = document.getElementById('resource-usage');
        if (resourceUsageEl) {
            resourceUsageEl.textContent = `${Math.round(overallUsage)}%`;
        }
    }

    /**
     * Update a gauge element
     */
    updateGauge(gaugeId, percentage) {
        const gauge = document.getElementById(gaugeId);
        if (!gauge) return;
        
        const fill = gauge.querySelector('.gauge-fill');
        const label = gauge.querySelector('.gauge-label');
        
        fill.style.width = `${percentage}%`;
        label.textContent = `${Math.round(percentage)}%`;
        
        // Color coding
        if (percentage > 90) {
            fill.style.backgroundColor = 'var(--danger)';
        } else if (percentage > 70) {
            fill.style.backgroundColor = 'var(--warning)';
        } else {
            fill.style.backgroundColor = 'var(--success)';
        }
    }

    /**
     * Calculate overall resource usage
     */
    calculateOverallResourceUsage() {
        if (!this.resources || !Array.isArray(this.resources)) return 0;
        
        let totalUsage = 0;
        let count = 0;
        
        // Calculate average usage across all resources with limits
        this.resources.forEach(resource => {
            if (resource.daily_limit || resource.monthly_limit) {
                totalUsage += resource.utilization_percentage || 0;
                count++;
            }
        });
        
        return count > 0 ? totalUsage / count : 0;
    }

    /**
     * Update cost tracking
     */
    updateCostTracking(costSummary) {
        if (!costSummary) return;
        
        const dailyCostEl = document.getElementById('daily-cost');
        const todayCostEl = document.getElementById('today-cost');
        const weekCostEl = document.getElementById('week-cost');
        const monthCostEl = document.getElementById('month-cost');
        
        if (dailyCostEl) {
            dailyCostEl.textContent = this.orchestratorAPI.formatCostEstimate(
                costSummary.total_cost_today || costSummary.today || 0
            );
        }
        
        if (todayCostEl) {
            todayCostEl.textContent = this.orchestratorAPI.formatCostEstimate(
                costSummary.total_cost_today || costSummary.today || 0
            );
        }
        
        if (weekCostEl) {
            weekCostEl.textContent = this.orchestratorAPI.formatCostEstimate(
                costSummary.this_week || 0
            );
        }
        
        if (monthCostEl) {
            monthCostEl.textContent = this.orchestratorAPI.formatCostEstimate(
                costSummary.this_month || 0
            );
        }
    }

    /**
     * Update health indicators
     */
    updateHealthIndicators(health) {
        // Update system health indicators based on health check response
        const indicators = document.querySelectorAll('.health-indicator');
        indicators.forEach(indicator => {
            const status = indicator.querySelector('.health-status');
            if (health.status === 'healthy') {
                status.classList.add('healthy');
                status.classList.remove('unhealthy', 'warning');
            }
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId) {
        this.activeTab = tabId;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.closest('.tab-button')?.classList.add('active');
        
        // Update content
        const contentContainer = document.getElementById('orchestrator-tab-content');
        if (contentContainer) {
            contentContainer.innerHTML = this.renderTabContent();
            
            // Re-initialize any tab-specific content
            this.initializeTabContent(tabId);
        }
    }

    /**
     * Initialize tab-specific content
     */
    async initializeTabContent(tabId) {
        switch (tabId) {
            case 'dashboard':
                await this.loadInitialData();
                break;
            case 'pipelines':
                await this.loadPipelineData();
                break;
            case 'resources':
                await this.loadResourceStatus();
                this.initializeResourceCharts();
                break;
            case 'workers':
                await this.loadWorkerStatus();
                break;
            case 'history':
                await this.loadExecutionHistory();
                break;
            case 'templates':
                await this.loadTemplates();
                break;
            case 'logs':
                this.initializeLogViewer();
                break;
        }
    }

    /**
     * Load pipeline data
     */
    async loadPipelineData() {
        try {
            // Load active executions and queue
            await this.loadActiveExecutions();
        } catch (error) {
            console.error('Failed to load pipeline data:', error);
        }
    }

    /**
     * Load execution history
     */
    async loadExecutionHistory() {
        try {
            const response = await this.orchestratorAPI.getExecutionHistory();
            const executions = response.executions || [];
            
            // Update history table
            this.renderHistoryTable(executions);
        } catch (error) {
            console.error('Failed to load execution history:', error);
        }
    }

    /**
     * Load templates
     */
    async loadTemplates() {
        try {
            const response = await this.orchestratorAPI.getTemplates();
            this.templates = response.templates || [];
            
            // Update template list
            this.renderTemplateList();
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    /**
     * Initialize log viewer
     */
    initializeLogViewer() {
        // Initialize log viewer functionality
        console.log('Initializing log viewer...');
    }

    /**
     * Render history table
     */
    renderHistoryTable(executions) {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;
        
        if (executions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-cell">
                        <div class="empty-state">
                            <p>No executions found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = executions.map(execution => `
            <tr>
                <td>${execution.execution_id}</td>
                <td>${execution.pipeline_name || 'Unknown'}</td>
                <td>${execution.client_id || 'N/A'}</td>
                <td><span class="status-badge ${execution.status}">${execution.status}</span></td>
                <td>${this.formatDuration(execution.duration_ms)}</td>
                <td>${this.orchestratorAPI.formatCostEstimate(execution.total_cost || 0)}</td>
                <td>${new Date(execution.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm" onclick="window.orchestratorPage.viewExecutionDetails('${execution.execution_id}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Render template list
     */
    renderTemplateList() {
        const container = document.getElementById('template-list');
        if (!container) return;
        
        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No templates found</p>
                    <button class="btn btn-sm" onclick="window.orchestratorPage.syncTemplates()">
                        Sync Templates
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.templates.map(template => `
            <div class="template-item" onclick="window.orchestratorPage.selectTemplate('${template.template_name}')">
                <div class="template-name">${template.display_name || template.template_name}</div>
                <div class="template-info">
                    <span>${template.stages?.length || 0} stages</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Format duration
     */
    formatDuration(ms) {
        if (!ms) return 'N/A';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        return `${Math.round(ms / 60000)}m`;
    }

    /**
     * Show execute pipeline modal
     */
    async showExecuteModal() {
        const modal = new SimpleModal({
            title: 'Execute Pipeline',
            size: 'large',
            content: await this.renderExecuteForm(),
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    action: () => modal.close()
                },
                {
                    text: 'Estimate Cost',
                    class: 'btn-info',
                    action: () => this.estimatePipeline()
                },
                {
                    text: 'Execute',
                    class: 'btn-primary',
                    action: () => this.executePipeline()
                }
            ]
        });
        
        modal.show();
    }

    /**
     * Render execute pipeline form
     */
    async renderExecuteForm() {
        return `
            <form id="execute-pipeline-form" class="execute-form">
                <div class="form-group">
                    <label>Pipeline Template</label>
                    <select id="pipeline-template" class="form-control" onchange="window.orchestratorPage.onTemplateChange()">
                        <option value="">Select a template...</option>
                        ${this.templates.map(template => `
                            <option value="${template.template_name}">${template.display_name || template.template_name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div id="template-parameters" class="parameters-section">
                    <!-- Template parameters will be loaded here -->
                </div>
                
                <div class="form-group">
                    <label>Priority</label>
                    <select id="execution-priority" class="form-control">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                
                <div id="cost-estimate" class="cost-estimate-section" style="display: none;">
                    <!-- Cost estimate will be shown here -->
                </div>
            </form>
        `;
    }

    /**
     * Handle template selection change
     */
    async onTemplateChange() {
        const templateName = document.getElementById('pipeline-template').value;
        if (!templateName) {
            document.getElementById('template-parameters').innerHTML = '';
            return;
        }
        
        try {
            const template = await this.orchestratorAPI.getTemplateDetails(templateName);
            this.renderTemplateParameters(template);
        } catch (error) {
            console.error('Failed to load template details:', error);
            window.showToast('Failed to load template details', 'error');
        }
    }

    /**
     * Render template parameters
     */
    renderTemplateParameters(template) {
        const container = document.getElementById('template-parameters');
        if (!container) return;
        
        const parameters = template.default_parameters || {};
        
        container.innerHTML = `
            <h4>Parameters</h4>
            ${Object.entries(parameters).map(([key, value]) => `
                <div class="form-group">
                    <label>${this.formatParameterLabel(key)}</label>
                    ${this.renderParameterInput(key, value)}
                </div>
            `).join('')}
        `;
    }

    /**
     * Format parameter label
     */
    formatParameterLabel(key) {
        return key.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
     * Render parameter input based on type
     */
    renderParameterInput(key, defaultValue) {
        const type = typeof defaultValue;
        
        if (type === 'boolean') {
            return `
                <select name="${key}" class="form-control">
                    <option value="true" ${defaultValue ? 'selected' : ''}>Yes</option>
                    <option value="false" ${!defaultValue ? 'selected' : ''}>No</option>
                </select>
            `;
        } else if (type === 'number') {
            return `<input type="number" name="${key}" class="form-control" value="${defaultValue}">`;
        } else {
            return `<input type="text" name="${key}" class="form-control" value="${defaultValue || ''}">`;
        }
    }

    /**
     * Estimate pipeline cost
     */
    async estimatePipeline() {
        const templateName = document.getElementById('pipeline-template').value;
        if (!templateName) {
            window.showToast('Please select a template', 'warning');
            return;
        }
        
        const parameters = this.getFormParameters();
        
        try {
            const estimate = await this.orchestratorAPI.estimateExecution(templateName, parameters);
            this.showCostEstimate(estimate);
        } catch (error) {
            console.error('Failed to estimate cost:', error);
            window.showToast('Failed to estimate cost', 'error');
        }
    }

    /**
     * Show cost estimate
     */
    showCostEstimate(estimate) {
        const container = document.getElementById('cost-estimate');
        if (!container) return;
        
        container.style.display = 'block';
        container.innerHTML = `
            <h4>Cost Estimate</h4>
            <div class="estimate-grid">
                <div class="estimate-item">
                    <span>Estimated Time:</span>
                    <strong>${this.orchestratorAPI.formatTimeEstimate(estimate.estimated_time_ms)}</strong>
                </div>
                <div class="estimate-item">
                    <span>Estimated Cost:</span>
                    <strong>${this.orchestratorAPI.formatCostEstimate(estimate.estimated_cost_usd)}</strong>
                </div>
                <div class="estimate-item">
                    <span>Resource Availability:</span>
                    <strong class="${estimate.resources_available ? 'text-success' : 'text-danger'}">
                        ${estimate.resources_available ? 'Available' : 'Limited'}
                    </strong>
                </div>
            </div>
            ${estimate.warnings ? `
                <div class="estimate-warnings">
                    ${estimate.warnings.map(w => `<div class="warning-item">⚠️ ${w}</div>`).join('')}
                </div>
            ` : ''}
        `;
    }

    /**
     * Execute pipeline
     */
    async executePipeline() {
        const templateName = document.getElementById('pipeline-template').value;
        if (!templateName) {
            window.showToast('Please select a template', 'warning');
            return;
        }
        
        const parameters = this.getFormParameters();
        const priority = document.getElementById('execution-priority').value;
        
        parameters.priority = priority;
        
        try {
            const response = await this.orchestratorAPI.executePipeline(
                templateName,
                parameters,
                this.apiClient.context?.client_id || 'default'
            );
            
            window.showToast('Pipeline execution started', 'success');
            
            // Close modal
            document.querySelector('.modal')?.remove();
            
            // Switch to pipeline tab to monitor
            this.switchTab('pipelines');
            
            // Start monitoring the execution
            this.monitorExecution(response.execution_id);
            
        } catch (error) {
            console.error('Failed to execute pipeline:', error);
            window.showToast('Failed to execute pipeline: ' + error.message, 'error');
        }
    }

    /**
     * Get form parameters
     */
    getFormParameters() {
        const form = document.getElementById('execute-pipeline-form');
        const parameters = {};
        
        form.querySelectorAll('[name]').forEach(input => {
            const name = input.name;
            let value = input.value;
            
            // Convert types
            if (input.type === 'number') {
                value = parseFloat(value);
            } else if (value === 'true') {
                value = true;
            } else if (value === 'false') {
                value = false;
            }
            
            parameters[name] = value;
        });
        
        return parameters;
    }

    /**
     * Monitor execution progress
     */
    monitorExecution(executionId) {
        // Subscribe to real-time updates
        const eventSource = this.orchestratorAPI.subscribeToExecution(
            executionId,
            (update) => {
                console.log('Execution update:', update);
                // Update UI with progress
                this.updateExecutionProgress(executionId, update);
            },
            (error) => {
                console.error('Execution monitoring error:', error);
            }
        );
        
        // Store for cleanup
        this.activeMonitors = this.activeMonitors || {};
        this.activeMonitors[executionId] = eventSource;
    }

    /**
     * Update execution progress in UI
     */
    updateExecutionProgress(executionId, update) {
        // Find execution item and update progress
        const executionItems = document.querySelectorAll('.execution-item');
        executionItems.forEach(item => {
            if (item.querySelector('.execution-id')?.textContent === executionId) {
                const progressBar = item.querySelector('.progress-fill');
                if (progressBar) {
                    progressBar.style.width = `${update.progress || 0}%`;
                }
                
                const statusElement = item.querySelector('.execution-status');
                if (statusElement && update.status) {
                    const status = this.orchestratorAPI.parseExecutionStatus(update.status);
                    statusElement.className = `execution-status ${status.color}`;
                    statusElement.textContent = `${status.icon} ${status.label}`;
                }
            }
        });
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    /**
     * Refresh current data
     */
    async refreshData() {
        console.log('🔄 Refreshing orchestrator data...');
        
        switch (this.activeTab) {
            case 'dashboard':
                await this.loadInitialData();
                break;
            case 'pipelines':
                await this.loadActiveExecutions();
                break;
            case 'resources':
                await this.loadResourceStatus();
                break;
            case 'workers':
                await this.loadWorkerStatus();
                break;
            case 'history':
                await this.loadExecutionHistory();
                break;
        }
    }

    /**
     * Initialize visualizations (charts, etc)
     */
    initializeVisualizations() {
        // Initialize cost chart if on resources tab
        if (this.activeTab === 'resources') {
            this.initializeResourceCharts();
        }
    }

    /**
     * Initialize resource charts
     */
    initializeResourceCharts() {
        // Would implement Chart.js here for cost tracking visualization
        console.log('Initializing resource charts...');
    }

    /**
     * Clean up on unmount
     */
    unmount() {
        // Clear refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Close any active monitors
        if (this.activeMonitors) {
            Object.values(this.activeMonitors).forEach(monitor => monitor.close());
        }
        
        // Clear global reference
        delete window.orchestratorPage;
    }
}

// Export for use
window.OrchestratorPage = OrchestratorPage;