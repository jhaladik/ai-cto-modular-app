// Clients Page Component - Safe Integration Version  
// File: Pages/public/js/components/clients-page.js

/**
 * ClientsPage - Converts modal client list to routed page with expandable rows
 * Safe version that integrates with existing ClientListManager functionality
 */
class ClientsPage {
    constructor(apiClient) {
        this.apiClient = apiClient || window.apiClient;
        this.clients = [];
        this.filteredClients = [];
        this.currentFilter = '';
        this.currentSort = 'company_name';
        this.isLoading = false;
        this.expandedRows = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 20;
        
        // Bind methods for event handlers
        this.handleSearch = this.handleSearch.bind(this);
        this.handleSort = this.handleSort.bind(this);
        this.toggleRowExpansion = this.toggleRowExpansion.bind(this);
        this.goToPage = this.goToPage.bind(this);
    }

    /**
     * Render the clients page
     */
    render() {
        return `
            <div class="clients-page">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">👥 Client Management</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="clientsPage.exportClients()">
                            📊 Export
                        </button>
                        <button class="btn btn-primary" onclick="clientsPage.showAddClient()">
                            ➕ Add Client
                        </button>
                    </div>
                </div>

                <!-- Search and Filters -->
                <div class="clients-controls" style="background: var(--surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 1.5rem;">
                    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 250px;">
                            <input type="text" 
                                   class="search-input" 
                                   style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm);"
                                   placeholder="🔍 Search clients..."
                                   value="${this.currentFilter}"
                                   onkeyup="clientsPage.handleSearch(event)">
                        </div>
                        <div style="min-width: 150px;">
                            <select class="filter-select" 
                                    style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm);"
                                    onchange="clientsPage.handleSort(event)">
                                <option value="company_name" ${this.currentSort === 'company_name' ? 'selected' : ''}>
                                    Sort by Company
                                </option>
                                <option value="subscription_tier" ${this.currentSort === 'subscription_tier' ? 'selected' : ''}>
                                    Sort by Tier
                                </option>
                                <option value="created_at" ${this.currentSort === 'created_at' ? 'selected' : ''}>
                                    Sort by Date
                                </option>
                                <option value="monthly_budget_usd" ${this.currentSort === 'monthly_budget_usd' ? 'selected' : ''}>
                                    Sort by Budget
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Client Statistics -->
                <div class="clients-summary">
                    ${this.renderClientsSummary()}
                </div>

                <!-- Clients Table -->
                <div class="clients-content" id="clients-content">
                    ${this.renderClientsTable()}
                </div>

                <!-- Pagination -->
                <div class="pagination-container" style="margin-top: 1.5rem;">
                    ${this.renderPagination()}
                </div>
            </div>
        `;
    }

    /**
     * Render client statistics summary
     */
    renderClientsSummary() {
        const stats = this.calculateStats();
        
        return `
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-value">${stats.total}</div>
                    <div class="summary-label">Total Clients</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${stats.active}</div>
                    <div class="summary-label">Active</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${stats.trial}</div>
                    <div class="summary-label">Trial</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">$${stats.totalRevenue.toLocaleString()}</div>
                    <div class="summary-label">Monthly Revenue</div>
                </div>
            </div>
        `;
    }

    /**
     * Render clients table with expandable rows
     */
    renderClientsTable() {
        if (this.isLoading) {
            return `
                <div class="loading-state">
                    <div class="loading-spinner">🔄</div>
                    <p>Loading clients...</p>
                </div>
            `;
        }

        if (this.filteredClients.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No clients found</h3>
                    <p>Try adjusting your search criteria or add your first client.</p>
                    <button class="btn btn-primary" onclick="clientsPage.showAddClient()">
                        ➕ Add First Client
                    </button>
                </div>
            `;
        }

        const paginatedClients = this.getPaginatedClients();

        return `
            <div class="expandable-table">
                <!-- Table Header -->
                <div class="table-header">
                    <div>Company</div>
                    <div>Tier</div>
                    <div>Status</div>
                    <div>Budget Usage</div>
                    <div></div>
                </div>

                <!-- Table Rows -->
                ${paginatedClients.map(client => this.renderClientRow(client)).join('')}
            </div>
        `;
    }

    /**
     * Render individual client row with expandable details
     */
    renderClientRow(client) {
        const isExpanded = this.expandedRows.has(client.client_id);
        const usagePercent = this.getUsagePercentage(client);
        
        return `
            <div class="table-row ${isExpanded ? 'expanded' : ''}" 
                 data-client-id="${client.client_id}"
                 onclick="clientsPage.toggleRowExpansion('${client.client_id}')">
                
                <div class="client-basic-info">
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                        ${client.company_name || 'Unknown Company'}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${client.contact_email || 'No email provided'}
                    </div>
                </div>
                
                <div>
                    <span class="tier-badge tier-${(client.subscription_tier || 'basic').toLowerCase()}">
                        ${(client.subscription_tier || 'BASIC').toUpperCase()}
                    </span>
                </div>
                
                <div>
                    <span class="status-badge ${(client.account_status || 'active').toLowerCase()}">
                        ${this.getStatusIcon(client.account_status)} ${(client.account_status || 'Active').charAt(0).toUpperCase() + (client.account_status || 'active').slice(1)}
                    </span>
                </div>
                
                <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="flex: 1; background: #f3f4f6; border-radius: 999px; height: 6px; overflow: hidden;">
                            <div style="width: ${Math.min(usagePercent, 100)}%; height: 100%; background: ${usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#10b981'}; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); min-width: 60px;">
                            ${usagePercent}%
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        $${client.used_budget_current_month || 0} / $${client.monthly_budget_usd || 0}
                    </div>
                </div>
                
                <div class="row-actions">
                    <span class="row-expand-icon" style="transition: transform 0.2s ease; ${isExpanded ? 'transform: rotate(90deg);' : ''}">
                        ▶
                    </span>
                </div>
            </div>
            
            ${isExpanded ? this.renderRowDetails(client) : ''}
        `;
    }

    /**
     * Render expanded row details
     */
    renderRowDetails(client) {
        return `
            <div class="row-details" style="display: block;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                    
                    <div>
                        <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">Account Information</h4>
                        <div style="display: grid; gap: 0.75rem;">
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Company:</strong><br>
                                <span>${client.company_name || 'Not provided'}</span>
                            </div>
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Contact Email:</strong><br>
                                <span>${client.contact_email || 'Not provided'}</span>
                            </div>
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Industry:</strong><br>
                                <span>${client.industry || 'Not specified'}</span>
                            </div>
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Created:</strong><br>
                                <span>${this.formatDate(client.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">Subscription & Usage</h4>
                        <div style="display: grid; gap: 0.75rem;">
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Tier:</strong><br>
                                <span class="tier-badge tier-${(client.subscription_tier || 'basic').toLowerCase()}">
                                    ${(client.subscription_tier || 'BASIC').toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Monthly Budget:</strong><br>
                                <span>$${client.monthly_budget_usd || 0}</span>
                            </div>
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Used This Month:</strong><br>
                                <span>$${client.used_budget_current_month || 0}</span>
                            </div>
                            <div>
                                <strong style="color: var(--text-secondary); font-size: 0.875rem;">Usage:</strong><br>
                                <span>${this.getUsagePercentage(client)}% of budget</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">Quick Actions</h4>
                        <div style="display: grid; gap: 0.5rem;">
                            <button class="btn btn-secondary btn-sm" onclick="clientsPage.editClient('${client.client_id}'); event.stopPropagation();">
                                ✏️ Edit Client
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="clientsPage.viewReports('${client.client_id}'); event.stopPropagation();">
                                📋 View Reports
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="clientsPage.viewUsage('${client.client_id}'); event.stopPropagation();">
                                📊 Usage Details
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="clientsPage.sendMessage('${client.client_id}'); event.stopPropagation();">
                                💬 Send Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
        
        if (totalPages <= 1) return '';

        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredClients.length);

        return `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn btn-secondary btn-sm" 
                        ${this.currentPage === 1 ? 'disabled' : ''}
                        onclick="clientsPage.goToPage(${this.currentPage - 1})">
                    ← Previous
                </button>
                
                <span style="color: var(--text-secondary); font-size: 0.875rem;">
                    Showing ${startItem}-${endItem} of ${this.filteredClients.length} clients
                </span>
                
                <button class="btn btn-secondary btn-sm"
                        ${this.currentPage === totalPages ? 'disabled' : ''}
                        onclick="clientsPage.goToPage(${this.currentPage + 1})">
                    Next →
                </button>
            </div>
        `;
    }

    /**
     * Mount the component and load data
     */
    async mount() {
        // Set global reference for event handlers
        window.clientsPage = this;
        
        // Load initial data
        await this.loadClients();
        
        console.log('✅ Clients page mounted');
    }

    /**
     * Load clients data from API
     */
    async loadClients() {
        try {
            this.isLoading = true;
            this.updateContent();
            
            // Use existing API if available
            let response;
            if (this.apiClient && this.apiClient.getClients) {
                response = await this.apiClient.getClients();
            } else {
                // Fallback to mock data
                response = { clients: this.getMockClients() };
            }
            
            this.clients = response.clients || [];
            this.filteredClients = [...this.clients];
            
            this.applyFilters();
            this.updateContent();
            
        } catch (error) {
            console.error('Failed to load clients:', error);
            this.showError('Failed to load clients: ' + error.message);
        } finally {
            this.isLoading = false;
            setTimeout(() => this.updateContent(), 100);
        }
    }

    /**
     * Get mock client data for testing
     */
    getMockClients() {
        return [
            {
                client_id: 'client_1',
                company_name: 'Acme Corp',
                contact_email: 'admin@acme.com',
                subscription_tier: 'premium',
                account_status: 'active',
                monthly_budget_usd: 1000,
                used_budget_current_month: 750,
                industry: 'Technology',
                created_at: '2024-01-15T10:00:00Z'
            },
            {
                client_id: 'client_2',
                company_name: 'Global Industries',
                contact_email: 'contact@global.com',
                subscription_tier: 'enterprise',
                account_status: 'active',
                monthly_budget_usd: 2500,
                used_budget_current_month: 1200,
                industry: 'Manufacturing',
                created_at: '2024-02-10T14:30:00Z'
            },
            {
                client_id: 'client_3',
                company_name: 'StartupXYZ',
                contact_email: 'hello@startupxyz.com',
                subscription_tier: 'standard',
                account_status: 'trial',
                monthly_budget_usd: 500,
                used_budget_current_month: 120,
                industry: 'E-commerce',
                created_at: '2024-07-01T09:15:00Z'
            }
        ];
    }

    /**
     * Handle search input
     */
    handleSearch(event) {
        this.currentFilter = event.target.value.toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
        this.updateContent();
    }

    /**
     * Handle sort selection
     */
    handleSort(event) {
        this.currentSort = event.target.value;
        this.applyFilters();
        this.updateContent();
    }

    /**
     * Apply filters and sorting
     */
    applyFilters() {
        let filtered = [...this.clients];

        // Apply search filter
        if (this.currentFilter) {
            filtered = filtered.filter(client => 
                (client.company_name || '').toLowerCase().includes(this.currentFilter) ||
                (client.contact_email || '').toLowerCase().includes(this.currentFilter) ||
                (client.industry || '').toLowerCase().includes(this.currentFilter)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const aVal = a[this.currentSort] || '';
            const bVal = b[this.currentSort] || '';
            
            if (typeof aVal === 'string') {
                return aVal.localeCompare(bVal);
            }
            
            return (aVal || 0) - (bVal || 0);
        });

        this.filteredClients = filtered;
    }

    /**
     * Toggle row expansion
     */
    toggleRowExpansion(clientId) {
        if (this.expandedRows.has(clientId)) {
            this.expandedRows.delete(clientId);
        } else {
            this.expandedRows.add(clientId);
        }
        this.updateContent();
    }

    /**
     * Pagination methods
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.expandedRows.clear(); // Close expanded rows when changing pages
            this.updateContent();
        }
    }

    getPaginatedClients() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredClients.slice(start, end);
    }

    /**
     * Update content areas
     */
    updateContent() {
        const contentElement = document.getElementById('clients-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderClientsTable();
        }

        const paginationElement = document.querySelector('.pagination-container');
        if (paginationElement) {
            paginationElement.innerHTML = this.renderPagination();
        }

        const summaryElement = document.querySelector('.clients-summary');
        if (summaryElement) {
            summaryElement.innerHTML = this.renderClientsSummary();
        }
    }

    /**
     * Action methods
     */
    showAddClient() {
        alert('Add Client functionality coming soon!\n\nThis will open a form to create a new client account.');
    }

    editClient(clientId) {
        const client = this.clients.find(c => c.client_id === clientId);
        alert(`Edit client: ${client?.company_name}\n\nThis will open an edit form with the client's current information.`);
    }

    viewReports(clientId) {
        const client = this.clients.find(c => c.client_id === clientId);
        alert(`View reports for: ${client?.company_name}\n\nThis will show all reports generated for this client.`);
    }

    viewUsage(clientId) {
        const client = this.clients.find(c => c.client_id === clientId);
        alert(`Usage details for: ${client?.company_name}\n\nThis will show detailed usage analytics and billing information.`);
    }

    sendMessage(clientId) {
        const client = this.clients.find(c => c.client_id === clientId);
        alert(`Send message to: ${client?.company_name}\n\nThis will open a communication interface to contact the client.`);
    }

    exportClients() {
        // Generate CSV export
        const csv = this.generateCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        alert('Client data exported to CSV file!');
    }

    /**
     * Utility methods
     */
    calculateStats() {
        const total = this.clients.length;
        const active = this.clients.filter(c => (c.account_status || 'active') === 'active').length;
        const trial = this.clients.filter(c => (c.account_status || 'active') === 'trial').length;
        const totalRevenue = this.clients.reduce((sum, c) => sum + (c.monthly_budget_usd || 0), 0);
        
        return { total, active, trial, totalRevenue };
    }

    getStatusIcon(status) {
        const icons = {
            'active': '🟢',
            'trial': '🟡',
            'suspended': '🔴',
            'cancelled': '⚫'
        };
        return icons[status] || '🟢';
    }

    getUsagePercentage(client) {
        const budget = client.monthly_budget_usd || 0;
        const used = client.used_budget_current_month || 0;
        return budget > 0 ? Math.round((used / budget) * 100) : 0;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            return 'Invalid date';
        }
    }

    generateCSV() {
        const headers = ['Company', 'Email', 'Tier', 'Status', 'Budget', 'Used', 'Industry', 'Created'];
        const rows = this.clients.map(client => [
            client.company_name || '',
            client.contact_email || '',
            client.subscription_tier || '',
            client.account_status || '',
            client.monthly_budget_usd || 0,
            client.used_budget_current_month || 0,
            client.industry || '',
            client.created_at || ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    showError(message) {
        const contentElement = document.getElementById('clients-content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--error);">❌</div>
                    <h3>Error Loading Clients</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="clientsPage.loadClients()">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Export for global use
window.ClientsPage = ClientsPage;