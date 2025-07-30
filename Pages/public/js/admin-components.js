// Refactored Admin Dashboard - Uses UI Components
// File: /js/admin-components.js

/**
 * Admin Dashboard - Now using modular UI components
 * Clean, reusable, and extensible architecture
 */

// Prevent duplicate class declarations
if (!window.AdminDashboard) {
    
    class AdminDashboard {
        constructor() {
            this.refreshInterval = null;
            this.apiClient = window.apiClient || new AIFactoryAPIClient();
            this.userInfo = this.apiClient.getCurrentUser();
            
            // Component instances
            this.layout = null;
            this.statCards = new Map();
            this.workerCards = new Map();
            
            this.initializeComponents();
        }
    
        initializeComponents() {
            // Create dashboard layout
            this.layout = new DashboardLayout({
                title: '🎛️ AI Factory Admin',
                userInfo: this.userInfo,
                customActions: [
                    { text: '👥 Clients', onclick: 'window.adminDashboard?.showClients()', class: 'btn-secondary btn-small' }
                ]
            });
    
            // Create stat cards
            this.statCards.set('clients', new StatCard({
                id: 'clients',
                label: 'Total Clients',
                icon: '👥',
                type: 'default'
            }));
    
            this.statCards.set('revenue', new StatCard({
                id: 'revenue',
                label: 'Revenue',
                icon: '💰',
                type: 'currency'
            }));
    
            this.statCards.set('requests', new StatCard({
                id: 'requests',
                label: 'Requests Today',
                icon: '📊',
                type: 'default'
            }));
    
            this.statCards.set('health', new StatCard({
                id: 'health',
                label: 'System Health',
                icon: '💚',
                type: 'percentage'
            }));
    
            // Create worker cards
            this.workerCards.set('universal-researcher', new UniversalResearcherCard({
                apiClient: this.apiClient,
                userContext: { isAdmin: true }
            }));
    
            // Register workers globally for onclick handlers
            if (!window.workerRegistry) {
                window.workerRegistry = new Map();
            }
            window.workerRegistry.set('universal-researcher', this.workerCards.get('universal-researcher'));
        }
    
        async render() {
            // Render main layout
            const layoutHtml = this.layout.render();
            
            // We'll populate the stats and workers sections after mounting
            return layoutHtml;
        }
    
        async mount() {
            console.log('🎛️ Mounting Admin Dashboard...');
            
            // Set global reference
            window.currentDashboard = this;
            window.adminDashboard = this;
            
            // Render stat cards
            this.renderStatCards();
            
            // Render worker cards
            await this.renderWorkerCards();
            
            // Load initial data
            await this.loadStats();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('✅ Admin Dashboard mounted');
        }
    
        renderStatCards() {
            const statsGrid = document.getElementById('stats-grid');
            if (!statsGrid) return;
    
            const statsHtml = Array.from(this.statCards.values())
                .map(card => card.render())
                .join('');
            
            statsGrid.innerHTML = statsHtml;
        }
    
        async renderWorkerCards() {
            const workersGrid = document.getElementById('workers-grid');
            if (!workersGrid) return;
    
            const workersHtml = Array.from(this.workerCards.values())
                .map(card => card.render())
                .join('');
            
            workersGrid.innerHTML = workersHtml;
    
            // Mount worker cards
            for (const workerCard of this.workerCards.values()) {
                try {
                    await workerCard.mount();
                } catch (error) {
                    console.error(`Failed to mount worker: ${workerCard.workerId}`, error);
                    workerCard.showError(error);
                }
            }
        }
    
        async loadStats() {
            try {
                const result = await this.apiClient.getAdminStats();
                
                // Handle nested response format: {success: true, stats: {...}}
                const stats = result.stats || result;
                this.updateStatsDisplay(stats);
            } catch (error) {
                console.error('Failed to load stats:', error);
                this.showStatsError(error);
            }
        }
    
        updateStatsDisplay(stats) {
            // Map the nested API response to flat structure expected by StatCards
            const mappedStats = this.mapApiStatsToDisplay(stats);
            
            // Update stat cards with mapped values
            this.statCards.get('clients')?.update(mappedStats.total_clients || 0, {
                value: mappedStats.client_growth_count || 0,
                label: 'new this month',
                isPercent: false
            });
    
            this.statCards.get('revenue')?.update(mappedStats.total_revenue || 0, {
                value: mappedStats.revenue_growth_percent || 0,
                label: '% growth',
                isPercent: true
            });
    
            this.statCards.get('requests')?.update(mappedStats.requests_today || 0, {
                value: mappedStats.request_growth_percent || 0,
                label: '% growth',
                isPercent: true
            });
    
            this.statCards.get('health')?.update(mappedStats.system_health_percentage || 0);
        }
    
        /**
         * Map the nested API response to flat structure for StatCards
         */
        mapApiStatsToDisplay(apiStats) {
            // Handle both old flat format and new nested format
            if (apiStats.total_clients !== undefined) {
                // Already in flat format
                return apiStats;
            }
            
            // Map nested format to flat format
            return {
                // Client stats
                total_clients: apiStats.clients?.total || 0,
                active_clients: apiStats.clients?.active || 0,
                trial_clients: apiStats.clients?.trial || 0,
                client_growth_count: apiStats.clients?.new_this_month || 0,
                
                // Revenue stats  
                total_revenue: apiStats.revenue?.current_month || 0,
                revenue_growth_percent: apiStats.revenue?.growth_rate || 0,
                
                // System stats
                system_health_percentage: apiStats.system?.health_score || 0,
                uptime_percentage: apiStats.system?.uptime || 0,
                
                // Request stats (not in current API, set defaults)
                requests_today: apiStats.requests?.today || 0,
                request_growth_percent: apiStats.requests?.growth_rate || 0
            };
        }
    
        showStatsError(error) {
            const statsGrid = document.getElementById('stats-grid');
            if (statsGrid) {
                statsGrid.innerHTML = `
                    <div class="error-state" style="grid-column: 1 / -1;">
                        <h3>⚠️ Stats Unavailable</h3>
                        <p>${error.message}</p>
                        <button class="btn btn-primary" onclick="window.adminDashboard?.loadStats()">
                            🔄 Retry
                        </button>
                    </div>
                `;
            }
        }
    
        async refresh() {
            console.log('🔄 Refreshing dashboard...');
            
            try {
                // Use batch operation for better performance
                const dashboardData = await this.apiClient.getDashboardData();
                
                if (dashboardData.stats) {
                    // Handle nested response format: {success: true, stats: {...}}
                    const stats = dashboardData.stats.stats || dashboardData.stats;
                    this.updateStatsDisplay(stats);
                } else if (dashboardData.statsError) {
                    console.error('Stats error:', dashboardData.statsError);
                    this.showStatsError(dashboardData.statsError);
                }
                
                // Refresh worker health
                for (const workerCard of this.workerCards.values()) {
                    await workerCard.checkHealth();
                }
                
            } catch (error) {
                console.error('Dashboard refresh failed:', error);
                // Fallback to individual calls
                await this.loadStats();
            }
        }
    
        startAutoRefresh() {
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            
            // Refresh every 30 seconds
            this.refreshInterval = setInterval(() => {
                this.loadStats();
            }, 30000);
        }
    
        destroy() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
            
            // Clear global references
            window.currentDashboard = null;
            window.adminDashboard = null;
        }
    
        // =============================================================================
        // ADMIN-SPECIFIC FEATURES
        // =============================================================================
    
        async showClients() {
            try {
                const clients = await this.apiClient.getClients();
                
                // Simple client list modal (can be enhanced later)
                const clientList = clients.clients?.map(client => 
                    `<li>${client.company_name} (${client.subscription_tier}) - ${client.account_status}</li>`
                ).join('') || '<li>No clients found</li>';
                
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5); display: flex; align-items: center;
                    justify-content: center; z-index: 1000;
                `;
                
                modal.innerHTML = `
                    <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                        <h3>👥 Client List</h3>
                        <ul style="margin: 1rem 0; padding-left: 1.5rem;">
                            ${clientList}
                        </ul>
                        <button class="btn btn-secondary" onclick="this.closest('div').remove()">Close</button>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
            } catch (error) {
                console.error('Failed to load clients:', error);
                alert('Failed to load clients: ' + error.message);
            }
        }
    
        async addWorker(workerConfig) {
            // Future: Add new worker dynamically
            const workerCard = new WorkerCard(workerConfig);
            this.workerCards.set(workerConfig.workerId, workerCard);
            
            // Re-render workers grid
            await this.renderWorkerCards();
        }
    
        getComponentStats() {
            return {
                statCards: this.statCards.size,
                workerCards: this.workerCards.size,
                refreshInterval: !!this.refreshInterval,
                userType: this.userInfo?.role || 'unknown'
            };
        }
    }
    
    // Global admin dashboard instance
    window.AdminDashboard = AdminDashboard;
    
    } // End of AdminDashboard class protection
    
    // =============================================================================
    // ADMIN-SPECIFIC WORKER CARDS (Future workers)
    // =============================================================================
    
    // Prevent duplicate class declarations for future worker cards
    if (!window.ContentClassifierCard) {
        
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
                                  placeholder="Enter content to classify..."></textarea>
                    </div>
                    
                    <div class="worker-actions">
                        <button class="btn btn-primary" onclick="window.workerRegistry?.get('${this.workerId}')?.classifyContent()">
                            🧠 Classify Content
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.checkHealth()">
                            💚 Health Check
                        </button>
                    </div>
                    
                    <div id="classification-results-${this.workerId}" style="margin-top: 1rem;"></div>
                </div>
            `;
        }
    
        async classifyContent() {
            // Implementation when content classifier is added
            console.log('Content classification not implemented yet');
        }
    }
    
    window.ContentClassifierCard = ContentClassifierCard;
    
    } // End of ContentClassifierCard protection
    
    if (!window.ReportBuilderCard) {
        
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
                            <option value="daily_briefing">Daily Briefing</option>
                        </select>
                    </div>
                    
                    <div class="worker-actions">
                        <button class="btn btn-primary" onclick="window.workerRegistry?.get('${this.workerId}')?.generateReport()">
                            📊 Generate Report
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.checkHealth()">
                            💚 Health Check
                        </button>
                    </div>
                    
                    <div id="report-results-${this.workerId}" style="margin-top: 1rem;"></div>
                </div>
            `;
        }
    
        async generateReport() {
            // Implementation when report builder is added
            console.log('Report generation not implemented yet');
        }
    }
    
    window.ReportBuilderCard = ReportBuilderCard;
    
    } // End of ReportBuilderCard protection