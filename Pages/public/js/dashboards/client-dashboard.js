// Client Dashboard - Reuses UI Components for Client Experience
// File: /js/dashboards/client-dashboard.js

/**
 * Client Dashboard - Uses same components as admin but with client perspective
 * Proves modular architecture with component reusability
 */

class ClientDashboard {
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
        // Create client-focused layout
        this.layout = new DashboardLayout({
            title: '🎛️ My AI Factory',
            userInfo: this.userInfo,
            customActions: [
                { text: '📊 My Reports', onclick: 'window.clientDashboard?.showMyReports()', class: 'btn-secondary btn-small' },
                { text: '⚙️ Settings', onclick: 'window.clientDashboard?.showSettings()', class: 'btn-secondary btn-small' }
            ]
        });

        // Create client-specific stat cards
        this.statCards.set('usage', new StatCard({
            id: 'usage',
            label: 'Monthly Usage',
            icon: '📊',
            type: 'currency'
        }));

        this.statCards.set('budget', new StatCard({
            id: 'budget',
            label: 'Budget Remaining',
            icon: '💰',
            type: 'currency'
        }));

        this.statCards.set('requests', new StatCard({
            id: 'requests',
            label: 'My Requests',
            icon: '📋',
            type: 'default'
        }));

        this.statCards.set('tier', new StatCard({
            id: 'tier',
            label: 'Subscription Tier',
            icon: '⭐',
            type: 'default'
        }));

        // Initialize tier-based workers
        this.initializeWorkersByTier();

        // Register workers globally for onclick handlers
        this.workerCards.forEach((card, workerId) => {
            window.workerRegistry.set(workerId, card);
        });
    }

    initializeWorkersByTier() {
        const userTier = this.getUserTier();
        const availableWorkers = this.getWorkersForTier(userTier);

        // Universal Researcher - Available to all tiers
        // NEW:
        if (availableWorkers.includes('universal-researcher')) {
            this.workerCards.set('universal-researcher', new EnhancedClientUniversalResearcherCard({
                apiClient: this.apiClient,
                userContext: { 
                    isAdmin: false, 
                    tier: userTier,
                    limitations: this.getTierLimitations(userTier)
                }
            }));
        }

        // Content Classifier - Standard+ tiers
        if (availableWorkers.includes('content-classifier') && window.ContentClassifierCard) {
            this.workerCards.set('content-classifier', new ContentClassifierCard({
                apiClient: this.apiClient,
                userContext: { tier: userTier }
            }));
        }

        // Report Builder - Premium+ tiers
        if (availableWorkers.includes('report-builder') && window.ReportBuilderCard) {
            this.workerCards.set('report-builder', new ReportBuilderCard({
                apiClient: this.apiClient,
                userContext: { tier: userTier }
            }));
        }

        // Show upgrade card for locked workers
        const lockedWorkers = this.getLockedWorkers(userTier);
        if (lockedWorkers.length > 0) {
            this.workerCards.set('upgrade-prompt', new UpgradePromptCard({
                lockedWorkers,
                currentTier: userTier
            }));
        }
    }

    getUserTier() {
        return this.userInfo?.subscription_tier || 
               this.userInfo?.tier || 
               'basic';
    }

    getWorkersForTier(tier) {
        const tierWorkers = {
            'basic': ['universal-researcher'],
            'standard': ['universal-researcher', 'content-classifier'],
            'premium': ['universal-researcher', 'content-classifier', 'report-builder'],
            'enterprise': ['universal-researcher', 'content-classifier', 'report-builder']
        };
        
        return tierWorkers[tier] || tierWorkers['basic'];
    }

    getLockedWorkers(tier) {
        const allWorkers = ['universal-researcher', 'content-classifier', 'report-builder'];
        const availableWorkers = this.getWorkersForTier(tier);
        return allWorkers.filter(worker => !availableWorkers.includes(worker));
    }

    getTierLimitations(tier) {
        const limitations = {
            'basic': {
                max_requests_per_day: 5,
                max_sources_per_request: 10,
                available_templates: ['basic_research']
            },
            'standard': {
                max_requests_per_day: 20,
                max_sources_per_request: 25,
                available_templates: ['basic_research', 'content_analysis']
            },
            'premium': {
                max_requests_per_day: 100,
                max_sources_per_request: 50,
                available_templates: ['basic_research', 'content_analysis', 'executive_report']
            },
            'enterprise': {
                max_requests_per_day: -1, // unlimited
                max_sources_per_request: -1,
                available_templates: ['all']
            }
        };
        
        return limitations[tier] || limitations['basic'];
    }

    async render() {
        // Render main layout
        return this.layout.render();
    }

    async mount() {
        console.log('🎛️ Mounting Client Dashboard...');
        
        // Set global reference
        window.currentDashboard = this;
        window.clientDashboard = this;
        
        // Render stat cards
        this.renderStatCards();
        
        // Render worker cards
        await this.renderWorkerCards();
        
        // Load initial data
        await this.loadClientStats();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        console.log('✅ Client Dashboard mounted');
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

    async loadClientStats() {
        try {
            // Don't call admin endpoints for client users - use mock data for now
            // TODO: Replace with client-specific KAM endpoint when implemented: /my-stats
            
            const userTier = this.getUserTier();
            const mockClientStats = this.generateMockClientStats(userTier);
            
            console.log('📊 Using mock client stats (KAM client endpoints not implemented yet)');
            this.updateStatsDisplay(mockClientStats);
            
        } catch (error) {
            console.error('Failed to load client stats:', error);
            this.showStatsError(error);
        }
    }

    generateMockClientStats(tier) {
        // Generate realistic mock data based on tier
        const tierData = {
            'basic': { budget: 100, usage: 25.50 },
            'standard': { budget: 250, usage: 67.25 },
            'premium': { budget: 500, usage: 145.80 },
            'enterprise': { budget: 1000, usage: 234.90 }
        };
        
        const data = tierData[tier] || tierData['basic'];
        
        return {
            monthly_usage: data.usage,
            budget_remaining: data.budget - data.usage,
            requests_this_month: Math.floor(data.usage / 12), // Mock requests
            subscription_tier: tier,
            usage_percentage: (data.usage / data.budget) * 100
        };
    }

    mapAdminStatsToClient(adminStats) {
        const userTier = this.getUserTier();
        const tierLimits = this.getTierLimitations(userTier);
        
        // Mock client-specific data based on admin stats
        // TODO: Replace with real client-specific data from KAM
        return {
            monthly_usage: adminStats.revenue?.current_month * 0.1 || 25.50, // Mock: 10% of total
            budget_remaining: 500 - (adminStats.revenue?.current_month * 0.1 || 25.50),
            requests_this_month: Math.floor((adminStats.clients?.total || 8) * 0.3), // Mock: requests
            subscription_tier: userTier,
            usage_percentage: ((adminStats.revenue?.current_month * 0.1) / 500) * 100 || 5.1
        };
    }

    updateStatsDisplay(stats) {
        // Update stat cards with client-specific values
        this.statCards.get('usage')?.update(stats.monthly_usage || 0, {
            value: stats.usage_percentage || 0,
            label: '% of budget used',
            isPercent: true
        });

        this.statCards.get('budget')?.update(stats.budget_remaining || 0, {
            value: stats.budget_remaining > 0 ? 'Available' : 'Exceeded',
            label: 'status',
            isPercent: false
        });

        this.statCards.get('requests')?.update(stats.requests_this_month || 0, {
            value: this.getTierLimitations(this.getUserTier()).max_requests_per_day > 0 ? 
                   this.getTierLimitations(this.getUserTier()).max_requests_per_day - (stats.requests_this_month || 0) : 
                   'Unlimited',
            label: 'remaining',
            isPercent: false
        });

        this.statCards.get('tier')?.update(this.formatTierName(stats.subscription_tier));
    }

    formatTierName(tier) {
        const tierNames = {
            'basic': '🥉 Basic',
            'standard': '🥈 Standard', 
            'premium': '🥇 Premium',
            'enterprise': '💎 Enterprise'
        };
        return tierNames[tier] || '🥉 Basic';
    }

    showStatsError(error) {
        const statsGrid = document.getElementById('stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="error-state" style="grid-column: 1 / -1;">
                    <h3>⚠️ Stats Unavailable</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="window.clientDashboard?.loadClientStats()">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    async refresh() {
        console.log('🔄 Refreshing client dashboard...');
        
        try {
            await this.loadClientStats();
            
            // Refresh worker health
            for (const workerCard of this.workerCards.values()) {
                if (workerCard.checkHealth) {
                    await workerCard.checkHealth();
                }
            }
            
        } catch (error) {
            console.error('Client dashboard refresh failed:', error);
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        
        // Refresh every 60 seconds (less frequent than admin)
        this.refreshInterval = setInterval(() => {
            this.loadClientStats();
        }, 60000);
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Clear global references
        window.currentDashboard = null;
        window.clientDashboard = null;
    }

    // =============================================================================
    // CLIENT-SPECIFIC FEATURES
    // =============================================================================

    async showMyReports() {
        // Simple reports modal (can be enhanced later)
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h3>📊 My Reports</h3>
                <div style="margin: 1rem 0;">
                    <div class="report-item" style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 1rem;">
                        <h4>Market Research - AI Trends</h4>
                        <p style="color: #6b7280; font-size: 0.875rem;">Generated 2 days ago • 15 sources</p>
                        <div style="margin-top: 0.5rem;">
                            <button class="btn btn-small btn-secondary">📄 View</button>
                            <button class="btn btn-small btn-secondary">💾 Download</button>
                        </div>
                    </div>
                    <div class="report-item" style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 1rem;">
                        <h4>Competitive Analysis - Tech Sector</h4>
                        <p style="color: #6b7280; font-size: 0.875rem;">Generated 1 week ago • 8 sources</p>
                        <div style="margin-top: 0.5rem;">
                            <button class="btn btn-small btn-secondary">📄 View</button>
                            <button class="btn btn-small btn-secondary">💾 Download</button>
                        </div>
                    </div>
                </div>
                <button class="btn btn-secondary" onclick="this.closest('div').remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async showSettings() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px;">
                <h3>⚙️ Account Settings</h3>
                <div style="margin: 1.5rem 0;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Notification Preferences</label>
                        <label style="display: block; margin-bottom: 0.5rem;">
                            <input type="checkbox" checked> Email when reports are ready
                        </label>
                        <label style="display: block; margin-bottom: 0.5rem;">
                            <input type="checkbox" checked> Budget alerts
                        </label>
                        <label style="display: block; margin-bottom: 0.5rem;">
                            <input type="checkbox"> Weekly usage summaries
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Current Plan</label>
                        <p>${this.formatTierName(this.getUserTier())} - $50/month</p>
                        ${this.getUserTier() !== 'enterprise' ? '<button class="btn btn-primary btn-small">⬆️ Upgrade Plan</button>' : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="this.closest('div').remove()">Cancel</button>
                    <button class="btn btn-primary">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    getComponentStats() {
        return {
            statCards: this.statCards.size,
            workerCards: this.workerCards.size,
            refreshInterval: !!this.refreshInterval,
            userType: 'client',
            tier: this.getUserTier(),
            availableWorkers: this.getWorkersForTier(this.getUserTier())
        };
    }
}

// =============================================================================
// CLIENT-SPECIFIC WORKER CARDS
// =============================================================================

class UpgradePromptCard {
    constructor(config) {
        this.lockedWorkers = config.lockedWorkers;
        this.currentTier = config.currentTier;
    }

    render() {
        const workerNames = {
            'content-classifier': '🧠 Content Classifier',
            'report-builder': '📊 Report Builder'
        };

        const lockedWorkersList = this.lockedWorkers
            .map(worker => `<li>${workerNames[worker] || worker}</li>`)
            .join('');

        return `
            <div class="card worker-card upgrade-card">
                <div class="card-header">
                    <h3 class="card-title">
                        ⬆️ Upgrade Available
                        <span class="worker-status">
                            <span class="status-dot" style="background: #f59e0b;"></span>
                            Locked
                        </span>
                    </h3>
                </div>
                <div class="card-content">
                    <div class="upgrade-content">
                        <p><strong>Unlock more AI workers:</strong></p>
                        <ul style="margin: 1rem 0; padding-left: 1.5rem;">
                            ${lockedWorkersList}
                        </ul>
                        <p style="color: #6b7280; font-size: 0.875rem;">
                            Current plan: ${this.formatTierName(this.currentTier)}
                        </p>
                        <div class="worker-actions">
                            <button class="btn btn-primary" onclick="this.showUpgradePlans()">
                                ⭐ View Plans
                            </button>
                        </div>
                    </div>
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
        return tierNames[tier] || '🥉 Basic';
    }

    async mount() {
        // Add onclick handler
        window.showUpgradePlans = () => this.showUpgradePlans();
    }

    showUpgradePlans() {
        // Simple upgrade modal
        alert('Upgrade plans coming soon! Contact support@aifactory.com for premium features.');
    }
}

// Enhanced Universal Researcher Card for clients
class ClientUniversalResearcherCard extends UniversalResearcherCard {
    constructor(config) {
        super(config);
        this.limitations = config.userContext?.limitations || {};
        this.tier = config.userContext?.tier || 'basic';
    }

    async loadInterface() {
        // Call parent implementation first
        await super.loadInterface();
        
        // Add tier limitations info
        const container = document.getElementById(this.containerId);
        if (container && this.limitations.max_requests_per_day > 0) {
            const limitInfo = document.createElement('div');
            limitInfo.className = 'tier-limitations';
            limitInfo.innerHTML = `
                <strong>Your ${this.formatTierName(this.tier)} Plan:</strong> 
                ${this.limitations.max_requests_per_day} requests/day • 
                ${this.limitations.max_sources_per_request} sources/request
            `;
            
            // Insert after the form but before the actions
            const actions = container.querySelector('.worker-actions');
            if (actions) {
                actions.parentNode.insertBefore(limitInfo, actions);
            }
        }
    }

    formatTierName(tier) {
        const tierNames = {
            'basic': '🥉 Basic',
            'standard': '🥈 Standard', 
            'premium': '🥇 Premium',
            'enterprise': '💎 Enterprise'
        };
        return tierNames[tier] || '🥉 Basic';
    }

    async executeResearch() {
        // Check limitations before executing
        if (this.limitations.max_requests_per_day > 0) {
            // In a real implementation, you'd check against actual usage
            // For now, just show the limitation exists
            console.log(`Research limited to ${this.limitations.max_requests_per_day} requests/day for ${this.tier} tier`);
        }

        // Call parent implementation
        return super.executeResearch();
    }
}

// Global client dashboard instance
window.ClientDashboard = ClientDashboard;
window.UpgradePromptCard = UpgradePromptCard;
window.ClientUniversalResearcherCard = ClientUniversalResearcherCard;