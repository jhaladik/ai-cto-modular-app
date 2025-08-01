/**
 * Clients Page Component - Clean Version
 * Simple client list with sorting - NO SEARCH FUNCTIONALITY
 */
class ClientsPage {
    constructor(apiClient) {
        this.apiClient = apiClient || window.apiClient;
        this.clients = [];
        this.filteredClients = [];
        this.currentSort = 'company_name';
        this.sortDirection = 'asc';
        this.isLoading = false;
        this.expandedRows = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 15;
        
        // Bind methods for event handlers
        this.handleSort = this.handleSort.bind(this);
        this.toggleRowExpansion = this.toggleRowExpansion.bind(this);
        this.goToPage = this.goToPage.bind(this);
        this.refresh = this.refresh.bind(this);
    }

    /**
     * Render the clients page - NO SEARCH COMPONENTS
     */
    render() {
        return `
            <div class="clients-page">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">👥 Client Management</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="clientsPage.refresh()">
                            🔄 Refresh
                        </button>
                        <button class="btn btn-secondary" onclick="clientsPage.exportClients()">
                            📊 Export
                        </button>
                        <button class="btn btn-primary" onclick="clientsPage.showAddClient()">
                            ➕ Add Client
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="clients-summary" id="clients-summary">
                    <!-- Summary cards will be rendered here -->
                </div>

                <!-- Simple Controls - NO SEARCH -->
                <div class="clients-controls">
                    <div class="sort-controls">
                        <label for="sort-select">Sort by:</label>
                        <select id="sort-select" onchange="clientsPage.handleSort(event)">
                            <option value="company_name">Company Name</option>
                            <option value="created_at">Date Added</option>
                            <option value="subscription_tier">Subscription Tier</option>
                            <option value="account_status">Account Status</option>
                            <option value="monthly_budget_usd">Monthly Budget</option>
                        </select>
                        <button class="btn btn-small" onclick="clientsPage.toggleSortDirection()">
                            ${this.sortDirection === 'asc' ? '⬆️' : '⬇️'}
                        </button>
                    </div>
                    
                    <div class="view-controls">
                        <span class="results-count" id="results-count">
                            Showing ${this.filteredClients.length} clients
                        </span>
                    </div>
                </div>

                <!-- Clients Content -->
                <div id="clients-content" class="clients-content">
                    <!-- Clients will be rendered here -->
                </div>

                <!-- Pagination -->
                <div class="pagination-container">
                    <!-- Pagination will be rendered here -->
                </div>
            </div>
        `;
    }

    /**
     * Mount the component and load data
     */
    async mount() {
        console.log('📋 Mounting Clients Page...');
        
        // Render summary
        this.renderClientsSummary();
        
        // Load clients data
        await this.loadClients();
        
        console.log('✅ Clients Page mounted');
    }

    /**
     * Load clients from API
     */
    async loadClients() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log('📡 Loading clients...');
        
        try {
            // Show loading state
            const contentElement = document.getElementById('clients-content');
            if (contentElement) {
                contentElement.innerHTML = this.renderLoadingState();
            }
            
            // Use real API data
            const result = await this.apiClient.kamRequest('/clients', 'GET');
            const clients = result.success ? result.clients : [];
            
            this.clients = clients;
            this.applySorting();
            this.updateContent();
            
            console.log(`✅ Loaded ${clients.length} clients`);
            
        } catch (error) {
            console.error('❌ Failed to load clients:', error);
            this.showError('Failed to load clients. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Handle sort selection - NO SEARCH FILTERING
     */
    handleSort(event) {
        this.currentSort = event.target.value;
        this.applySorting();
        this.updateContent();
        console.log(`📊 Sorted by: ${this.currentSort} (${this.sortDirection})`);
    }

    /**
     * Toggle sort direction
     */
    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.applySorting();
        this.updateContent();
        
        // Update button icon
        const button = document.querySelector('.sort-controls button');
        if (button) {
            button.innerHTML = this.sortDirection === 'asc' ? '⬆️' : '⬇️';
        }
    }

    /**
     * Apply sorting only - no search filtering
     */
    applySorting() {
        let sorted = [...this.clients];

        // Apply sorting
        sorted.sort((a, b) => {
            const aVal = a[this.currentSort] || '';
            const bVal = b[this.currentSort] || '';
            
            let comparison;
            if (typeof aVal === 'string') {
                comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
            } else {
                comparison = (aVal || 0) - (bVal || 0);
            }
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        this.filteredClients = sorted;
        this.currentPage = 1; // Reset to first page when sorting
    }

    /**
     * Toggle row expansion for client details
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
     * Navigate to client detail page
     */
    goToClientDetail(clientId) {
        if (window.router) {
            window.router.navigate(`/clients/${clientId}`);
        } else {
            console.warn('Router not available');
        }
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
        // Update clients table
        const contentElement = document.getElementById('clients-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderClientsTable();
        }

        // Update pagination
        const paginationElement = document.querySelector('.pagination-container');
        if (paginationElement) {
            paginationElement.innerHTML = this.renderPagination();
        }

        // Update results count
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${this.filteredClients.length} clients`;
        }

        // Update summary
        this.renderClientsSummary();
    }

    /**
     * Render clients table with expandable rows
     */
    renderClientsTable() {
        const clients = this.getPaginatedClients();
        
        if (clients.length === 0) {
            return `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <h3>No Clients Found</h3>
                    <p>There are no clients to display.</p>
                    <button class="btn btn-primary" onclick="clientsPage.showAddClient()">
                        ➕ Add First Client
                    </button>
                </div>
            `;
        }

        return `
            <div class="expandable-table">
                ${clients.map(client => this.renderClientRow(client)).join('')}
            </div>
        `;
    }

    /**
     * Render individual client row
     */
    renderClientRow(client) {
        const isExpanded = this.expandedRows.has(client.client_id);
        const budgetPercentage = (client.used_budget_current_month / client.monthly_budget_usd) * 100;
        
        return `
            <div class="client-row ${isExpanded ? 'expanded' : ''}">
                <div class="client-row-header" onclick="clientsPage.toggleRowExpansion('${client.client_id}')">
                    <div class="client-info">
                        <div class="client-name">
                            <h4>${client.company_name}</h4>
                            <span class="client-email">${client.contact_email}</span>
                        </div>
                        <div class="client-meta">
                            <span class="tier-badge tier-${client.subscription_tier}">
                                ${this.formatTierName(client.subscription_tier)}
                            </span>
                            <span class="status-badge status-${client.account_status}">
                                ${client.account_status}
                            </span>
                        </div>
                    </div>
                    <div class="client-stats">
                        <div class="budget-info">
                            <div class="budget-text">
                                $${client.used_budget_current_month} / $${client.monthly_budget_usd}
                            </div>
                            <div class="budget-bar">
                                <div class="budget-progress" style="width: ${Math.min(budgetPercentage, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-small" onclick="event.stopPropagation(); clientsPage.goToClientDetail('${client.client_id}')">
                            View Details
                        </button>
                        <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                
                ${isExpanded ? `
                    <div class="client-row-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Industry</label>
                                <span>${client.industry}</span>
                            </div>
                            <div class="detail-item">
                                <label>Created</label>
                                <span>${new Date(client.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <label>Last Activity</label>
                                <span>${new Date(client.last_activity).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <label>Budget Usage</label>
                                <span>${budgetPercentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div class="detail-actions">
                            <button class="btn btn-secondary btn-small" onclick="clientsPage.editClient('${client.client_id}')">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="clientsPage.viewReports('${client.client_id}')">
                                📊 Reports
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="clientsPage.viewBilling('${client.client_id}')">
                                💳 Billing
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
        
        if (totalPages <= 1) return '';

        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(`
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="clientsPage.goToPage(${i})">
                    ${i}
                </button>
            `);
        }

        return `
            <div class="pagination">
                <button class="page-btn" 
                        onclick="clientsPage.goToPage(${this.currentPage - 1})"
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    ‹ Previous
                </button>
                ${pages.join('')}
                <button class="page-btn" 
                        onclick="clientsPage.goToPage(${this.currentPage + 1})"
                        ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next ›
                </button>
            </div>
        `;
    }

    /**
     * Render clients summary cards
     */
    renderClientsSummary() {
        const summaryElement = document.getElementById('clients-summary');
        if (!summaryElement) return;

        const totalClients = this.clients.length;
        const activeClients = this.clients.filter(c => c.account_status === 'active').length;
        const totalRevenue = this.clients.reduce((sum, c) => sum + (c.monthly_budget_usd || 0), 0);
        const totalUsage = this.clients.reduce((sum, c) => sum + (c.used_budget_current_month || 0), 0);

        summaryElement.innerHTML = `
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-value">${totalClients}</div>
                    <div class="summary-label">Total Clients</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${activeClients}</div>
                    <div class="summary-label">Active Clients</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">$${totalRevenue.toLocaleString()}</div>
                    <div class="summary-label">Monthly Budget</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">$${totalUsage.toLocaleString()}</div>
                    <div class="summary-label">Usage This Month</div>
                </div>
            </div>
        `;
    }

    /**
     * Render loading state
     */
    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="loading-spinner">🔄</div>
                <div class="loading-text">Loading clients...</div>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const contentElement = document.getElementById('clients-content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3>Error Loading Clients</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="clientsPage.refresh()">
                        🔄 Try Again
                    </button>
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
    async refresh() {
        console.log('🔄 Refreshing clients...');
        await this.loadClients();
    }

    showAddClient() {
        alert('Add Client functionality coming soon!\n\nThis will open a form to create a new client account.');
    }

    exportClients() {
        console.log('📊 Exporting clients...');
        alert('Export functionality coming soon!\n\nThis will download a CSV of all clients.');
    }

    editClient(clientId) {
        console.log(`✏️ Editing client: ${clientId}`);
        alert(`Edit client functionality coming soon!\n\nClient ID: ${clientId}`);
    }

    viewReports(clientId) {
        console.log(`📊 Viewing reports for client: ${clientId}`);
        if (window.router) {
            window.router.navigate(`/clients/${clientId}/reports`);
        }
    }

    viewBilling(clientId) {
        console.log(`💳 Viewing billing for client: ${clientId}`);
        if (window.router) {
            window.router.navigate(`/clients/${clientId}/billing`);
        }
    }
}

// Global instance for event handlers
window.ClientsPage = ClientsPage;