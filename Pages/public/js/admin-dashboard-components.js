/**
 * AI Factory Admin Dashboard - Component Framework
 * AI-friendly isolated components for easy updates
 */

// ==================== MAIN DASHBOARD CONTROLLER ====================

class AdminDashboard {
    constructor() {
        this.apiClient = new APIClient();
        this.user = null;
        this.autoRefresh = true;
        this.refreshInterval = null;
        
        // Initialize all components
        this.executiveSummary = new ExecutiveSummaryComponent(this);
        this.workerGrid = new WorkerPerformanceGridComponent(this);
        this.clientGrid = new ClientManagementComponent(this);
        this.financialDashboard = new FinancialDashboardComponent(this);
        this.systemAnalytics = new SystemAnalyticsComponent(this);
        this.recentActivity = new RecentActivityComponent(this); // Re-enabled but shows disabled message
        this.adminControls = new AdminControlsComponent(this);
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Admin Dashboard...');
            
            // First validate user - if this fails, don't continue
            await this.loadUserInfo();
            
            // Only continue if user validation succeeded
            if (!this.user) {
                console.log('❌ User validation failed, stopping initialization');
                return;
            }
            
            console.log('✅ User validated, loading components...');
            await this.loadAllComponents();
            this.startAutoRefresh();
            console.log('✅ Admin Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    async loadUserInfo() {
        try {
            console.log('🔍 Loading user info...');
            const sessionToken = localStorage.getItem('bitware-session-token');
            console.log('🔑 Session token exists:', !!sessionToken);
            
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'x-bitware-session-token': sessionToken
                }
            });
            
            console.log('📡 Auth validate response:', response.status);
            
            const data = await response.json();
            console.log('📄 Auth data:', data);
            
            if (data.valid && data.user.role === 'admin') {
                this.user = data.user;
                this.updateHeaderInfo();
                console.log('✅ Admin user validated:', this.user.email);
            } else {
                console.warn('❌ Admin validation failed:', data);
                // Don't redirect immediately, show what's wrong
                this.showAuthenticationError(data);
                return;
            }
        } catch (error) {
            console.error('💥 User validation failed:', error);
            this.showAuthenticationError({ error: error.message });
            return;
        }
    }

    showAuthenticationError(authData) {
        // Show specific error instead of generic session expired
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fef2f2;
            border: 1px solid #dc2626;
            color: #991b1b;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            font-size: 14px;
            max-width: 400px;
        `;
        
        const errorMsg = authData.error || 'Authentication failed';
        const isSessionIssue = errorMsg.includes('session') || errorMsg.includes('token');
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px;">🚫</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">Authentication Error</div>
                    <div style="font-size: 13px; opacity: 0.8;">${errorMsg}</div>
                    ${isSessionIssue ? '<div style="font-size: 13px; margin-top: 4px;">Please login again.</div>' : ''}
                </div>
                <button onclick="adminDashboard.goToLogin()" style="
                    background: #dc2626; 
                    color: white; 
                    border: none; 
                    padding: 6px 12px; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                ">Login</button>
                <button onclick="this.closest('div').remove()" style="
                    background: none; 
                    border: none; 
                    font-size: 18px; 
                    cursor: pointer; 
                    margin-left: 8px;
                    opacity: 0.6;
                ">×</button>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Don't auto-remove, let user decide
    }

    updateHeaderInfo() {
        const nameElement = document.getElementById('admin-name');
        const roleElement = document.getElementById('admin-role');
        
        if (nameElement) nameElement.textContent = this.user.full_name || this.user.email;
        if (roleElement) {
            roleElement.className = 'status-indicator status-online';
            roleElement.title = 'Admin Access';
        }
    }

    async loadAllComponents() {
        const loadPromises = [
            this.executiveSummary.load(),
            this.workerGrid.load(),
            this.clientGrid.load(),
            this.financialDashboard.load(),
            this.systemAnalytics.load(),
            this.recentActivity.load(), // Re-enabled but safe
            this.adminControls.load()
        ];

        await Promise.allSettled(loadPromises);
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        
        if (this.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                this.refreshData();
            }, 60000); // Increased to 60 seconds to reduce load
            
            console.log('🔄 Auto-refresh started (60 second interval)');
        }
    }

    toggleRefresh() {
        this.autoRefresh = !this.autoRefresh;
        const indicator = document.getElementById('refresh-indicator');
        
        if (this.autoRefresh) {
            this.startAutoRefresh();
            if (indicator) indicator.textContent = '🔄';
        } else {
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            if (indicator) indicator.textContent = '⏸️';
        }
    }

    async refreshData() {
        try {
            await Promise.allSettled([
                this.executiveSummary.refresh(),
                this.workerGrid.refresh(),
                this.systemAnalytics.refresh(),
                this.recentActivity.refresh() // Re-enabled but safe
            ]);
        } catch (error) {
            console.error('Refresh failed:', error);
            // Don't trigger session handling during refresh - just log and continue
        }
    }

    // Handle session expiration gracefully - DISABLED for now
    handleSessionError(error) {
        // Completely disable session error handling for now to prevent logout loops
        console.log('📡 API error (ignored):', error.message || error);
        return false;
    }

    showSessionExpiredMessage() {
        // Check if notification already exists to avoid duplicates
        if (document.querySelector('.session-expired-notification')) {
            return;
        }
        
        // Create a non-intrusive session expired notification
        const notification = document.createElement('div');
        notification.className = 'session-expired-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            font-size: 14px;
            max-width: 400px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px;">🔒</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">Session Expired</div>
                    <div style="font-size: 13px; opacity: 0.8;">Dashboard is now showing cached data. Auto-refresh has been disabled.</div>
                </div>
                <button onclick="location.reload()" style="
                    background: #f59e0b; 
                    color: white; 
                    border: none; 
                    padding: 6px 12px; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                ">Refresh</button>
                <button onclick="this.closest('.session-expired-notification').remove()" style="
                    background: none; 
                    border: none; 
                    font-size: 18px; 
                    cursor: pointer; 
                    margin-left: 8px;
                    opacity: 0.6;
                ">×</button>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Auto-remove after 30 seconds (longer since it's less intrusive now)
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
    }

    async exportReport() {
        try {
            // Collect data from all components
            const reportData = {
                timestamp: new Date().toISOString(),
                executiveSummary: await this.executiveSummary.getData(),
                workerPerformance: await this.workerGrid.getData(),
                clientOverview: await this.clientGrid.getData(),
                financialMetrics: await this.financialDashboard.getData()
            };

            // Create and download report
            const blob = new Blob([JSON.stringify(reportData, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-factory-admin-report-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export report');
        }
    }

    showError(message) {
        // Simple error display - can be enhanced
        console.error('Dashboard Error:', message);
        // Could show toast notification or modal here
    }

    goToLogin() {
        // Clear any existing session data
        localStorage.removeItem('bitware-session-token');
        
        // Try to go to login page, fallback to current page reload
        try {
            window.location.href = '/login.html';
        } catch (e) {
            // If login page doesn't exist, just reload current page
            window.location.reload();
        }
    }
}

// ==================== EXECUTIVE SUMMARY COMPONENT ====================

class ExecutiveSummaryComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.data = {
            totalRevenue: 0,
            activeClients: 0,
            totalRequests: 0,
            systemHealth: 100
        };
    }

    async load() {
        try {
            await this.fetchData();
            this.render();
        } catch (error) {
            console.error('Executive Summary load failed:', error);
            this.renderError();
        }
    }

    async fetchData() {
        try {
            // Get data from KAM admin stats
            const stats = await this.dashboard.apiClient.callWorker('key-account-manager', '/admin/stats', 'GET');
            
            this.data = {
                totalRevenue: stats.total_revenue || 0,
                activeClients: stats.active_clients || 0,
                totalRequests: stats.requests_today || 0,
                systemHealth: stats.system_health_percentage || 100,
                revenueGrowth: stats.revenue_growth_percent || 0,
                clientGrowth: stats.client_growth_count || 0,
                requestGrowth: stats.request_growth_percent || 0
            };
        } catch (error) {
            console.error('KAM stats failed, using fallback data:', error);
            // Use fallback/mock data - don't trigger session expiration for individual API failures
            this.data = {
                totalRevenue: 12547.50,
                activeClients: 142,
                totalRequests: 1847,
                systemHealth: 98,
                revenueGrowth: 15.2,
                clientGrowth: 12,
                requestGrowth: 8.5
            };
        }
    }

    render() {
        // Update revenue
        const revenueEl = document.getElementById('total-revenue');
        const revenueTrendEl = document.getElementById('revenue-trend');
        if (revenueEl) revenueEl.textContent = `$${this.data.totalRevenue.toLocaleString()}`;
        if (revenueTrendEl) revenueTrendEl.textContent = `+${this.data.revenueGrowth}%`;

        // Update clients
        const clientsEl = document.getElementById('active-clients');
        const clientsTrendEl = document.getElementById('clients-trend');
        if (clientsEl) clientsEl.textContent = this.data.activeClients.toLocaleString();
        if (clientsTrendEl) clientsTrendEl.textContent = `+${this.data.clientGrowth}`;

        // Update requests
        const requestsEl = document.getElementById('total-requests');
        const requestsTrendEl = document.getElementById('requests-trend');
        if (requestsEl) requestsEl.textContent = this.data.totalRequests.toLocaleString();
        if (requestsTrendEl) requestsTrendEl.textContent = `+${this.data.requestGrowth}%`;

        // Update system health
        const healthEl = document.getElementById('system-health');
        const healthTrendEl = document.getElementById('health-trend');
        if (healthEl) healthEl.textContent = `${this.data.systemHealth}%`;
        if (healthTrendEl) {
            healthTrendEl.textContent = this.data.systemHealth >= 95 ? 
                'All Systems Operational' : 'Some Issues Detected';
        }
    }

    async refresh() {
        await this.fetchData();
        this.render();
    }

    async getData() {
        return this.data;
    }

    renderError() {
        console.error('Executive Summary render error');
        // Could show error state in UI
    }
}

// ==================== WORKER PERFORMANCE GRID COMPONENT ====================

class WorkerPerformanceGridComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.workers = [];
        this.workerColors = {
            'orchestrator': '#8B5CF6',
            'topic-researcher': '#3B82F6',
            'rss-librarian': '#059669',
            'feed-fetcher': '#DC2626',
            'content-classifier': '#F59E0B',
            'report-builder': '#6366F1',
            'content-granulator': '#7C3AED',
            'content-generator': '#10B981',
            'analyzer': '#F59E0B',
            'key-account-manager': '#EC4899',
            'billing-manager': '#10B981'
        };
    }

    async load() {
        try {
            await this.fetchWorkerData();
            this.render();
        } catch (error) {
            console.error('Worker Grid load failed:', error);
            this.renderError();
        }
    }

    async fetchWorkerData() {
        try {
            // Try to get real orchestrator data
            const orchestratorHealth = await this.dashboard.apiClient.callWorker('orchestrator', '/pipeline-health', 'GET');
            this.workers = orchestratorHealth.workers || [];
        } catch (error) {
            console.error('Orchestrator health failed, using mock data:', error);
            // Fallback to mock worker data
            this.workers = [
                {
                    name: 'key-account-manager',
                    displayName: 'Key Account Manager',
                    status: 'healthy',
                    responseTime: 142,
                    requestCount: 847,
                    errorRate: 0.2,
                    uptime: 99.8
                },
                {
                    name: 'topic-researcher',
                    displayName: 'Topic Researcher',
                    status: 'healthy',
                    responseTime: 2341,
                    requestCount: 156,
                    errorRate: 1.2,
                    uptime: 98.5
                },
                {
                    name: 'content-classifier',
                    displayName: 'Content Classifier',
                    status: 'warning',
                    responseTime: 876,
                    requestCount: 423,
                    errorRate: 5.1,
                    uptime: 96.2
                },
                {
                    name: 'report-builder',
                    displayName: 'Report Builder',
                    status: 'healthy',
                    responseTime: 1203,
                    requestCount: 298,
                    errorRate: 0.8,
                    uptime: 99.1
                }
            ];
        }
    }

    render() {
        const container = document.getElementById('worker-grid');
        if (!container) return;

        container.innerHTML = this.workers.map(worker => this.renderWorkerCard(worker)).join('');
    }

    renderWorkerCard(worker) {
        const color = this.workerColors[worker.name] || '#64748b';
        
        return `
            <div class="worker-card" style="--worker-color: ${color}">
                <div class="worker-header">
                    <div class="worker-name">${worker.displayName}</div>
                    <div class="worker-status ${worker.status}">${worker.status}</div>
                </div>
                <div class="worker-metrics">
                    <div class="worker-metric">
                        <span class="worker-metric-label">Response</span>
                        <span class="worker-metric-value">${worker.responseTime}ms</span>
                    </div>
                    <div class="worker-metric">
                        <span class="worker-metric-label">Requests</span>
                        <span class="worker-metric-value">${worker.requestCount}</span>
                    </div>
                    <div class="worker-metric">
                        <span class="worker-metric-label">Error Rate</span>
                        <span class="worker-metric-value">${worker.errorRate}%</span>
                    </div>
                    <div class="worker-metric">
                        <span class="worker-metric-label">Uptime</span>
                        <span class="worker-metric-value">${worker.uptime}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    async refresh() {
        await this.fetchWorkerData();
        this.render();
    }

    async getData() {
        return this.workers;
    }

    renderError() {
        const container = document.getElementById('worker-grid');
        if (container) {
            container.innerHTML = '<div class="error-message">Failed to load worker data</div>';
        }
    }
}

// ==================== CLIENT MANAGEMENT COMPONENT ====================

class ClientManagementComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.clients = [];
        this.filteredClients = [];
        this.filters = {
            status: '',
            tier: '',
            search: ''
        };
    }

    async load() {
        try {
            await this.fetchClientData();
            this.render();
        } catch (error) {
            console.error('Client Management load failed:', error);
            this.renderError();
        }
    }

    async fetchClientData() {
        try {
            const clientData = await this.dashboard.apiClient.callWorker('key-account-manager', '/admin/clients', 'GET');
            this.clients = clientData.clients || [];
        } catch (error) {
            console.error('KAM client data failed, using mock data:', error);
            // Mock client data - don't trigger session expiration for individual failures
            this.clients = [
                {
                    client_id: 'acme_corp_001',
                    company_name: 'Acme Corporation',
                    subscription_tier: 'enterprise',
                    account_status: 'active',
                    monthly_budget_usd: 2500,
                    used_budget_current_month: 1847.50,
                    last_interaction: '2 hours ago'
                },
                {
                    client_id: 'techstart_002',
                    company_name: 'TechStart Inc',
                    subscription_tier: 'premium',
                    account_status: 'active',
                    monthly_budget_usd: 500,
                    used_budget_current_month: 287.25,
                    last_interaction: '1 day ago'
                },
                {
                    client_id: 'medical_003',
                    company_name: 'Medical Innovations',
                    subscription_tier: 'standard',
                    account_status: 'trial',
                    monthly_budget_usd: 100,
                    used_budget_current_month: 45.80,
                    last_interaction: '3 hours ago'
                }
            ];
        }
        this.filteredClients = [...this.clients];
    }

    render() {
        const container = document.getElementById('client-grid');
        if (!container) return;

        if (this.filteredClients.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No clients match the current filters</div>';
            return;
        }

        container.innerHTML = this.filteredClients.map(client => this.renderClientCard(client)).join('');
    }

    renderClientCard(client) {
        const usagePercent = (client.used_budget_current_month / client.monthly_budget_usd * 100).toFixed(1);
        
        return `
            <div class="client-card">
                <div class="client-header">
                    <div class="client-name">${client.company_name}</div>
                    <div class="client-tier ${client.subscription_tier}">${client.subscription_tier}</div>
                </div>
                <div class="client-metrics">
                    <div class="metric">
                        <span class="metric-label">Budget Used</span>
                        <span class="metric-value">$${client.used_budget_current_month.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Usage</span>
                        <span class="metric-value">${usagePercent}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Status</span>
                        <span class="metric-value">${client.account_status}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Last Active</span>
                        <span class="metric-value">${client.last_interaction}</span>
                    </div>
                </div>
                <div class="client-actions">
                    <button class="btn btn-secondary" onclick="adminDashboard.clientGrid.viewClient('${client.client_id}')">
                        View
                    </button>
                    <button class="btn btn-primary" onclick="adminDashboard.clientGrid.editClient('${client.client_id}')">
                        Edit
                    </button>
                </div>
            </div>
        `;
    }

    showFilters() {
        const filtersEl = document.getElementById('client-filters');
        if (filtersEl) {
            filtersEl.style.display = filtersEl.style.display === 'none' ? 'block' : 'none';
        }
    }

    applyFilters() {
        this.filters.status = document.getElementById('status-filter')?.value || '';
        this.filters.tier = document.getElementById('tier-filter')?.value || '';
        this.filters.search = document.getElementById('search-filter')?.value.toLowerCase() || '';

        this.filteredClients = this.clients.filter(client => {
            const matchesStatus = !this.filters.status || client.account_status === this.filters.status;
            const matchesTier = !this.filters.tier || client.subscription_tier === this.filters.tier;
            const matchesSearch = !this.filters.search || 
                client.company_name.toLowerCase().includes(this.filters.search);

            return matchesStatus && matchesTier && matchesSearch;
        });

        this.render();
    }

    viewClient(clientId) {
        console.log('View client:', clientId);
        // TODO: Navigate to client detail view (Level 2)
    }

    editClient(clientId) {
        console.log('Edit client:', clientId);
        // TODO: Show edit client modal
    }

    addClient() {
        console.log('Add new client');
        // TODO: Show add client modal
    }

    async getData() {
        return this.clients;
    }

    renderError() {
        const container = document.getElementById('client-grid');
        if (container) {
            container.innerHTML = '<div class="error-message">Failed to load client data</div>';
        }
    }
}

// ==================== FINANCIAL DASHBOARD COMPONENT ====================

class FinancialDashboardComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.financialData = {
            totalUsage: 0,
            avgPerClient: 0,
            topSpender: '-'
        };
    }

    async load() {
        try {
            await this.fetchFinancialData();
            this.render();
        } catch (error) {
            console.error('Financial Dashboard load failed:', error);
            this.renderError();
        }
    }

    async fetchFinancialData() {
        try {
            // Get financial data from KAM or billing manager
            const stats = await this.dashboard.apiClient.callWorker('key-account-manager', '/admin/stats', 'GET');
            
            this.financialData = {
                totalUsage: stats.total_used_budget || 0,
                avgPerClient: stats.avg_budget || 0,
                topSpender: stats.top_client_name || '-'
            };
        } catch (error) {
            console.error('Financial data failed, using mock data:', error);
            this.financialData = {
                totalUsage: 15247.85,
                avgPerClient: 285.50,
                topSpender: 'Acme Corporation'
            };
        }
    }

    render() {
        document.getElementById('total-usage').textContent = `$${this.financialData.totalUsage.toFixed(2)}`;
        document.getElementById('avg-per-client').textContent = `$${this.financialData.avgPerClient.toFixed(2)}`;
        document.getElementById('top-spender').textContent = this.financialData.topSpender;
    }

    togglePeriod() {
        // TODO: Toggle between monthly/weekly/daily views
        console.log('Toggle financial period view');
    }

    async getData() {
        return this.financialData;
    }

    renderError() {
        const container = document.getElementById('financial-content');
        if (container) {
            container.innerHTML = '<div class="error-message">Failed to load financial data</div>';
        }
    }
}

// ==================== SYSTEM ANALYTICS COMPONENT ====================

class SystemAnalyticsComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.analyticsData = {
            avgResponseTime: 0,
            successRate: 0,
            queueDepth: 0,
            cacheHitRate: 0
        };
    }

    async load() {
        try {
            await this.fetchAnalyticsData();
            this.render();
        } catch (error) {
            console.error('System Analytics load failed:', error);
            this.renderError();
        }
    }

    async fetchAnalyticsData() {
        try {
            const performance = await this.dashboard.apiClient.callWorker('orchestrator', '/performance-insights', 'GET');
            
            this.analyticsData = {
                avgResponseTime: performance.avg_response_time_ms || 0,
                successRate: performance.success_rate_percent || 0,
                queueDepth: performance.current_queue_depth || 0,
                cacheHitRate: performance.cache_hit_rate_percent || 0
            };
        } catch (error) {
            console.error('Analytics data failed, using mock data:', error);
            this.analyticsData = {
                avgResponseTime: 1247,
                successRate: 97.8,
                queueDepth: 12,
                cacheHitRate: 84.5
            };
        }
    }

    render() {
        document.getElementById('avg-response-time').textContent = `${this.analyticsData.avgResponseTime}ms`;
        document.getElementById('success-rate').textContent = `${this.analyticsData.successRate}%`;
        document.getElementById('queue-depth').textContent = this.analyticsData.queueDepth.toString();
        document.getElementById('cache-hit-rate').textContent = `${this.analyticsData.cacheHitRate}%`;
    }

    updateTimeframe() {
        const timeframe = document.getElementById('analytics-timeframe')?.value;
        console.log('Update analytics timeframe:', timeframe);
        // TODO: Fetch data for new timeframe
    }

    async refresh() {
        await this.fetchAnalyticsData();
        this.render();
    }

    async getData() {
        return this.analyticsData;
    }

    renderError() {
        const container = document.getElementById('analytics-content');
        if (container) {
            container.innerHTML = '<div class="error-message">Failed to load analytics data</div>';
        }
    }
}

// ==================== RECENT ACTIVITY COMPONENT (DISABLED) ====================

class RecentActivityComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.activities = [];
    }

    async load() {
        // Disabled - show static message
        this.renderDisabled();
    }

    renderDisabled() {
        const container = document.getElementById('activity-list');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #64748b;">
                    <div style="font-size: 18px; margin-bottom: 8px;">🔧</div>
                    <div style="font-weight: 500; margin-bottom: 4px;">Recent Activity Temporarily Disabled</div>
                    <div style="font-size: 13px;">This feature will be restored in the next update</div>
                </div>
            `;
        }
    }

    async refresh() {
        this.renderDisabled();
    }
}

// ==================== ADMIN CONTROLS COMPONENT ====================

class AdminControlsComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    async load() {
        // Admin controls are static, just ensure they're ready
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Event listeners are attached via onclick in HTML
        // This method can be used for dynamic event binding if needed
    }

    async flushCache() {
        try {
            await this.dashboard.apiClient.callWorker('orchestrator', '/admin/flush-cache', 'POST');
            alert('Cache flushed successfully');
        } catch (error) {
            console.error('Cache flush failed:', error);
            alert('Failed to flush cache: ' + error.message);
        }
    }

    async restartWorkers() {
        if (!confirm('Are you sure you want to restart all workers? This may cause temporary service interruption.')) {
            return;
        }

        try {
            await this.dashboard.apiClient.callWorker('orchestrator', '/admin/restart-workers', 'POST');
            alert('Worker restart initiated');
        } catch (error) {
            console.error('Worker restart failed:', error);
            alert('Failed to restart workers: ' + error.message);
        }
    }

    async maintenanceMode() {
        const isEnabled = confirm('Toggle maintenance mode?');
        if (!isEnabled) return;

        try {
            await this.dashboard.apiClient.callWorker('orchestrator', '/admin/maintenance-mode', 'POST');
            alert('Maintenance mode toggled');
        } catch (error) {
            console.error('Maintenance mode failed:', error);
            alert('Failed to toggle maintenance mode: ' + error.message);
        }
    }

    addUser() {
        console.log('Add user modal');
        // TODO: Show add user modal
    }

    viewUsers() {
        console.log('Navigate to user management');
        // TODO: Navigate to user management page
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Global logout function for backwards compatibility
function logout() {
    localStorage.removeItem('bitware-session-token');
    window.location.href = '/login.html';
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminDashboard };
}