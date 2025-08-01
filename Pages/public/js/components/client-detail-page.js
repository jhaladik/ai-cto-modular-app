// Client Detail Page Component
// File: Pages/public/js/components/client-detail-page.js
// Main component for displaying detailed client information

class ClientDetailPage {
    constructor(clientId, apiClient) {
        this.clientId = clientId;
        this.apiClient = apiClient || window.apiClient;
        
        // Data storage
        this.clientData = null;
        this.analytics = null;
        this.communications = [];
        this.requests = [];
        this.isLoading = false;
        this.error = null;
        
        // UI State
        this.activeTab = 'communications'; // Default as requested
        this.refreshInterval = null;
        this.refreshRate = 30000; // 30 seconds
        
        // Component instances
        this.statCards = new Map();
        
        // Bind methods
        this.handleTabChange = this.handleTabChange.bind(this);
        this.refresh = this.refresh.bind(this);
        this.startAutoRefresh = this.startAutoRefresh.bind(this);
        this.stopAutoRefresh = this.stopAutoRefresh.bind(this);
    }

    /**
     * Render the complete client detail page
     */
    async render() {
        console.log(`🎨 Rendering client detail page for: ${this.clientId}`);
        
        // FIXED: Proper logic to determine when to show content
        const hasClientData = !!(this.clientData && (this.clientData.client_id || this.clientData.company_name));
        const showContent = hasClientData && !this.error;
        const showLoading = !hasClientData && this.isLoading && !this.error;
        
        console.log('- Has client data:', hasClientData);
        console.log('- Will show content:', showContent);
        console.log('- Will show loading:', showLoading);
        
        return `
            <div class="client-detail-page">
                <!-- Loading State - ONLY show if no data and actually loading -->
                <div id="client-detail-loading" class="loading-state" style="display: ${showLoading ? 'block' : 'none'};">
                    <div class="loading-spinner">🔄</div>
                    <p>Loading client details...</p>
                </div>
                
                <!-- Error State -->
                <div id="client-detail-error" class="error-state" style="display: ${this.error ? 'block' : 'none'};">
                    <div class="error-icon">❌</div>
                    <h3>Error Loading Client Details</h3>
                    <p>${this.error || 'An unexpected error occurred'}</p>
                    <button class="btn btn-primary" onclick="window.clientDetailPage.loadClientData()">
                        🔄 Retry
                    </button>
                </div>
                
                <!-- Main Content - Show if we have data -->
                <div id="client-detail-content" style="display: ${showContent ? 'block' : 'none'};">
                    <!-- Breadcrumb Navigation -->
                    ${this.renderBreadcrumb()}
                    
                    <!-- Client Profile Header -->
                    ${this.renderClientHeader()}
                    
                    <!-- Quick Stats Cards -->
                    ${this.renderStatsCards()}
                    
                    <!-- Tabbed Content -->
                    ${this.renderTabbedContent()}
                    
                    <!-- Tab Content Areas -->
                    <div class="tab-content">
                        <div id="communications-content" 
                            class="tab-pane ${this.activeTab === 'communications' ? 'active' : ''}">
                            ${this.renderCommunicationsTab()}
                        </div>
                        
                        <div id="analytics-content" 
                            class="tab-pane ${this.activeTab === 'analytics' ? 'active' : ''}">
                            ${this.renderAnalyticsTab()}
                        </div>
                        
                        <div id="requests-content" 
                            class="tab-pane ${this.activeTab === 'requests' ? 'active' : ''}">
                            ${this.renderRequestsTab()}
                        </div>
                        
                        <div id="settings-content" 
                            class="tab-pane ${this.activeTab === 'settings' ? 'active' : ''}">
                            ${this.renderSettingsTab()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    /**
     * Render breadcrumb navigation
     */
    renderBreadcrumb() {
        const clientName = this.clientData?.company_name || 'Loading...';
        
        return `
            <nav class="breadcrumb" style="margin-bottom: 1.5rem;">
                <a href="#/dashboard" class="breadcrumb-link">Dashboard</a>
                <span class="breadcrumb-separator">›</span>
                <a href="#/clients" class="breadcrumb-link">Clients</a>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-current">${clientName}</span>
            </nav>
        `;
    }

    /**
     * Render client profile header
     */
    renderClientHeader() {
        // HANDLE MISSING DATA GRACEFULLY
        if (!this.clientData) {
            return `
                <div class="client-header" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; margin-bottom: 2rem;">
                    <div style="text-align: center; color: #6b7280;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">👤</div>
                        <p>Loading client information...</p>
                    </div>
                </div>
            `;
        }

        const client = this.clientData;
        const clientName = client.company_name || client.name || 'Unknown Client';
        const clientEmail = client.primary_contact_email || client.email || 'No email available';
        const contactName = client.primary_contact_name || client.contact_name || 'Not specified';
        const tier = client.service_tier || client.tier || 'Standard';
        const status = client.status || 'Active';
        const monthlyBudget = client.monthly_budget_usd || client.monthly_budget || 'Unlimited';
        
        return `
            <div class="client-header" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <div class="client-avatar">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 600; color: white; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                            ${clientName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="client-info" style="flex: 1;">
                        <h1 class="client-name" style="font-size: 1.75rem; font-weight: 600; margin: 0 0 0.5rem 0; color: #111827;">
                            ${clientName}
                        </h1>
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                            <span class="tier-badge" style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #e0f2fe; color: #0277bd;">
                                ${tier}
                            </span>
                            <span class="status-badge" style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; background: #e8f5e8; color: #2e7d32;">
                                ${status}
                            </span>
                            <span class="budget-info" style="font-size: 0.875rem; color: #6b7280; font-family: monospace;">
                                Budget: $${monthlyBudget}/month
                            </span>
                        </div>
                        <div class="client-contact" style="display: flex; align-items: center; gap: 1rem; color: #6b7280; font-size: 0.875rem; flex-wrap: wrap;">
                            <span class="contact-email">📧 <a href="mailto:${clientEmail}" style="color: #2563eb; text-decoration: none;">${clientEmail}</a></span>
                            <span class="contact-name">👤 ${contactName}</span>
                        </div>
                    </div>
                    <div class="client-actions" style="display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0;">
                        <button onclick="alert('Edit client functionality')" style="padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: background 0.2s;">
                            ✏️ Edit Client
                        </button>
                        <button onclick="alert('Message client functionality')" style="padding: 0.5rem 1rem; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: background 0.2s;">
                            💬 Send Message
                        </button>
                        <button onclick="alert('View client activity')" style="padding: 0.5rem 1rem; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: background 0.2s;">
                            📊 Activity
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    /**
     * Render quick stats cards
     */
    renderStatsCards() {
        if (!this.clientData) {
            return '<div class="stats-placeholder">Loading statistics...</div>';
        }

        const client = this.clientData;
        
        return `
            <div class="stats-grid" style="margin-bottom: 2rem;">
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">$${client.total_lifetime_value?.toFixed(2) || '0.00'}</div>
                        <div class="stat-label">Lifetime Value</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-content">
                        <div class="stat-value">${client.satisfaction_score?.toFixed(1) || 'N/A'}</div>
                        <div class="stat-label">Satisfaction Score</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">${((client.used_budget_current_month / client.monthly_budget_usd) * 100).toFixed(0)}%</div>
                        <div class="stat-label">Budget Usage</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatDate(client.last_interaction, 'relative')}</div>
                        <div class="stat-label">Last Active</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render tabbed navigation
     */
    renderTabbedContent() {
        return `
            <div class="tab-navigation" style="margin-bottom: 1.5rem;">
                <button class="tab-button ${this.activeTab === 'communications' ? 'active' : ''}" 
                        onclick="clientDetailPage.handleTabChange('communications')">
                    💬 Communications
                </button>
                <button class="tab-button ${this.activeTab === 'analytics' ? 'active' : ''}" 
                        onclick="clientDetailPage.handleTabChange('analytics')">
                    📊 Analytics
                </button>
                <button class="tab-button ${this.activeTab === 'requests' ? 'active' : ''}" 
                        onclick="clientDetailPage.handleTabChange('requests')">
                    📋 Requests
                </button>
                <button class="tab-button ${this.activeTab === 'settings' ? 'active' : ''}" 
                        onclick="clientDetailPage.handleTabChange('settings')">
                    ⚙️ Settings
                </button>
            </div>
        `;
    }

    /**
     * Render communications tab content
     */
    renderCommunicationsTab() {
        if (!this.clientData || !this.clientData.communication_history) {
            return '<p>No communication history available.</p>';
        }

        const communications = this.clientData.communication_history;
        
        if (communications.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No Communications Yet</h3>
                    <p>No communication history found for this client.</p>
                    <button class="btn btn-primary" onclick="clientDetailPage.sendMessage()">
                        Send First Message
                    </button>
                </div>
            `;
        }

        return `
            <div class="communications-list">
                <div class="communications-header">
                    <h3>Communication History</h3>
                    <button class="btn btn-primary" onclick="clientDetailPage.sendMessage()">
                        + New Message
                    </button>
                </div>
                
                <div class="communications-timeline">
                    ${communications.map(comm => this.renderCommunicationItem(comm)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render individual communication item
     */
    renderCommunicationItem(comm) {
        const sentimentIcon = this.getSentimentIcon(comm.sentiment_score);
        const intentBadge = this.getIntentBadge(comm.intent_detected);
        
        return `
            <div class="communication-item">
                <div class="comm-header">
                    <div class="comm-type">
                        ${this.getCommTypeIcon(comm.type)} ${comm.type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div class="comm-meta">
                        ${sentimentIcon} ${intentBadge}
                        <span class="comm-date">${this.formatDate(comm.processed_at)}</span>
                    </div>
                </div>
                <div class="comm-content">
                    ${comm.content}
                </div>
            </div>
        `;
    }

    /**
     * Render analytics tab (placeholder)
     */
    renderAnalyticsTab() {
        return `
            <div class="analytics-content">
                <h3>Client Analytics</h3>
                <p>📊 Analytics dashboard coming soon! This will include:</p>
                <ul>
                    <li>Budget usage trends</li>
                    <li>Request frequency patterns</li>
                    <li>Satisfaction score history</li>
                    <li>Communication engagement metrics</li>
                </ul>
            </div>
        `;
    }

    /**
     * Render requests tab (placeholder)
     */
    renderRequestsTab() {
        return `
            <div class="requests-content">
                <h3>Client Requests</h3>
                <p>📋 Request history coming soon! This will include:</p>
                <ul>
                    <li>All client requests and their status</li>
                    <li>Pipeline transparency data</li>
                    <li>Deliverables and reports</li>
                    <li>Cost breakdown by request</li>
                </ul>
            </div>
        `;
    }

    /**
     * Render settings tab (placeholder)
     */
    renderSettingsTab() {
        return `
            <div class="settings-content">
                <h3>Client Settings</h3>
                <p>⚙️ Client settings management coming soon! This will include:</p>
                <ul>
                    <li>Subscription tier management</li>
                    <li>Budget adjustments</li>
                    <li>Communication preferences</li>
                    <li>Contact information updates</li>
                </ul>
            </div>
        `;
    }

    /**
     * Mount the component and load data
     */
    async mount() {
        console.log(`🔧 Mounting client detail page for: ${this.clientId}`);
        
        // Make this component globally accessible
        window.clientDetailPage = this;
        
        try {
            await this.loadClientData();
            
            // DISABLED: Auto-refresh to prevent loops
            // this.startAutoRefresh();
            
            console.log('✅ Client detail page mounted successfully (auto-refresh disabled)');
        } catch (error) {
            console.error('❌ Failed to mount client detail page:', error);
            this.error = error.message;
            this.updateErrorDisplay();
        }
    }
    /**
     * Load client data from API
     */
    async loadClientData() {
        // PREVENT MULTIPLE SIMULTANEOUS LOADS
        if (this._isCurrentlyLoading) {
            console.log('⚠️ Load already in progress, skipping...');
            return;
        }
        
        this._isCurrentlyLoading = true;
        console.log(`📡 Loading data for client: ${this.clientId}`);
        
        this.isLoading = true;
        this.error = null;
        this.updateLoadingDisplay();

        try {
            // Use the batch method from API client
            const dashboardData = await this.apiClient.getClientDetailDashboard(this.clientId);
            
            // Store the loaded data
            this.clientData = dashboardData.client?.client || dashboardData.client;
            this.analytics = dashboardData.analytics || {};
            this.communications = dashboardData.communications?.data || [];
            this.requests = dashboardData.requests?.data || [];
            
            this.isLoading = false;
            this.error = null;
            
            console.log('✅ Client data loaded successfully:', this.clientData?.company_name || this.clientData?.name);
            
            // CRITICAL: Update the display after loading data
            this.updateDisplay();
            
            // Also update the page content with loaded data
            this.refreshPageContent();
            
        } catch (error) {
            console.error('❌ Failed to load client data:', error);
            this.error = error.message;
        } finally {
            this.isLoading = false;
            this._isCurrentlyLoading = false; // RESET THE LOCK
            this.updateDisplay();
        }
    }    
    
    /**
     * Handle tab changes
     */
    async handleTabChange(tabName) {
        console.log(`📑 Switching to tab: ${tabName}`);
        
        this.activeTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="clientDetailPage.handleTabChange('${tabName}')"]`)?.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-content`)?.classList.add('active');
        
        // Load tab-specific data if needed
        await this.loadTabData(tabName);
    }

    /**
     * Load data specific to a tab
     */
    async loadTabData(tabName) {
        console.log(`📊 Loading data for tab: ${tabName}`);
        
        switch (tabName) {
            case 'analytics':
                // Load analytics data if not already loaded
                break;
            case 'requests':
                // Load detailed requests if not already loaded
                break;
            case 'settings':
                // Load settings data
                break;
        }
    }

    /**
     * Refresh all data
     */
    async refresh() {
        console.log('🔄 Refreshing client detail data...');
        await this.loadClientData();
    }

    /**
     * Start auto-refresh interval
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing client data...');
            this.loadClientData();
        }, this.refreshRate);
        
        console.log(`⏰ Auto-refresh started (${this.refreshRate / 1000}s interval)`);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏰ Auto-refresh stopped');
        }
    }

    /**
     * Refresh page content with loaded data
     */
    refreshPageContent() {
        if (!this.clientData) return;
        
        console.log('🎨 Refreshing page content with client data...');
        
        // Update breadcrumb
        const breadcrumbCurrent = document.querySelector('.breadcrumb-current');
        if (breadcrumbCurrent) {
            const clientName = this.clientData.company_name || this.clientData.name || 'Unknown Client';
            breadcrumbCurrent.textContent = clientName;
            console.log('✅ Updated breadcrumb to:', clientName);
        }
        
        // Update page title elements
        const clientNameElements = document.querySelectorAll('.client-name, .page-title');
        clientNameElements.forEach(element => {
            if (element.textContent.includes('Loading') || 
                element.textContent.includes('Ready') || 
                element.textContent.trim() === '') {
                const clientName = this.clientData.company_name || this.clientData.name || 'Client Details';
                element.textContent = clientName;
                console.log('✅ Updated element text to:', clientName);
            }
        });
        
        // Hide any remaining loading states
        document.querySelectorAll('.loading-state').forEach(el => {
            if (el.style.display !== 'none') {
                el.style.display = 'none';
                console.log('🙈 Hidden loading state');
            }
        });
        
        // Show main content
        const contentElement = document.getElementById('client-detail-content');
        if (contentElement) {
            contentElement.style.display = 'block';
            console.log('✅ Showed main content');
        }
        
        // Update any text that still shows "Ready..."
        const walker = document.createTreeWalker(
            document.querySelector('.client-detail-page') || document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let textNode;
        while (textNode = walker.nextNode()) {
            if (textNode.nodeValue && textNode.nodeValue.includes('Ready')) {
                if (textNode.nodeValue.includes('Ready statistics')) {
                    textNode.nodeValue = 'Client Statistics';
                } else if (textNode.nodeValue.includes('Ready...')) {
                    textNode.nodeValue = this.clientData.company_name || this.clientData.name || 'Client Details';
                }
            }
        }
        
        console.log('🎨 Page content refresh completed');
    }
    /**
     * Update display based on current state
     */
    updateDisplay() {
        this.updateLoadingDisplay();
        this.updateErrorDisplay();
        this.updateContentDisplay();
    }

    updateLoadingDisplay() {
        const loading = document.getElementById('client-detail-loading');
        if (loading) loading.style.display = this.isLoading ? 'block' : 'none';
    }

    updateErrorDisplay() {
        const error = document.getElementById('client-detail-error');
        if (error) error.style.display = this.error ? 'block' : 'none';
    }

    updateContentDisplay() {
        const content = document.getElementById('client-detail-content');
        if (content) content.style.display = this.clientData ? 'block' : 'none';
    }

    /**
     * Action methods (placeholders)
     */
    sendMessage() {
        alert(`Send message functionality for ${this.clientData?.company_name} coming soon!`);
    }

    editClient() {
        alert(`Edit client functionality for ${this.clientData?.company_name} coming soon!`);
    }

    /**
     * Helper methods
     */
    formatDate(dateString, format = 'readable') {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        
        if (format === 'relative') {
            const now = new Date();
            const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
            
            if (diffInHours < 1) return 'Just now';
            if (diffInHours < 24) return `${diffInHours}h ago`;
            if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
            return `${Math.floor(diffInHours / 168)}w ago`;
        }
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    getSentimentIcon(score) {
        if (score >= 0.7) return '😊';
        if (score >= 0.3) return '😐';
        return '😞';
    }

    getIntentBadge(intent) {
        const intentColors = {
            'request_report': 'primary',
            'provide_feedback': 'success',
            'request_support': 'warning',
            'general_inquiry': 'secondary'
        };
        
        const color = intentColors[intent] || 'secondary';
        return `<span class="badge badge-${color}">${intent.replace('_', ' ')}</span>`;
    }

    getCommTypeIcon(type) {
        const icons = {
            'email_inbound': '📨',
            'email_outbound': '📤',
            'chat': '💬',
            'dashboard': '🖥️'
        };
        
        return icons[type] || '📄';
    }

    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        console.log('🧹 Destroying client detail page');
        this.stopAutoRefresh();
        
        // Clean up global reference
        if (window.clientDetailPage === this) {
            window.clientDetailPage = null;
        }
    }
}

// Make component globally available
window.ClientDetailPage = ClientDetailPage;