/**
 * Client Detail Page Component - Clean Version
 * Shows detailed client information - NO AUTO-REFRESH INTERVALS
 */
class ClientDetailPage {
    constructor(apiClient, clientId) {
        this.apiClient = apiClient || window.apiClient;
        this.clientId = clientId;
        this.clientData = null;
        this.isLoading = false;
        this.currentTab = 'overview';
        
        // NO auto-refresh interval - manual refresh only
        
        // Bind methods for event handlers
        this.refresh = this.refresh.bind(this);
        this.switchTab = this.switchTab.bind(this);
    }

    /**
     * Render the client detail page
     */
    render() {
        return `
            <div class="client-detail-page">
                <!-- Breadcrumb Navigation -->
                <div class="breadcrumb">
                    <a href="#" onclick="router.navigate('/clients'); return false;">👥 Clients</a>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-current">
                        ${this.clientData?.company_name || 'Loading...'}
                    </span>
                </div>

                <!-- Page Header -->
                <div class="page-header">
                    <div class="client-header-info">
                        <h1 class="page-title client-name">
                            ${this.clientData?.company_name || 'Loading Client...'}
                        </h1>
                        <div class="client-meta">
                            ${this.clientData ? `
                                <span class="tier-badge tier-${this.clientData.subscription_tier}">
                                    ${this.formatTierName(this.clientData.subscription_tier)}
                                </span>
                                <span class="status-badge status-${this.clientData.account_status}">
                                    ${this.clientData.account_status}
                                </span>
                                <span class="client-id">ID: ${this.clientData.client_id}</span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="clientDetailPage.refresh()">
                            🔄 Refresh
                        </button>
                        <button class="btn btn-secondary" onclick="clientDetailPage.editClient()">
                            ✏️ Edit Client
                        </button>
                        <button class="btn btn-primary" onclick="clientDetailPage.contactClient()">
                            📧 Contact
                        </button>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="tab-navigation">
                    <button class="tab-btn ${this.currentTab === 'overview' ? 'active' : ''}" 
                            onclick="clientDetailPage.switchTab('overview')">
                        📊 Overview
                    </button>
                    <button class="tab-btn ${this.currentTab === 'usage' ? 'active' : ''}" 
                            onclick="clientDetailPage.switchTab('usage')">
                        📈 Usage & Billing
                    </button>
                    <button class="tab-btn ${this.currentTab === 'reports' ? 'active' : ''}" 
                            onclick="clientDetailPage.switchTab('reports')">
                        📋 Reports
                    </button>
                    <button class="tab-btn ${this.currentTab === 'settings' ? 'active' : ''}" 
                            onclick="clientDetailPage.switchTab('settings')">
                        ⚙️ Settings
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="tab-content" id="tab-content">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;
    }

    /**
     * Mount the component and load data
     */
    async mount() {
        console.log(`📋 Mounting Client Detail Page for client: ${this.clientId}`);
        
        // Debug session information
        this.debugSessionInfo();
        
        try {
            // Load client data with comprehensive fallbacks
            await this.loadClientData();
            
            console.log('✅ Client Detail Page mounted successfully');
        } catch (error) {
            console.error('❌ Failed to mount Client Detail Page:', error);
            this.showError(`Failed to load client details: ${error.message}`);
        }
    }

    /**
     * Debug session information for troubleshooting
     */
    debugSessionInfo() {
        console.log('🔍 Debug Info - Client Detail Page:');
        console.log('  - Client ID:', this.clientId);
        console.log('  - API Client:', !!this.apiClient);
        console.log('  - Session Manager:', !!window.sessionManager);
        
        if (window.sessionManager?.sessionData) {
            const session = window.sessionManager.sessionData;
            console.log('  - User authenticated:', !!session.authenticated);
            console.log('  - User info:', session.user);
            console.log('  - KAM context:', session.kamContext);
        }
    }

    /**
     * Load client data from API
     */
    async loadClientData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log(`📡 Loading client data: ${this.clientId}`);
        
        try {
            // Show loading state
            this.updateLoadingState(true);
            
            // Try to get client data from multiple sources
            let clientData = null;
            
            // Method 1: Try API call first (if available)
            if (this.apiClient) {
                try {
                    console.log('🔍 Trying API client...');
                    const response = await this.apiClient.getClient(this.clientId);
                    if (response && response.client) {
                        clientData = response.client;
                        console.log('✅ Client data loaded from API');
                    }
                } catch (apiError) {
                    console.warn('⚠️ API call failed, trying mock data:', apiError.message);
                }
            }
            
            // Method 2: Use mock data as fallback
            if (!clientData) {
                console.log('🔍 Using mock data as fallback...');
                clientData = await this.getMockClientData(this.clientId);
            }
            
            // Method 3: Use session context as fallback
            if (!clientData && window.sessionManager?.sessionData?.kamContext) {
                console.log('🔍 Using session context as fallback...');
                const context = window.sessionManager.sessionData.kamContext;
                clientData = this.createClientFromSession(context);
            }
            
            // Method 4: Use absolute fallback
            if (!clientData) {
                console.log('🔍 Using absolute fallback data...');
                clientData = this.getAbsoluteFallbackData();
            }
            
            if (clientData) {
                this.clientData = clientData;
                this.refreshPageContent();
                console.log(`✅ Client data loaded: ${clientData.company_name}`);
            } else {
                throw new Error('No client data available from any source');
            }
            
        } catch (error) {
            console.error('❌ Failed to load client data:', error);
            this.showError('Failed to load client data. Please try again or contact support.');
        } finally {
            this.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    /**
     * Mock client data - replace with actual API call when ready
     */
    async getMockClientData(clientId) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockClients = {
            'client_1': {
                client_id: 'client_1',
                company_name: 'TechCorp Solutions',
                contact_email: 'admin@techcorp.com',
                contact_name: 'John Smith',
                phone: '+1 (555) 123-4567',
                subscription_tier: 'premium',
                account_status: 'active',
                monthly_budget_usd: 1000,
                used_budget_current_month: 450,
                industry: 'Technology',
                company_size: '50-200 employees',
                created_at: '2024-01-15T10:00:00Z',
                last_activity: '2024-07-29T14:30:00Z',
                address: {
                    street: '123 Tech Street',
                    city: 'San Francisco',
                    state: 'CA',
                    zip: '94105',
                    country: 'United States'
                },
                usage_stats: {
                    requests_this_month: 245,
                    avg_response_time: 1.2,
                    success_rate: 98.5,
                    top_services: ['Universal Researcher', 'Content Classifier']
                },
                recent_reports: [
                    {
                        id: 'report_1',
                        title: 'AI Market Analysis Q3 2024',
                        created: '2024-07-28T10:00:00Z',
                        status: 'completed'
                    },
                    {
                        id: 'report_2',
                        title: 'Technology Trends Research',
                        created: '2024-07-25T15:30:00Z',
                        status: 'completed'
                    }
                ]
            },
            'client_2': {
                client_id: 'client_2',
                company_name: 'Global Industries',
                contact_email: 'contact@global.com',
                contact_name: 'Sarah Johnson',
                phone: '+1 (555) 987-6543',
                subscription_tier: 'enterprise',
                account_status: 'active',
                monthly_budget_usd: 2500,
                used_budget_current_month: 1200,
                industry: 'Manufacturing',
                company_size: '500+ employees',
                created_at: '2024-02-10T14:30:00Z',
                last_activity: '2024-07-30T09:15:00Z',
                address: {
                    street: '456 Industrial Blvd',
                    city: 'Chicago',
                    state: 'IL',
                    zip: '60601',
                    country: 'United States'
                },
                usage_stats: {
                    requests_this_month: 580,
                    avg_response_time: 0.9,
                    success_rate: 99.2,
                    top_services: ['Report Builder', 'RSS Librarian']
                },
                recent_reports: [
                    {
                        id: 'report_3',
                        title: 'Manufacturing Industry Analysis',
                        created: '2024-07-29T11:15:00Z',
                        status: 'completed'
                    }
                ]
            }
        };
        
        return mockClients[clientId] || null;
    }

    /**
     * Create client data from session context
     */
    createClientFromSession(context) {
        if (!context) return null;

        console.log('🔄 Creating client data from session context...');
        
        return {
            client_id: context.client_id || 'session_client',
            company_name: context.company_name || 'Your Company',
            contact_email: context.contact_email || 'unknown@company.com',
            contact_name: 'Account Manager',
            phone: '+1 (555) 000-0000',
            subscription_tier: context.subscription_tier || 'basic',
            account_status: context.account_status || 'active',
            monthly_budget_usd: context.monthly_budget_usd || 500,
            used_budget_current_month: context.used_budget_current_month || 50,
            industry: 'Technology',
            company_size: 'Unknown',
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            address: {
                street: 'Unknown Address',
                city: 'Unknown City',
                state: 'Unknown',
                zip: '00000',
                country: 'Unknown'
            },
            usage_stats: {
                requests_this_month: 25,
                avg_response_time: 1.5,
                success_rate: 95.0,
                top_services: ['Research Tools']
            },
            recent_reports: []
        };
    }

    /**
     * Get absolute fallback data when all else fails
     */
    getAbsoluteFallbackData() {
        console.log('🆘 Using absolute fallback data...');
        
        return {
            client_id: this.clientId || 'fallback_client',
            company_name: 'Demo Account',
            contact_email: 'demo@example.com',
            contact_name: 'Demo User',
            phone: '+1 (555) 123-4567',
            subscription_tier: 'basic',
            account_status: 'active',
            monthly_budget_usd: 100,
            used_budget_current_month: 25,
            industry: 'Demo',
            company_size: 'Small',
            created_at: '2024-01-01T00:00:00Z',
            last_activity: new Date().toISOString(),
            address: {
                street: '123 Demo Street',
                city: 'Demo City',
                state: 'Demo State',
                zip: '12345',
                country: 'Demo Country'
            },
            usage_stats: {
                requests_this_month: 10,
                avg_response_time: 2.0,
                success_rate: 90.0,
                top_services: ['Demo Service']
            },
            recent_reports: [
                {
                    id: 'demo_report',
                    title: 'Demo Report',
                    created: new Date().toISOString(),
                    status: 'completed'
                }
            ]
        };
    }

    /**
     * Refresh all data - MANUAL ONLY, NO AUTO-REFRESH
     */
    async refresh() {
        console.log('🔄 Refreshing client detail data...');
        await this.loadClientData();
    }

    /**
     * Switch between tabs
     */
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="clientDetailPage.switchTab('${tab}')"]`)?.classList.add('active');
        
        // Update tab content
        const tabContent = document.getElementById('tab-content');
        if (tabContent) {
            tabContent.innerHTML = this.renderTabContent();
        }
        
        console.log(`📑 Switched to tab: ${tab}`);
    }

    /**
     * Render content based on current tab
     */
    renderTabContent() {
        if (!this.clientData) {
            return this.renderLoadingContent();
        }

        switch (this.currentTab) {
            case 'overview':
                return this.renderOverviewTab();
            case 'usage':
                return this.renderUsageTab();
            case 'reports':
                return this.renderReportsTab();
            case 'settings':
                return this.renderSettingsTab();
            default:
                return this.renderOverviewTab();
        }
    }

    /**
     * Render overview tab
     */
    renderOverviewTab() {
        const client = this.clientData;
        const budgetPercentage = (client.used_budget_current_month / client.monthly_budget_usd) * 100;
        
        return `
            <div class="overview-content">
                <!-- Key Metrics -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${client.usage_stats.requests_this_month}</div>
                        <div class="metric-label">Requests This Month</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${client.usage_stats.avg_response_time}s</div>
                        <div class="metric-label">Avg Response Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${client.usage_stats.success_rate}%</div>
                        <div class="metric-label">Success Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${budgetPercentage.toFixed(1)}%</div>
                        <div class="metric-label">Budget Used</div>
                    </div>
                </div>

                <!-- Client Information -->
                <div class="info-grid">
                    <div class="info-section">
                        <h3>📞 Contact Information</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Primary Contact</label>
                                <span>${client.contact_name}</span>
                            </div>
                            <div class="info-item">
                                <label>Email</label>
                                <span><a href="mailto:${client.contact_email}">${client.contact_email}</a></span>
                            </div>
                            <div class="info-item">
                                <label>Phone</label>
                                <span><a href="tel:${client.phone}">${client.phone}</a></span>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>🏢 Company Details</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Industry</label>
                                <span>${client.industry}</span>
                            </div>
                            <div class="info-item">
                                <label>Company Size</label>
                                <span>${client.company_size}</span>
                            </div>
                            <div class="info-item">
                                <label>Customer Since</label>
                                <span>${new Date(client.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>📍 Address</h3>
                        <div class="info-content">
                            <div class="address">
                                ${client.address.street}<br>
                                ${client.address.city}, ${client.address.state} ${client.address.zip}<br>
                                ${client.address.country}
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>🎯 Top Services</h3>
                        <div class="info-content">
                            <div class="service-list">
                                ${client.usage_stats.top_services.map(service => `
                                    <span class="service-tag">${service}</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render usage tab - CONSISTENT LAYOUT
     */
    renderUsageTab() {
        const client = this.clientData;
        const budgetPercentage = (client.used_budget_current_month / client.monthly_budget_usd) * 100;
        
        return `
            <div class="usage-content">
                <!-- Usage Metrics Grid - Same as Overview -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${client.monthly_budget_usd}</div>
                        <div class="metric-label">Monthly Budget</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${client.used_budget_current_month}</div>
                        <div class="metric-label">Used This Month</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${client.monthly_budget_usd - client.used_budget_current_month}</div>
                        <div class="metric-label">Remaining Budget</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${budgetPercentage.toFixed(1)}%</div>
                        <div class="metric-label">Budget Usage</div>
                    </div>
                </div>

                <!-- Usage Information Grid - Same Structure as Overview -->
                <div class="info-grid">
                    <div class="info-section">
                        <h3>📊 Usage Statistics</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Total Requests</label>
                                <span>${client.usage_stats.requests_this_month}</span>
                            </div>
                            <div class="info-item">
                                <label>Average Response Time</label>
                                <span>${client.usage_stats.avg_response_time}s</span>
                            </div>
                            <div class="info-item">
                                <label>Success Rate</label>
                                <span>${client.usage_stats.success_rate}%</span>
                            </div>
                            <div class="info-item">
                                <label>Last Activity</label>
                                <span>${new Date(client.last_activity).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>💰 Budget Breakdown</h3>
                        <div class="info-content">
                            <div class="budget-overview">
                                <div class="budget-bar-large" style="margin-bottom: 1rem;">
                                    <div class="budget-progress-large" style="width: ${Math.min(budgetPercentage, 100)}%; height: 12px; background: var(--primary); border-radius: 6px; transition: width 0.3s ease;"></div>
                                </div>
                                <div class="info-item">
                                    <label>Usage Percentage</label>
                                    <span>${budgetPercentage.toFixed(1)}%</span>
                                </div>
                                <div class="info-item">
                                    <label>Daily Average</label>
                                    <span>${(client.used_budget_current_month / new Date().getDate()).toFixed(2)}</span>
                                </div>
                                <div class="info-item">
                                    <label>Projected Monthly</label>
                                    <span>${((client.used_budget_current_month / new Date().getDate()) * 30).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>🎯 Service Usage</h3>
                        <div class="info-content">
                            <div class="service-list">
                                ${client.usage_stats.top_services.map(service => `
                                    <span class="service-tag">${service}</span>
                                `).join('')}
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-secondary btn-small">View Detailed Usage</button>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>📈 Usage Trends</h3>
                        <div class="info-content">
                            <p>Usage analytics and trends will be displayed here.</p>
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-secondary btn-small">Download Usage Report</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render reports tab - CONSISTENT LAYOUT
     */
    renderReportsTab() {
        const client = this.clientData;
        
        return `
            <div class="reports-content">
                <!-- Reports Metrics Grid - Same as Overview -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${client.recent_reports.length}</div>
                        <div class="metric-label">Total Reports</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${client.recent_reports.filter(r => r.status === 'completed').length}</div>
                        <div class="metric-label">Completed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${client.recent_reports.filter(r => r.status === 'pending').length}</div>
                        <div class="metric-label">In Progress</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">
                            ${client.recent_reports.length > 0 ? 
                                new Date(Math.max(...client.recent_reports.map(r => new Date(r.created)))).toLocaleDateString() : 
                                'None'}
                        </div>
                        <div class="metric-label">Latest Report</div>
                    </div>
                </div>

                <!-- Reports Information Grid - Same Structure as Overview -->
                <div class="info-grid">
                    <div class="info-section">
                        <h3>📋 Recent Reports</h3>
                        <div class="info-content">
                            ${client.recent_reports.length > 0 ? 
                                client.recent_reports.map(report => `
                                    <div class="info-item" style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
                                        <label>${report.title}</label>
                                        <span>
                                            <span class="status-badge status-${report.status}">${report.status}</span>
                                            <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
                                                ${new Date(report.created).toLocaleDateString()}
                                            </span>
                                        </span>
                                    </div>
                                `).join('') : 
                                '<p style="color: var(--text-secondary); font-style: italic;">No reports generated yet.</p>'
                            }
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-primary btn-small">Generate New Report</button>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>📊 Report Types</h3>
                        <div class="info-content">
                            <div class="service-list">
                                <span class="service-tag">Usage Analytics</span>
                                <span class="service-tag">Performance Report</span>
                                <span class="service-tag">Cost Analysis</span>
                                <span class="service-tag">Custom Report</span>
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-secondary btn-small">View Templates</button>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>📈 Report Analytics</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Reports This Month</label>
                                <span>${client.recent_reports.filter(r => 
                                    new Date(r.created).getMonth() === new Date().getMonth()
                                ).length}</span>
                            </div>
                            <div class="info-item">
                                <label>Average Generation Time</label>
                                <span>2.3 minutes</span>
                            </div>
                            <div class="info-item">
                                <label>Most Used Template</label>
                                <span>Usage Analytics</span>
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-secondary btn-small">View Analytics</button>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>⚙️ Report Settings</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Auto-Generate Monthly</label>
                                <span>
                                    <input type="checkbox" style="margin-right: 0.5rem;">
                                    Enabled
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Email Reports</label>
                                <span>
                                    <input type="checkbox" checked style="margin-right: 0.5rem;">
                                    Enabled
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Report Format</label>
                                <span>
                                    <select style="padding: 0.25rem; border: 1px solid var(--border); border-radius: 4px;">
                                        <option>PDF</option>
                                        <option>Excel</option>
                                        <option>CSV</option>
                                    </select>
                                </span>
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-secondary btn-small">Save Settings</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render settings tab - CONSISTENT LAYOUT
     */
    renderSettingsTab() {
        const client = this.clientData;
        
        return `
            <div class="settings-content">
                <!-- Settings Metrics Grid - Same as Overview -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${this.formatTierName(client.subscription_tier).replace(/[^\w\s]/gi, '')}</div>
                        <div class="metric-label">Current Tier</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${client.account_status}</div>
                        <div class="metric-label">Account Status</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${new Date(client.created_at).toLocaleDateString()}</div>
                        <div class="metric-label">Member Since</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${new Date(client.last_activity).toLocaleDateString()}</div>
                        <div class="metric-label">Last Login</div>
                    </div>
                </div>

                <!-- Settings Information Grid - Same Structure as Overview -->
                <div class="info-grid">
                    <div class="info-section">
                        <h3>📊 Subscription Details</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Current Plan</label>
                                <span>
                                    <span class="tier-badge tier-${client.subscription_tier}">
                                        ${this.formatTierName(client.subscription_tier)}
                                    </span>
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Monthly Budget</label>
                                <span>${client.monthly_budget_usd}</span>
                            </div>
                            <div class="info-item">
                                <label>Account Status</label>
                                <span>
                                    <span class="status-badge status-${client.account_status}">${client.account_status}</span>
                                </span>
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-primary btn-small" onclick="window.upgradeAccount && window.upgradeAccount()">
                                    ⬆️ Upgrade Plan
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>🔔 Notification Settings</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Email Notifications</label>
                                <span>
                                    <input type="checkbox" checked style="margin-right: 0.5rem;">
                                    Enabled
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Budget Alerts</label>
                                <span>
                                    <input type="checkbox" checked style="margin-right: 0.5rem;">
                                    At 80% usage
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Report Completion</label>
                                <span>
                                    <input type="checkbox" checked style="margin-right: 0.5rem;">
                                    Enabled
                                </span>
                            </div>
                            <div class="info-item">
                                <label>System Updates</label>
                                <span>
                                    <input type="checkbox" style="margin-right: 0.5rem;">
                                    Disabled
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>🔐 Security Settings</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Password</label>
                                <span>
                                    <button class="btn btn-secondary btn-small">Change Password</button>
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Two-Factor Authentication</label>
                                <span>
                                    <button class="btn btn-secondary btn-small">Enable 2FA</button>
                                </span>
                            </div>
                            <div class="info-item">
                                <label>API Keys</label>
                                <span>
                                    <button class="btn btn-secondary btn-small">Manage Keys</button>
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Login Sessions</label>
                                <span>
                                    <button class="btn btn-secondary btn-small">View Sessions</button>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>⚙️ Account Actions</h3>
                        <div class="info-content">
                            <div class="info-item">
                                <label>Export Data</label>
                                <span>
                                    <button class="btn btn-secondary btn-small">Download Archive</button>
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Support</label>
                                <span>
                                    <button class="btn btn-secondary btn-small" onclick="window.contactSupport && window.contactSupport()">
                                        Contact Support
                                    </button>
                                </span>
                            </div>
                            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                                <div class="info-item">
                                    <label style="color: var(--error);">Danger Zone</label>
                                    <span>
                                        <button class="btn btn-danger btn-small">Deactivate Account</button>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Save Actions -->
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; gap: 1rem;">
                    <button class="btn btn-primary">Save All Settings</button>
                    <button class="btn btn-secondary">Reset to Defaults</button>
                </div>
            </div>
        `;
    }

    /**
     * Render loading content
     */
    renderLoadingContent() {
        return `
            <div class="loading-state">
                <div class="loading-spinner">🔄</div>
                <div class="loading-text">Loading client details...</div>
            </div>
        `;
    }

    /**
     * Update loading state
     */
    updateLoadingState(isLoading) {
        // Could update specific UI elements to show loading
        if (isLoading) {
            console.log('🔄 Loading client data...');
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
            breadcrumbCurrent.textContent = this.clientData.company_name;
        }
        
        // Update page title
        const clientNameElements = document.querySelectorAll('.client-name, .page-title');
        clientNameElements.forEach(element => {
            element.textContent = this.clientData.company_name;
        });
        
        // Update tab content
        const tabContent = document.getElementById('tab-content');
        if (tabContent) {
            tabContent.innerHTML = this.renderTabContent();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const tabContent = document.getElementById('tab-content');
        if (tabContent) {
            tabContent.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3>Error Loading Client</h3>
                    <p>${message}</p>
                    <div class="debug-info" style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #6b7280;">
                        <strong>Debug Information:</strong><br>
                        Client ID: ${this.clientId}<br>
                        API Client: ${this.apiClient ? 'Available' : 'Not Available'}<br>
                        Session Manager: ${window.sessionManager ? 'Available' : 'Not Available'}<br>
                        User Authenticated: ${window.sessionManager?.isAuthenticated() ? 'Yes' : 'No'}
                    </div>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="clientDetailPage.refresh()">
                            🔄 Try Again
                        </button>
                        <button class="btn btn-secondary" onclick="clientDetailPage.loadFallbackData()">
                            📋 Load Demo Data
                        </button>
                        <button class="btn btn-secondary" onclick="window.contactSupport && window.contactSupport()">
                            📧 Contact Support
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Format tier name with icons
     */
    formatTierName(tier) {
        const tierNames = {
            'basic': '🥉 Basic',
            'standard': '🥈 Standard',
            'premium': '🥇 Premium',
            'enterprise': '💎 Enterprise'
        };
        return tierNames[tier] || '🔧 Unknown';
    }

    /**
     * Action methods (placeholder implementations)
     */
    editClient() {
        console.log(`✏️ Editing client: ${this.clientId}`);
        alert('Edit client functionality coming soon!');
    }

    contactClient() {
        console.log(`📧 Contacting client: ${this.clientId}`);
        if (this.clientData?.contact_email) {
            window.open(`mailto:${this.clientData.contact_email}`);
        }
    }

    /**
     * Load fallback data for testing/demo purposes
     */
    async loadFallbackData() {
        console.log('🆘 Loading fallback data manually...');
        
        try {
            this.clientData = this.getAbsoluteFallbackData();
            this.refreshPageContent();
            console.log('✅ Fallback data loaded successfully');
            
            // Show success message
            if (window.Toast) {
                Toast.success('Demo data loaded successfully');
            }
        } catch (error) {
            console.error('❌ Failed to load fallback data:', error);
            alert('Failed to load demo data. Please contact support.');
        }
    }

    /**
     * Cleanup method - NO INTERVALS TO CLEAN
     */
    destroy() {
        console.log('🗑️ ClientDetailPage destroyed');
        // No intervals or timers to clean up
    }
}

// Global instance for event handlers
window.ClientDetailPage = ClientDetailPage;