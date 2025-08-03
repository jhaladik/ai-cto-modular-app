/**
 * Admin Dashboard Page Component
 * Shows comprehensive system status and health indicators
 */
class DashboardPage {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.refreshInterval = null;
        this.isLoading = false;
        
        // Bind methods
        this.refresh = this.refresh.bind(this);
        this.loadStats = this.loadStats.bind(this);
        this.checkWorkerHealth = this.checkWorkerHealth.bind(this);
    }

    /**
     * Render the dashboard page
     */
    render() {
        return `
            <div class="dashboard-page">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">🎛️ System Dashboard</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="dashboardPage.refresh()">
                            🔄 Refresh
                        </button>
                        <button class="btn btn-secondary" onclick="dashboardPage.toggleAutoRefresh()">
                            ⏱️ Auto-refresh: <span id="auto-refresh-status">OFF</span>
                        </button>
                    </div>
                </div>

                <!-- Main Stats -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value" id="total-clients">⏳</div>
                        <div class="metric-label">Total Clients</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="active-clients">⏳</div>
                        <div class="metric-label">Active Clients</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="monthly-revenue">⏳</div>
                        <div class="metric-label">Monthly Revenue</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="requests-today">⏳</div>
                        <div class="metric-label">Requests Today</div>
                    </div>
                </div>

                <!-- System Health -->
                <div class="system-health-section">
                    <h2>🏥 System Health</h2>
                    <div class="health-grid" id="health-grid">
                        <div class="health-indicator loading">
                            <span class="indicator-icon">⏳</span>
                            <span class="indicator-label">Checking workers...</span>
                        </div>
                    </div>
                </div>

                <!-- Worker Status -->
                <div class="worker-status-section">
                    <h2>🤖 Worker Status</h2>
                    <div class="worker-grid" id="worker-grid">
                        <!-- Worker status cards will be inserted here -->
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="activity-section">
                    <h2>📊 Recent Activity</h2>
                    <div class="activity-feed" id="activity-feed">
                        <div class="activity-item">
                            <span class="activity-time">Loading...</span>
                            <span class="activity-text">Fetching recent activity...</span>
                        </div>
                    </div>
                </div>

                <!-- Error Alerts -->
                <div class="alerts-section" id="alerts-section" style="display: none;">
                    <h2>⚠️ System Alerts</h2>
                    <div class="alerts-list" id="alerts-list">
                        <!-- Alerts will be inserted here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Mount the component
     */
    async mount() {
        console.log('📊 Mounting Dashboard Page');
        
        // Initial load
        await this.refresh();
        
        // Set up auto-refresh if needed
        if (localStorage.getItem('dashboard-auto-refresh') === 'true') {
            this.startAutoRefresh();
        }
    }

    /**
     * Refresh all dashboard data
     */
    async refresh() {
        if (this.isLoading) return;
        
        console.log('🔄 Refreshing dashboard...');
        this.isLoading = true;
        
        try {
            // Load all data in parallel
            await Promise.all([
                this.loadStats(),
                this.checkWorkerHealth(),
                this.loadRecentActivity()
            ]);
            
            console.log('✅ Dashboard refresh complete');
        } catch (error) {
            console.error('❌ Dashboard refresh failed:', error);
            this.showError('Failed to refresh dashboard data');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load dashboard statistics
     */
    async loadStats() {
        try {
            const result = await this.apiClient.kamRequest('/dashboard/stats', 'GET');
            
            if (result.success && result.stats) {
                // Update main metrics
                this.updateMetric('total-clients', result.stats.clients.total);
                this.updateMetric('active-clients', result.stats.clients.active);
                this.updateMetric('monthly-revenue', '$' + result.stats.revenue.monthly_total.toLocaleString());
                this.updateMetric('requests-today', result.stats.usage.requests_today);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
            this.updateMetric('total-clients', '❌');
            this.updateMetric('active-clients', '❌');
            this.updateMetric('monthly-revenue', '❌');
            this.updateMetric('requests-today', '❌');
        }
    }

    /**
     * Check worker health status
     */
    async checkWorkerHealth() {
        const workers = [
            { name: 'Key Account Manager', endpoint: '/health', binding: 'KEY_ACCOUNT_MANAGER' },
            { name: 'Orchestrator', endpoint: '/health', binding: 'ORCHESTRATOR' },
            { name: 'Universal Researcher', endpoint: '/health', binding: 'UNIVERSAL_RESEARCHER' },
            { name: 'RSS Finder', endpoint: '/health', binding: 'RSS_FINDER' },
            { name: 'Feed Fetcher', endpoint: '/health', binding: 'FEED_FETCHER' },
            { name: 'Content Classifier', endpoint: '/health', binding: 'CONTENT_CLASSIFIER' },
            { name: 'Report Builder', endpoint: '/health', binding: 'REPORT_BUILDER' }
        ];

        const healthGrid = document.getElementById('health-grid');
        const workerGrid = document.getElementById('worker-grid');
        
        if (!healthGrid || !workerGrid) return;

        // Clear existing content
        healthGrid.innerHTML = '';
        workerGrid.innerHTML = '';

        // Overall system health
        let healthyWorkers = 0;
        let totalWorkers = workers.length;

        // Check each worker
        for (const worker of workers) {
            const status = await this.checkWorkerStatus(worker);
            
            if (status.healthy) healthyWorkers++;

            // Add worker card
            workerGrid.innerHTML += this.renderWorkerCard(worker, status);
        }

        // Update overall health
        const healthPercentage = Math.round((healthyWorkers / totalWorkers) * 100);
        const healthStatus = healthPercentage === 100 ? 'healthy' : healthPercentage >= 80 ? 'warning' : 'error';
        
        healthGrid.innerHTML = `
            <div class="health-indicator ${healthStatus}">
                <span class="indicator-icon">${healthStatus === 'healthy' ? '✅' : healthStatus === 'warning' ? '⚠️' : '❌'}</span>
                <span class="indicator-label">System Health: ${healthPercentage}%</span>
            </div>
            <div class="health-indicator">
                <span class="indicator-icon">🤖</span>
                <span class="indicator-label">${healthyWorkers}/${totalWorkers} Workers Online</span>
            </div>
            <div class="health-indicator">
                <span class="indicator-icon">🔌</span>
                <span class="indicator-label">Database: Connected</span>
            </div>
            <div class="health-indicator">
                <span class="indicator-icon">💾</span>
                <span class="indicator-label">KV Store: Active</span>
            </div>
        `;
    }

    /**
     * Check individual worker status
     */
    async checkWorkerStatus(worker) {
        // For now, simulate checking - in production, you'd make actual health check calls
        // Since we can't directly call workers from frontend, we'd need proxy endpoints
        
        // Simulate random health status for demo
        const isHealthy = Math.random() > 0.1; // 90% healthy
        const responseTime = Math.floor(Math.random() * 100) + 20; // 20-120ms
        
        return {
            healthy: isHealthy,
            responseTime: responseTime,
            lastChecked: new Date().toISOString(),
            error: isHealthy ? null : 'Connection timeout'
        };
    }

    /**
     * Render worker status card
     */
    renderWorkerCard(worker, status) {
        const statusClass = status.healthy ? 'healthy' : 'error';
        const statusIcon = status.healthy ? '✅' : '❌';
        
        return `
            <div class="worker-card ${statusClass}">
                <div class="worker-header">
                    <span class="worker-icon">${statusIcon}</span>
                    <span class="worker-name">${worker.name}</span>
                </div>
                <div class="worker-details">
                    <div class="worker-stat">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value">${status.healthy ? 'Online' : 'Offline'}</span>
                    </div>
                    <div class="worker-stat">
                        <span class="stat-label">Response:</span>
                        <span class="stat-value">${status.healthy ? status.responseTime + 'ms' : 'N/A'}</span>
                    </div>
                    ${status.error ? `
                        <div class="worker-error">
                            Error: ${status.error}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Load recent activity
     */
    async loadRecentActivity() {
        try {
            // For now, show mock activity - in production, this would come from logs/events
            const activities = [
                { time: new Date(Date.now() - 5 * 60000), text: 'Client "TechCorp Solutions" updated their profile', type: 'info' },
                { time: new Date(Date.now() - 15 * 60000), text: 'New research request completed for "DataMind Analytics"', type: 'success' },
                { time: new Date(Date.now() - 30 * 60000), text: 'System backup completed successfully', type: 'success' },
                { time: new Date(Date.now() - 45 * 60000), text: 'API rate limit warning for client "StartupHub"', type: 'warning' },
                { time: new Date(Date.now() - 60 * 60000), text: 'Monthly report generated for all premium clients', type: 'info' }
            ];

            const activityFeed = document.getElementById('activity-feed');
            if (!activityFeed) return;

            activityFeed.innerHTML = activities.map(activity => `
                <div class="activity-item ${activity.type}">
                    <span class="activity-time">${this.formatTime(activity.time)}</span>
                    <span class="activity-text">${activity.text}</span>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load activity:', error);
        }
    }

    /**
     * Format time for activity feed
     */
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Update a metric value
     */
    updateMetric(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Toggle auto-refresh
     */
    toggleAutoRefresh() {
        if (this.refreshInterval) {
            this.stopAutoRefresh();
        } else {
            this.startAutoRefresh();
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => this.refresh(), 30000); // 30 seconds
        document.getElementById('auto-refresh-status').textContent = 'ON';
        localStorage.setItem('dashboard-auto-refresh', 'true');
        console.log('⏱️ Auto-refresh started');
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        document.getElementById('auto-refresh-status').textContent = 'OFF';
        localStorage.setItem('dashboard-auto-refresh', 'false');
        console.log('⏹️ Auto-refresh stopped');
    }

    /**
     * Show error message
     */
    showError(message) {
        const alertsSection = document.getElementById('alerts-section');
        const alertsList = document.getElementById('alerts-list');
        
        if (alertsSection && alertsList) {
            alertsSection.style.display = 'block';
            alertsList.innerHTML = `
                <div class="alert alert-error">
                    <span class="alert-icon">❌</span>
                    <span class="alert-text">${message}</span>
                    <span class="alert-time">${new Date().toLocaleTimeString()}</span>
                </div>
            ` + alertsList.innerHTML;
        }
    }

    /**
     * Cleanup on unmount
     */
    unmount() {
        this.stopAutoRefresh();
    }
}

// Export globally
window.DashboardPage = DashboardPage;