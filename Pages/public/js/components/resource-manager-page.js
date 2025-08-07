// Resource Manager Page Component
// Provides monitoring and management interface for the Resource Manager

export class ResourceManagerPage {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.refreshInterval = null;
        this.selectedTab = 'overview';
    }

    async render() {
        return `
            <div class="resource-manager-page">
                <div class="page-header">
                    <h2>Resource Manager</h2>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="resourceManagerPage.refresh()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button class="btn btn-primary" onclick="resourceManagerPage.toggleAutoRefresh()">
                            <i class="fas fa-clock"></i> <span id="auto-refresh-label">Auto Refresh: OFF</span>
                        </button>
                    </div>
                </div>

                <div class="tabs">
                    <button class="tab-button active" data-tab="overview" onclick="resourceManagerPage.switchTab('overview')">
                        <i class="fas fa-dashboard"></i> Overview
                    </button>
                    <button class="tab-button" data-tab="resources" onclick="resourceManagerPage.switchTab('resources')">
                        <i class="fas fa-server"></i> Resources
                    </button>
                    <button class="tab-button" data-tab="queue" onclick="resourceManagerPage.switchTab('queue')">
                        <i class="fas fa-list"></i> Queue
                    </button>
                    <button class="tab-button" data-tab="costs" onclick="resourceManagerPage.switchTab('costs')">
                        <i class="fas fa-dollar-sign"></i> Costs
                    </button>
                    <button class="tab-button" data-tab="optimization" onclick="resourceManagerPage.switchTab('optimization')">
                        <i class="fas fa-chart-line"></i> Optimization
                    </button>
                    <button class="tab-button" data-tab="alerts" onclick="resourceManagerPage.switchTab('alerts')">
                        <i class="fas fa-exclamation-triangle"></i> Alerts
                    </button>
                </div>

                <div class="tab-content">
                    <div id="overview-tab" class="tab-pane active">
                        ${this.renderOverviewTab()}
                    </div>
                    <div id="resources-tab" class="tab-pane">
                        ${this.renderResourcesTab()}
                    </div>
                    <div id="queue-tab" class="tab-pane">
                        ${this.renderQueueTab()}
                    </div>
                    <div id="costs-tab" class="tab-pane">
                        ${this.renderCostsTab()}
                    </div>
                    <div id="optimization-tab" class="tab-pane">
                        ${this.renderOptimizationTab()}
                    </div>
                    <div id="alerts-tab" class="tab-pane">
                        ${this.renderAlertsTab()}
                    </div>
                </div>
            </div>
        `;
    }

    renderOverviewTab() {
        return `
            <div class="overview-container">
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-server"></i></div>
                        <div class="metric-content">
                            <div class="metric-value" id="total-resources">--</div>
                            <div class="metric-label">Active Resources</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-list"></i></div>
                        <div class="metric-content">
                            <div class="metric-value" id="queue-depth">--</div>
                            <div class="metric-label">Queue Depth</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-tachometer-alt"></i></div>
                        <div class="metric-content">
                            <div class="metric-value" id="avg-wait-time">--</div>
                            <div class="metric-label">Avg Wait Time</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-dollar-sign"></i></div>
                        <div class="metric-content">
                            <div class="metric-value" id="hourly-cost">--</div>
                            <div class="metric-label">Hourly Cost</div>
                        </div>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="chart-card">
                        <h3>Resource Utilization</h3>
                        <div id="resource-chart" class="chart-container">
                            <div class="loading">Loading chart...</div>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3>Queue Status</h3>
                        <div id="queue-chart" class="chart-container">
                            <div class="loading">Loading chart...</div>
                        </div>
                    </div>
                </div>

                <div class="recent-activity">
                    <h3>Recent Activity</h3>
                    <div id="activity-list" class="activity-list">
                        <div class="loading">Loading activity...</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderResourcesTab() {
        return `
            <div class="resources-container">
                <h3>Resource Pools</h3>
                <div id="resource-pools" class="resource-pools">
                    <div class="loading">Loading resources...</div>
                </div>

                <h3>Resource Allocation</h3>
                <div class="allocation-controls">
                    <select id="resource-type" class="form-control">
                        <option value="">Select Resource Type</option>
                        <option value="openai-gpt4">OpenAI GPT-4</option>
                        <option value="openai-gpt35">OpenAI GPT-3.5</option>
                        <option value="email">Email (SendGrid)</option>
                        <option value="sms">SMS (Twilio)</option>
                        <option value="database">Database (D1)</option>
                        <option value="storage-kv">KV Storage</option>
                    </select>
                    <input type="number" id="resource-amount" class="form-control" placeholder="Amount" min="1">
                    <button class="btn btn-primary" onclick="resourceManagerPage.checkAvailability()">
                        Check Availability
                    </button>
                </div>
                <div id="availability-result" class="result-container"></div>
            </div>
        `;
    }

    renderQueueTab() {
        return `
            <div class="queue-container">
                <div class="queue-stats">
                    <div class="stat-card">
                        <span class="stat-label">Immediate:</span>
                        <span class="stat-value" id="queue-immediate">0</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Fast:</span>
                        <span class="stat-value" id="queue-fast">0</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Normal:</span>
                        <span class="stat-value" id="queue-normal">0</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Batch:</span>
                        <span class="stat-value" id="queue-batch">0</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Deferred:</span>
                        <span class="stat-value" id="queue-deferred">0</span>
                    </div>
                </div>

                <h3>Queue Management</h3>
                <div class="queue-controls">
                    <input type="text" id="request-id-search" class="form-control" placeholder="Request ID">
                    <button class="btn btn-primary" onclick="resourceManagerPage.searchQueue()">
                        <i class="fas fa-search"></i> Search
                    </button>
                    <button class="btn btn-secondary" onclick="resourceManagerPage.loadQueueDetails()">
                        <i class="fas fa-list"></i> View All
                    </button>
                </div>

                <div id="queue-details" class="queue-details">
                    <div class="loading">Loading queue...</div>
                </div>
            </div>
        `;
    }

    renderCostsTab() {
        return `
            <div class="costs-container">
                <div class="cost-summary">
                    <h3>Cost Summary</h3>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <span class="label">Today:</span>
                            <span class="value" id="cost-today">$0.00</span>
                        </div>
                        <div class="summary-card">
                            <span class="label">This Week:</span>
                            <span class="value" id="cost-week">$0.00</span>
                        </div>
                        <div class="summary-card">
                            <span class="label">This Month:</span>
                            <span class="value" id="cost-month">$0.00</span>
                        </div>
                    </div>
                </div>

                <h3>Cost Breakdown</h3>
                <div id="cost-breakdown" class="cost-breakdown">
                    <div class="loading">Loading costs...</div>
                </div>

                <h3>Cost Estimator</h3>
                <div class="cost-estimator">
                    <select id="template-select" class="form-control">
                        <option value="">Select Template</option>
                        <option value="market_research_pipeline">Market Research</option>
                        <option value="content_monitoring_pipeline">Content Monitoring</option>
                        <option value="competitor_analysis_pipeline">Competitor Analysis</option>
                        <option value="trend_detection_pipeline">Trend Detection</option>
                    </select>
                    <select id="tier-select" class="form-control">
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
                    <button class="btn btn-primary" onclick="resourceManagerPage.estimateCost()">
                        Estimate Cost
                    </button>
                </div>
                <div id="cost-estimate-result" class="result-container"></div>
            </div>
        `;
    }

    renderOptimizationTab() {
        return `
            <div class="optimization-container">
                <h3>Optimization Analysis</h3>
                <div class="optimization-controls">
                    <input type="number" id="client-id-opt" class="form-control" placeholder="Client ID" min="1">
                    <button class="btn btn-primary" onclick="resourceManagerPage.analyzeOptimization()">
                        <i class="fas fa-chart-line"></i> Analyze
                    </button>
                </div>

                <div id="optimization-stats" class="optimization-stats">
                    <div class="loading">Select a client to analyze...</div>
                </div>

                <h3>Optimization Recommendations</h3>
                <div id="optimization-recommendations" class="recommendations">
                    <div class="loading">No recommendations available</div>
                </div>
            </div>
        `;
    }

    renderAlertsTab() {
        return `
            <div class="alerts-container">
                <div class="alerts-header">
                    <h3>Active Alerts</h3>
                    <button class="btn btn-secondary" onclick="resourceManagerPage.refreshAlerts()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>

                <div id="alerts-list" class="alerts-list">
                    <div class="loading">Loading alerts...</div>
                </div>
            </div>
        `;
    }

    async initialize() {
        await this.loadOverviewData();
        window.resourceManagerPage = this;
    }

    async loadOverviewData() {
        try {
            // Load status
            const status = await this.apiClient.makeRequest('/api/resource-manager', {
                endpoint: '/status',
                method: 'GET'
            });

            // Update metrics
            if (status.resources) {
                const totalResources = Object.keys(status.resources).length;
                document.getElementById('total-resources').textContent = totalResources;
            }

            if (status.queues) {
                const totalQueued = status.queues.total || 0;
                document.getElementById('queue-depth').textContent = totalQueued;
            }

            // Load metrics
            const metrics = await this.apiClient.makeRequest('/api/resource-manager', {
                endpoint: '/metrics',
                method: 'GET'
            });

            // Update charts
            this.updateResourceChart(status.resources);
            this.updateQueueChart(status.queues);

        } catch (error) {
            console.error('Error loading overview data:', error);
            this.showError('Failed to load overview data');
        }
    }

    async checkAvailability() {
        const resourceType = document.getElementById('resource-type').value;
        const amount = parseInt(document.getElementById('resource-amount').value);

        if (!resourceType || !amount) {
            this.showError('Please select resource type and enter amount');
            return;
        }

        try {
            const result = await this.apiClient.makeRequest('/api/resource-manager', {
                endpoint: '/api/resources/check',
                method: 'POST',
                data: { resourceType, amount }
            });

            const resultDiv = document.getElementById('availability-result');
            if (result.available) {
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> 
                        Resource available! No wait time required.
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-clock"></i> 
                        Resource not immediately available. 
                        Wait time: ${Math.round(result.waitTime / 1000)}s
                    </div>
                `;
            }
        } catch (error) {
            this.showError('Failed to check availability');
        }
    }

    async estimateCost() {
        const template = document.getElementById('template-select').value;
        const clientTier = document.getElementById('tier-select').value;

        if (!template) {
            this.showError('Please select a template');
            return;
        }

        try {
            const result = await this.apiClient.makeRequest('/api/resource-manager', {
                endpoint: '/api/cost/estimate',
                method: 'POST',
                data: { template, clientTier }
            });

            const resultDiv = document.getElementById('cost-estimate-result');
            resultDiv.innerHTML = `
                <div class="estimate-result">
                    <h4>Cost Estimate</h4>
                    <div class="estimate-value">$${result.estimated.toFixed(4)}</div>
                    <div class="estimate-confidence">Confidence: ${(result.confidence * 100).toFixed(0)}%</div>
                </div>
            `;
        } catch (error) {
            this.showError('Failed to estimate cost');
        }
    }

    async refreshAlerts() {
        try {
            const alerts = await this.apiClient.makeRequest('/api/resource-manager', {
                endpoint: '/admin/alerts',
                method: 'GET'
            });

            const alertsList = document.getElementById('alerts-list');
            if (alerts.alerts && alerts.alerts.length > 0) {
                alertsList.innerHTML = alerts.alerts.map(alert => `
                    <div class="alert-item alert-${alert.severity}">
                        <div class="alert-header">
                            <span class="alert-type">${alert.alert_type}</span>
                            <span class="alert-time">${new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                        <div class="alert-message">${alert.message}</div>
                    </div>
                `).join('');
            } else {
                alertsList.innerHTML = '<div class="no-alerts">No active alerts</div>';
            }
        } catch (error) {
            this.showError('Failed to load alerts');
        }
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tab}-tab`);
        });

        this.selectedTab = tab;

        // Load tab-specific data
        switch(tab) {
            case 'resources':
                this.loadResourcePools();
                break;
            case 'queue':
                this.loadQueueDetails();
                break;
            case 'costs':
                this.loadCostData();
                break;
            case 'alerts':
                this.refreshAlerts();
                break;
        }
    }

    async loadResourcePools() {
        try {
            const availability = await this.apiClient.makeRequest('/api/resource-manager', {
                endpoint: '/api/resources/availability',
                method: 'GET'
            });

            const poolsDiv = document.getElementById('resource-pools');
            if (availability.availability) {
                poolsDiv.innerHTML = Object.entries(availability.availability).map(([name, pool]) => `
                    <div class="resource-pool">
                        <h4>${name}</h4>
                        <div class="pool-stats">
                            <div class="pool-stat">
                                <span>Shared:</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${pool.shared.percentage}%"></div>
                                </div>
                                <span>${pool.shared.available}/${pool.shared.capacity}</span>
                            </div>
                            <div class="pool-stat">
                                <span>Reserved:</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${pool.reserved.percentage}%"></div>
                                </div>
                                <span>${pool.reserved.available}/${pool.reserved.capacity}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading resource pools:', error);
        }
    }

    async loadQueueDetails() {
        try {
            const status = await this.apiClient.makeRequest('/api/resource-manager', {
                endpoint: '/api/queue/status',
                method: 'GET'
            });

            // Update queue stats
            ['immediate', 'fast', 'normal', 'batch', 'deferred'].forEach(queue => {
                const elem = document.getElementById(`queue-${queue}`);
                if (elem && status[queue]) {
                    elem.textContent = status[queue].depth || 0;
                }
            });

            // Show queue details
            const detailsDiv = document.getElementById('queue-details');
            detailsDiv.innerHTML = `
                <div class="queue-summary">
                    <p>Total requests in queue: ${status.total || 0}</p>
                    <p>Currently executing: ${status.executing || 0}</p>
                </div>
            `;
        } catch (error) {
            console.error('Error loading queue details:', error);
        }
    }

    async loadCostData() {
        // This would load actual cost data from the API
        // For now, showing placeholder
        document.getElementById('cost-breakdown').innerHTML = `
            <div class="cost-table">
                <table>
                    <thead>
                        <tr>
                            <th>Provider</th>
                            <th>Resource</th>
                            <th>Usage</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>OpenAI</td>
                            <td>GPT-3.5</td>
                            <td>50,000 tokens</td>
                            <td>$0.075</td>
                        </tr>
                        <tr>
                            <td>SendGrid</td>
                            <td>Email</td>
                            <td>100 emails</td>
                            <td>$0.01</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    updateResourceChart(resources) {
        // Update resource utilization chart
        const chartDiv = document.getElementById('resource-chart');
        if (resources) {
            // Simple text representation for now
            chartDiv.innerHTML = Object.entries(resources).map(([name, pool]) => `
                <div class="chart-bar">
                    <span class="bar-label">${name}</span>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${pool.shared.percentage}%"></div>
                    </div>
                    <span class="bar-value">${pool.shared.percentage.toFixed(1)}%</span>
                </div>
            `).join('');
        }
    }

    updateQueueChart(queues) {
        // Update queue depth chart
        const chartDiv = document.getElementById('queue-chart');
        if (queues) {
            const queueTypes = ['immediate', 'fast', 'normal', 'batch', 'deferred'];
            chartDiv.innerHTML = queueTypes.map(type => `
                <div class="chart-bar">
                    <span class="bar-label">${type}</span>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${Math.min(100, (queues[type]?.depth || 0) * 10)}%"></div>
                    </div>
                    <span class="bar-value">${queues[type]?.depth || 0}</span>
                </div>
            `).join('');
        }
    }

    toggleAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            document.getElementById('auto-refresh-label').textContent = 'Auto Refresh: OFF';
        } else {
            this.refreshInterval = setInterval(() => this.refresh(), 5000);
            document.getElementById('auto-refresh-label').textContent = 'Auto Refresh: ON';
        }
    }

    async refresh() {
        switch(this.selectedTab) {
            case 'overview':
                await this.loadOverviewData();
                break;
            case 'resources':
                await this.loadResourcePools();
                break;
            case 'queue':
                await this.loadQueueDetails();
                break;
            case 'alerts':
                await this.refreshAlerts();
                break;
        }
    }

    showError(message) {
        // Show error toast or alert
        console.error(message);
        alert(message);
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}